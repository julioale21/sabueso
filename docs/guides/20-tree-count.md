# Guía de estudio: 20 — Contar los árboles

> **Paso 20 del SPEC 02.** Archivos: `packages/core/src/trees/count.ts`, `packages/core/test/helpers/catalan.ts` (solo para las pruebas), `packages/core/src/command-line/story-source.ts` (la opción `--file`) y el comando `count`.
> Ficha teórica relacionada: [`docs/concepts/19-tree-count-catalan.md`](../concepts/19-tree-count-catalan.md).

---

## 1. El problema que resuelve

El paso 19 arma los árboles de a uno. Sirve para verlos, pero no para saber **cuántos son** cuando son muchísimos:

| Relato | Árboles en G0        | ¿Se pueden armar todos?        |
| ------ | -------------------- | ------------------------------ |
| A1     | 4                    | sí                             |
| V3     | 112                  | sí                             |
| L1     | C(197) ≈ 8,2 × 10¹¹⁴ | **no**: ni en millones de años |

Este paso **cuenta los árboles sin armarlos**. Da el número exacto de L1 en unos 200 milisegundos.

**Para qué sirve:**

- comprobar los números de la tabla 9.1 del spec;
- mostrar que en G0 la cantidad de árboles **crece exponencialmente** con los pasos, frente al **1 constante** de G1: el argumento cuantitativo de la defensa;
- la web muestra el total de árboles de cada relato;
- con una gramática cíclica, decir `infinite` en lugar de no terminar.

---

## 2. Cómo funciona

### 2.1 La idea: contar en lugar de construir

La enumeración (paso 19) recorre los enlaces y, por cada combinación, **arma** un árbol. El conteo recorre **los mismos enlaces**, pero en lugar de armar las combinaciones, **calcula cuántas son**:

| Enumerar (paso 19)                       | Contar (paso 20)           |
| ---------------------------------------- | -------------------------- |
| por cada enlace…                         | **suma** sobre los enlaces |
| …por cada lista de hijos del predecesor… | cuenta(predecesor)         |
| …por cada árbol de la causa…             | **×** cuenta(causa)        |
| …arma un árbol                           | (no arma nada)             |

- **Suma**, porque cada enlace es una forma alternativa de llegar al ítem: "una u otra".
- **Producto**, porque los hijos de la izquierda (predecesor) y el último hijo (causa) se eligen en forma independiente: "una y otra".

### 2.2 Programación dinámica: recordar lo calculado

El mismo ítem aparece como hijo de muchos otros. Sin memoria, se contaría una y otra vez, y el tiempo crecería como la cantidad de árboles (exponencial). **Recordando la cuenta de cada ítem**, cada uno se cuenta una sola vez: el tiempo es proporcional a la cantidad de ítems y enlaces del chart (decenas de miles para L1), no a la de árboles (10¹¹⁴).

### 2.3 Por qué G0 crece tan rápido

En G0, `Pasos → Pasos Pasos` permite agrupar los pasos de a dos de cualquier forma, como poner paréntesis en una suma sin reglas de asociatividad. Cada agrupación distinta es un árbol distinto:

| Pasos | Agrupaciones                  | Árboles en G0            |
| ----- | ----------------------------- | ------------------------ |
| 1     | PIS                           | 1                        |
| 2     | (PIS PIS)                     | 1                        |
| 3     | (PIS PIS) PIS · PIS (PIS PIS) | 2                        |
| 4     | …                             | 5                        |
| 198   | …                             | un número de 115 dígitos |

Cada paso más multiplica los árboles casi por 4: el crecimiento es **exponencial**. En G1, siempre 1.

**Nota (no es teoría de la materia):** la sucesión 1, 1, 2, 5, 14, 42… tiene nombre: son los **números de Catalan**, C(n) = (2n)! / ((n + 1)! n!). Con n pasos, G0 tiene C(n − 1) árboles. El programa no los usa para contar; solo las pruebas, para comprobar que el número de L1 es el correcto.

### 2.4 Ciclos: infinito

Si el recorrido llega a un ítem que **todavía se está contando**, ese ítem depende de sí mismo (A ⇒⁺ A): hay infinitos árboles, y la cuenta es `'infinite'`. Es el concepto de los ciclos del paso 10.

---

