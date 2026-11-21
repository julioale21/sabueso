# Guía de estudio: 19 — Los árboles de un relato

> **Paso 19 del SPEC 02.** Archivos: `packages/core/src/trees/enumerate.ts` y el comando `packages/core/src/command-line/commands/trees.ts` (y `trees/tree.ts` y `trees/render.ts`, adelantados en el paso 18).
> Fichas teóricas relacionadas: [`18-backpointers-and-trees.md`](../concepts/18-backpointers-and-trees.md) y [`21-ambiguity-g0-vs-g1.md`](../concepts/21-ambiguity-g0-vs-g1.md) (borrador).

---

## 1. El problema que resuelve

Earley ya dice si un relato es válido. Este paso responde **cómo**: arma el **árbol de derivación**, que muestra la estructura del relato (qué es el Planteo, qué la Investigación, qué el Desenlace) y, si hay más de un árbol, **la ambigüedad**.

Es la parte más visible del proyecto para la defensa:

```sh
npm run sabueso -- trees --grammar g0 "CRI SOS PIS INT REV"    # 4 trees: G0 es ambigua
npm run sabueso -- trees --grammar g1 "CRI SOS PIS INT REV"    # 1 tree: G1 no lo es
```

Hasta este paso, Earley era un **reconocedor** (sí o no). Con los árboles, pasa a ser un **analizador sintáctico** (parser): da la estructura.

---

## 2. Cómo funciona

### 2.1 Los enlaces ya guardan el árbol

Cada vez que Earley avanzó un punto, guardó un **enlace** (paso 13): de qué ítem venía (el **predecesor**, con el punto un lugar antes) y qué se reconoció en el medio (la **causa**):

| Tipo de enlace | La causa es…                           | En el árbol, ese hijo es…    |
| -------------- | -------------------------------------- | ---------------------------- |
| `scan`         | un token leído                         | una hoja con el evento (CRI) |
| `complete`     | un ítem hijo completo (B → γ •)        | el subárbol de ese ítem      |
| `nullable`     | un símbolo anulable salteado (paso 15) | un árbol ε (paso 18)         |

Un ítem completo `(A → X₁…Xₖ •, i)` tiene un enlace por el último símbolo, su predecesor tiene uno por el anterior, y así hasta el punto en 0. Recorriendo esa cadena hacia atrás se obtienen los k hijos de A.

### 2.2 El algoritmo

1. Se busca el ítem de aceptación `($S → S •, 0)` en el último conjunto.
2. **Los hijos de un ítem:** si el punto está en 0, todavía no hay hijos (una lista vacía). Si no, por cada enlace: los hijos del predecesor, más el árbol de la causa al final.
3. **El árbol de un ítem completo** `B → γ •` es un nodo B con esos hijos (o una hoja ε si γ está vacío).
4. La raíz es `$S`; el árbol del relato es su único hijo, `S`.

### 2.3 Varios enlaces, varios árboles

Si un ítem tiene **dos enlaces**, se llegó a él de dos formas: hay dos listas de hijos posibles, y por lo tanto dos árboles. El algoritmo recorre **todas** las combinaciones: cada enlace de cada ítem, por cada árbol de su causa. Así salen los 4 árboles de A1 en G0.

### 2.4 De a uno y hasta un límite

En G0 un relato puede tener muchísimos árboles: L1 tiene C(197), un número de 115 dígitos. No se pueden armar todos. Por eso los árboles se producen **de a uno**, con un **generador** de JavaScript (`function*`): el siguiente árbol recién se arma cuando se lo pide. `parseTrees` pide hasta un límite: por defecto **3**, que alcanza para mostrar una ambigüedad (`DEFAULT_TREE_LIMIT`). Cuántos hay en total lo dice el conteo (guía 20), que no arma ningún árbol.

---

## 3. Por qué así

