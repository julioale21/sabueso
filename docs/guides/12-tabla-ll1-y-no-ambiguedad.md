# 12 — Tabla LL(1) y no ambigüedad

> Archivos: `packages/core/src/analysis/predictive-table.ts`, `packages/core/src/analysis/index.ts` (`analyzeGrammar`) y los comandos `predictive-table` y `analyze` en `packages/core/src/command-line/commands/`.

## 1. Teoría

La **tabla LL(1)** M[A, a] dice qué producción usar cuando hay que expandir A y el próximo símbolo es a. Con FIRST y FOLLOW ([guía 11](11-first-y-follow.md)), cada producción A → α va:

- en M[A, a] para cada a ∈ FIRST(α);
- si α ⇒\* ε, también en M[A, b] para cada b ∈ FOLLOW(A) (incluido `$`).

Hay un **conflicto** cuando una casilla tiene más de una producción. G es **LL(1)** si no hay conflictos.

**Teorema:** toda gramática LL(1) es **no ambigua**. En cada paso hay a lo sumo una producción posible, así que cada cadena tiene una sola derivación más a la izquierda, y un solo árbol. La vuelta no vale: una gramática no ambigua puede tener conflictos.

**Ejemplo: el mini policial** (`examples/grammars/mini-detective.grammar`, sus FIRST y FOLLOW están en la guía 11):

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

Ninguna casilla tiene dos reglas: es LL(1). Las vacías son errores: con `CRI REV`, después de leer CRI se llega a [Hallazgo, REV], vacía, y el mensaje sale solo: "se esperaba HAL, PIS o INT".

## 2. Por qué así

- **Para certificar que G1 no es ambigua.** Decidir si una gramática cualquiera es ambigua es indecidible, pero LL(1) es una condición suficiente y decidible. El programa arma la tabla entera y cuenta los conflictos: 0 en G1, 13 en G0.
- **Un conflicto no prueba ambigüedad.** En G0, los de `Pasos → Paso | Pasos Pasos` y `Linea → SOS | SOS Pasos` vienen de la ambigüedad; los otros (como `Hecho → CRI | CRI HAL`) son falta de factorizar. `arithmetic` es no ambigua y tiene conflictos por la recursión a izquierda. Para buscar ambigüedad de verdad están las búsquedas acotadas ([guía 27](27-busquedas-acotadas.md)).
- **G0 → G1:** G1 usa listas recursivas a derecha y factorización a izquierda (`Inicio → CRI Hallazgo`, `Hallazgo → HAL | ε`). Así queda sin conflictos.
- **LL(1) no analiza los relatos:** solo sirve para gramáticas LL(1), y el proyecto trabaja con cualquiera, incluida G0. Para eso está Earley.
- **`analyzeGrammar`** junta los análisis de las guías 07 a 12 en un solo resultado, para el comando `analyze` y la web.

## 3. El código, función por función

### 3.1 `buildPredictiveTable({ grammar, sets })`

Devuelve `table` (no terminal → símbolo → producciones; las casillas vacías no están), `conflicts` (las casillas con más de una producción) e `isPredictive` (`true` si es LL(1)).

```ts
export function buildPredictiveTable({
  grammar,
  sets = computeFirstFollow(grammar),
}: {
  grammar: Grammar;
  sets?: FirstFollowSets | undefined;
}): PredictiveTable {
  const table = new Map<SymbolName, Map<SymbolName, Production[]>>();
  for (const nonterminal of grammar.nonterminals) {
    table.set(nonterminal, new Map());
  }
  for (const production of grammar.productions) {
    const row = table.get(production.leftSide);
    for (const lookahead of predictionSet({ production, sets })) {
      row?.set(lookahead, [...(row.get(lookahead) ?? []), production]);
    }
  }
  const conflicts = findConflicts({ table });
  return { table, conflicts, isPredictive: conflicts.length === 0 };
}
```

