# 28 — Pruebas diferenciales y de rendimiento

> Archivos: `packages/core/src/differential/differential.ts`, `packages/core/src/performance/benchmark.ts`, los comandos `differential` y `bench` (`packages/core/src/command-line/commands/`) y las pruebas `packages/core/test/differential.test.ts` y `packages/core/test/performance.test.ts`.

## 1. Teoría

Este paso no agrega un concepto nuevo: genera **evidencia** de dos cosas.

- **Que el núcleo es correcto.** Una **prueba diferencial** compara varias implementaciones de lo mismo sobre muchas entradas. Acá se toman **todas** las cadenas hasta un largo y se verifica que los tres reconocedores acepten exactamente las mismas: Earley sobre G ([guía 14](14-reconocedor-de-earley.md)), CYK sobre la FNC de G ([guía 25](25-cyk.md)) y el autómata de pila de G ([guía 26](26-automata-de-pila.md)). Como están construidos de maneras muy distintas, es muy difícil que los tres fallen igual: un error en cualquiera aparece como una **discrepancia**.
- **Que el núcleo es rápido.** El anteproyecto pide que un relato largo se analice en menos de un segundo. Se mide con L1, un relato de 200 eventos (`CRI`, 198 `PIS` y `REV`).

### Ejemplo: G1 hasta largo 3

```sh
npm run sabueso -- differential --grammar g1 --max-length 3
```

Hasta largo 3 hay 1 + 14 + 14² + 14³ = 2 955 cadenas. Earley acepta 8 (2 hechos × 4 pasos × `REV`, las mismas que genera la [guía 27](27-busquedas-acotadas.md)). CYK y el autómata de pila aceptan esas mismas 8 y rechazan las otras 2 947: 0 discrepancias.

**Resultados del corpus completo:**

| Gramática                 | Corpus                       | Cadenas | Oraciones | Discrepancias |
| ------------------------- | ---------------------------- | ------- | --------- | ------------- |
| G1                        | 14 etiquetas, largo ≤ 4      | 41 371  | 110       | 0             |
| G0                        | 14 etiquetas, largo ≤ 4      | 41 371  | 145       | 0             |
| `arithmetic` y la ambigua | {id, +, \*, (, )}, largo ≤ 5 | 3 906   | —         | 0             |
| `parentheses`             | {(, )}, largo ≤ 8            | 511     | —         | 0             |

**Rendimiento con L1:**

| Gramática | Reconocer              | Primer árbol | Derivación | Contar                             | Total       | Criterio  |
| --------- | ---------------------- | ------------ | ---------- | ---------------------------------- | ----------- | --------- |
| G1        | ~17 ms (22 709 ítems)  | ~3 ms        | ~3 ms      | ~0,5 ms (1 árbol)                  | **~24 ms**  | < 1000 ms |
| G0        | ~140 ms (43 006 ítems) | ~2 ms        | ~2 ms      | ~100 ms (un número de 115 dígitos) | **~245 ms** | < 3000 ms |

Los tiempos varían de una máquina a otra; los criterios dejan mucho margen. G0 tiene casi el doble de ítems porque `Pasos → Pasos Pasos` puede partir los 198 pasos de muchísimas maneras, y el conteo tiene que sumarlas todas: el precio de la ambigüedad.

## 2. Por qué así

- **Corpus exhaustivo, no al azar:** todas las cadenas sobre Σ hasta un largo. Así no depende de la suerte, y los casos borde (la cadena vacía, cadenas casi correctas) siempre están. Las tres corridas sobre 41 371 cadenas tardan alrededor de un segundo.
- **Se compara la aceptación, no los árboles:** la FNC cambia los árboles ([guía 25](25-cyk.md)), así que la cantidad de árboles de CYK no se puede comparar con la de Earley. Lo que tiene que coincidir es "sí o no".
- **`undetermined` también es una discrepancia:** si el autómata de pila llegara a su límite de pasos con alguna cadena del corpus, la prueba fallaría. No pasa.
- **La FNC se calcula una sola vez** por gramática, antes de recorrer el corpus.
- **El reloj se puede inyectar:** `benchmark` recibe `clock` (por defecto `performance.now()`), así la prueba de la función verifica la estructura con tiempos fijos, y solo las pruebas de rendimiento miden de verdad.
- **El conteo se mide aparte:** en G0, contar los árboles de L1 cuesta casi tanto como reconocerla, porque hay que sumar y multiplicar números enormes (`bigint`, [guía 20](20-conteo-de-arboles.md)).

## 3. El código, función por función

### 3.1 `allStrings({ alphabet, maxLength })`

```ts
const strings: SymbolName[][] = [[]];
let previous: SymbolName[][] = [[]];
for (let length = 1; length <= maxLength; length++) {
  previous = previous.flatMap((prefix) => alphabet.map((symbol) => [...prefix, symbol]));
  strings.push(...previous);
}
return strings;
```

