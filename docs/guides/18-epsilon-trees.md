# Guía de estudio: 18 — Árboles ε

> **Paso 18 del SPEC 02.** Archivos: `packages/core/src/trees/epsilon.ts`, `packages/core/src/trees/tree.ts` (el tipo `ParseTree` y la aritmética de conteos), `packages/core/src/trees/render.ts` (el dibujo en texto) y el comando `epsilon-trees`.
> Ficha relacionada: [`18-backpointers-and-trees.md`](../concepts/18-backpointers-and-trees.md) (se escribe en el paso 19).

---

## 1. El problema que resuelve

Con este paso empiezan los **árboles**. Earley ya sabe si un relato es válido; ahora hay que reconstruir **cómo**: el árbol de derivación, que muestra qué parte del relato es el Planteo, cuál la Investigación y cuál el Desenlace.

Los árboles se reconstruyen siguiendo los **enlaces** de cada ítem (paso 19). Pero hay un tipo de enlace que no alcanza: el enlace **`nullable`** del arreglo de ε (paso 15). Ese enlace dice "acá se salteó HallazgoOpc porque derivó ε", pero **no apunta a ningún ítem**: no hay un subárbol guardado en el chart.

Este paso resuelve eso: genera los **subárboles ε** de un símbolo anulable directamente **desde la gramática**, y los cuenta.

| En G1                       | Subárbol ε        |
| --------------------------- | ----------------- |
| un relato sin hallazgo      | `HallazgoOpc → ε` |
| un relato sin epílogo       | `EpiOpc → ε`      |
| una línea de sospecha vacía | `CuerpoLinea → ε` |

---

## 2. Cómo funciona

### 2.1 Qué es un árbol ε

Un árbol que deriva la cadena vacía. Para un símbolo anulable B:

- si B tiene la producción **B → ε**, un árbol es `B` con una sola hoja `ε`;
- si B tiene una producción **B → X₁…Xₖ con todos los Xᵢ anulables**, un árbol es `B` con un árbol ε de cada Xᵢ como hijos.

Las producciones con algún terminal o algún símbolo no anulable no sirven: no pueden derivar ε.

### 2.2 Cuántos hay

Se cuenta como se cuentan caminos:

- **suma** sobre las producciones que sirven: una u otra;
- **producto** sobre los hijos de cada producción: elegir un árbol para cada uno, en forma independiente.

Ejemplo (`examples/grammars/epsilon-choices.grammar`): `S → A A | x`, `A → ε | B`, `B → ε | b`.

| Símbolo | Producciones que derivan ε | Cuenta        |
| ------- | -------------------------- | ------------- |
| B       | `B → ε`                    | 1             |
| A       | `A → ε` y `A → B`          | 1 + 1 = **2** |
| S       | `S → A A`                  | 2 × 2 = **4** |

En **G1, cada anulable tiene exactamente 1 árbol ε**: todas sus partes opcionales tienen una sola forma de faltar (`X → ε`).

### 2.3 Cuando son infinitos

Si un símbolo puede derivar ε **pasando por sí mismo** (`S → S | ε`), la vuelta S ⇒ S se repite cuantas veces se quiera: hay **infinitos** árboles ε. El conteo lo detecta (un símbolo que aparece mientras todavía se lo está contando) y devuelve `'infinite'`. Es el mismo concepto que los ciclos del paso 10.

---

## 3. Por qué así

- **Desde la gramática, no desde el chart:** el enlace `nullable` no apunta a ningún ítem, así que no hay otra fuente. Y alcanza: si B es anulable, sus árboles ε dependen solo de la gramática, no del relato.
- **Contar sin generar:** con la memoria (memoización) y la recursión, el conteo no necesita armar los árboles. Es la misma técnica que el paso 20 va a usar para contar los árboles de un relato entero.
- **`bigint` para los conteos:** los árboles de G0 crecen como los números de Catalan (C(197) tiene 115 dígitos). Un `number` de JavaScript pierde precisión después de 2⁵³.
- **`'infinite'` en lugar de no terminar:** un conteo con ciclos no puede dar un número; el valor especial lo dice y el programa sigue.