- **Enlaces en lugar de un bosque compartido (SPPF):** el SPPF representa todos los árboles en una sola estructura compacta, pero es mucho más complejo. Los enlaces son simples, ya están en el chart, y alcanzan para enumerar (este paso) y contar (paso 20).
- **Generadores:** permiten tener "infinitos o muchísimos" árboles sin armarlos. El consumidor decide cuántos quiere.
- **Orden fijo:** se recorren los enlaces en el orden en que se agregaron, así los árboles salen siempre en el mismo orden, y las pruebas y la web pueden numerarlos.
- **Ciclos:** con A ⇒⁺ A habría infinitos árboles y la recursión no terminaría. Se lleva la lista de ítems del camino actual y se saltea una rama que volvería a uno de ellos. Así la enumeración siempre termina (el paso 20 dice que la cuenta es infinita).

---

## 4. Cómo se usa en el programa

| Quién                      | Llama a                    | Recibe                                       |
| -------------------------- | -------------------------- | -------------------------------------------- |
| comando `trees` (paso 19)  | `parseTrees`, `renderTree` | los árboles, dibujados y numerados           |
| derivación (paso 21)       | `parseTrees`               | el primer árbol, para escribir su derivación |
| `parse` (paso 22) y la web | `parseTrees`               | los árboles, para dibujarlos en SVG          |

---

## 5. El código, función por función

### 5.1 `parseTrees({ grammar, recognition, limit })`

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

- Pide árboles al generador hasta juntar `limit`. El `break` corta el generador: los árboles que siguen **nunca se arman**.
- Por eso funciona con L1: pedir 3 árboles cuesta lo mismo que armar 3, no C(197).

### 5.2 `enumerateTrees({ grammar, recognition })`

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
- Busca el ítem de aceptación en el último conjunto (`chart.at(-1)`): la producción `$S → S` con el punto al final. Si la entrada se rechazó, no hay árboles: `return` termina el generador sin entregar nada.
- `computeNullable` hace falta para los árboles ε.
- El árbol que arma `treesOfItem` tiene raíz `$S`; el del relato es su único hijo (`children[0]`, que se toma con `const [story] = …`).

### 5.3 `treesOfItem({ context, item })`

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
- `onPath`: si el ítem ya está en el camino actual, se llegó a él desde sí mismo (un ciclo): esta rama no da árboles. Se agrega antes de bajar y se saca al terminar, para que otras ramas sí puedan usarlo.
- Una producción vacía (`B → ε`) tiene cero hijos: el nodo lleva una hoja ε.

### 5.4 `childSequences({ context, item })`

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

- **Es el corazón del paso.** Da las listas de hijos para los símbolos **antes del punto** del ítem.
- **Caso base:** con el punto en 0, todavía no se reconoció nada: una sola lista, vacía.
- **Caso general**, para cada enlace:
  - `childSequences(link.predecessor)`: las listas de hijos del mismo ítem con el punto un lugar antes (todos los símbolos anteriores);
  - `causeTrees({ link })`: los árboles posibles del símbolo que se reconoció en este avance;
  - cada combinación (`[...before, child]`) es una lista de hijos posible.
- **Los tres `for` anidados recorren todas las combinaciones:** varios enlaces, varias listas del predecesor, varios árboles de la causa. Es exactamente donde se multiplica la ambigüedad.
- La recursión va hacia atrás (hacia el punto 0), pero la lista se arma hacia adelante: `before` tiene los hijos de la izquierda y `child` se agrega a la derecha.

### 5.5 `causeTrees({ context, link })`

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

- **`scan`:** una hoja con el terminal leído. El símbolo es el que estaba después del punto del predecesor (`rightSide[predecessor.dot]`), y `tokenIndex` dice qué evento del relato es.
- **`complete`:** los árboles del ítem hijo. `yield*` entrega, uno por uno, todo lo que produce otro generador.
- **`nullable`:** los árboles ε del símbolo salteado (paso 18). En G1 hay exactamente uno.

---

## 6. Ejemplo recorrido a mano: los 4 árboles de A1 en G0

