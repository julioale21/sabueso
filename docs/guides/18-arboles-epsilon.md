# 18 — Árboles ε

> Archivos: `packages/core/src/trees/epsilon.ts`, `packages/core/src/trees/tree.ts` (el tipo `ParseTree` y la aritmética de conteos), `packages/core/src/trees/render.ts` (el dibujo en texto) y el comando `epsilon-trees`.

## 1. Teoría

Los árboles de un relato se reconstruyen siguiendo los enlaces de cada ítem ([guía 19](19-arboles-de-un-relato.md)). Pero el enlace **`nullable`** del arreglo de ε ([guía 15](15-arreglo-de-epsilon.md)) dice "acá se salteó HallazgoOpc porque derivó ε" y **no apunta a ningún ítem**: el chart no guarda ese subárbol. Este paso genera los **subárboles ε** desde la gramática, y los cuenta.

- **Árbol ε:** un árbol de derivación que deriva la cadena vacía. Para un símbolo anulable B:
  - si B tiene la producción **B → ε**, un árbol es `B` con una sola hoja `ε`;
  - si B tiene una producción **B → X₁…Xₖ con todos los Xᵢ anulables**, un árbol es `B` con un árbol ε de cada Xᵢ como hijos.
- **Cuántos hay:** **suma** sobre las producciones que sirven (una u otra) y **producto** sobre los hijos de cada una (elecciones independientes).
- **Infinitos:** si un símbolo deriva ε **pasando por sí mismo** (`S → S | ε`), la vuelta se repite sin fin. Es el mismo concepto que los ciclos de la [guía 10](10-ciclos.md).

### Ejemplo

`examples/grammars/epsilon-choices.grammar`: `S → A A | x`, `A → ε | B`, `B → ε | b`.

| Símbolo | Producciones que derivan ε | Cuenta        |
| ------- | -------------------------- | ------------- |
| B       | `B → ε`                    | 1             |
| A       | `A → ε` y `A → B`          | 1 + 1 = **2** |
| S       | `S → A A`                  | 2 × 2 = **4** |

En **G1, cada anulable tiene exactamente 1 árbol ε** (`HallazgoOpc → ε`, `EpiOpc → ε`, `CuerpoLinea → ε`…): cada parte opcional tiene una sola forma de faltar.

## 2. Por qué así

- **Desde la gramática, no desde el chart:** el enlace `nullable` no apunta a ningún ítem, así que no hay otra fuente. Y alcanza: los árboles ε de B dependen solo de la gramática, no del relato.
- **Contar sin generar:** con memoria (memoización) y recursión, el conteo no arma los árboles. Es la técnica que usa la [guía 20](20-conteo-de-arboles.md) para contar los árboles de un relato entero.
- **`bigint` para los conteos:** los árboles de G0 crecen como los números de Catalan (C(197) tiene 115 dígitos). Un `number` pierde precisión después de 2⁵³.
- **`'infinite'` en lugar de no terminar:** un conteo con ciclos no puede dar un número; el valor especial lo dice y el programa sigue.
- **Se adelantaron dos archivos de la guía 19**, porque este paso ya los necesita: `trees/tree.ts` (el tipo y el conteo) y `trees/render.ts` (el dibujo).

## 3. El código, función por función

### 3.1 El tipo `ParseTree` (`trees/tree.ts`)

```ts
export type ParseTree =
  | { kind: 'terminal'; symbol: SymbolName; tokenIndex: number }
  | { kind: 'epsilon' }
  | { kind: 'nonterminal'; symbol: SymbolName; production: Production; children: ParseTree[] };
```

Tres tipos de nodo: una **hoja con un evento** del relato (`tokenIndex` dice cuál), una **hoja ε** y un **nodo interno**, con la producción que se usó y un hijo por cada símbolo de su lado derecho. Es la definición de árbol de derivación de Hopcroft (sección 5).

### 3.2 `addCounts` y `multiplyCounts` (`trees/tree.ts`)

