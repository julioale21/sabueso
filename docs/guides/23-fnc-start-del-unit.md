# 23 — FNC: START, DEL y UNIT

> Archivos: `packages/core/src/chomsky-normal-form/add-new-start.ts`, `packages/core/src/chomsky-normal-form/remove-epsilon-productions.ts`, `packages/core/src/chomsky-normal-form/remove-unit-productions.ts`, `packages/core/src/chomsky-normal-form/rewrite.ts` y el comando `packages/core/src/command-line/commands/chomsky-normal-form.ts`.

## 1. Teoría

Una gramática está en **Forma Normal de Chomsky (FNC)** si toda producción es **A → B C** (dos no terminales) o **A → a** (un terminal). Solo el inicial S puede tener **S → ε**, y únicamente si S no aparece en ningún lado derecho. Toda GLC se puede pasar a FNC sin cambiar su lenguaje, con seis pasos:

| #   | Paso    | Qué hace                                                                                                  |
| --- | ------- | --------------------------------------------------------------------------------------------------------- |
| 1   | START   | Si el inicial aparece a la derecha, agrega un inicial nuevo S0 con S0 → S.                                |
| 2   | DEL     | Borra las producciones ε: cada A → α se reemplaza por sus versiones sin algunos anulables.                |
| 3   | UNIT    | Borra las unitarias A → B: si A llega a B solo con unitarias, A copia las producciones no unitarias de B. |
| 4   | USELESS | Borra los símbolos inútiles ([guía 09](09-simbolos-inutiles-y-vacuidad.md)).                              |
| 5   | TERM    | En los lados de largo ≥ 2, cambia cada terminal a por un T_a nuevo, con T_a → a.                          |
| 6   | BIN     | Parte cada lado de largo ≥ 3 en una cadena de producciones de largo 2 (X1, X2, …).                        |

- **El orden importa:** DEL crea unitarias nuevas (`Planteo → Hecho MarcoOpc` da `Planteo → Hecho`), así que UNIT va después.
- **Pares unitarios:** (A, B) es un par si A llega a B usando solo unitarias. Se calculan como los anulables: se empieza con (A, A) y, si (A, B) es par y B → C es unitaria, (A, C) también.

Esta guía explica START, DEL y UNIT; la [guía 24](24-fnc-useless-term-bin.md), los otros tres.

### Ejemplo resuelto a mano: `parentheses`

S → ( S ) S | ε. Su lenguaje contiene ε.

| Paso  | Producciones                                                            | Qué cambió                                    |
| ----- | ----------------------------------------------------------------------- | --------------------------------------------- |
| START | S0 → S · S → ( S ) S · S → ε                                            | + S0 → S (S aparece a la derecha)             |
| DEL   | S0 → S · S0 → ε · S → ( S ) S · S → ( S ) · S → ( ) S · S → ( )         | ( S ) S da 4 versiones; − S → ε; queda S0 → ε |
| UNIT  | S0 → ε · S0 → ( S ) S · S0 → ( S ) · S0 → ( ) S · S0 → ( ) · las 4 de S | − S0 → S; S0 copia las 4 producciones de S    |

S0 → ε queda porque ε está en el lenguaje, y S0 no aparece a la derecha de nada. Con USELESS, TERM y BIN termina en 19 producciones en FNC.

## 2. Por qué así

- **Para qué la FNC:** CYK ([guía 25](25-cyk.md)) solo funciona con gramáticas en FNC. Sirve para la comparación con Earley (los árboles de la FNC no tienen la forma de la gramática diseñada) y para la validación cruzada de la [guía 28](28-pruebas-diferenciales-y-rendimiento.md) (Earley sobre G contra CYK sobre FNC(G)).
- **Una función por paso:** cada una recibe una gramática y devuelve otra con el mismo lenguaje. Se pueden mostrar, probar y explicar por separado, y el comando imprime la gramática después de cada una.
- **START solo cuando hace falta:** Sipser agrega S0 siempre; acá se agrega solo si el inicial aparece a la derecha. Así G1 conserva `Relato` como inicial y no suma una producción que UNIT y USELESS borrarían después.
- **S → ε conservado en DEL:** la alternativa, borrar todas las ε y agregar S → ε al final, da el mismo resultado con un paso extra fuera de la lista de seis.
- **N no se recalcula:** `buildGrammar` deduce N de los lados izquierdos. Después de DEL, `A` en `epsilon-trap` (A → ε) se queda sin producciones pero sigue en `S → A A x`. Con `buildGrammar` pasaría a ser un **terminal**, y la gramática aceptaría la cadena `A A x`. Por eso los pasos usan `rewriteGrammar`, que conserva N; USELESS lo borra después, porque A no es productivo.
- **Se reutiliza el análisis:** DEL usa los anulables de la guía 07, y los pares unitarios usan el mismo `repeatRuleUntilNoChange`.

