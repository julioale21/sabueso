# 10 — Ciclos

> Archivos: `packages/core/src/analysis/cycles.ts` y `packages/core/src/command-line/commands/cycles.ts`.

## 1. Teoría

Una gramática es **cíclica** si algún A cumple A ⇒⁺ A: A vuelve a sí mismo sin producir nada. Entonces alguna cadena tiene **infinitos** árboles, porque la vuelta se puede repetir.

- **Grafo unitario:** una arista A → B por cada producción A → α B β con α y β anulables ([guía 07](07-simbolos-anulables.md)). G es cíclica si y solo si ese grafo tiene un ciclo.
- El ciclo se busca con una **búsqueda en profundidad** (DFS).
- **Cíclica no es ambigua:** ambigua es más de un árbol; cíclica, infinitos. G0 es ambigua pero no cíclica.

**Ejemplo: `test-cyclic`.** `S → A | a`, `A → S`. Aristas: S → A y A → S. Hay ciclo: **S ⇒⁺ A ⇒⁺ S**, y la cadena `a` tiene infinitos árboles (S ⇒ a, S ⇒ A ⇒ S ⇒ a, …).

## 2. Por qué así

- **Para qué sirve:** el conteo de árboles ([guía 20](20-conteo-de-arboles.md)) devuelve `'infinite'` en lugar de entrar en un bucle, la enumeración de árboles ([guía 19](19-arboles-de-un-relato.md)) corta con un límite, y el informe `analyze` ([guía 12](12-tabla-ll1-y-no-ambiguedad.md)) lo muestra. Ni G0 ni G1 son cíclicas: todo relato tiene una cantidad finita de árboles (en G0 puede ser C(197) para L1, pero es un número).
- **Un grafo:** A ⇒⁺ A es encadenar pasos "A se convierte solo en B". Encadenar pasos es seguir aristas, y volver a A es un ciclo del grafo.
- **DFS:** es la forma estándar de encontrar ciclos en un grafo dirigido. Cuesta O(|N| + aristas).
- **Un ciclo por arista de retroceso:** alcanza para decidir si G es cíclica y para mostrar los ciclos. No se listan todos los ciclos simples (es un algoritmo más complejo y no hace falta).
- **Descartado: derivar y ver si se repite.** Derivar no termina justamente cuando hay ciclos. El grafo es finito y la DFS siempre termina.

## 3. El código, función por función

### 3.1 `findCycles(grammar)`

```ts
const graph = buildUnitGraph({ grammar, nullableSymbols: computeNullable(grammar) });
const search = new CycleSearch(graph);
for (const symbol of grammar.nonterminals) {
  search.visit(symbol);
}
return search.cycles;
```

- `computeNullable(grammar)`: primero los anulables. El grafo los necesita para saber qué símbolos pueden desaparecer.
- `new CycleSearch(graph)`: una sola búsqueda para todo el grafo. Así `finished` se comparte entre los arranques.
- `for ... search.visit(symbol)`: arranca desde cada no terminal, porque el grafo puede tener partes no conectadas. Los ya explorados se saltean solos dentro de `visit`.
- Devuelve `SymbolName[][]`: `[S, A]` significa S ⇒⁺ A ⇒⁺ S; una lista vacía, que no hay ciclos.

### 3.2 `buildUnitGraph({ grammar, nullableSymbols })`

```ts
const graph: UnitGraph = new Map();
for (const nonterminal of grammar.nonterminals) {
  graph.set(nonterminal, []);
}
for (const production of grammar.productions) {
  for (const target of unitTargets({ production, grammar, nullableSymbols })) {
    const edges = graph.get(production.leftSide) ?? [];
    if (!edges.includes(target)) {
      edges.push(target);
    }
  }
}
return graph;
```

- El primer `for` le da a cada no terminal una lista vacía. Así un símbolo sin aristas aparece igual (en `--graph` como `—`).
- `?? []` solo está para el tipo. En la práctica la lista ya existe, y `push` la modifica dentro del mapa.
- `if (!edges.includes(target))`: no repite aristas. A → B y A → B C (con C anulable) dan la misma arista.

### 3.3 `unitTargets({ production, grammar, nullableSymbols })`

```ts
return symbols.filter(
  (symbol, position) =>
    grammar.nonterminals.has(symbol) &&
    symbols.every((other, index) => index === position || nullableSymbols.has(other)),
);
```

