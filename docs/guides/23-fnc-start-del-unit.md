# Guía de estudio: 23 — FNC: START, DEL y UNIT

> **Paso 23 del SPEC 02.** Archivos: `packages/core/src/chomsky-normal-form/add-new-start.ts`, `remove-epsilon-productions.ts`, `remove-unit-productions.ts`, `rewrite.ts` y el comando `packages/core/src/command-line/commands/chomsky-normal-form.ts`.
> Ficha teórica relacionada: [`docs/concepts/22-chomsky-normal-form.md`](../concepts/22-chomsky-normal-form.md) (primera parte).

---

## 1. El problema que resuelve

Hasta el paso 22, el motor reconoce con Earley **cualquier** GLC tal como la escribió el autor. CYK (paso 25), en cambio, solo funciona con gramáticas en **Forma Normal de Chomsky**: cada producción es A → BC o A → a. Para tener CYK hay que convertir G0, G1 y las gramáticas de libro a FNC sin cambiar su lenguaje.

CYK sirve en el proyecto para dos cosas:

- **la comparación del anteproyecto:** mostrar con un ejemplo concreto que los árboles de la FNC no tienen la forma de la gramática diseñada. Por eso se eligió Earley;
- **la validación cruzada:** las pruebas diferenciales (paso 28) comparan Earley sobre G con CYK sobre FNC(G).

La conversión tiene seis pasos. Este paso implementa los tres primeros, los que **limpian** la gramática: START, DEL y UNIT. Los otros tres (USELESS, TERM y BIN, paso 24) le dan la **forma** final.

---

## 2. Por qué así

- **Una función por paso:** cada una recibe una gramática y devuelve otra con el mismo lenguaje. Se pueden mostrar, probar y explicar por separado, y el comando imprime la gramática después de cada una.
- **El orden de Hopcroft 7.1:** DEL antes que UNIT, porque DEL **crea** producciones unitarias nuevas (`Planteo → Hecho MarcoOpc` da `Planteo → Hecho`). Si UNIT fuera primero, quedarían unitarias.
- **START primero, y solo cuando hace falta:** la FNC permite S → ε para el inicial cuando ε ∈ L(G), siempre que el inicial no aparezca en ningún lado derecho. Sipser agrega S0 siempre; acá se agrega solo si el inicial aparece a la derecha, porque si no, el inicial ya cumple esa condición. Así G1 conserva `Relato` como inicial y no suma una producción que UNIT y USELESS borrarían después.
- **S → ε conservado en DEL:** después de START el inicial no aparece a la derecha, así que alcanza con no borrar su producción ε. La alternativa, borrar todas las ε y agregar S → ε al final, da el mismo resultado con un paso extra fuera de la lista de seis.
- **N no se recalcula:** `buildGrammar` deduce N de los lados izquierdos. Después de DEL, `A` en `epsilon-trap` (A → ε) se queda sin producciones pero sigue en `S → A A x`. Con `buildGrammar` pasaría a ser un **terminal**, y la gramática cambiaría de lenguaje. Por eso los pasos usan `rewriteGrammar`, que conserva N; el paso USELESS lo borra después, porque A no es productivo.
- **Se reutiliza el análisis:** DEL usa los anulables del paso 7, y los pares unitarios usan el mismo `repeatRuleUntilNoChange`.

---

## 3. Cómo se usa en el programa

| Quién                                     | Llama a                                                  | Recibe                            |
| ----------------------------------------- | -------------------------------------------------------- | --------------------------------- |
| comando `chomsky-normal-form`             | `CHOMSKY_NORMAL_FORM_STEPS` (los seis, desde el paso 24) | la gramática después de cada paso |
| `toChomskyNormalForm` (paso 24)           | los mismos tres, y después USELESS, TERM y BIN           | la FNC y los 6 pasos              |
| CYK y las pruebas diferenciales (25 y 28) | `toChomskyNormalForm`                                    | la gramática en FNC               |
| web (SPEC 03)                             | la API pública                                           | el panel "FNC paso a paso"        |