## 3. El código, función por función

Una gramática es un objeto `Grammar` (`packages/core/src/grammar/types.ts`) con `start`, `nonterminals` (N), `terminals` (Σ) y `productions` (P, una lista de `{ id, leftSide, rightSide }`). Una producción ε es una con `rightSide` vacío (`[]`).

Los tres pasos siguen el mismo esquema: reciben un `Grammar`, arman una lista nueva de producciones con `map`, `flatMap` y `filter`, y llaman a `rewriteGrammar`. Ninguno modifica el `Grammar` que recibe. Por eso el comando puede encadenarlos (`removeUnitProductions(removeEpsilonProductions(addNewStart(g)))`) y mostrar el antes y el después de cada uno.

### 3.1 `addNewStart(grammar)` (`add-new-start.ts`)

```ts
export const NEW_START = 'S0';

export function addNewStart(grammar: Grammar): Grammar {
  if (!appearsOnSomeRightSide({ grammar, symbol: grammar.start })) {
    return grammar;
  }
  const newStart = freshSymbol({ grammar, name: NEW_START });
  return rewriteGrammar({
    grammar,
    start: newStart,
    newNonterminals: [newStart],
    productions: [{ leftSide: newStart, rightSide: [grammar.start] }, ...grammar.productions],
  });
}

export function appearsOnSomeRightSide({
  grammar,
  symbol,
}: {
  grammar: Grammar;
  symbol: string;
}): boolean {
  return grammar.productions.some((production) => production.rightSide.includes(symbol));
}
```

- **`appearsOnSomeRightSide`** pregunta si alguna producción tiene al inicial en su lado derecho. `some` corta en la primera. Con G1 (`Relato`) da `false`; con `parentheses` (`S → ( S ) S`) da `true`.
- **`return grammar`:** si no hace falta S0, devuelve **el mismo objeto**. El comando lo detecta (`after === before`) e imprime `Nothing to do: …`.
- **`freshSymbol({ grammar, name: NEW_START })`** quiere llamarlo `S0`; si ya existe, prueba `S0'`, `S0''`, hasta encontrar uno libre.
- **`rewriteGrammar`** arma G' con tres datos:
  - `start: newStart`: el inicial de G' es `S0`;
  - `newNonterminals: [newStart]`: `S0` se agrega a N;
  - `productions`: `S0 → S` primero (solo por legibilidad: al imprimir se ve primero la puerta de entrada) y después todas las de G, sin cambios.

### 3.2 `removeEpsilonProductions(grammar)` (`remove-epsilon-productions.ts`)

```ts
export function removeEpsilonProductions(grammar: Grammar): Grammar {
  const nullableSymbols = computeNullable(grammar);
  const productions = grammar.productions.flatMap((production) =>
    withoutNullableSymbols({ rightSide: production.rightSide, nullableSymbols }).map(
      (rightSide) => ({
        leftSide: production.leftSide,
        rightSide,
      }),
    ),
  );
  return rewriteGrammar({
    grammar,
    productions: productions.filter((production) => keepsProduction({ production, grammar })),
  });
}
```

- **`computeNullable(grammar)`:** los anulables (guía 07).
- **`flatMap`:** cada producción se convierte en la lista de sus versiones (`withoutNullableSymbols`), y `.map` les vuelve a poner el mismo lado izquierdo. `flatMap` junta todo en una sola lista.
- **`filter(keepsProduction)`:** saca las versiones vacías, salvo la del inicial.
- **`rewriteGrammar`:** no cambia el inicial ni N; solo las producciones, y quita las repetidas.

**`withoutNullableSymbols({ rightSide, nullableSymbols })`** arma las versiones:

```ts
let versions: SymbolName[][] = [[]];
for (const symbol of rightSide) {
  versions = versions.flatMap((version) =>
    nullableSymbols.has(symbol) ? [[...version, symbol], version] : [[...version, symbol]],
  );
}
return versions;
```

- Empieza con una sola versión vacía y recorre el lado derecho de izquierda a derecha.
- Si el símbolo **no** es anulable, se agrega al final de todas las versiones.
- Si **es** anulable, cada versión se duplica: una con el símbolo y otra sin él.

