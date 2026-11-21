# Guía de estudio: 10 — Ciclos

> **Paso 10 del SPEC 02.** Archivos: `packages/core/src/analysis/cycles.ts` y `packages/core/src/command-line/commands/cycles.ts`.
> Ficha teórica relacionada: [`docs/concepts/09-cycles.md`](../concepts/09-cycles.md).

---

## 1. El problema que resuelve

¿Puede un no terminal volver a sí mismo **sin producir nada**? Si existe A ⇒⁺ A, la vuelta se puede repetir todas las veces que se quiera, y alguna cadena tiene **infinitos árboles de derivación**.

| Quién                  | Para qué necesita saberlo                                                            | Paso |
| ---------------------- | ------------------------------------------------------------------------------------ | ---- |
| Conteo de árboles      | con un ciclo, el conteo no termina: hay que devolver `'infinite'` en lugar de contar | 20   |
| Enumeración de árboles | idem: hay que cortar con un límite                                                   | 19   |
| Informe `analyze`      | es una propiedad más de la gramática                                                 | 12   |

Para el relato: ni G0 ni G1 son cíclicas, así que todo relato tiene una cantidad **finita** de árboles. En G0 puede ser enorme (C(197) para L1), pero es un número.

---

## 2. Por qué esta herramienta

- **Qué se eligió:** un grafo con una arista A → B cuando A puede convertirse **solo** en B, y una búsqueda en profundidad (DFS) para encontrar ciclos en ese grafo.
- **Por qué un grafo:** A ⇒⁺ A es encadenar pasos "A se convierte solo en B". Encadenar pasos es seguir aristas, y volver a A es un ciclo del grafo.
- **Por qué importan los anulables:** `A → C B D` no es una producción unitaria, pero si C y D pueden desaparecer (son anulables, paso 7), A ⇒⁺ B igual. Por eso la arista A → B se agrega cuando **todo lo demás del lado derecho es anulable**.
- **Por qué DFS:** es la forma estándar de encontrar ciclos en un grafo dirigido. La búsqueda mantiene el camino actual; si una arista llega a un símbolo que todavía está en ese camino (arista de retroceso), el tramo del camino desde ese símbolo es un ciclo. Cuesta O(|N| + aristas).
- **Alternativa descartada: derivar y ver si se repite.** Derivar no termina justamente cuando hay ciclos. El grafo es finito y la DFS siempre termina.

---

## 3. Cómo se usa en el programa

| Quién                       | Llama a          | Recibe                                   |
| --------------------------- | ---------------- | ---------------------------------------- |
| comando `cycles` (paso 10)  | `findCycles`     | la lista de ciclos                       |
| comando `cycles --graph`    | `buildUnitGraph` | el grafo, para mostrarlo                 |
| `analyzeGrammar` (paso 12)  | `findCycles`     | los ciclos, en el informe                |
| conteo de árboles (paso 20) | `findCycles`     | si hay ciclos, el conteo es `'infinite'` |

`findCycles` devuelve `SymbolName[][]`: cada ciclo es la lista de sus símbolos en orden. `[S, A]` significa S ⇒⁺ A ⇒⁺ S. Una lista vacía: no hay ciclos.

---

## 4. Cómo funciona

1. Se calculan los anulables (paso 7).
2. **Grafo unitario:** para cada producción A → X₁…Xₖ y cada no terminal Xᵢ del lado derecho, si todos los **demás** símbolos son anulables, se agrega la arista A → Xᵢ.
3. **DFS** desde cada no terminal, en el orden de la gramática:
   - si el símbolo ya terminó de explorarse, no hay nada nuevo: se vuelve;
   - si el símbolo está en el camino actual, es una arista de retroceso: el tramo del camino desde él es un ciclo;
   - si no, se agrega al camino, se siguen sus aristas, se saca del camino y se marca como terminado.

Se registra un ciclo por cada arista de retroceso. Alcanza para decidir si la gramática es cíclica y para mostrar los ciclos; no lista todos los ciclos simples posibles (eso es un algoritmo más complejo y no hace falta).

---

## 5. El código, función por función

### 5.1 `findCycles(grammar)`

