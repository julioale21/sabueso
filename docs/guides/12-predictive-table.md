# Guía de estudio: 12 — Tabla LL(1) y análisis completo

> **Paso 12 del SPEC 02.** Archivos: `packages/core/src/analysis/predictive-table.ts`, `packages/core/src/analysis/index.ts` (`analyzeGrammar`), y los comandos `predictive-table` y `analyze` en `packages/core/src/command-line/commands/`.
> Ficha teórica relacionada: [`docs/concepts/06-predictive-table-and-unambiguity.md`](../concepts/06-predictive-table-and-unambiguity.md).

---

## 1. El problema que resuelve

Es la conclusión del análisis de la gramática. Con FIRST y FOLLOW (paso 11) se arma la **tabla LL(1)**: todas las decisiones de un analizador LL(1), tomadas de antemano. Si ninguna casilla tiene dos producciones, la gramática es **LL(1)** y, por el teorema, **no ambigua**.

Para el proyecto es la prueba en código de algo central: **G1 no es ambigua**. Hasta ahora estaba verificado a mano, en algunas casillas, en la sección 4.4 del spec. Ahora el programa arma la tabla entera y cuenta los conflictos: 0 en G1, 13 en G0.

Además, `analyzeGrammar` junta en un solo resultado todo lo de los pasos 7 a 12, y el comando `analyze` lo muestra como informe.

---

## 2. Explicado simple: la tabla y la corrida

Con el mini policial de la guía 11 (`examples/grammars/mini-detective.grammar`).

### 2.1 La tabla: todas las decisiones de antemano

Filas: dónde estoy (el no terminal que hay que expandir). Columnas: qué evento viene. Casilla: qué regla uso. Se llena así:

- la regla A → α va en cada columna de FIRST(α);
- si α puede ser ε, también en cada columna de FOLLOW(A).

| Estoy en… \ viene… | CRI                 | HAL                 | PIS             | INT             | REV         | EPI | $   |
| ------------------ | ------------------- | ------------------- | --------------- | --------------- | ----------- | --- | --- |
| Relato             | Inicio Pistas Final | Inicio Pistas Final |                 |                 |             |     |     |
| Inicio             | CRI Hallazgo        | HAL                 |                 |                 |             |     |     |
| Hallazgo           |                     | HAL                 | ε               | ε               |             |     |     |
| Pistas             |                     |                     | Pista MasPistas | Pista MasPistas |             |     |     |
| MasPistas          |                     |                     | Pista MasPistas | Pista MasPistas | ε           |     |     |
| Pista              |                     |                     | PIS             | INT             |             |     |     |
| Final              |                     |                     |                 |                 | REV Epilogo |     |     |
| Epilogo            |                     |                     |                 |                 |             | EPI | ε   |

Ninguna casilla tiene dos reglas: es LL(1). Las vacías son errores.

### 2.2 La corrida: `CRI PIS INT REV`

Una pila con lo que falta armar (el tope, a la izquierda). Si el tope es un evento, tiene que coincidir con el que viene. Si es un no terminal, se busca su casilla.

| Paso | Falta armar               | Viene           | Qué hago                                |
| ---- | ------------------------- | --------------- | --------------------------------------- |
| 1    | Relato                    | CRI PIS INT REV | [Relato, CRI] → Inicio Pistas Final     |
| 2    | Inicio Pistas Final       | CRI …           | [Inicio, CRI] → CRI Hallazgo            |
| 3    | CRI Hallazgo Pistas Final | CRI …           | CRI coincide: lo leo                    |
| 4    | Hallazgo Pistas Final     | PIS INT REV     | [Hallazgo, PIS] → ε: lo salteo          |
| 5    | Pistas Final              | PIS …           | [Pistas, PIS] → Pista MasPistas         |
| 6    | Pista MasPistas Final     | PIS …           | [Pista, PIS] → PIS                      |
| 7    | PIS MasPistas Final       | PIS …           | coincide: lo leo                        |
| 8    | MasPistas Final           | INT REV         | [MasPistas, INT] → otra pista           |
| 9    | Pista MasPistas Final     | INT …           | [Pista, INT] → INT                      |
| 10   | INT MasPistas Final       | INT …           | coincide: lo leo                        |
| 11   | MasPistas Final           | REV             | [MasPistas, REV] → ε: no hay más pistas |
| 12   | Final                     | REV             | [Final, REV] → REV Epilogo              |
| 13   | REV Epilogo               | REV             | coincide: lo leo                        |
| 14   | Epilogo                   | (fin)           | [Epilogo, $] → ε                        |
| 15   | (nada)                    | (fin)           | relato válido                           |