---

## 4. Cómo funciona

Antes del código, la idea de cada paso en palabras, con un ejemplo chico.

### 4.1 START: un símbolo inicial nuevo, si hace falta

**Qué hace:** primero mira si el inicial S aparece en algún lado derecho.

- **Si aparece** (como en `parentheses`), inventa un no terminal nuevo, `S0`, lo convierte en el símbolo inicial y agrega una sola producción: `S0 → S`. No borra ni cambia nada más.
- **Si no aparece** (como en G1), no hace nada: devuelve la misma gramática.

**Ejemplo con `parentheses`:**

| Antes de START | Después de START |
| -------------- | ---------------- |
|                | `S0 → S` (nueva) |
| `S → ( S ) S`  | `S → ( S ) S`    |
| `S → ε`        | `S → ε`          |
| inicial: **S** | inicial: **S0**  |

**Por qué no cambia el lenguaje:** toda derivación de la gramática nueva empieza con `S0 ⇒ S`, y desde ahí sigue exactamente como antes. Es como agregar una puerta de entrada delante de la que ya había.

**Para qué sirve, si no cambia nada:** en `parentheses`, S aparece **adentro** de sus propias producciones (`( S ) S`). Si quisiéramos dejar `S → ε` para aceptar la cadena vacía, esa ε también se podría usar adentro de `( S ) S`, y las producciones no estarían en FNC. Con START, el inicial pasa a ser S0, que **no aparece a la derecha de ninguna producción**. Entonces `S0 → ε` solo puede usarse para derivar la cadena vacía completa, nunca dentro de otra producción. Por eso la FNC permite justamente la ε del inicial y ninguna otra.

**Cuándo no hace falta:** si el inicial ya no aparece a la derecha de nada, ya cumple lo que S0 garantiza. Es el caso de G1: `Relato` solo aparece a la izquierda (`Relato → Planteo Investigacion Desenlace`). Por eso, con G1, START no hace nada y el inicial sigue siendo `Relato`. Lo mismo pasa con G0 y con `epsilon-trap`.

### 4.2 DEL: borrar las producciones ε

**Qué hace:** elimina las producciones `A → ε` sin perder ninguna oración.

**La idea:** si un símbolo B es anulable (puede desaparecer), en cada producción donde aparece hay dos posibilidades: usarlo o que desaparezca. DEL escribe las dos versiones de antemano. Después ya no hace falta `B → ε`.

1. Se calculan los anulables (paso 7).
2. Cada producción `A → X1…Xk` se reemplaza por todas las versiones que borran algunos de sus Xi anulables. Con m anulables hay 2^m versiones.
3. Se descartan las versiones vacías (las `A → ε`), salvo la del símbolo inicial (`S0 → ε` en `parentheses`).

**Ejemplo con G1:** `MarcoOpc` es anulable (`MarcoOpc → ε`).

| Antes de DEL               | Después de DEL                                 |
| -------------------------- | ---------------------------------------------- |
| `Planteo → Hecho MarcoOpc` | `Planteo → Hecho MarcoOpc` y `Planteo → Hecho` |
| `MarcoOpc → ε`             | (borrada)                                      |

El relato `CRI PIS REV`, que antes usaba `MarcoOpc → ε`, ahora usa directamente `Planteo → Hecho`.

**Por qué no cambia el lenguaje:** en una derivación de G, cada anulable que termina en ε se "borra" de antemano eligiendo la versión que no lo tiene. Lo único que se pierde es la cadena vacía misma, y la ε del inicial la recupera si estaba en el lenguaje.

### 4.3 UNIT: borrar las producciones unitarias

**Qué es una producción unitaria:** una que solo cambia un no terminal por otro, sin producir nada: `Investigacion → Pasos`. No aporta terminales, solo "renombra".

**La idea:** si A se puede convertir en B con renombres (A ⇒ … ⇒ B), entonces A puede hacer todo lo que hace B. UNIT le copia a A, directamente, las producciones "útiles" (no unitarias) de B, y borra los renombres.