## 3. Por qué así

- **`bigint`:** C(197) tiene 115 dígitos. `number` (un decimal de 64 bits) solo es exacto hasta 2⁵³ ≈ 9 × 10¹⁵; después redondea. `bigint` es exacto para cualquier tamaño.
- **Memoización por ítem:** dos ítems iguales en conjuntos distintos son objetos distintos, así que la memoria usa el objeto mismo como clave (`Map<EarleyItem, …>`).
- **Mismos enlaces que la enumeración:** el conteo y la enumeración tienen que dar lo mismo; una prueba lo verifica en cuatro gramáticas.
- **La fórmula de Catalan solo en las pruebas** (`test/helpers/catalan.ts`): sirve para comprobar que L1 da el número correcto, como pide el spec. El motor no la necesita para contar.
- **`--file`:** L1 tiene 200 eventos; se lee de `test/fixtures/l1.txt`. La lectura vive en `command-line/story-source.ts`, para que la usen otros comandos (`parse`, `bench`).

---

## 4. Cómo se usa en el programa

| Quién                     | Llama a      | Recibe                              |
| ------------------------- | ------------ | ----------------------------------- |
| comando `count` (paso 20) | `countTrees` | el número, para imprimirlo          |
| `parse` (paso 22)         | `countTrees` | `treeCount` en el resultado         |
| web (SPEC 03)             | `parse`      | el total de árboles, junto al árbol |

---

## 5. El código, función por función

### 5.1 `countTrees({ grammar, recognition })`

```ts
const accepting = recognition.chart
  .at(-1)
  ?.items.find((item) => item.production === recognition.startProduction && item.dot === 1);
if (!recognition.accepted || accepting === undefined) {
  return 0n;
}
const context: CountContext = {
  grammar,
  nullableSymbols: computeNullable({ grammar }),
  known: new Map(),
  inProgress: new Set(),
  epsilonCounts: new Map(),
};
return countItem({ context, item: accepting });
```

- Busca el ítem de aceptación, como la enumeración. Si la entrada se rechazó, hay 0 árboles.
- El contexto lleva la **memoria** (`known`), los ítems **en curso** (`inProgress`) y la memoria de los árboles ε (`epsilonCounts`), compartida por todos los enlaces `nullable`.
- La cuenta del ítem `$S → S •` es la del relato: `$S` tiene un solo hijo, así que no cambia el número.

### 5.2 `countItem({ context, item })`

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

- **Primero la memoria:** si el ítem ya se contó, se devuelve el número guardado. Es lo que hace que cada ítem se cuente una sola vez.
- **Caso base:** con el punto en 0 no se reconoció nada: hay exactamente una forma (la lista vacía de hijos). Es el `yield []` de la enumeración.
- **Ciclo:** si el ítem ya está en curso, se volvió a él mientras se lo contaba: `'infinite'`.
- **El `for`** es la fórmula: para cada enlace, cuenta(predecesor) × cuenta(causa), y se suman. Es `childSequences` (paso 19) con números en lugar de árboles.
- Al terminar, el ítem sale de "en curso" y su cuenta queda en la memoria.

### 5.3 `countCause({ context, link })`

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
- Un anulable salteado: la cantidad de árboles ε del símbolo (paso 18). En G1 siempre es 1.

### 5.4 `readStory({ parsed, environment })` (`command-line/story-source.ts`)

- Si hay `--file`, lee el archivo y lo separa en eventos (como el paso 6). El título dice `200 events from l1.txt`.
- Si no, usa las palabras de la línea de comandos.
- Las dos cosas a la vez es un error de uso; un archivo que no existe da `Cannot read the story file`.

### 5.5 El comando `count`

- Imprime el número con su interpretación: `0 trees` (rechazado), `1 tree: unambiguous`, `8 trees: the grammar is ambiguous`, el número completo con su cantidad de dígitos si es enorme, o `Infinitely many trees`.
- Mide el tiempo del reconocimiento y el conteo con `performance.now()`.

---

## 6. Ejemplo recorrido a mano: `CRI PIS PIS PIS REV` con G0

Los `Pasos` sobre `PIS PIS PIS` (posiciones 1 a 4). Llamemos P(i, j) a la cuenta de los ítems `Pasos` completos que cubren de i a j:

| Tramo             | Cómo se llega                              | Cuenta                |
| ----------------- | ------------------------------------------ | --------------------- |
| un PIS            | `Pasos → Paso`                             | 1                     |
| P(1, 3), dos PIS  | `Pasos → Pasos Pasos` partido en 1 + 1     | 1 × 1 = 1             |
| P(2, 4), dos PIS  | igual                                      | 1                     |
| P(1, 4), tres PIS | partido en (1) + (2, 4), o en (1, 3) + (1) | 1 × 1 + 1 × 1 = **2** |

El ítem `Pasos → Pasos Pasos •` de 1 a 4 tiene **dos enlaces** (dos formas de partir): la suma da 2 = C(2). Con 4 pistas daría 5 = C(3), y así: cada tramo se cuenta una vez y se reutiliza.

```sh
npm run sabueso -- count --grammar g0 "CRI PIS PIS PIS REV"    # 2 trees
npm run sabueso -- trees --grammar g0 "CRI PIS PIS PIS REV"    # los 2, dibujados
```

---

## 7. Errores

`countTrees` no lanza errores: devuelve 0, un número o `'infinite'`. El comando informa un archivo que no se puede leer (código 1) y un uso incorrecto (código 2).

---

## 8. Consola y pruebas

```sh
npm run sabueso -- count --grammar g0 "CTX HAL ENC INT SOS PIS DSC REV CNF CAP"   # 8 trees
npm run sabueso -- count --grammar g0 --file packages/core/test/fixtures/l1.txt   # C(197), 115 dígitos
npm run sabueso -- count --grammar g1 --file packages/core/test/fixtures/l1.txt   # 1 tree
```

**`test/trees/count.test.ts`:**

| Prueba                 | Qué verifica                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------- |
| tabla 9.1              | V1, V2, V3, A1, M1, I5, I7 e I1 con G0 y G1 (lo pide el spec)                                                       |
| L1                     | C(197) en G0, comparado con la fórmula, 115 dígitos; 1 en G1 (lo pide el spec)                                      |
| crecimiento            | con n pistas, C(n − 1) (Catalan) para n = 1 a 12                                                                    |
| igual a la enumeración | en G0, `arithmetic-ambiguous` y `parentheses`                                                                       |
| casos especiales       | `test-cyclic` da `infinite` (lo pide el spec); rechazo da 0; entrada vacía; aritmética ambigua (2) y no ambigua (1) |

**`test/command-line/count.test.ts`:** V1, L1 desde un archivo (con sus 115 dígitos), L1 con G1, un ciclo, un rechazo, un archivo inexistente y las dos fuentes a la vez.

---

## 9. Preguntas probables en la defensa

**¿Cómo se cuentan los árboles sin armarlos?**
Recorriendo los mismos enlaces que la enumeración, pero sumando sobre los enlaces (formas alternativas) y multiplicando la cuenta del predecesor por la de la causa (elecciones independientes). Con memoria, cada ítem se cuenta una sola vez.

**¿Por qué es rápido aunque haya 10¹¹⁴ árboles?**
Porque el trabajo depende de la cantidad de ítems y enlaces del chart (decenas de miles para L1), no de la cantidad de árboles. Es programación dinámica: los subproblemas compartidos se resuelven una vez.

**¿Por qué G0 tiene tantos árboles?**
Por `Pasos → Pasos Pasos`: los pasos se pueden agrupar de a dos de muchas formas, como paréntesis en una suma sin asociatividad, y cada agrupación es un árbol. La cantidad crece exponencialmente (cada paso más la multiplica casi por 4). Si preguntan por la sucesión: son los números de Catalan.

**¿Por qué `bigint`?**
Porque `number` es exacto solo hasta 2⁵³ ≈ 9 × 10¹⁵. C(197) tiene 115 dígitos.

**¿Qué significa `infinite`?**
Que la gramática tiene un ciclo A ⇒⁺ A sobre esa entrada: la vuelta se repite sin fin. El conteo lo detecta al encontrar un ítem que todavía se está contando.

**¿Para qué sirve en el proyecto?**
Para verificar la tabla 9.1, para que la web muestre el total de árboles, y como el argumento más fuerte contra G0: un relato de 200 eventos con 10¹¹⁴ árboles, frente a 1 en G1.