```ts
const graph = buildUnitGraph({ grammar, nullable: computeNullable({ grammar }) });
const search = new CycleSearch(graph);
for (const symbol of grammar.nonterminals) {
  search.visit(symbol);
}
return search.cycles;
```

- `computeNullable({ grammar })`: primero los anulables (paso 7). El grafo los necesita para saber qué símbolos pueden desaparecer.
- `new CycleSearch(graph)`: una sola búsqueda para todo el grafo. Así `finished` se comparte entre los arranques.
- `for ... search.visit(symbol)`: arranca desde cada no terminal, porque el grafo puede tener partes no conectadas. Los que ya se exploraron se saltean solos dentro de `visit`.

### 5.2 `buildUnitGraph({ grammar, nullable })`

```ts
const graph: UnitGraph = new Map();
for (const nonterminal of grammar.nonterminals) {
  graph.set(nonterminal, []);
}
for (const production of grammar.productions) {
  for (const target of unitTargets({ production, grammar, nullable })) {
    const edges = graph.get(production.leftSide) ?? [];
    if (!edges.includes(target)) {
      edges.push(target);
    }
  }
}
return graph;
```

- El primer `for` le da a cada no terminal una lista vacía. Así un símbolo sin aristas aparece igual en el grafo (y en `--graph` como `—`).
- `graph.get(production.leftSide) ?? []`: el `?? []` solo está para el tipo, porque `get` puede devolver `undefined`. En la práctica la lista ya existe, y `push` la modifica dentro del mapa.
- `if (!edges.includes(target))`: no repite aristas. Dos producciones A → B y A → B C (con C anulable) dan la misma arista A → B.

### 5.3 `unitTargets({ production, grammar, nullable })`

```ts
return symbols.filter(
  (symbol, position) =>
    grammar.nonterminals.has(symbol) &&
    symbols.every((other, index) => index === position || nullable.has(other)),
);
```

- `filter((symbol, position) => ...)`: recorre el lado derecho con la posición de cada símbolo. Se usa la posición, no el nombre, porque un símbolo puede repetirse (A → B B).
- `grammar.nonterminals.has(symbol)`: solo un no terminal puede ser destino de una arista.
- `symbols.every((other, index) => index === position || nullable.has(other))`: se lee "todos los **otros** símbolos son anulables". `index === position` saltea al propio candidato; el resto tiene que estar en `nullable`.
- Es la definición de A → α B β con α y β anulables: A puede convertirse solo en B.
- Un terminal nunca es anulable. Así que cualquier terminal en el lado derecho corta todas las aristas de esa producción.

### 5.4 La clase `CycleSearch`

Tiene tres campos: `path` (el camino actual, desde el primer símbolo visitado), `finished` (los símbolos ya explorados del todo) y `cycles` (los ciclos encontrados). El trabajo está en `visit`:

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

- **Terminado** (`this.finished.has(symbol)`): ya se exploró todo lo que sale de él. No hay nada nuevo: se vuelve.
- **En el camino** (`position !== -1`): llegamos a un símbolo que todavía estamos explorando. Es una arista de retroceso.
- `this.path.slice(position)`: el tramo del camino desde ese símbolo hasta el actual. Con la arista que acabamos de seguir, cierra el ciclo. Por ejemplo, con `path = [S, A, B]` y una arista B → A, el ciclo es `[A, B]`: A ⇒⁺ B ⇒⁺ A.
- **Nuevo** (ni terminado ni en el camino): `push` lo agrega al camino, se visitan sus aristas y `pop` lo saca. Así `path` siempre es el camino desde la raíz hasta el símbolo actual.
- `this.finished.add(symbol)`: va después del `pop`. Desde ese momento, otra rama que llegue a él no lo vuelve a explorar.
- Se registra un ciclo por cada arista de retroceso, no todos los ciclos simples (sección 4).

### 5.5 El comando `cycles`

- Lee `--grammar` o `--grammar-file`, y `--graph`.
- Con `--graph`, imprime el grafo unitario: una fila por no terminal con sus aristas, o `—` si no tiene.
- Imprime cada ciclo como `S ⇒+ A ⇒+ S` (con `formatCycle`, que repite el primer símbolo al final), o `No cycles: every string has finitely many trees`.

---

