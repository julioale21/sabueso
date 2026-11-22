# 20 — Contar los árboles

> Archivos: `packages/core/src/trees/count.ts`, `packages/core/src/command-line/story-source.ts` (la opción `--file`), el comando `count` y `packages/core/test/helpers/catalan.ts` (solo para las pruebas).

## 1. Teoría

La [guía 19](19-arboles-de-un-relato.md) arma los árboles de a uno. Pero en G0 pueden ser muchísimos: L1 tiene un número de 115 dígitos. Este paso **cuenta los árboles sin armarlos**, con programación dinámica sobre los mismos enlaces de Earley:

- cuenta(ítem con el punto en 0) = 1;
- cuenta(ítem) = Σ sobre sus enlaces de cuenta(predecesor) × cuenta(causa);
- cuenta(token) = 1; cuenta(ítem hijo) es recursiva; cuenta(anulable B) = cantidad de árboles ε de B ([guía 18](18-arboles-epsilon.md));
- la cuenta de cada ítem se recuerda (**memoización**): cada ítem se cuenta una sola vez.

**Suma**, porque cada enlace es una forma alternativa de llegar al ítem ("una u otra"). **Producto**, porque los hijos de la izquierda y el último hijo se eligen en forma independiente ("una y otra"). Si se vuelve a un ítem que todavía se está contando, hay un ciclo A ⇒⁺ A ([guía 10](10-ciclos.md)): la cuenta es **`'infinite'`**.

En G0, `Pasos → Pasos Pasos` agrupa los pasos de a dos de todas las formas posibles, y cada agrupación es un árbol. La cantidad crece **exponencialmente** con los pasos (son los números de Catalan, C(n − 1) para n pasos). En G1, siempre 1.

**Ejemplo:** `CRI PIS PIS PIS REV` con G0. `Pasos` agrupa `PIS PIS PIS` de dos formas: (PIS PIS) PIS o PIS (PIS PIS).

| Tramo (posiciones) | Cómo se llega                              | Cuenta                |
| ------------------ | ------------------------------------------ | --------------------- |
| un PIS             | `Pasos → Paso`                             | 1                     |
| dos PIS (1 a 3)    | `Pasos → Pasos Pasos` partido en 1 + 1     | 1 × 1 = 1             |
| dos PIS (2 a 4)    | igual                                      | 1                     |
| tres PIS (1 a 4)   | partido en (1) + (2, 4), o en (1, 3) + (1) | 1 × 1 + 1 × 1 = **2** |

El ítem `Pasos → Pasos Pasos •` de 1 a 4 tiene **dos enlaces**: la suma da **2 árboles**. Con 4 pasos daría 5. Cada tramo se cuenta una vez y se reutiliza.

## 2. Por qué así

- **Memoización:** sin ella, el tiempo crecería como la cantidad de árboles. Con ella, es proporcional a los ítems y enlaces del chart (decenas de miles para L1). L1 se cuenta en unos 200 milisegundos.
- **`bigint`:** C(197) tiene 115 dígitos. `number` (un decimal de 64 bits) solo es exacto hasta 2⁵³ ≈ 9 × 10¹⁵; después redondea. `bigint` es exacto para cualquier tamaño.
- **Memoización por ítem:** dos ítems iguales en conjuntos distintos son objetos distintos. La memoria usa el objeto mismo como clave (`Map<EarleyItem, …>`).
- **Mismos enlaces que la enumeración:** el conteo y la enumeración tienen que dar lo mismo; una prueba lo verifica en varias gramáticas.
- **La fórmula de Catalan solo en las pruebas** (`test/helpers/catalan.ts`): comprueba que L1 da el número correcto, como pide el spec. El motor no la necesita.
- **`--file`:** L1 tiene 200 eventos; se lee de `test/fixtures/l1.txt`. La lectura vive en `command-line/story-source.ts`, para que la usen otros comandos (`parse`, `bench`).
- **Quién lo usa:** el comando `count`, `parse` ([guía 22](22-api-publica.md), el campo `treeCount`), el comando `trees` (para decir el total) y la web, que muestra el total junto al árbol.

## 3. El código, función por función

### 3.1 `countTrees({ grammar, recognition })`

```ts
const accepting = recognition.acceptingItem;
if (accepting === null) {
  return 0n;
}
const context: CountContext = {
  grammar,
  nullableSymbols: computeNullable(grammar),
  known: new Map(),
  inProgress: new Set(),
  epsilonCounts: new Map(),
};
return countItem({ context, item: accepting });
```

- Parte del ítem de aceptación ($S → S •, 0), que `recognize` devuelve en `acceptingItem`. Si la entrada se rechazó, es `null` y hay 0 árboles.
- El contexto lleva la **memoria** (`known`), los ítems **en curso** (`inProgress`) y la memoria de los árboles ε (`epsilonCounts`), compartida por todos los enlaces `nullable`.
- La cuenta de `$S → S •` es la del relato: `$S` tiene un solo hijo, así que no cambia el número.
- No lanza errores: devuelve 0, un número o `'infinite'`.

