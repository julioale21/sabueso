# 27 — Búsquedas acotadas

> Archivos: `packages/core/src/bounded/generate.ts`, `packages/core/src/bounded/ambiguity.ts`, `packages/core/src/bounded/compare.ts` y los comandos `generate`, `ambiguity` y `compare` (`packages/core/src/command-line/commands/`), con la opción común en `packages/core/src/command-line/max-length.ts`.

## 1. Teoría

- Un problema es **decidible** si hay un algoritmo que siempre termina y responde sí o no. Es **semidecidible** si el algoritmo responde "sí" cuando la respuesta es sí, pero puede no terminar cuando es no.
- Dos problemas sobre GLC son **indecidibles** (Hopcroft 9.5.2 y 9.5.3): **¿G es ambigua?** y **¿L(G) = L(H)?**
- Los dos son semidecidibles "por el lado del sí". La **búsqueda acotada** prueba todas las oraciones hasta un largo k:
  - si encuentra un **testigo** (una oración con dos árboles, o una que está en un lenguaje y no en el otro), la respuesta queda **demostrada**;
  - "nada hasta k" **no demuestra nada**: el testigo podría estar en k + 1.
- La **no** ambigüedad se demuestra por otro camino: ser LL(1) ([guía 12](12-tabla-ll1-y-no-ambiguedad.md)).

### Ejemplo: el testigo de G0

Las oraciones se generan de la más corta a la más larga. Con largo 3 G0 no tiene testigo. El primero de largo 4 es `CRI SOS ATQ REV`, con **2 árboles**: la sospecha abarca el ataque (`Linea → SOS Pasos`) o no (`Pasos → Pasos Pasos`, con `Linea → SOS` sola). Eso demuestra que G0 es ambigua. En cambio, G1 no tiene testigo hasta largo 7, y eso solo no demuestra nada.

## 2. Por qué así

- **Todo sale de generar.** El testigo y la comparación recorren la lista de oraciones de largo ≤ k. Generar desde la gramática es mucho más rápido que probar todas las cadenas sobre Σ: con 14 etiquetas y largo 7 serían 14⁷ ≈ 105 millones de cadenas; G1 tiene 19 986 oraciones de ese largo o menos.
- **Formas sentenciales más a la izquierda, en anchura:** cada oración aparece por un camino ordenado, y la búsqueda es la misma idea que la simulación del autómata de pila ([guía 26](26-automata-de-pila.md)), pero sin entrada.
- **La poda por minYield acota la búsqueda:** se expande siempre el no terminal de más a la izquierda, y una forma cuyo minYield ([guía 08](08-longitud-minima-derivable.md)) ya supera k se descarta (en G1 con k = 3, `Marco Hecho Investigacion Desenlace` necesita 4 etiquetas y se corta). Sin ella, la recursión (`Pasos → Pasos Pasos`) generaría formas para siempre. Solo una recursión que no agrega etiquetas (S → S B con B ⇒ ε) escapa a la poda; para ese caso hay un límite de formas que lanza un error claro.
- **Orden fijo:** de la más corta a la más larga y, a igual largo, en orden alfabético por etiqueta. Así el testigo es siempre el mismo (el spec pide `CRI SOS ATQ REV`) y las listas se pueden comparar en las pruebas.
- **El conteo de árboles ya existía:** el testigo usa Earley y `countTrees` ([guía 14](14-reconocedor-de-earley.md) y [guía 20](20-conteo-de-arboles.md)). No hay que construir árboles para saber si hay más de uno.
- **Los mensajes dicen lo que no se demuestra:** sin testigo, la consola aclara que eso no prueba nada y sugiere `predictive-table`, que sí demuestra la no ambigüedad.
- **`compare g0 g1 --max-length 3`** encuentra `CRI DSC REV` y `HAL DSC REV` solo en G0: eso demuestra L(G0) ≠ L(G1) ([guía 19](19-arboles-de-un-relato.md)).
- La web usa `findAmbiguityWitness` y `compareLanguages` en la pestaña "G0 vs G1".

## 3. El código, función por función

### 3.1 `generateSentences({ grammar, maxLength, maxForms })` (`generate.ts`)

```ts
const minYield = computeMinYield(grammar);
const start = [grammar.start];
const queue: SymbolName[][] = [start];
const visited = new Set([start.join(' ')]);
const sentences = new Map<string, SymbolName[]>();
for (let next = 0; next < queue.length; next++) {
  if (next >= maxForms) {
    throw new Error(`generateSentences explored ${maxForms} forms without finishing: …`);
  }
  const form = queue[next] ?? [];
  const position = form.findIndex((symbol) => grammar.nonterminals.has(symbol));
  if (position === -1) {
    sentences.set(form.join(' '), form);
    continue;
  }
  for (const production of grammar.productionsByLeftSide.get(form[position] ?? '') ?? []) {
    const expanded = [
      ...form.slice(0, position),
      ...production.rightSide,
      ...form.slice(position + 1),
    ];
    const key = expanded.join(' ');
    if (!visited.has(key) && minYieldOfSequence({ symbols: expanded, minYield }) <= maxLength) {
      visited.add(key);
      queue.push(expanded);
    }
  }
}
return [...sentences.values()].sort(compareSentences);
```

- **La cola es un array con un índice**, como en el autómata de pila: BFS sin sacar elementos.
- **`position`:** el primer no terminal de la forma. Si no hay (`-1`), la forma es una oración y se guarda (el `Map` evita repetidas; una oración puede salir de dos árboles).
- **`expanded`:** la forma con ese no terminal reemplazado por el lado derecho de la producción: lo de antes, el lado derecho y lo de después.
- **El filtro:** no vista y con minYield ≤ k (`minYieldOfSequence`, de la guía 08; un terminal cuenta 1, así que las etiquetas ya producidas también cuentan).
- **`maxForms`** (500 000 por defecto): el seguro contra las recursiones que no agregan etiquetas. Es el único error propio del paso: al pasarlo, lanza `generateSentences explored … forms without finishing`. Con las gramáticas del proyecto no ocurre.
- **`sort(compareSentences)`:** por largo y después alfabético.