1. Se calculan los **pares unitarios** de cada A: los B a los que A llega solo con producciones unitarias. A siempre llega a sí mismo, con cero pasos.
2. Para cada par (A, B) y cada producción **no unitaria** `B → α`, se agrega `A → α`.
3. Las producciones unitarias no se copian: desaparecen.

**Ejemplo con G1 (después de DEL):** `Investigacion → Pasos`, `Pasos → Evidencia` y `Evidencia → PIS`.

- Los pares de Investigacion son {Investigacion, Pasos, Evidencia, Linea}: con renombres, Investigacion llega a Pasos, y Pasos llega a Evidencia y a Linea.
- Entonces Investigacion recibe las producciones no unitarias de los cuatro. Por ejemplo, `Investigacion → PIS` (de Evidencia) e `Investigacion → SOS CuerpoLinea` (de Linea).
- La derivación de 3 pasos `Investigacion ⇒ Pasos ⇒ Evidencia ⇒ PIS` pasa a ser un solo paso: `Investigacion ⇒ PIS`.

---

## 5. El código, función por función

### 5.0 La idea común: cada paso es una función de gramática a gramática

En el código, una gramática es un objeto `Grammar` (`src/grammar/types.ts`). Lo que importa para la FNC:

| Campo          | Qué es                                        | En `parentheses`                                      |
| -------------- | --------------------------------------------- | ----------------------------------------------------- |
| `start`        | el símbolo inicial S                          | `'S'`                                                 |
| `nonterminals` | N                                             | `{S}`                                                 |
| `terminals`    | Σ                                             | `{(, )}`                                              |
| `productions`  | P: una lista de `{ id, leftSide, rightSide }` | `{0, S, ['(', 'S', ')', 'S']}` y `{1, S, []}` (S → ε) |

Una producción ε es simplemente una con `rightSide` vacío (`[]`).

Los tres pasos siguen **el mismo esquema**:

1. Reciben un `Grammar`.
2. Arman una **lista nueva de producciones**, con operaciones de listas comunes (`map`, `flatMap`, `filter`). Esto es lo único que cambia de un paso a otro.
3. Llaman a `rewriteGrammar` con esa lista, que la convierte en un `Grammar` nuevo (numera, quita repetidas y agrupa).

Ninguno modifica el `Grammar` que recibe: cada uno devuelve uno nuevo. Por eso el comando puede encadenarlos (`removeUnitProductions(removeEpsilonProductions(addNewStart(g)))`) y mostrar el antes y el después de cada uno.

Los objetos reales en cada paso, para `parentheses` (producciones como `[id, leftSide, rightSide]`):

| Después de | `start` | `nonterminals` | `productions`                                                                                                       |
| ---------- | ------- | -------------- | ------------------------------------------------------------------------------------------------------------------- |
| (original) | S       | S              | [0, S, ( S ) S] · [1, S, ε]                                                                                         |
| START      | **S0**  | **S0**, S      | **[0, S0, S]** · [1, S, ( S ) S] · [2, S, ε]                                                                        |
| DEL        | S0      | S0, S          | [0, S0, S] · **[1, S0, ε]** · [2, S, ( S ) S] · **[3, S, ( S )]** · **[4, S, ( ) S]** · **[5, S, ( )]**             |
| UNIT       | S0      | S0, S          | [0, S0, ε] · **[1, S0, ( S ) S]** · **[2, S0, ( S )]** · **[3, S0, ( ) S]** · **[4, S0, ( )]** · [5..8: las 4 de S] |

Lo que cambia en cada paso:

- **START:** cambia `start`, se agrega `S0` a `nonterminals` y se agrega una producción al principio de la lista. (Con G1 no cambia nada: devuelve el mismo objeto.)
- **DEL:** solo cambia la lista: cada producción se reemplaza por sus versiones, y desaparece `S → ε`.
- **UNIT:** solo cambia la lista: desaparece `S0 → S` y S0 recibe copias de las producciones de S.