```ts
export function addCounts(first: TreeCount, second: TreeCount): TreeCount {
  return first === 'infinite' || second === 'infinite' ? 'infinite' : first + second;
}

export function multiplyCounts(first: TreeCount, second: TreeCount): TreeCount {
  if (first === 0n || second === 0n) {
    return 0n;
  }
  return first === 'infinite' || second === 'infinite' ? 'infinite' : first * second;
}
```

- `TreeCount` es un `bigint` (los números terminan en `n`: `1n`, `4n`) o `'infinite'`.
- **Infinito absorbe:** infinitas formas más algo, o por algo, siguen siendo infinitas.
- **Salvo el cero en un producto:** si una parte no se puede armar de ninguna forma (0), no hay árbol, aunque la otra tenga infinitas. Por eso el `if` del cero va primero.

### 3.3 `countEpsilonTrees({ grammar, nullableSymbols, symbol, known })` y `countWithMemory`

La función pública recibe la gramática, sus anulables, el símbolo y, opcionalmente, una memoria `known` para compartir resultados entre llamadas (el conteo de árboles la reutiliza). El estado de la recursión, `inProgress`, lo crea ella y se lo pasa a un ayudante privado, `countWithMemory`.

```ts
export function countEpsilonTrees({ grammar, nullableSymbols, symbol, known = new Map() }) {
  return countWithMemory({
    context: { grammar, nullableSymbols, known, inProgress: new Set() },
    symbol,
  });
}

function countWithMemory({ context, symbol }) {
  const { grammar, nullableSymbols, known, inProgress } = context;
  const remembered = known.get(symbol);
  if (remembered !== undefined) {
    return remembered;
  }
  if (inProgress.has(symbol)) {
    return 'infinite';
  }
  inProgress.add(symbol);
  let total: TreeCount = 0n;
  for (const production of emptyProductionsOf({ grammar, nullableSymbols, symbol })) {
    const ways = production.rightSide.reduce<TreeCount>(
      (product, child) =>
        multiplyCounts({ first: product, second: countWithMemory({ context, symbol: child }) }),
      1n,
    );
    total = addCounts({ first: total, second: ways });
  }
  inProgress.delete(symbol);
  known.set(symbol, total);
  return total;
}
```

(Los tipos de los parámetros están en el código; acá se omiten para leer mejor.)

- **`known` (la memoria):** si el símbolo ya se contó, se devuelve el resultado guardado. Sin esto, símbolos compartidos se contarían muchas veces.
- **`inProgress` (los que se están contando ahora):** si aparece un símbolo que todavía se está contando, se llegó a él desde sí mismo: hay un ciclo, y la respuesta es `'infinite'`.
- **El `for`** recorre solo las producciones que pueden derivar ε (`emptyProductionsOf`): las que tienen algún terminal o algún símbolo no anulable no sirven.
- **El `reduce`** multiplica los árboles ε de cada hijo, empezando en `1n`. Para `B → ε` no hay hijos, así que queda `1n`: un árbol, la hoja ε.
- `total` suma las formas de todas las producciones.
- Al terminar, el símbolo deja de estar "en curso" y su resultado queda en la memoria.

### 3.4 `epsilonTrees({ grammar, nullableSymbols, symbol, path })`

```ts
const onPath = new Set([...path, symbol]);
return emptyProductionsOf({ grammar, nullableSymbols, symbol })
  .filter((production) => production.rightSide.every((child) => !onPath.has(child)))
  .flatMap((production) =>
    combinations(
      production.rightSide.map((child) =>
        epsilonTrees({ grammar, nullableSymbols, symbol: child, path: onPath }),
      ),
    ).map((children): ParseTree => ({
      kind: 'nonterminal',
      symbol,
      production,
      children: children.length === 0 ? [{ kind: 'epsilon' }] : children,
    })),
  );
```

- `onPath` son los símbolos desde la raíz hasta acá. El `filter` descarta las producciones que volverían a uno de ellos: **así no se entra en un bucle** con un ciclo, y se listan solo los árboles sin símbolos repetidos (el conteo, en cambio, dice `'infinite'`).
- Para cada producción que sirve: se arman los árboles ε de cada hijo (`map`), y `combinations` arma todas las formas de elegir uno para cada posición.
- Cada combinación es un nodo `symbol` con esos hijos. Si la producción es `B → ε` (sin hijos), el nodo lleva una hoja `ε`.
- `flatMap` junta los árboles de todas las producciones.