Con `( S ) S`, donde solo S es anulable:

| Símbolo leído | Versiones                             |
| ------------- | ------------------------------------- |
| (inicio)      | `[]`                                  |
| `(`           | `(`                                   |
| `S`           | `( S` · `(`                           |
| `)`           | `( S )` · `( )`                       |
| `S`           | `( S ) S` · `( S )` · `( ) S` · `( )` |

Las versiones salen en el orden de contar en binario, y la original siempre es la primera.

**`keepsProduction({ production, grammar })`:**

```ts
return production.rightSide.length > 0 || production.leftSide === grammar.start;
```

Se queda con la producción si no es vacía **o** si es del inicial. Solo aparece una versión vacía del inicial cuando es anulable, es decir, cuando ε ∈ L(G): en G1 nunca; en `parentheses`, sí (`S0 → ε`).

### 3.3 `computeUnitPairs(grammar)` (`remove-unit-productions.ts`)

```ts
const unitPairs = new Map<SymbolName, Set<SymbolName>>();
for (const nonterminal of grammar.nonterminals) {
  const rounds = repeatRuleUntilNoChange({
    start: [nonterminal],
    newSymbolsOfRound: (reachedSymbols) => unitTargets({ grammar, reachedSymbols }),
  });
  unitPairs.set(nonterminal, lastRound(rounds));
}
return unitPairs;
```

La regla de cada ronda, `unitTargets({ grammar, reachedSymbols })`:

```ts
return grammar.productions
  .filter(
    (production) => reachedSymbols.has(production.leftSide) && isUnit({ production, grammar }),
  )
  .map((production) => production.rightSide[0] ?? '');
```

Devuelve un `Map` que a cada A le asocia sus pares unitarios. Para cada A corre el menor punto fijo de los pares unitarios (sección 1):

- **Empieza con `{A}`:** la base (A, A).
- **Cada ronda:** `unitTargets` mira las unitarias `B → C` cuyo B ya está en el conjunto y agrega los C (`rightSide[0]`, el único símbolo). Es la regla de inducción.
- **`lastRound(rounds)`:** `repeatRuleUntilNoChange` devuelve todas las rondas; los pares son la última.
- **Termina** porque el conjunto solo crece y no puede pasar de |N| símbolos.

Ejemplo con Investigacion, en G1 después de DEL:

| Ronda | Unitarias que se usan                | Conjunto                                 |
| ----- | ------------------------------------ | ---------------------------------------- |
| 0     | —                                    | {Investigacion}                          |
| 1     | `Investigacion → Pasos`              | {Investigacion, Pasos}                   |
| 2     | `Pasos → Evidencia`, `Pasos → Linea` | {Investigacion, Pasos, Evidencia, Linea} |
| 3     | ninguna nueva                        | igual: punto fijo                        |

**Supone que DEL ya corrió.** Con producciones ε, A también podría renombrarse a B a través de `A → B C` con C anulable, y no se detectaría. Después de DEL, ese caso ya es la unitaria `A → B`.

### 3.4 `removeUnitProductions(grammar)`

```ts
const unitPairs = computeUnitPairs(grammar);
const productions = [...grammar.nonterminals].flatMap((nonterminal) =>
  [...(unitPairs.get(nonterminal) ?? [])].flatMap((target) =>
    (grammar.productionsByLeftSide.get(target) ?? [])
      .filter((production) => !isUnit({ production, grammar }))
      .map((production) => ({ leftSide: nonterminal, rightSide: production.rightSide })),
  ),
);
return rewriteGrammar({ grammar, productions });
```

Tres bucles anidados, escritos con `flatMap`:

1. para cada no terminal A…
2. …para cada B de sus pares unitarios (A incluido)…
3. …para cada producción **no** unitaria `B → α`, agrega `A → α`.

Como el par (A, A) siempre está, A conserva sus propias producciones no unitarias. Las unitarias no se copian nunca: así desaparecen. Si dos B le dan a A la misma producción, `rewriteGrammar` deja una sola.

**`isUnit({ production, grammar })`:** el lado derecho tiene exactamente un símbolo y es un no terminal. `Investigacion → Pasos` es unitaria; `Evidencia → PIS` no (PIS es terminal).

### 3.5 `rewriteGrammar({ grammar, productions, start, newNonterminals })` (`rewrite.ts`)

