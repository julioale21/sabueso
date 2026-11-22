# 19 — Los árboles de un relato

> Archivos: `packages/core/src/trees/enumerate.ts` y el comando `packages/core/src/command-line/commands/trees.ts` (y `packages/core/src/trees/tree.ts` y `packages/core/src/trees/render.ts`, adelantados en la guía 18).

## 1. Teoría

Earley ya dice si un relato es válido. Este paso dice **cómo**: arma el **árbol de derivación**. Con los árboles, Earley deja de ser un **reconocedor** (sí o no) y pasa a ser un **analizador sintáctico** (da la estructura).

- Un **árbol de derivación** tiene la raíz S. Cada nodo A tiene como hijos el lado derecho de una producción A → X₁…Xₖ (o una hoja ε si A → ε). Sus hojas, leídas de izquierda a derecha, forman la cadena.
- G es **ambigua** si alguna cadena tiene dos árboles distintos.
- En Earley, cada avance del punto guarda un **enlace** ([guía 13](13-earley-items-y-conjuntos.md)): el **predecesor** (el mismo ítem con el punto un lugar antes) y la **causa** (un token leído, un ítem hijo completo o un símbolo anulable).
- Desde ($S → S •, 0) en el último conjunto, seguir los enlaces hacia atrás da los hijos de cada nodo: **el árbol**. Un ítem con **varios enlaces** da varios árboles: ahí está **la ambigüedad**.

**Ejemplo:** A1 = `CRI SOS PIS INT REV` tiene 4 árboles en G0. Cambia solo la Investigación:

| Árbol | Agrupación de los pasos | La sospecha (SOS) abarca |
| ----- | ----------------------- | ------------------------ |
| 1     | ((SOS) (PIS)) (INT)     | nada                     |
| 2     | (SOS PIS) (INT)         | PIS                      |
| 3     | (SOS) ((PIS) (INT))     | nada                     |
| 4     | (SOS (PIS INT))         | PIS e INT                |

Vienen de dos reglas de G0: `Pasos → Pasos Pasos` (no decide cómo se agrupan los pasos) y `Linea → SOS Pasos` (no decide hasta dónde llega la sospecha). Los árboles 1 y 3 dicen lo mismo: **4 árboles, 3 lecturas**. En G1, que es LL(1) ([guía 12](12-tabla-ll1-y-no-ambiguedad.md)), A1 tiene **1** árbol.

## 2. Por qué así

- **Enlaces en lugar de un bosque compartido (SPPF):** el SPPF representa todos los árboles en una estructura compacta, pero es mucho más complejo. Los enlaces son simples, ya están en el chart y alcanzan para enumerar (este paso) y contar ([guía 20](20-conteo-de-arboles.md)).
- **Enlaces que se guardan así:**

  | Tipo de enlace | La causa es…                    | En el árbol, ese hijo es…                     |
  | -------------- | ------------------------------- | --------------------------------------------- |
  | `scan`         | un token leído                  | una hoja con el evento (CRI)                  |
  | `complete`     | un ítem hijo completo (B → γ •) | el subárbol de ese ítem                       |
  | `nullable`     | un símbolo anulable salteado    | un árbol ε ([guía 18](18-arboles-epsilon.md)) |

- **Generadores (`function*`):** puede haber muchísimos árboles (L1 tiene C(197) en G0). El siguiente árbol recién se arma cuando se lo pide. `parseTrees` pide hasta un límite: por defecto **3** (`DEFAULT_TREE_LIMIT`), que alcanza para mostrar una ambigüedad. Cuántos hay en total lo dice el conteo, que no arma ningún árbol.
- **Orden fijo:** los enlaces se recorren en el orden en que se agregaron. Los árboles salen siempre en el mismo orden, y las pruebas y la web pueden numerarlos.
- **Ciclos:** con A ⇒⁺ A habría infinitos árboles. Se lleva la lista de ítems del camino actual y se saltea una rama que vuelve a uno de ellos. La enumeración siempre termina; la [guía 20](20-conteo-de-arboles.md) informa que la cuenta es infinita.
- **Quién lo usa:** el comando `trees`, la derivación ([guía 21](21-derivacion-mas-a-la-izquierda.md), el primer árbol) y `parse` ([guía 22](22-api-publica.md)), que la web dibuja en SVG.

## 3. El código, función por función

### 3.1 `parseTrees({ grammar, recognition, limit })`

```ts
const trees: ParseTree[] = [];
for (const tree of enumerateTrees({ grammar, recognition })) {
  if (trees.length >= limit) {
    break;
  }
  trees.push(tree);
}
return trees;
```

- Pide árboles al generador hasta juntar `limit`.
- El `break` corta el generador: los árboles que siguen **nunca se arman**. Por eso funciona con L1: pedir 3 árboles cuesta 3, no C(197).

### 3.2 `enumerateTrees({ grammar, recognition })`

```ts
const accepting = recognition.acceptingItem;
if (accepting === null) {
  return;
}
const context: TreeContext = {
  grammar,
  nullableSymbols: computeNullable(grammar),
  onPath: new Set(),
};
for (const root of treesOfItem({ context, item: accepting })) {
  const [story] = root.kind === 'nonterminal' ? root.children : [];
  if (story !== undefined) {
    yield story;
  }
}
```

- `function*` hace de esta función un **generador**: cada `yield` entrega un árbol y la función queda en pausa hasta que se pide el siguiente.
- Parte del ítem de aceptación ($S → S •, 0), que `recognize` ya devuelve en `acceptingItem`. Si la entrada se rechazó, es `null`: `return` termina el generador sin entregar nada.
- `computeNullable` hace falta para los árboles ε.
- El árbol de `treesOfItem` tiene raíz `$S`. El del relato es su único hijo, que se toma con `const [story] = …`.