Nunca hubo que adivinar. Las reglas usadas, en orden, son la **única** derivación más a la izquierda: un solo árbol. Es la misma pila del autómata de pila (ficha 24), pero el autómata adivina la regla y LL(1) la busca en la tabla.

Con `CRI REV`, después de leer CRI llego a [Hallazgo, REV]: casilla vacía, error. El mensaje sale solo: "se esperaba HAL, PIS o INT".

### 2.3 Un conflicto

Con `Inicio → CRI HAL | CRI | HAL`, las dos primeras reglas empiezan con CRI: la casilla [Inicio, CRI] tiene dos reglas. Con un solo evento de vista no se puede decidir: no es LL(1). El arreglo es la factorización a izquierda: `Inicio → CRI Hallazgo`, `Hallazgo → HAL | ε`. Es lo que se hizo de G0 a G1.

---

## 3. Por qué esta herramienta

- **Qué se eligió:** construir la tabla completa y buscar casillas con más de una producción. Es la definición de LL(1) llevada a código.
- **Por qué sirve para la ambigüedad:** decidir si una gramática cualquiera es ambigua es **indecidible**. Pero LL(1) es una condición **suficiente** y decidible: si la tabla no tiene conflictos, la gramática no es ambigua. Para G1 alcanza.
- **Por qué no alcanza para todo:** que haya conflictos **no** prueba ambigüedad. `arithmetic` es no ambigua y tiene conflictos (recursión a izquierda). En G0, de los 13 conflictos, solo los de `Pasos` y `Linea` vienen de la ambigüedad; los otros son de falta de factorización. Para buscar ambigüedad de verdad están las búsquedas acotadas del paso 27.

---

## 4. Cómo se usa en el programa

| Quién                                | Llama a                | Recibe                                  |
| ------------------------------------ | ---------------------- | --------------------------------------- |
| comando `predictive-table` (paso 12) | `buildPredictiveTable` | la tabla, los conflictos y el veredicto |
| comando `analyze` (paso 12)          | `analyzeGrammar`       | todos los análisis de los pasos 7 a 12  |
| API pública (paso 22)                | `analyzeGrammar`       | el informe, para la web (SPEC 03)       |

`buildPredictiveTable` devuelve:

| Campo          | Qué es                                                                               |
| -------------- | ------------------------------------------------------------------------------------ |
| `table`        | `Map` de no terminal → `Map` de símbolo → producciones. Las casillas vacías no están |
| `conflicts`    | las casillas con más de una producción, fila por fila                                |
| `isPredictive` | `true` si no hay conflictos: la gramática es LL(1)                                   |

---

## 5. El código, función por función

### 5.1 `buildPredictiveTable(grammar, sets?)`

```ts
export function buildPredictiveTable(
  grammar: Grammar,
  sets: FirstFollowSets = computeFirstFollow({ grammar }),
): PredictiveTable {
  const table = new Map<SymbolName, Map<SymbolName, Production[]>>();
  for (const nonterminal of grammar.nonterminals) {
    table.set(nonterminal, new Map());
  }
  for (const production of grammar.productions) {
    const row = table.get(production.leftSide);
    for (const lookahead of predictionSet(production, sets)) {
      row?.set(lookahead, [...(row.get(lookahead) ?? []), production]);
    }
  }
  const conflicts = findConflicts(table);
  return { table, conflicts, isPredictive: conflicts.length === 0 };
}
```

- `sets = computeFirstFollow({ grammar })`: si quien llama ya tiene FIRST y FOLLOW (como `analyzeGrammar`), los pasa y no se calculan dos veces.
- Primero crea una fila vacía por no terminal, así todo no terminal aparece en la tabla aunque no tenga casillas.
- Para cada producción, `predictionSet` dice en qué columnas va. `row.get(lookahead) ?? []` toma lo que ya había en la casilla (o nada) y le agrega esta producción: **por eso una casilla puede terminar con dos**, y eso es el conflicto.
- No se detiene en el primer conflicto: llena la tabla entera, así se pueden listar todos.
- `isPredictive` es simplemente "no hubo conflictos".