Arma G' a partir de G. Recibe `grammar` y `productions` (obligatorios), y `start` y `newNonterminals` (opcionales). Devuelve:

- **N:** los nuevos (S0) más los de G. **No se recalcula** (sección 2).
- **Σ:** el mismo de G. Ningún paso de la FNC agrega terminales.
- **P:** las producciones numeradas desde 0, sin repetidas (`uniqueProductions`). En `epsilon-trap`, `S → A A x` da `A x` dos veces (borrando una A o la otra): queda una sola.
- **`productionsByLeftSide`:** las producciones agrupadas por lado izquierdo (con `groupByLeftSide` de `grammar/productions.ts`), con una lista, quizás vacía, para cada no terminal.

Ayudas: **`productionKey(production)`** (de `grammar/productions.ts`) identifica una producción por sus símbolos, sin importar su número; sirve para detectar repetidas y para que el comando compare dos gramáticas. **`freshSymbol({ grammar, name })`** devuelve `name` si no está en N ni en Σ; si no, le agrega primas.

### 3.6 El comando `chomsky-normal-form`

- Aplica los pasos uno tras otro, con la lista `CHOMSKY_NORMAL_FORM_STEPS` del núcleo ([guía 24](24-fnc-useless-term-bin.md)). Las descripciones de la consola están en `STEP_DESCRIPTIONS`.
- `--until` dice en qué paso parar (también en minúsculas). Por defecto corre todos.
- Por cada paso imprime el título, las producciones **agregadas** (`+`) y **quitadas** (`-`), comparadas por símbolos con `productionKey` (los números cambian de un paso a otro), y la gramática resultante con `formatGrammar`.
- Las funciones no lanzan errores. El comando termina con código 2 sin `--grammar`, con argumentos de más o con un `--until` inválido.

## 4. Consola y pruebas

```sh
npm run sabueso -- chomsky-normal-form --grammar g1 --until UNIT
```

| Paso  | Agrega | Quita | Producciones | Ejemplos                                                                 |
| ----- | ------ | ----- | ------------ | ------------------------------------------------------------------------ |
| START | 0      | 0     | 40           | nada: `Relato` no aparece a la derecha                                   |
| DEL   | 16     | 10    | 46           | − MarcoOpc → ε; + Planteo → Hecho; + Linea → SOS                         |
| UNIT  | 33     | 10    | 69           | − Investigacion → Pasos; + Investigacion → PIS; + Desenlace → REV Cierre |

ε ∉ L(G1), así que después de DEL no queda ninguna producción ε. Después de UNIT, `Descarte` ya no es alcanzable: solo aparecía en `CuerpoLinea → Descarte`, una unitaria que UNIT borró. Lo borra USELESS (guía 24).

**`packages/core/test/chomsky-normal-form/start-del-unit.test.ts`:**

| Prueba                  | Qué verifica                                                                                                                             |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| START                   | S0 → S primera en `parentheses`; G1, G0 y `epsilon-trap` quedan iguales; `S0'` si ya existe S0                                           |
| DEL a mano              | `parentheses` y `epsilon-trap` producción por producción; A queda en N sin producciones                                                  |
| DEL en G1               | ninguna producción ε                                                                                                                     |
| pares unitarios         | `parentheses` y el ciclo de `test-cyclic`                                                                                                |
| UNIT a mano             | `parentheses` (9 producciones) y `test-cyclic` (el ciclo desaparece)                                                                     |
| ningún unitario         | G0, G1 y las de libro                                                                                                                    |
| el lenguaje se preserva | las oraciones de G1 de largo ≤ 4 se aceptan después de cada paso; G0 y G1 aceptan y rechazan lo mismo hasta largo 3; las de libro, con ε |

**`packages/core/test/command-line/chomsky-normal-form.test.ts`:** los pasos de G1 con sus conteos (40, 46, 69, hasta las 78 y el veredicto FNC ✓), `--until DEL`, S0 → ε en `parentheses` y los errores de uso.

## 5. Referencias

- Hopcroft, Motwani y Ullman, _Introducción a la teoría de autómatas, lenguajes y computación_, secciones 7.1.1 y 7.1.2 (símbolos inútiles), 7.1.3 (producciones ε), 7.1.4 (producciones unitarias) y 7.1.5 (Forma Normal de Chomsky).
- Sipser, M., _Introducción a la teoría de la computación_, sección 2.1 (Teorema 2.9: la FNC con el inicial nuevo S0).
- Augusto, sección 2.4.3.