### 5.1 `addNewStart(grammar)` (`add-new-start.ts`)

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

**Qué recibe:** una gramática G.

**Qué devuelve:** la misma G si no hace falta S0, o una gramática **nueva** G' con S0. La original nunca se modifica.

Línea por línea:

1. **`appearsOnSomeRightSide({ grammar, symbol: grammar.start })`** recorre todas las producciones y pregunta si alguna tiene al inicial en su lado derecho (`rightSide.includes(symbol)`). `some` corta en la primera que encuentra.
   - Con G1 pregunta por `Relato`: ninguna producción lo tiene a la derecha, así que da `false`.
   - Con `parentheses` pregunta por `S`: `S → ( S ) S` lo tiene, así que da `true`.
2. **`return grammar`:** si el inicial no aparece a la derecha, no hay nada que hacer. Se devuelve **el mismo objeto**, sin copiarlo. El comando lo detecta (`after === before`) e imprime `Nothing to do: …`.
3. **`freshSymbol({ grammar, name: NEW_START })`** elige el nombre del inicial nuevo. Quiere llamarlo `S0`, pero si la gramática ya tiene un símbolo `S0`, usarlo mezclaría dos símbolos distintos con el mismo nombre. En ese caso prueba `S0'`, después `S0''`, hasta encontrar uno libre. En `parentheses` devuelve `'S0'`.
4. **`rewriteGrammar({ grammar, … })`** arma G' a partir de G (sección 5.6). Además de `grammar`, le dice tres cosas:
   - **`start: newStart`:** el inicial de G' es `S0`, no `S`.
   - **`newNonterminals: [newStart]`:** `S0` se agrega a N. Sin esto, `S0` no sería un no terminal de G'.
   - **`productions: [ {S0 → S}, ...grammar.productions ]`:** las producciones de G' son `S0 → S` (primera) seguida de **todas** las de G, sin cambios. `rightSide: [grammar.start]` es el lado derecho con un solo símbolo: el inicial viejo. `...grammar.productions` copia las producciones de G.

**Resultado con `parentheses`:** inicial `S0`, N = {S0, S}, Σ igual, 3 producciones: `S0 → S`, `S → ( S ) S` y `S → ε`.

**Resultado con G1:** la misma G1, con inicial `Relato` y 40 producciones.

**Por qué la nueva va primera:** solo por legibilidad. Al imprimir la gramática, lo primero que se ve es la puerta de entrada.

### 5.2 `removeEpsilonProductions(grammar)` (`remove-epsilon-productions.ts`)

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

1. **`computeNullable(grammar)`:** los anulables, con la función del paso 7. En G1 son los 10 `…Opc` y compañía.
2. **`flatMap` sobre las producciones:** cada producción se convierte en **una lista** de producciones (sus versiones), y `flatMap` las junta todas en una sola lista. Para cada lado derecho, `withoutNullableSymbols` da las versiones, y `.map` les vuelve a poner el mismo lado izquierdo.
3. **`filter(keepsProduction)`:** saca las versiones vacías (`A → ε`), salvo la del símbolo inicial.
4. **`rewriteGrammar`:** arma G'. Acá no cambia el inicial ni N; solo las producciones. Además quita las repetidas.

**`withoutNullableSymbols({ rightSide, nullableSymbols })`**, la función que arma las versiones:

```ts
let versions: SymbolName[][] = [[]];
for (const symbol of rightSide) {
  versions = versions.flatMap((version) =>
    nullableSymbols.has(symbol) ? [[...version, symbol], version] : [[...version, symbol]],
  );
}
return versions;
```

Recorre el lado derecho de izquierda a derecha. `versions` son las versiones armadas hasta ahora, empezando por una sola versión vacía. Con cada símbolo:

- si **no** es anulable, se agrega al final de todas las versiones;
- si **es** anulable, cada versión se duplica: una con el símbolo y otra sin él.