### 5.2 `predictionSet(production, sets)`

```ts
const firstOfRightSide = firstOfSequence({ symbols: production.rightSide, first: sets.first });
const lookaheads = new Set([...firstOfRightSide].filter((member) => member !== EMPTY_STRING));
if (firstOfRightSide.has(EMPTY_STRING)) {
  for (const member of sets.follow.get(production.leftSide) ?? []) {
    lookaheads.add(member);
  }
}
return lookaheads;
```

- `firstOfSequence` (guía 11) da FIRST(α), con ε si α puede desaparecer.
- `filter(member !== EMPTY_STRING)`: ε no es un símbolo que pueda venir en la entrada, así que no es una columna.
- Si α puede ser ε, la regla también se elige cuando viene algo que puede ir **después** de A: FOLLOW(A). Por ahí entra `$` en la tabla.
- Es la idea central del paso: **dos producciones del mismo A tienen conflicto exactamente cuando sus conjuntos de predicción comparten un símbolo**.

### 5.3 `findConflicts(table)`

Recorre las filas y las casillas en orden y junta las que tienen más de una producción. El orden sigue la gramática (filas) y el orden en que se llenaron las casillas, así la salida es siempre la misma.

### 5.4 `analyzeGrammar(grammar)` (`analysis/index.ts`)

```ts
const useful = analyzeUsefulSymbols({ grammar });
const sets = computeFirstFollow({ grammar });
return {
  nullable: computeNullable({ grammar }),
  minYield: computeMinYield({ grammar }),
  productive: useful.productive,
  reachable: useful.reachable,
  useless: useful.useless,
  isEmpty: useful.isEmpty,
  cycles: findCycles({ grammar }),
  first: sets.first,
  follow: sets.follow,
  predictiveTable: buildPredictiveTable(grammar, sets),
};
```

- Llama a cada análisis una vez y arma el objeto `GrammarAnalysis` que define el spec.
- `sets` se calcula una sola vez y se reutiliza para la tabla.
- No agrega lógica nueva: es el punto de entrada único para quien quiera "todo sobre esta gramática" (la web, en el SPEC 03).

### 5.5 Los comandos

**`predictive-table`:**

- `formatPredictiveTable`: una fila por no terminal y una columna por terminal (ordenados) más `$`. En cada casilla, los números de sus producciones.
- `formatCell`: si la casilla tiene más de una, agrega `✗` (`'13 14 ✗'`).
- `formatProductionList`: la lista numerada de producciones, para poder leer los números de las casillas.
- Si hay conflictos, `formatConflicts` los lista con las producciones que compiten.
- `formatVerdict`: "LL(1): … unambiguous" o "Not LL(1): k conflict(s)".

**`analyze`:** una fila por análisis (tamaño, anulables, oración más corta, inútiles, vacuidad, ciclos, LL(1)), con el comando que muestra el detalle de cada uno.

---

## 6. Ejemplo recorrido a mano: los conflictos de G0

`Pasos → Paso | Pasos Pasos` (producciones 13 y 14 de G0):

| Paso                                            | Resultado                                           |
| ----------------------------------------------- | --------------------------------------------------- |
| conjunto de predicción de `Pasos → Paso`        | FIRST(Paso) = {PIS, INT, DSC, ATQ, SOS}             |
| conjunto de predicción de `Pasos → Pasos Pasos` | FIRST(Pasos) = {PIS, INT, DSC, ATQ, SOS}            |
| intersección                                    | los 5 símbolos: 5 casillas con las dos producciones |

Viendo PIS, el analizador no puede saber si es "un paso" o "el comienzo de varios pasos agrupados". Es la misma ambigüedad que da los 4 árboles de A1.

`Linea → SOS | SOS Pasos`: las dos empiezan con SOS. Viendo SOS no se sabe si la sospecha abarca pasos o no: la otra ambigüedad de G0.

---

## 7. Errores