- `filter((symbol, position) => ...)`: recorre el lado derecho con la posición. Se usa la posición, no el nombre, porque un símbolo puede repetirse (A → B B).
- `grammar.nonterminals.has(symbol)`: solo un no terminal puede ser destino.
- `symbols.every((other, index) => index === position || nullableSymbols.has(other))`: "todos los **otros** símbolos son anulables". `index === position` saltea al propio candidato.
- Es la definición de A → α B β con α y β anulables. Un terminal nunca es anulable, así que corta todas las aristas de esa producción.

### 3.4 La clase `CycleSearch`

Tiene tres campos: `path` (el camino actual), `finished` (los símbolos ya explorados del todo) y `cycles`. El trabajo está en `visit`:

```ts
if (this.finished.has(symbol)) {
  return;
}
const position = this.path.indexOf(symbol);
if (position !== -1) {
  this.cycles.push(this.path.slice(position));
  return;
}
this.path.push(symbol);
for (const next of this.graph.get(symbol) ?? []) {
  this.visit(next);
}
this.path.pop();
this.finished.add(symbol);
```

Es la DFS clásica de tres colores. Cada `if` es un estado:

- **Terminado** (`this.finished.has(symbol)`): ya se exploró todo lo que sale de él. Se vuelve.
- **En el camino** (`position !== -1`): una arista de retroceso. `this.path.slice(position)` es el tramo desde ese símbolo hasta el actual; con la arista recién seguida, cierra el ciclo. Con `path = [S, A, B]` y una arista B → A, el ciclo es `[A, B]`.
- **Nuevo:** `push` lo agrega al camino, se visitan sus aristas y `pop` lo saca. Así `path` siempre es el camino desde la raíz hasta el símbolo actual.
- `this.finished.add(symbol)` va después del `pop`: otra rama que llegue a él no lo vuelve a explorar.

La corrida sobre `test-cyclic` (grafo S → A, A → S):

| Paso | Acción                          | `path` | `finished` | Ciclos     |
| ---- | ------------------------------- | ------ | ---------- | ---------- |
| 1    | visitar S: no está en nada      | [S]    | {}         |            |
| 2    | seguir S → A: visitar A         | [S, A] | {}         |            |
| 3    | seguir A → S: S está en `path`  | [S, A] | {}         | **[S, A]** |
| 4    | A no tiene más aristas: termina | [S]    | {A}        |            |
| 5    | S no tiene más aristas: termina | []     | {S, A}     |            |
| 6    | visitar A: ya terminó           | []     | {S, A}     |            |

### 3.5 El comando `cycles`

- Lee `--grammar` o `--grammar-file`, y `--graph` (el grafo unitario, una fila por no terminal).
- Imprime cada ciclo como `S ⇒+ A ⇒+ S` (`formatCycle` repite el primer símbolo al final), o `No cycles: every string has finitely many trees`.
- `findCycles` no lanza errores: una gramática cíclica es válida (código 0). Los errores de uso son los comunes (código 2).

## 4. Consola y pruebas

```sh
npm run sabueso -- cycles --grammar test-cyclic --graph
```

```text
test-cyclic: cycles A ⇒+ A

Unit graph (A → B when A → α B β with α and β nullable):

From  To
----  --
S     A
A     S

1 cycle(s): some string has infinitely many trees
  S ⇒+ A ⇒+ S
```

Con `--grammar g1` imprime `No cycles…`. Con `--grammar-file examples/grammars/hidden-cycle.grammar` encuentra `S ⇒+ S`.

| Prueba                                           | Qué verifica                                                                                                                                                                                                                                                        |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core/test/analysis/cycles.test.ts`     | `test-cyclic` da [S, A]; G0, G1, `arithmetic`, `parentheses` y `meta` no tienen ciclos; `S → S`; el ciclo escondido da [S]; `S → S S` es cíclica solo si S es anulable; un terminal corta; varios ciclos en orden; el grafo de G1 y G0 (Pasos no apunta a sí mismo) |
| `packages/core/test/command-line/cycles.test.ts` | el ciclo de `test-cyclic`, "No cycles" para G1, el grafo con `--graph`, el ciclo escondido con `--grammar-file` y los errores de uso                                                                                                                                |

## 5. Referencias

- SPEC 02, sección 3.9.
- Hopcroft, Motwani y Ullman, _Introducción a la teoría de autómatas, lenguajes y computación_, sección 7.1.4 (eliminación de producciones unitarias: los pares unitarios (A, B) con A ⇒\* B son las aristas de este grafo).