- `sets = computeFirstFollow(grammar)`: un valor por defecto. Si quien llama ya tiene FIRST y FOLLOW (como `analyzeGrammar`), los pasa y no se calculan dos veces.
- Primero crea una fila vacía por no terminal, así todos aparecen aunque no tengan casillas.
- Para cada producción, `predictionSet` dice en qué columnas va. `row.get(lookahead) ?? []` toma lo que ya había en la casilla y le agrega esta producción: **por eso una casilla puede terminar con dos**, y eso es el conflicto.
- No se detiene en el primer conflicto: llena la tabla entera, así se pueden listar todos.

### 3.2 `predictionSet({ production, sets })`

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
- `filter(member !== EMPTY_STRING)`: ε no puede venir en la entrada, así que no es una columna.
- Si α puede ser ε, la regla también se elige con lo que puede venir **después** de A: FOLLOW(A). Por ahí entra `$` en la tabla.
- Es la idea central: **dos producciones del mismo A chocan exactamente cuando sus conjuntos de predicción comparten un símbolo**.

### 3.3 `findConflicts({ table })`

Recorre las filas y casillas en orden y junta las que tienen más de una producción. El orden sigue la gramática, así la salida es siempre la misma.

### 3.4 `analyzeGrammar(grammar)` (`analysis/index.ts`)

```ts
const useful = analyzeUsefulSymbols(grammar);
const sets = computeFirstFollow(grammar);
return {
  nullableSymbols: computeNullable(grammar),
  minYield: computeMinYield(grammar),
  productive: useful.productive,
  reachable: useful.reachable,
  useless: useful.useless,
  isEmpty: useful.isEmpty,
  cycles: findCycles(grammar),
  first: sets.first,
  follow: sets.follow,
  predictiveTable: buildPredictiveTable({ grammar, sets }),
};
```

- Llama a cada análisis una vez y arma el objeto `GrammarAnalysis`. `sets` se calcula una sola vez y se reutiliza para la tabla.
- No agrega lógica nueva: es el punto de entrada único para "todo sobre esta gramática" (la API pública de la [guía 22](22-api-publica.md) y la web).

### 3.5 Los comandos

- **`predictive-table`:** `formatPredictiveTable` imprime una fila por no terminal y una columna por terminal más `$`, con los números de producción; `formatCell` marca con `✗` las casillas con más de una; `formatConflicts` lista los conflictos y `formatVerdict` dice "LL(1): … unambiguous" o "Not LL(1): k conflict(s)".
- **`analyze`:** una fila por análisis (tamaño, anulables, oración más corta, inútiles, vacuidad, ciclos, LL(1)), con el comando que muestra el detalle.
- Ninguna función lanza errores: una gramática con conflictos es válida, solo no es LL(1) (código 0). Los errores de uso son los comunes (código 2).

## 4. Consola y pruebas

```sh
npm run sabueso -- predictive-table --grammar g0
```

Imprime la tabla con `✗`, los 13 conflictos (por ejemplo `M[Pasos, PIS]: Pasos → Paso  |  Pasos → Pasos Pasos`) y `Not LL(1): 13 conflict(s)…`. Con `--grammar g1` termina con `LL(1): no cell has two productions, so the grammar is unambiguous`. `npm run sabueso -- analyze --grammar g1` muestra el informe completo.

| Prueba                                                     | Qué verifica                                                                                                                                                                                                                                                                      |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core/test/analysis/predictive-table.test.ts`     | G1 y `meta` sin conflictos; G0 con (Linea, SOS), (Planteo, CRI) y (Pasos, PIS); `arithmetic` con 4 conflictos; la tabla del mini policial y la casilla vacía [Hallazgo, REV]; `Inicio → CRI HAL \| CRI \| HAL` choca en CRI; S → ε en `parentheses` ocupa FOLLOW; `predictionSet` |
| `packages/core/test/analysis/analyze.test.ts`              | el informe de G1 y las propiedades de `test-useless`, `test-empty` y `test-cyclic`                                                                                                                                                                                                |
| `packages/core/test/command-line/predictive-table.test.ts` | la tabla con `✗`, los conflictos, el veredicto, el informe `analyze` y los errores de uso                                                                                                                                                                                         |

## 5. Referencias

- Aho, Lam, Sethi y Ullman, _Compiladores: principios, técnicas y herramientas_ (2.ª ed.), secciones 4.4.3 (tablas de análisis sintáctico predictivo) y 4.4.4 (análisis predictivo no recursivo).