Ninguna función lanza errores: una gramática con conflictos es válida, solo no es LL(1). Los comandos terminan con código 0 en los dos casos. Los errores de uso son los de los demás análisis (código 2).

---

## 8. Consola y pruebas

```sh
npm run sabueso -- predictive-table --grammar g0
```

Imprime la tabla (las casillas con conflicto marcadas con `✗`), la lista de producciones, los 13 conflictos (por ejemplo `M[Pasos, PIS]: Pasos → Paso  |  Pasos → Pasos Pasos`) y termina con `Not LL(1): 13 conflict(s)…`. Con `--grammar g1` termina con `LL(1): no cell has two productions, so the grammar is unambiguous`.

```sh
npm run sabueso -- analyze --grammar g1
```

```text
Analysis           Result                                      Details
-----------------  ------------------------------------------  ----------------
Size               |N| = 21, |Σ| = 14, |P| = 40                grammars
Nullable (A ⇒* ε)  {CapOpc, Cierre, CtxOpc, …, PerOpc}         nullable
Shortest sentence  length 3                                    min-yield
Useless symbols    ∅                                           useful
L(G) = ∅           no                                          useful
Cycles (A ⇒+ A)    none                                        cycles
LL(1)              yes: 0 conflicts, so unambiguous            predictive-table
```

**`test/analysis/predictive-table.test.ts`:**

| Prueba                  | Qué verifica                                                           |
| ----------------------- | ---------------------------------------------------------------------- |
| G1 y `meta`             | 0 conflictos, LL(1)                                                    |
| G0                      | entre sus conflictos, (Linea, SOS), (Planteo, CRI) y (Pasos, PIS)      |
| la casilla (Pasos, PIS) | tiene `Pasos → Paso` y `Pasos → Pasos Pasos`                           |
| `arithmetic`            | 4 conflictos por recursión a izquierda                                 |
| mini policial           | las casillas de la tabla de la sección 2.1, y la vacía [Hallazgo, REV] |
| sin factorizar          | `Inicio → CRI HAL \| CRI \| HAL` da un conflicto en CRI                |
| producción ε            | en `parentheses`, S → ε ocupa las columnas de FOLLOW, `$` incluido     |
| `predictionSet`         | FIRST del lado derecho, o FOLLOW para una producción ε                 |

**`test/analysis/analyze.test.ts`** y **`test/command-line/predictive-table.test.ts`:** el informe de G1, las propiedades de `test-useless`, `test-empty` y `test-cyclic`, la tabla con `✗`, el veredicto y los errores de uso.

---

## 9. Preguntas probables en la defensa

**¿Qué es la tabla LL(1)?**
Para cada no terminal A y cada símbolo a que puede venir, qué producción usar. A → α va en [A, a] si a ∈ FIRST(α), o si α puede ser ε y a ∈ FOLLOW(A).

**¿Qué es un conflicto?**
Una casilla con dos producciones: mirando un solo símbolo no se puede decidir. G es LL(1) si y solo si no hay conflictos.

**¿Por qué LL(1) implica no ambigua?**
Porque en cada paso de la derivación más a la izquierda hay a lo sumo una producción aplicable: la de la casilla. Entonces cada cadena tiene una sola derivación más a la izquierda, y por lo tanto un solo árbol.

**¿Y al revés? ¿Toda gramática no ambigua es LL(1)?**
No. `arithmetic` es no ambigua (precedencia y asociatividad fijadas) pero tiene recursión a izquierda, y `E → E + T` y `E → T` empiezan igual: conflictos. LL(1) es suficiente, no necesario.

**¿Los 13 conflictos de G0 son todos por ambigüedad?**
No. Los de `Pasos` (5 casillas) y `Linea` (1) vienen de la ambigüedad. Los de `Planteo`, `Marco`, `Hecho`, `Desenlace` y `Resolucion` son de falta de factorización: por ejemplo, `Hecho → CRI | CRI HAL` no es ambigua, pero las dos empiezan con CRI.

**¿Por qué no usar LL(1) para analizar los relatos?**
Porque solo funciona con gramáticas LL(1), y el proyecto tiene que trabajar con cualquiera, incluida G0. Para eso está Earley. LL(1) se usa para leer los archivos `.grammar` y para certificar que G1 no es ambigua.