Ejemplo con `( S ) S`, donde solo S es anulable:

| Símbolo leído | Versiones                             |
| ------------- | ------------------------------------- |
| (inicio)      | `[]`                                  |
| `(`           | `(`                                   |
| `S`           | `( S` · `(`                           |
| `)`           | `( S )` · `( )`                       |
| `S`           | `( S ) S` · `( S )` · `( ) S` · `( )` |

Las 4 versiones salen en el orden de contar en binario, y la original siempre es la primera.

**`keepsProduction({ production, grammar })`:**

```ts
return production.rightSide.length > 0 || production.leftSide === grammar.start;
```

Se queda con la producción si su lado derecho no está vacío **o** si es del símbolo inicial (S0 en `parentheses`, `Relato` en G1). Solo aparece una versión vacía del inicial cuando es anulable, es decir, cuando ε ∈ L(G). En G1 nunca pasa; en `parentheses`, sí (`S0 → ε`).

### 5.3 `computeUnitPairs(grammar)` (`remove-unit-productions.ts`)

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

**Qué devuelve:** un `Map` que a cada no terminal A le asocia el conjunto de los B a los que llega con renombres (sus pares unitarios).

Para cada no terminal A, corre un **menor punto fijo** (el mismo `repeatRuleUntilNoChange` de los anulables):

- **Empieza con `{A}`:** A llega a sí mismo sin hacer nada.
- **Cada ronda:** `unitTargets` mira las producciones unitarias `B → C` cuyo B ya está en el conjunto (`reachedSymbols`) y agrega los C. `production.rightSide[0]` es ese C, el único símbolo del lado derecho.
- **`lastRound(rounds)`:** `repeatRuleUntilNoChange` devuelve todas las rondas; los pares de A son el conjunto de la última.
- **Termina** cuando una ronda no agrega nada. Siempre termina: el conjunto solo crece y no puede tener más que |N| símbolos.

Ejemplo con Investigacion, en G1 después de DEL:

| Ronda | Unitarias que se usan                | Conjunto                                 |
| ----- | ------------------------------------ | ---------------------------------------- |
| 0     | —                                    | {Investigacion}                          |
| 1     | `Investigacion → Pasos`              | {Investigacion, Pasos}                   |
| 2     | `Pasos → Evidencia`, `Pasos → Linea` | {Investigacion, Pasos, Evidencia, Linea} |
| 3     | ninguna nueva                        | igual: punto fijo                        |

**Supone que DEL ya corrió.** Con producciones ε, A también podría "renombrarse" a B a través de `A → B C` con C anulable, y no se detectaría. Después de DEL, ese caso ya se convirtió en la producción unitaria `A → B`.

### 5.4 `removeUnitProductions(grammar)`

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

Son tres bucles anidados, escritos con `flatMap`:

1. Para cada no terminal A…
2. …para cada B de sus pares unitarios (A incluido)…
3. …para cada producción de B que **no** es unitaria (`B → α`), agrega `A → α`.

Como el par (A, A) siempre está, A conserva sus propias producciones no unitarias. Las unitarias no se copian nunca: así desaparecen. Si dos B le dan a A la misma producción, `rewriteGrammar` deja una sola.

### 5.5 `isUnit({ production, grammar })`

```ts
const [only] = production.rightSide;
return production.rightSide.length === 1 && only !== undefined && grammar.nonterminals.has(only);
```

Una producción es unitaria si su lado derecho tiene **exactamente un símbolo** y ese símbolo es un **no terminal**. `Investigacion → Pasos` es unitaria. `Evidencia → PIS` no lo es, porque PIS es terminal: esa producción sí produce algo. `only !== undefined` solo está para que TypeScript sepa que el símbolo existe.

### 5.6 `rewriteGrammar({ grammar, productions, start, newNonterminals })` (`rewrite.ts`)

Es la función que usan los tres pasos para armar G' a partir de G. Recibe un objeto con:

- **`grammar`** (obligatorio): G, la gramática antes del paso;
- **`productions`** (obligatorio): las producciones de G', todavía sin numerar;
- **`start`** (opcional): el inicial nuevo; si no se pasa, se queda el de G;
- **`newNonterminals`** (opcional): no terminales nuevos para agregar a N.

Y devuelve G':

- **N:** los nuevos (S0) más los de G. **No se recalcula**: un no terminal que se quedó sin producciones sigue siendo no terminal.
- **Σ:** el mismo de G. Ningún paso de la FNC agrega terminales.
- **P:** las producciones numeradas desde 0, sin repetidas (`uniqueProductions`). Por ejemplo, en `epsilon-trap`, `S → A A x` da `A x` dos veces (borrando la primera A o la segunda): queda una sola.
- **`productionsByLeftSide`:** las producciones agrupadas por lado izquierdo, con una lista (quizás vacía) para cada no terminal. Earley la usa para predecir.

**Por qué no usar `buildGrammar`:** `buildGrammar` deduce N de los lados izquierdos. Después de DEL, en `epsilon-trap`, A se queda sin producciones pero sigue apareciendo en `S → A A x`. `buildGrammar` lo tomaría por un **terminal** llamado "A", y el lenguaje cambiaría: aceptaría la cadena `A A x`.

Usa una ayuda de `grammar/productions.ts` y exporta otra:

- **`productionKey(production)`** (de `grammar/productions.ts`, la misma que usa `buildGrammar`): convierte una producción en un texto que la identifica por sus símbolos (`["S","(","S",")"]`), sin importar su número. Sirve para detectar repetidas y para que el comando compare dos gramáticas. `rewriteGrammar` también arma el índice por lado izquierdo con `groupByLeftSide`, de ese mismo archivo.
- **`freshSymbol({ grammar, name })`:** devuelve `name` si no está en N ni en Σ; si no, le agrega primas hasta que quede libre.

### 5.7 El comando `chomsky-normal-form`

- El comando aplica los pasos uno tras otro: la salida de un paso es la entrada del siguiente. Desde el paso 24 la lista de pasos es `CHOMSKY_NORMAL_FORM_STEPS` del núcleo (guía 24, sección 5.4), y las descripciones de la consola están en `STEP_DESCRIPTIONS`.
- `--until` dice en qué paso parar. Por defecto corre todos. Acepta el nombre en minúsculas.
- Por cada paso imprime:
  - el título, con lo que hace el paso;
  - las producciones **agregadas** (`+`): las que están después y no estaban antes;
  - las **quitadas** (`-`): las que estaban antes y ya no están. Se comparan por símbolos con `productionKey`, porque los números cambian de un paso a otro;
  - la gramática resultante, con `formatGrammar`.
- Un `--until` que no es uno de los pasos es un error de uso (código 2).

---

## 6. Ejemplo recorrido a mano

### 6.1 `parentheses`: S → ( S ) S | ε

| Paso  | Anulables / pares | Agrega                                         | Quita  | Producciones |
| ----- | ----------------- | ---------------------------------------------- | ------ | ------------ |
| START | —                 | S0 → S                                         | —      | 3            |
| DEL   | {S, S0}           | S0 → ε, S → ( S ), S → ( ) S, S → ( )          | S → ε  | 6            |
| UNIT  | S0: {S0, S}       | S0 → ( S ) S, S0 → ( S ), S0 → ( ) S, S0 → ( ) | S0 → S | 9            |

S0 → ε queda: el lenguaje de `parentheses` contiene la cadena vacía.

### 6.2 G1

```sh
npm run sabueso -- chomsky-normal-form --grammar g1 --until UNIT
```

| Paso  | Agrega | Quita | Producciones | Ejemplos                                                                 |
| ----- | ------ | ----- | ------------ | ------------------------------------------------------------------------ |
| START | 0      | 0     | 40           | nada: `Relato` no aparece a la derecha                                   |
| DEL   | 16     | 10    | 46           | − MarcoOpc → ε; + Planteo → Hecho; + Linea → SOS                         |
| UNIT  | 33     | 10    | 69           | − Investigacion → Pasos; + Investigacion → PIS; + Desenlace → REV Cierre |