**Se adelantaron dos archivos del paso 19**, porque este paso ya los necesita:

- `trees/tree.ts`: el tipo `ParseTree` y las operaciones de conteo (`addCounts`, `multiplyCounts`);
- `trees/render.ts`: el dibujo del árbol en texto, para mostrar los árboles ε en la consola.

---

## 4. Cómo se usa en el programa

| Quién                             | Usa                                               | Para qué                                           |
| --------------------------------- | ------------------------------------------------- | -------------------------------------------------- |
| comando `epsilon-trees` (paso 18) | `countEpsilonTrees`, `epsilonTrees`, `renderTree` | mostrar la cuenta y los árboles                    |
| enumeración de árboles (paso 19)  | `epsilonTrees`                                    | completar el subárbol de cada enlace `nullable`    |
| conteo de árboles (paso 20)       | `countEpsilonTrees`                               | cuenta(enlace `nullable` sobre B) = árboles ε de B |

---

## 5. El código, función por función

### 5.1 El tipo `ParseTree` (`trees/tree.ts`)

```ts
export type ParseTree =
  | { kind: 'terminal'; symbol: SymbolName; tokenIndex: number }
  | { kind: 'epsilon' }
  | { kind: 'nonterminal'; symbol: SymbolName; production: Production; children: ParseTree[] };
```

Tres tipos de nodo: una **hoja con un evento** del relato (`tokenIndex` dice cuál), una **hoja ε** y un **nodo interno**, con la producción que se usó y un hijo por cada símbolo de su lado derecho. Es la definición de árbol de derivación de Hopcroft 5.2.

### 5.2 `addCounts` y `multiplyCounts` (`trees/tree.ts`)

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
- **Salvo el cero en un producto:** si una parte no se puede armar de ninguna forma (0), no hay árbol, aunque la otra parte tenga infinitas formas. Por eso el `if` del cero va primero.

### 5.3 `countEpsilonTrees({ grammar, nullable, symbol, known, inProgress })`

```ts
const remembered = known.get(symbol);
if (remembered !== undefined) {
  return remembered;
}
if (inProgress.has(symbol)) {
  return 'infinite';
}
inProgress.add(symbol);
let total: TreeCount = 0n;
for (const production of emptyProductionsOf({ grammar, nullable, symbol })) {
  const ways = production.rightSide.reduce<TreeCount>(
    (product, child) =>
      multiplyCounts({
        first: product,
        second: countEpsilonTrees({ grammar, nullable, symbol: child, known, inProgress }),
      }),
    1n,
  );
  total = addCounts({ first: total, second: ways });
}
inProgress.delete(symbol);
known.set(symbol, total);
return total;
```

- **`known` (la memoria):** si el símbolo ya se contó, se devuelve el resultado guardado. Sin esto, símbolos compartidos se contarían muchas veces.
- **`inProgress` (los que se están contando ahora):** si aparece un símbolo que todavía se está contando, se llegó a él desde sí mismo: hay un ciclo, y la respuesta es `'infinite'`.
- **El `for`** recorre solo las producciones que pueden derivar ε (`emptyProductionsOf`).
- **El `reduce`** multiplica los árboles ε de cada hijo, empezando en `1n`. Para `B → ε` no hay hijos, así que queda `1n`: un árbol, la hoja ε.
- `total` suma las formas de todas las producciones.
- Al terminar, el símbolo deja de estar "en curso" y su resultado queda en la memoria.

### 5.4 `epsilonTrees({ grammar, nullable, symbol, path })`