### 3.2 `compareSentences(first, second)`

```ts
if (first.length !== second.length) {
  return first.length - second.length;
}
const index = first.findIndex((token, position) => token !== second[position]);
if (index === -1) {
  return 0;
}
return (first[index] ?? '') < (second[index] ?? '') ? -1 : 1;
```

Primero el largo; a igual largo, decide la primera etiqueta distinta, comparada como texto (`ATQ` < `INT` < `PIS` < `SOS`). Por eso el testigo de G0 es `CRI SOS ATQ REV` y no `CRI SOS PIS REV`.

### 3.3 `findAmbiguityWitness({ grammar, maxLength })` (`ambiguity.ts`)

```ts
for (const sentence of generateSentences({ grammar, maxLength })) {
  const treeCount = countTrees({ grammar, recognition: recognize({ grammar, tokens: sentence }) });
  if (treeCount === 'infinite' || treeCount > 1n) {
    return { sentence, treeCount };
  }
}
return null;
```

- Recorre las oraciones en orden y cuenta los árboles de cada una, sin construirlos. En G0 con k = 4, las 10 de largo 3 tienen un árbol; la primera de largo 4 con dos es el testigo.
- **Infinitos** también es ambigüedad (un ciclo, como en `test-cyclic`).
- Devuelve el `AmbiguityWitness` del spec, `{ sentence, treeCount }`, o `null`.

### 3.4 `compareLanguages({ first, second, maxLength })` (`compare.ts`)

```ts
const firstSentences = generateSentences({ grammar: first, maxLength });
const secondSentences = generateSentences({ grammar: second, maxLength });
return {
  onlyInFirst: missingFrom({ sentences: firstSentences, others: secondSentences }),
  onlyInSecond: missingFrom({ sentences: secondSentences, others: firstSentences }),
  maxLength,
};
```

`missingFrom` arma un conjunto con las oraciones de la otra lista (como texto, `'CRI DSC REV'`) y se queda con las que no están. Devuelve el `LanguageComparison` del spec.

### 3.5 Los comandos

- **`--max-length k`** (`command-line/max-length.ts`): obligatoria, un entero de 0 a 12. El tope existe porque la cantidad de oraciones crece exponencialmente con k (G0 ya tiene 34 420 de largo ≤ 7).
- **`generate`:** la cantidad y una oración por línea.
- **`ambiguity`:** `WITNESS: CRI SOS ATQ REV has 2 trees, so the grammar is ambiguous` y los dos primeros árboles (con `parseTrees`). Sin testigo: "No witness up to length k", la aclaración de que no demuestra nada y la sugerencia de `predictive-table`.
- **`compare g0 g1`:** las dos listas ("Only in …") y la conclusión: `So L(g0) ≠ L(g1)` si hay diferencia, o que no demuestra nada si no la hay. Recibe dos nombres de gramáticas incluidas (`builtInGrammarSource`, nueva en `grammar-source.ts`).
- Sin `--max-length`, con un valor que no es un entero de 0 a 12, con un nombre de gramática desconocido o con argumentos de más, terminan con código 2.

## 4. Consola y pruebas

```sh
npm run sabueso -- ambiguity --grammar g0 --max-length 4
```

Imprime `WITNESS: CRI SOS ATQ REV has 2 trees, so the grammar is ambiguous` y sus dos árboles. Otros comandos: `generate --grammar g1 --max-length 3` (las 8 oraciones), `ambiguity --grammar g1 --max-length 7` (sin testigo) y `compare g0 g1 --max-length 3`.

**`packages/core/test/bounded/bounded.test.ts`:**

| Prueba                | Qué verifica                                                                                         |
| --------------------- | ---------------------------------------------------------------------------------------------------- |
| generar a mano        | G1 hasta 3 (8 oraciones); `parentheses` hasta 4 (ε, `( )`, `( ( ) )`, `( ) ( )`)                     |
| generar contra Earley | lo generado es exactamente lo que Earley acepta: las de libro, G0 y G1, probando todas las cadenas   |
| el límite             | S → S B, B → ε lanza el error                                                                        |
| B1, B2 y B3           | sin testigo en G0 hasta 3; `CRI SOS ATQ REV` con 2 árboles hasta 4; sin testigo en G1 hasta 7        |
| otros testigos        | `id * id * id` en `arithmetic-ambiguous`; infinitos árboles en `test-cyclic`                         |
| B4 y más              | G0 contra G1 hasta 3; hasta 4, G1 sigue sin oraciones propias; las dos aritméticas coinciden hasta 5 |

**`packages/core/test/command-line/bounded.test.ts`:** los tres comandos, los mensajes "no demuestra nada" y los errores de uso.

## 5. Referencias

- Hopcroft, Motwani y Ullman, _Introducción a la teoría de autómatas, lenguajes y computación_, secciones 9.5.2 (la ambigüedad es indecidible) y 9.5.3 (otros problemas indecidibles sobre GLC), y 9.2 (lenguajes recursivamente enumerables: semidecisión).
- Hopcroft, Motwani y Ullman, misma obra, secciones 5.1 (gramáticas y derivaciones, de donde sale la generación de oraciones por derivaciones más a la izquierda) y 7.4.3 (vacuidad de una GLC, la misma idea de "producir algo" que usa la poda por longitud mínima).