### 3.5 `combinations(options)`

```ts
return options.reduce<ParseTree[][]>(
  (choices, treesForPosition) =>
    choices.flatMap((choice) => treesForPosition.map((tree) => [...choice, tree])),
  [[]],
);
```

- El **producto cartesiano**: `[[a1, a2], [b1]]` da `[[a1, b1], [a2, b1]]`.
- Empieza con una sola elección vacía (`[[]]`). Por cada posición, extiende cada elección parcial con cada árbol posible de esa posición.
- Con cero posiciones, devuelve `[[]]`: una sola elección, vacía. Por eso `B → ε` da un árbol.
- La cantidad de combinaciones es el producto de las cantidades: lo mismo que calcula `countEpsilonTrees`.

### 3.6 `renderTree(tree)` (`trees/render.ts`)

```ts
const lines = [`${prefix}${nodeLabel(tree)}`];
const children = tree.kind === 'nonterminal' ? tree.children : [];
children.forEach((child, index) => {
  const isLast = index === children.length - 1;
  lines.push(
    ...renderLines({
      tree: child,
      prefix: `${childPrefix}${isLast ? '└─ ' : '├─ '}`,
      childPrefix: `${childPrefix}${isLast ? '   ' : '│  '}`,
    }),
  );
});
```

- Un nodo por línea. Cada hijo lleva `├─` si tiene hermanos después, o `└─` si es el último.
- **Los dos prefijos:** `prefix` va antes del propio nodo; `childPrefix`, antes de todo lo que cuelga de él. Si el nodo no es el último hijo, sus descendientes llevan `│  `, para que la línea vertical de su padre siga bajando hasta el próximo hermano. Si es el último, llevan espacios: esa rama ya terminó.

Ninguna función lanza errores. El comando termina con código 2 si el símbolo no es un no terminal de la gramática; un símbolo que no deriva ε no es un error: la cuenta es 0.

## 4. Consola y pruebas

```sh
npm run sabueso -- epsilon-trees --grammar-file examples/grammars/epsilon-choices.grammar S
npm run sabueso -- epsilon-trees --grammar g1 CuerpoLinea    # 1 tree: CuerpoLinea → ε
npm run sabueso -- epsilon-trees --grammar g1                # la cuenta de cada anulable
```

El primero da los 4 árboles de S del ejemplo. El cuarto (`A → B → ε` en las dos posiciones):

```text
S
├─ A
│  └─ B
│     └─ ε
└─ A
   └─ B
      └─ ε
```

**`packages/core/test/trees/epsilon.test.ts`:**

| Prueba         | Qué verifica                                                                     |
| -------------- | -------------------------------------------------------------------------------- |
| G1             | cada uno de los 10 anulables tiene exactamente 1 árbol ε (lo pide el spec)       |
| CuerpoLinea    | su árbol se dibuja `CuerpoLinea` / `└─ ε`                                        |
| varios árboles | A tiene 2; S → A A tiene 4, y se generan los 4 distintos                         |
| ciclos         | `S → S \| ε` y `S → S S \| ε` dan `infinite`; se lista solo el árbol sin repetir |
| no anulable    | Relato tiene 0 árboles ε                                                         |

**`packages/core/test/trees/tree.test.ts`:** la suma y el producto, `infinite` que absorbe, el cero que gana, números de 200 dígitos, y el dibujo de un árbol chico.

**`packages/core/test/command-line/epsilon-trees.test.ts`:** un símbolo, todos los anulables, los 4 árboles con un archivo, un ciclo, un símbolo no anulable y los errores de uso.

## 5. Referencias

- Hopcroft, Motwani y Ullman, _Introducción a la teoría de autómatas, lenguajes y computación_, sección 5.2 (árboles de derivación).
- Aycock, J. y Horspool, R. N., "Practical Earley Parsing", _The Computer Journal_ 45(6), 2002 (el enlace `nullable` que origina este paso).
