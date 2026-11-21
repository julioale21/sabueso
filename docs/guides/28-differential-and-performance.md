# Guía de estudio: 28 — Pruebas diferenciales y de rendimiento

> **Paso 28 del SPEC 02.** Archivos: `packages/core/src/differential/differential.ts`, `packages/core/src/performance/benchmark.ts`, los comandos `differential` y `bench` (`packages/core/src/command-line/commands/`) y las pruebas `packages/core/test/differential.test.ts` y `performance.test.ts`.
> Fichas teóricas relacionadas: [`docs/concepts/23-cocke-younger-kasami.md`](../concepts/23-cocke-younger-kasami.md) y [`docs/concepts/19-tree-count-catalan.md`](../concepts/19-tree-count-catalan.md).

---

## 1. El problema que resuelve

Este paso no agrega una función al analizador: genera **evidencia** de dos cosas.

- **Que el núcleo es correcto.** Las pruebas de cada paso usan valores calculados a mano, pero son unos pocos casos. Acá se toman **todas** las cadenas posibles hasta un largo y se verifica que los tres reconocedores (Earley sobre G, CYK sobre la FNC de G y el autómata de pila de G) acepten exactamente las mismas. Como están construidos de maneras muy distintas, es muy difícil que los tres fallen igual: un error en cualquiera aparece como una **discrepancia**.
- **Que el núcleo es rápido.** El anteproyecto pide que un relato largo se analice en menos de un segundo. Se mide con L1, un relato de 200 eventos.

---

## 2. Por qué así

- **Corpus exhaustivo, no al azar:** todas las cadenas sobre Σ hasta un largo. Así no depende de la suerte, y los casos borde (la cadena vacía, cadenas casi correctas) siempre están. Con 14 etiquetas y largo 4 son 41 371 cadenas, y las tres corridas tardan alrededor de un segundo.
- **Se compara la aceptación, no los árboles:** la FNC cambia los árboles (paso 25), así que la cantidad de árboles de CYK no se puede comparar con la de Earley. Lo que tiene que coincidir es "sí o no".
- **`undetermined` también es una discrepancia:** el autómata de pila tiene un límite de pasos; si lo alcanzara con alguna cadena del corpus, la prueba fallaría. No pasa.
- **La FNC se calcula una sola vez** por gramática, antes de recorrer el corpus.
- **El reloj se puede inyectar:** `benchmark` recibe `clock` (por defecto `performance.now()`), así la prueba de la función verifica la estructura con tiempos fijos, y solo las pruebas de rendimiento miden de verdad.
- **El conteo se mide aparte:** en G0, contar los árboles de L1 cuesta tanto como reconocerla, porque hay que sumar y multiplicar números enormes (`bigint`).

---

## 3. Cómo se usa en el programa

| Quién                       | Llama a                                                                               | Recibe                                                 |
| --------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| comando `differential`      | `runDifferential`                                                                     | cuántas cadenas, cuántas oraciones y las discrepancias |
| `runDifferential`           | `allStrings`, `recognize`, `recognizeCockeYoungerKasami`, `simulatePushdownAutomaton` | las tres respuestas de cada cadena                     |
| comando `bench`             | `benchmark`                                                                           | el tiempo de cada etapa                                |
| `test/differential.test.ts` | `runDifferential`                                                                     | 0 discrepancias en el corpus de la sección 9.4         |
| `test/performance.test.ts`  | `parse` y `benchmark`                                                                 | los tiempos de la sección 9.5                          |
| pruebas de pasos anteriores | `allStrings` (como `stringsUpTo`)                                                     | las cadenas para comparar lenguajes                    |

---

## 4. Cómo funciona

**La prueba diferencial**, para cada cadena del corpus:

1. Earley sobre G: ¿acepta?
2. CYK sobre la FNC de G: ¿acepta?
3. El autómata de pila de G: ¿`accept`, `reject` o `undetermined`?
4. Si CYK no coincide con Earley, o el autómata no da `accept` cuando Earley acepta y `reject` cuando no, se anota una discrepancia.

| Gramática                 | Corpus                      | Cadenas | Oraciones | Discrepancias |
| ------------------------- | --------------------------- | ------- | --------- | ------------- |
| G1                        | 14 etiquetas, largo ≤ 4     | 41 371  | 110       | 0             |
| G0                        | 14 etiquetas, largo ≤ 4     | 41 371  | 145       | 0             |
| `arithmetic` y la ambigua | {id, +, *, (, )}, largo ≤ 5 | 3 906   | —         | 0             |
| `parentheses`             | {(, )}, largo ≤ 8           | 511     | —         | 0             |

**El rendimiento**, con L1 (`CRI`, 198 `PIS` y `REV`):