### 3.2 `countItem({ context, item })`

```ts
const remembered = context.known.get(item);
if (remembered !== undefined) {
  return remembered;
}
if (item.dot === 0) {
  return 1n;
}
if (context.inProgress.has(item)) {
  return 'infinite';
}
context.inProgress.add(item);
let total: TreeCount = 0n;
for (const link of item.links) {
  const ways = multiplyCounts({
    first: countItem({ context, item: link.predecessor }),
    second: countCause({ context, link }),
  });
  total = addCounts({ first: total, second: ways });
}
context.inProgress.delete(item);
context.known.set(item, total);
return total;
```

- **Primero la memoria:** si el ítem ya se contó, devuelve el número guardado. Así cada ítem se cuenta una sola vez.
- **Caso base:** con el punto en 0 no se reconoció nada. Hay exactamente una forma (la lista vacía de hijos). Es el `yield []` de la enumeración.
- **Ciclo:** si el ítem ya está en curso, se volvió a él mientras se lo contaba: `'infinite'`.
- **El `for` es la fórmula:** para cada enlace, cuenta(predecesor) × cuenta(causa), y se suman. Es `childSequences` ([guía 19](19-arboles-de-un-relato.md)) con números en lugar de árboles.
- `multiplyCounts` y `addCounts` (en `trees/tree.ts`) operan sobre `bigint` y propagan `'infinite'`. En el producto, un 0 gana sobre `'infinite'`: si no hay forma de armar una parte, no hay ningún árbol.
- Al terminar, el ítem sale de "en curso" y su cuenta queda en la memoria.

### 3.3 `countCause({ context, link })`

```ts
if (link.kind === 'scan') {
  return 1n;
}
if (link.kind === 'complete') {
  return countItem({ context, item: link.child });
}
return countEpsilonTrees({
  grammar: context.grammar,
  nullableSymbols: context.nullableSymbols,
  symbol: link.symbol,
  known: context.epsilonCounts,
});
```

- Un token es una hoja: **1** forma.
- Un ítem hijo: su propia cuenta (recursiva, con la misma memoria).
- Un anulable salteado: la cantidad de árboles ε del símbolo ([guía 18](18-arboles-epsilon.md)). En G1 siempre es 1.

### 3.4 `readStory({ parsed, environment })` (`command-line/story-source.ts`)

- Con `--file`, lee el archivo y lo separa en eventos (como en la [guía 06](06-relato-como-cadena.md)). El título dice `200 events from l1.txt`.
- Sin `--file`, usa las palabras de la línea de comandos.
- Las dos cosas a la vez es un error de uso; un archivo que no existe da `Cannot read the story file`.

### 3.5 El comando `count`

- Imprime el número con su interpretación: `0 trees` (rechazado), `1 tree: unambiguous`, `8 trees: the grammar is ambiguous`, el número completo con su cantidad de dígitos si es enorme, o `Infinitely many trees`.
- Mide el tiempo del reconocimiento y el conteo con `performance.now()`.
- Termina con código 1 si no puede leer el archivo y con código 2 ante un uso incorrecto.

## 4. Consola y pruebas

```sh
npm run sabueso -- count --grammar g0 "CRI PIS PIS PIS REV"                       # 2 trees
npm run sabueso -- count --grammar g0 "CTX HAL ENC INT SOS PIS DSC REV CNF CAP"   # 8 trees
npm run sabueso -- count --grammar g0 --file packages/core/test/fixtures/l1.txt   # C(197), 115 dígitos
npm run sabueso -- count --grammar g1 --file packages/core/test/fixtures/l1.txt   # 1 tree
```

**`packages/core/test/trees/count.test.ts`:**

| Prueba                 | Qué verifica                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------- |
| tabla 9.1              | V1, V2, V3, A1, M1, I5, I7 e I1 con G0 y G1 (lo pide el spec)                                                       |
| L1                     | C(197) en G0, comparado con la fórmula, 115 dígitos; 1 en G1 (lo pide el spec)                                      |
| crecimiento            | con n pistas, C(n − 1) (Catalan) para n = 1 a 12                                                                    |
| igual a la enumeración | en G0, `arithmetic-ambiguous` y `parentheses`                                                                       |
| casos especiales       | `test-cyclic` da `infinite` (lo pide el spec); rechazo da 0; entrada vacía; aritmética ambigua (2) y no ambigua (1) |

**`packages/core/test/command-line/count.test.ts`:** V1, L1 desde un archivo (con sus 115 dígitos), L1 con G1, un ciclo, un rechazo, un archivo inexistente y las dos fuentes a la vez.

## 5. Referencias

- SPEC 02, sección 3.20.
- Para la nota sobre la sucesión: Graham, Knuth y Patashnik, _Matemáticas concretas_, sección 7.5 (los números de Catalan).