## 6. Ejemplo recorrido a mano

`test-cyclic`: `S → A | a`, `A → S`. Grafo: S → A, A → S.

| Paso | Acción                          | `path` | `finished` | Ciclos     |
| ---- | ------------------------------- | ------ | ---------- | ---------- |
| 1    | visitar S: no está en nada      | [S]    | {}         |            |
| 2    | seguir S → A: visitar A         | [S, A] | {}         |            |
| 3    | seguir A → S: S está en `path`  | [S, A] | {}         | **[S, A]** |
| 4    | A no tiene más aristas: termina | [S]    | {A}        |            |
| 5    | S no tiene más aristas: termina | []     | {S, A}     |            |
| 6    | visitar A: ya terminó           | []     | {S, A}     |            |

Resultado: `S ⇒+ A ⇒+ S`.

**Contraste con G0:** `Pasos → Pasos Pasos`. Para la arista Pasos → Pasos, el otro `Pasos` tendría que ser anulable, y no lo es. La única arista de Pasos es Pasos → Paso (por `Pasos → Paso`). No hay ciclo: G0 es **ambigua** (varios árboles) pero no **cíclica** (infinitos).

---

## 7. Errores

`findCycles` no lanza errores: una gramática cíclica es válida, y el comando la informa con código 0. Los errores de uso son los de los demás análisis (código 2).

---

## 8. Consola y pruebas

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

Con `--grammar g1` imprime `No cycles: every string has finitely many trees`. Con `--grammar-file examples/grammars/hidden-cycle.grammar` encuentra `S ⇒+ S`, escondido detrás de los anulables A y B.

**`test/analysis/cycles.test.ts`:**

| Prueba                                      | Qué verifica                                                              |
| ------------------------------------------- | ------------------------------------------------------------------------- |
| `test-cyclic`                               | el ciclo [S, A], el valor del spec                                        |
| G0, G1, `arithmetic`, `parentheses`, `meta` | no tienen ciclos                                                          |
| `S → S`                                     | un ciclo de un solo símbolo                                               |
| ciclo escondido                             | `S → A S B` con A y B anulables da [S]                                    |
| `S → S S`                                   | no es ciclo si S no es anulable; sí lo es si S → ε                        |
| un terminal corta                           | `S → A x`, `A → S` no tiene ciclo                                         |
| varios ciclos                               | [S, A, B] y [C, D], en orden                                              |
| el grafo de G1 y de G0                      | aristas solo donde lo demás es anulable; Pasos no apunta a sí mismo en G0 |

**`test/command-line/cycles.test.ts`:** el ciclo de `test-cyclic`, "No cycles" para G1, el grafo con `--graph`, el ciclo escondido con `--grammar-file` y los errores de uso.

---

## 9. Preguntas probables en la defensa

**¿Qué es una gramática cíclica?**
Una con algún A ⇒⁺ A: A vuelve a sí mismo sin producir nada más. Entonces alguna cadena tiene infinitos árboles, porque la vuelta se puede repetir.

**¿Cómo se detecta?**
Con un grafo: arista A → B si hay una producción A → α B β con α y β anulables (A se puede convertir solo en B). G es cíclica si ese grafo tiene un ciclo, y se busca con una DFS: un ciclo aparece cuando la búsqueda llega a un símbolo que está en el camino actual.

**¿Por qué hacen falta los anulables?**
Porque un ciclo se puede esconder: en `S → A S B` con A y B anulables, S ⇒ A S B ⇒⁺ S, aunque la producción no sea unitaria.

**¿G0 es cíclica? ¿Y ambigua?**
Ambigua sí, cíclica no. `Pasos → Pasos Pasos` no es un ciclo porque el otro `Pasos` siempre produce algo (no es anulable). Por eso los árboles de un relato en G0 pueden ser muchísimos (Catalan) pero siempre son finitos. Cíclica implica infinitos árboles; ambigua, solo más de uno.

**¿Para qué lo usa el proyecto?**
Para que el conteo de árboles (paso 20) devuelva `'infinite'` en lugar de quedarse en un bucle, y para el informe de la gramática. La Forma Normal de Chomsky elimina los ciclos al quitar las producciones unitarias (paso 23).