Después de UNIT queda un símbolo que ya no se usa: `Descarte`. Solo aparecía en `CuerpoLinea → Descarte`, una unitaria que UNIT borró (CuerpoLinea copió sus producciones `DSC Libres` y `DSC`). Ahora `Descarte` no es alcanzable desde `Relato`; lo borra USELESS en el paso 24.

---

## 7. Errores

Las funciones no lanzan errores. El comando: sin `--grammar`, con argumentos de más o con un `--until` inválido, termina con código 2.

---

## 8. Consola y pruebas

```sh
npm run sabueso -- chomsky-normal-form --grammar g1 --until UNIT
npm run sabueso -- chomsky-normal-form --grammar parentheses
```

**`test/chomsky-normal-form/start-del-unit.test.ts`:**

| Prueba                  | Qué verifica                                                                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| START                   | S0 → S primera en `parentheses`; G1, G0 y `epsilon-trap` quedan iguales; `S0'` si ya existe S0                                                                            |
| DEL a mano              | `parentheses` y `epsilon-trap` producción por producción; A queda en N sin producciones                                                                                   |
| DEL en G1               | ninguna producción ε                                                                                                                                                      |
| pares unitarios         | `parentheses` y el ciclo de `test-cyclic`                                                                                                                                 |
| UNIT a mano             | `parentheses` (9 producciones) y `test-cyclic` (el ciclo desaparece)                                                                                                      |
| ningún unitario         | G0, G1 y las de libro                                                                                                                                                     |
| el lenguaje se preserva | todas las oraciones de G1 de largo ≤ 4 se aceptan después de cada paso (lo pide el spec); G0 y G1 aceptan y rechazan lo mismo hasta largo 3; las de libro, con ε incluida |

**`test/command-line/chomsky-normal-form.test.ts`:** los tres pasos de G1 con sus conteos (40, 46 y 69), `--until DEL`, S0 → ε en `parentheses` y los errores de uso.

---

## 9. Preguntas probables en la defensa

**¿Para qué sirve START si S ya es el símbolo inicial?**
Para que el símbolo inicial no aparezca en ningún lado derecho. Así su producción ε se puede conservar cuando ε ∈ L(G) sin que esa ε borre nada dentro de otra producción.

**¿Por qué en G1 no se agrega S0?**
Porque `Relato` no aparece en ningún lado derecho: ya cumple lo que S0 garantiza. Los libros lo agregan siempre porque es más simple de enunciar; acá se agrega solo cuando hace falta, y el lenguaje es el mismo en los dos casos.

**¿Por qué DEL antes que UNIT?**
Porque DEL crea producciones unitarias nuevas: `Planteo → Hecho MarcoOpc`, con MarcoOpc anulable, da `Planteo → Hecho`. Con el orden inverso quedarían unitarias.

**¿Cuántas producciones puede generar DEL?**
Hasta 2^m por producción, con m la cantidad de anulables del lado derecho. En G1 los lados derechos son cortos (a lo sumo 3 símbolos), así que crece poco: de 40 a 46.

**¿Qué es un par unitario y cómo se calcula?**
(A, B) es un par si A ⇒\* B usando solo producciones unitarias. Se calcula como los anulables: un menor punto fijo con base (A, A) y la regla "si (A, B) es par y B → C, entonces (A, C)".

**¿Qué pasa con los ciclos?**
Un ciclo A ⇒+ A está hecho de pasos unitarios (después de DEL). UNIT los elimina todos: en `test-cyclic`, S → A | a y A → S quedan como S → a y A → a.

**¿Por qué no usar `buildGrammar` para armar cada paso?**
Porque deduce N de los lados izquierdos. Un no terminal que se quedó sin producciones (A en `epsilon-trap`) pasaría a ser un terminal, y el lenguaje cambiaría. `rewriteGrammar` conserva N.