### 3.3 `treesOfItem({ context, item })`

```ts
if (context.onPath.has(item)) {
  return;
}
context.onPath.add(item);
for (const children of childSequences({ context, item })) {
  yield {
    kind: 'nonterminal',
    symbol: item.production.leftSide,
    production: item.production,
    children: children.length === 0 ? [{ kind: 'epsilon' }] : children,
  };
}
context.onPath.delete(item);
```

- Un ítem completo `B → γ •` da un nodo B **por cada** lista de hijos posible.
- `onPath`: si el ítem ya está en el camino actual, se llegó a él desde sí mismo (un ciclo). Esta rama no da árboles.
- El ítem se agrega antes de bajar y se saca al terminar, para que otras ramas sí puedan usarlo.
- Una producción vacía (`B → ε`) tiene cero hijos: el nodo lleva una hoja ε.

### 3.4 `childSequences({ context, item })`

```ts
if (item.dot === 0) {
  yield [];
  return;
}
for (const link of item.links) {
  for (const before of childSequences({ context, item: link.predecessor })) {
    for (const child of causeTrees({ context, link })) {
      yield [...before, child];
    }
  }
}
```

**Es el corazón del paso.** Da las listas de hijos para los símbolos **antes del punto**.

- **Caso base:** con el punto en 0, todavía no se reconoció nada. Hay una sola lista, vacía.
- **Caso general**, para cada enlace:
  - `childSequences(link.predecessor)` da las listas de hijos de todos los símbolos anteriores;
  - `causeTrees({ link })` da los árboles posibles del símbolo reconocido en este avance;
  - cada combinación (`[...before, child]`) es una lista de hijos posible.
- **Los tres `for` anidados recorren todas las combinaciones:** varios enlaces, varias listas del predecesor, varios árboles de la causa. Es exactamente donde se multiplica la ambigüedad.
- La recursión va hacia atrás (hacia el punto 0), pero la lista se arma hacia adelante: `before` tiene los hijos de la izquierda y `child` se agrega a la derecha.

### 3.5 `causeTrees({ context, link })`

```ts
if (link.kind === 'scan') {
  yield {
    kind: 'terminal',
    symbol: link.predecessor.production.rightSide[link.predecessor.dot] ?? '',
    tokenIndex: link.tokenIndex,
  };
} else if (link.kind === 'complete') {
  yield* treesOfItem({ context, item: link.child });
} else {
  yield* epsilonTrees({ grammar: context.grammar, nullableSymbols: context.nullableSymbols, symbol: link.symbol });
}
```

- **`scan`:** una hoja con el terminal leído. El símbolo es el que estaba después del punto del predecesor (`rightSide[predecessor.dot]`). `tokenIndex` dice qué evento del relato es.
- **`complete`:** los árboles del ítem hijo. `yield*` entrega, uno por uno, todo lo que produce otro generador.
- **`nullable`:** los árboles ε del símbolo salteado ([guía 18](18-arboles-epsilon.md)). En G1 hay exactamente uno.

### 3.6 El comando `trees`

- Dibuja los árboles numerados con `renderTree`.
- Como contar es barato, llama a `countTrees` y siempre dice el total: `The first 3 of 4 trees: the grammar is ambiguous for this input (--max n draws more)`. Con un ciclo: `Infinitely many trees (a cycle A ⇒+ A): … Drawn: 2, the ones that go around no cycle`.
- No hay errores nuevos. Termina con código 1 si el relato se rechaza (no tiene árboles) y con código 2 si `--max` no es un entero mayor que 0.

## 4. Consola y pruebas

```sh
npm run sabueso -- trees --grammar g0 "CRI SOS PIS INT REV"            # the first 3 of 4 trees
npm run sabueso -- trees --grammar g0 --max 10 "CRI SOS PIS INT REV"   # all 4
npm run sabueso -- trees --grammar g1 "CRI PIS REV"                    # 1 tree, with its ε-subtrees
```

**`packages/core/test/trees/enumerate.test.ts`:**

| Prueba                        | Qué verifica                                                                                                           |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| A1                            | 4 árboles distintos en G0; con límite 2 da 2; 1 en G1 (lo pide el spec)                                                |
| tabla 9.1                     | V1 da 8 y V3 da 112 en G0; 1 en G1                                                                                     |
| las hojas son la entrada      | en G0, G1, `arithmetic-ambiguous` y `parentheses`, las hojas de cada árbol leídas de izquierda a derecha son el relato |
| la raíz                       | es el símbolo inicial                                                                                                  |
| ε en G1                       | las partes que faltan aparecen como subárboles ε                                                                       |
| el dibujo                     | `CRI PIS REV` en G0, línea por línea (lo pide el spec)                                                                 |
| generador                     | los primeros árboles de L1 salen al instante                                                                           |
| rechazo, ciclo, entrada vacía | sin árboles; los árboles sin repetir; `S → ε`                                                                          |

**`packages/core/test/command-line/trees.test.ts`:** los primeros 3 de 4 árboles numerados, los 4 con `--max 10`, 1 con G1, `--max 2`, un ciclo (dibuja los que no repiten el ciclo), un rechazo y los errores de uso.

## 5. Referencias

- Hopcroft, Motwani y Ullman, _Introducción a la teoría de autómatas, lenguajes y computación_, secciones 5.2 (árboles de derivación) y 5.4 (ambigüedad).
- Augusto, sección 2.4.2 (el "else colgante").
- SPEC 02, secciones 3.18 y 3.21.