| Gramática | Reconocer              | Primer árbol | Derivación | Contar                             | Total       | Criterio  |
| --------- | ---------------------- | ------------ | ---------- | ---------------------------------- | ----------- | --------- |
| G1        | ~17 ms (22 709 ítems)  | ~3 ms        | ~3 ms      | ~0,5 ms (1 árbol)                  | **~24 ms**  | < 1000 ms |
| G0        | ~140 ms (43 006 ítems) | ~2 ms        | ~2 ms      | ~100 ms (un número de 115 dígitos) | **~245 ms** | < 3000 ms |

Los tiempos varían de una máquina a otra; los criterios dejan mucho margen. G0 tiene casi el doble de ítems porque `Pasos → Pasos Pasos` puede partir los 198 pasos de muchísimas maneras, y el conteo tiene que sumarlas todas.

---

## 5. El código, función por función

### 5.1 `allStrings({ alphabet, maxLength })`

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

### 5.2 `runDifferential({ grammar, maxLength, alphabet })`

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

### 5.3 `benchmark({ grammar, tokens, clock })`

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

### 5.4 Los comandos

- **`differential --grammar g1 --max-length 4`:** cantidad de cadenas, de oraciones y de discrepancias, y "The three recognizers agree on every string." `--max-length` va de 0 a 6, porque la cantidad crece como 14^k. Termina con código 1 si hay alguna discrepancia.
- **`bench --grammar g0 --file packages/core/test/fixtures/l1.txt`:** una tabla con el tiempo y el resultado de cada etapa. Un conteo enorme se resume como "a number of 115 digits". Acepta el relato como palabras o con `--file`, como `parse` y `count`.

---

## 6. Ejemplo recorrido a mano

```sh
npm run sabueso -- differential --grammar g1 --max-length 3
```

Hasta largo 3 hay 1 + 14 + 14² + 14³ = 2 955 cadenas. Earley acepta 8 (las que genera el paso 27: 2 hechos × 4 pasos × `REV`). CYK y el autómata de pila aceptan esas mismas 8 y rechazan las otras 2 947: 0 discrepancias.

```sh
npm run sabueso -- bench --grammar g1 --file packages/core/test/fixtures/l1.txt
```

24 ms en total para 200 eventos: unas 40 veces por debajo del criterio del anteproyecto. Con G0, el mismo relato tarda unas diez veces más, y casi la mitad es el conteo: el precio de la ambigüedad.

---

## 7. Errores

- `runDifferential` y `benchmark` no lanzan errores.
- **Comandos:** `differential` sin `--max-length`, con un valor fuera de 0 a 6 o sin gramática, y `bench` sin gramática, terminan con código 2. `bench` con una etiqueta fuera de Σ rechaza (código 1).

---

## 8. Consola y pruebas

```sh
npm run sabueso -- differential --grammar g1 --max-length 4
npm run sabueso -- differential --grammar g0 --max-length 4
npm run sabueso -- bench --grammar g1 --file packages/core/test/fixtures/l1.txt
npm run sabueso -- bench --grammar g0 --file packages/core/test/fixtures/l1.txt
```

| Prueba                                         | Qué verifica                                                                                                                                         |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `test/differential.test.ts`                    | el corpus de la sección 9.4: G0 y G1 hasta 4, las aritméticas hasta 5, `parentheses` hasta 8, y las de prueba y `meta` hasta 3; 0 discrepancias      |
| `test/performance.test.ts`                     | G1 con L1 en menos de 1000 ms con `parse` (criterio del anteproyecto); G0 con L1 en menos de 3000 ms; `benchmark` con un reloj fijo y con un rechazo |
| `test/command-line/differential-bench.test.ts` | los dos comandos, sus salidas y los errores de uso                                                                                                   |

---

## 9. Preguntas probables en la defensa

**¿Qué es una prueba diferencial?**
Comparar varias implementaciones de lo mismo sobre muchas entradas. Si dos implementaciones independientes coinciden siempre, es muy improbable que las dos tengan el mismo error. Acá son tres: Earley, CYK y el autómata de pila.

**¿Por qué todas las cadenas y no una muestra al azar?**
Para no depender de la suerte. Con todas las cadenas hasta largo 4 están todos los casos borde: la cadena vacía, cadenas a las que les falta un evento, cadenas con un evento de más.

**¿Por qué no comparas la cantidad de árboles?**
Porque la FNC cambia los árboles: agrega no terminales y quita los unitarios. CYK y Earley trabajan sobre gramáticas distintas con el mismo lenguaje; lo único que tiene que coincidir es si la cadena pertenece.

**¿Cumple el criterio de rendimiento del anteproyecto?**
Sí. G1 analiza L1 (200 eventos) en unos 24 ms, con el criterio en 1000 ms. G0, en unos 245 ms, con el criterio en 3000 ms; la mitad es contar un número de 115 dígitos de árboles.

**¿Por qué G0 es más lenta que G1?**
Por la ambigüedad: `Pasos → Pasos Pasos` puede agrupar los 198 pasos de muchísimas maneras. Earley guarda todas en el chart (casi el doble de ítems) y el conteo tiene que sumarlas. G1, al no ser ambigua, tiene una sola forma de leer cada relato.