```sh
npm run sabueso -- trees --grammar g0 "CRI SOS PIS INT REV"
```

La Investigación de cada árbol (Planteo y Desenlace son iguales en los cuatro):

| Árbol | Estructura de los Pasos | La sospecha (SOS) abarca |
| ----- | ----------------------- | ------------------------ |
| 1     | ((SOS) (PIS)) (INT)     | nada                     |
| 2     | (SOS PIS) (INT)         | PIS                      |
| 3     | (SOS) ((PIS) (INT))     | nada                     |
| 4     | (SOS (PIS INT))         | PIS e INT                |

**Dónde se produce:** los ítems de Pasos completos en S4 (después de INT) tienen varios enlaces: el Completer los alcanzó por varios caminos, uno por cada forma de partir `SOS PIS INT` entre `Pasos → Pasos Pasos`, y por cada alcance de `Linea → SOS Pasos`. `childSequences` recorre todos.

**4 árboles, 3 lecturas:** los árboles 1 y 3 dicen lo mismo (la sospecha no abarca nada) y solo cambian la agrupación de los pasos. Con G1 sale **1** árbol: la sospecha abarca todo hasta la revelación.

---

## 7. Errores

No hay errores nuevos. El comando termina con código 1 si el relato se rechaza (no tiene árboles) y con código 2 si `--max` no es un entero mayor que 0.

---

## 8. Consola y pruebas

```sh
npm run sabueso -- trees --grammar g0 "CRI SOS PIS INT REV"            # the first 3 of 4 trees
npm run sabueso -- trees --grammar g0 --max 10 "CRI SOS PIS INT REV"   # all 4
npm run sabueso -- trees --grammar g1 "CRI PIS REV"                    # 1 tree, with its ε-subtrees
```

**`test/trees/enumerate.test.ts`:**

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

**`test/command-line/trees.test.ts`:** los primeros 3 de 4 árboles numerados, los 4 con `--max 10`, 1 con G1, `--max 2`, un ciclo (infinitos árboles: dibuja los que no repiten el ciclo), un rechazo y los errores de uso.

**El resumen del comando:** como contar es barato, `trees` llama a `countTrees` y siempre dice el total: `The first 3 of 4 trees: the grammar is ambiguous for this input (--max n draws more)`. Con un ciclo: `Infinitely many trees (a cycle A ⇒+ A): … Drawn: 2, the ones that go around no cycle`.

---

## 9. Preguntas probables en la defensa

**¿Cómo se reconstruye el árbol desde el chart?**
Siguiendo los enlaces hacia atrás desde ($S → S •, 0). Cada enlace dice qué se reconoció para avanzar el punto: un token (una hoja), un ítem hijo completo (un subárbol) o un anulable (un árbol ε). Los enlaces de un ítem completo, del último símbolo al primero, dan sus hijos.

**¿Dónde está la ambigüedad?**
En los ítems con varios enlaces: se llegó a ellos de varias formas. Cada combinación de enlaces da un árbol distinto.

**¿Por qué un generador?**
Porque puede haber muchísimos árboles (C(197) en L1). El generador arma cada árbol recién cuando se lo pide; pedir 3 cuesta 3, no todos.

**¿Por qué A1 tiene 4 árboles pero 3 lecturas?**
Porque dos de los árboles solo cambian la agrupación de los pasos (`Pasos → Pasos Pasos`), que no cambia lo que significa el relato. Las lecturas distintas vienen de hasta dónde llega la sospecha: nada, PIS, o PIS e INT.

**¿Qué diferencia hay entre reconocer y analizar?**
Reconocer es decidir si w ∈ L(G) (sí o no). Analizar es además dar la estructura: el árbol de derivación. Earley con enlaces hace las dos cosas.

**¿Qué pasa con una gramática cíclica?**
Tendría infinitos árboles. La enumeración saltea las ramas que vuelven a un ítem del camino, así siempre termina; el paso 20 informa que la cuenta es infinita.