Largo por largo: las cadenas de largo l son las de largo l − 1 con un símbolo más al final. Con |Σ| símbolos hay |Σ|^l. Antes era un ayudante de las pruebas (`stringsUpTo`); ahora vive en el núcleo y las pruebas lo reexportan.

### 3.2 `runDifferential({ grammar, maxLength, alphabet })`

```ts
const normalForm = toChomskyNormalForm(grammar).grammar;
const strings = allStrings({ alphabet, maxLength });
for (const tokens of strings) {
  const earley = recognize({ grammar, tokens }).accepted;
  const cockeYoungerKasami = recognizeCockeYoungerKasami({ grammar: normalForm, tokens }).accepted;
  const pushdownAutomaton = simulatePushdownAutomaton({ grammar, tokens }).result;
  if (earley) {
    accepted++;
  }
  if (cockeYoungerKasami !== earley || pushdownAutomaton !== (earley ? 'accept' : 'reject')) {
    discrepancies.push({ tokens, earley, cockeYoungerKasami, pushdownAutomaton });
  }
}
return { strings: strings.length, accepted, discrepancies };
```

- **`alphabet`** es Σ por defecto.
- **La condición de discrepancia:** CYK distinto de Earley, o el autómata con algo distinto de lo que dice Earley (incluido `undetermined`).
- Devuelve un `DifferentialReport`: cuántas cadenas, cuántas oraciones y la lista de discrepancias (vacía, si todo está bien).

### 3.3 `benchmark({ grammar, tokens, clock })`

```ts
const timed = <T>(work: () => T): { value: T; ms: number } => {
  const started = clock();
  const value = work();
  return { value, ms: clock() - started };
};
const recognition = timed(() => recognize({ grammar, tokens }));
const items = recognition.value.chart.reduce((total, set) => total + set.items.length, 0);
const count = timed(() => countTrees({ grammar, recognition: recognition.value }));
// … si rechaza, sin árbol ni derivación
const tree = timed(() => parseTrees({ grammar, recognition: recognition.value, limit: 1 })[0]);
const derivation = timed(() => (tree.value === undefined ? [] : leftmostDerivation(tree.value)));
```

- **`timed`:** corre un trabajo y devuelve su resultado y cuánto tardó, según `clock`.
- **`items`:** el total de ítems del chart, la medida del trabajo de Earley.
- Se mide cada etapa por separado: reconocer, contar y, si acepta, el primer árbol y su derivación. Si rechaza, `treeMs` y `derivationMs` son `null`.

### 3.4 Los comandos

- **`differential --grammar g1 --max-length 4`:** cantidad de cadenas, de oraciones y de discrepancias, y "The three recognizers agree on every string." `--max-length` va de 0 a 6, porque la cantidad crece como 14^k. Termina con código 1 si hay alguna discrepancia.
- **`bench --grammar g0 --file packages/core/test/fixtures/l1.txt`:** una tabla con el tiempo y el resultado de cada etapa. Un conteo enorme se resume como "a number of 115 digits". Acepta el relato como palabras o con `--file`, como `parse` y `count`.
- Sin `--max-length`, con un valor fuera de 0 a 6 o sin gramática, terminan con código 2. `bench` con una etiqueta fuera de Σ rechaza (código 1).

## 4. Consola y pruebas

```sh
npm run sabueso -- bench --grammar g1 --file packages/core/test/fixtures/l1.txt
```

Unos 24 ms en total para 200 eventos: unas 40 veces por debajo del criterio del anteproyecto. Con `--grammar g0`, el mismo relato tarda unas diez veces más.

| Prueba                                                       | Qué verifica                                                                                                                                         |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core/test/differential.test.ts`                    | el corpus de la sección 9.4: G0 y G1 hasta 4, las aritméticas hasta 5, `parentheses` hasta 8, y las de prueba y `meta` hasta 3; 0 discrepancias      |
| `packages/core/test/performance.test.ts`                     | G1 con L1 en menos de 1000 ms con `parse` (criterio del anteproyecto); G0 con L1 en menos de 3000 ms; `benchmark` con un reloj fijo y con un rechazo |
| `packages/core/test/command-line/differential-bench.test.ts` | los dos comandos, sus salidas y los errores de uso                                                                                                   |

## 5. Referencias

Este paso no tiene bibliografía propia. La teoría de cada reconocedor está en sus guías:

- [Guía 14 — Reconocedor de Earley](14-reconocedor-de-earley.md).
- [Guía 20 — Conteo de árboles](20-conteo-de-arboles.md).
- [Guía 25 — CYK](25-cyk.md).
- [Guía 26 — Autómata de pila](26-automata-de-pila.md).
- [Guía 27 — Búsquedas acotadas](27-busquedas-acotadas.md).