```ts
const onPath = new Set([...path, symbol]);
return emptyProductionsOf({ grammar, nullable, symbol })
  .filter((production) => production.rightSide.every((child) => !onPath.has(child)))
  .flatMap((production) =>
    combinations(
      production.rightSide.map((child) =>
        epsilonTrees({ grammar, nullable, symbol: child, path: onPath }),
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

### 5.5 `combinations(options)`

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

### 5.6 `renderTree(tree)` (`trees/render.ts`)

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

---

## 6. Ejemplo recorrido a mano

`epsilon-choices.grammar`, los árboles ε de S:

```sh
npm run sabueso -- epsilon-trees --grammar-file examples/grammars/epsilon-choices.grammar S
```

`S → A A`, y A tiene 2 árboles: `A → ε` y `A → B → ε`. `combinations` elige uno para cada A: 2 × 2 = 4 árboles. El cuarto:

```text
S
├─ A
│  └─ B
│     └─ ε
└─ A
   └─ B
      └─ ε
```

Fíjate en las barras: el primer A no es el último hijo de S, así que su subárbol lleva `│  ` a la izquierda (la rama de S sigue hacia el segundo A). El segundo A es el último: su subárbol lleva espacios.

---

## 7. Errores

Ninguna función lanza errores. El comando termina con código 2 si el símbolo no es un no terminal de la gramática. Un símbolo que no deriva ε no es un error: el comando lo dice y la cuenta es 0.

---

## 8. Consola y pruebas

```sh
npm run sabueso -- epsilon-trees --grammar g1 CuerpoLinea    # 1 tree: CuerpoLinea → ε
npm run sabueso -- epsilon-trees --grammar g1                # la cuenta de cada anulable
```

**`test/trees/epsilon.test.ts`:**

| Prueba         | Qué verifica                                                                     |
| -------------- | -------------------------------------------------------------------------------- |
| G1             | cada uno de los 10 anulables tiene exactamente 1 árbol ε (lo pide el spec)       |
| CuerpoLinea    | su árbol se dibuja `CuerpoLinea` / `└─ ε`                                        |
| varios árboles | A tiene 2; S → A A tiene 4, y se generan los 4 distintos                         |
| ciclos         | `S → S \| ε` y `S → S S \| ε` dan `infinite`; se lista solo el árbol sin repetir |
| no anulable    | Relato tiene 0 árboles ε                                                         |

**`test/trees/tree.test.ts`:** la suma y el producto, `infinite` que absorbe, el cero que gana, números de 200 dígitos, y el dibujo de un árbol chico.

**`test/command-line/epsilon-trees.test.ts`:** un símbolo, todos los anulables, los 4 árboles con un archivo, un ciclo, un símbolo no anulable y los errores de uso.

---

## 9. Preguntas probables en la defensa

**¿Qué es un árbol ε y por qué hace falta generarlo aparte?**
Un subárbol que deriva la cadena vacía. El arreglo de ε (paso 15) avanza sobre un símbolo anulable con un enlace `nullable`, que no apunta a ningún ítem: el chart no guarda ese subárbol. Se genera desde la gramática.

**¿Cómo se cuentan?**
Suma sobre las producciones que derivan ε (una u otra), y producto sobre los hijos de cada una (elecciones independientes). Con memoria, para no recontar, y `bigint`, porque las cuentas pueden ser enormes.

**¿Cuándo son infinitos?**
Cuando un símbolo deriva ε pasando por sí mismo, como `S → S | ε`: la vuelta se repite sin fin. El conteo lo detecta porque encuentra un símbolo que todavía se está contando.

**¿Cuántos árboles ε tienen los anulables de G1?**
Exactamente 1 cada uno: cada parte opcional tiene una sola forma de faltar (`X → ε`). Por eso las partes vacías nunca agregan ambigüedad en G1.

**¿Por qué `bigint` y no `number`?**
Porque `number` pierde precisión después de 2⁵³ (unos 9 × 10¹⁵), y los árboles de G0 llegan a C(197), un número de 115 dígitos.
