# Guía de estudio: 21 — La derivación más a la izquierda

> **Paso 21 del SPEC 02.** Archivos: `packages/core/src/trees/derivation.ts` y el comando `packages/core/src/command-line/commands/derive.ts`.
> Ficha teórica relacionada: [`docs/concepts/20-leftmost-derivation.md`](../concepts/20-leftmost-derivation.md).

---

## 1. El problema que resuelve

El árbol (paso 19) muestra la estructura del relato de un vistazo. La **derivación** muestra **cómo se llega** al relato desde el símbolo inicial, reemplazo por reemplazo:

```text
Relato ⇒ Planteo Investigacion Desenlace ⇒ Hecho MarcoOpc Investigacion Desenlace ⇒ … ⇒ CRI SOS PIS INT REV
```

Es la otra forma de escribir una derivación en la materia, la de los ejercicios. Para el proyecto sirve para:

- **la web:** el panel "Derivación más a la izquierda", sincronizado con el árbol (al elegir un paso se resalta el nodo que se reemplazó);
- **la ambigüedad:** la definición formal es "dos derivaciones más a la izquierda distintas". Con `--tree` se pueden mostrar las de G0;
- **el autómata de pila (paso 26):** las expansiones de su camino de aceptación son esta misma derivación.

---

## 2. Cómo funciona

### 2.1 Árbol y derivación dicen lo mismo

Una derivación **más a la izquierda** reemplaza siempre el no terminal de más a la izquierda. Si se recorre el árbol en **preorden** (primero el nodo, después sus hijos de izquierda a derecha), las producciones aparecen exactamente en ese orden:

| Preorden del árbol (G1, A1)              | Paso de la derivación                                         |
| ---------------------------------------- | ------------------------------------------------------------- |
| Relato → Planteo Investigacion Desenlace | 1                                                             |
| Planteo → Hecho MarcoOpc                 | 2 (Planteo es el primero de la forma)                         |
| Hecho → CRI HallazgoOpc                  | 3 (Hecho es el primero)                                       |
| HallazgoOpc → ε                          | 4 (CRI ya es terminal: HallazgoOpc es el primero no terminal) |
| MarcoOpc → ε                             | 5                                                             |
| Investigacion → Pasos                    | 6 (todo el Planteo ya está resuelto)                          |
| …                                        | …                                                             |

**Por qué coinciden:** el preorden termina un subárbol entero (todo lo de la izquierda) antes de pasar al hermano de la derecha. Así, cuando le toca a un nodo, todo lo que está a su izquierda en la forma ya es terminal: es el no terminal de más a la izquierda.

### 2.2 El algoritmo

1. La primera forma es el símbolo inicial: `[Relato]`.
2. Se toman las producciones del árbol en preorden.
3. Para cada una, se reemplaza el no terminal de más a la izquierda (que es su lado izquierdo) por su lado derecho. Con una producción ε, simplemente desaparece.
4. Cada reemplazo es un paso: se guarda la forma nueva y la producción.

---

## 3. Por qué así

- **Del árbol, no del chart:** el árbol ya tiene toda la información (paso 19). La derivación es solo otra forma de mostrarlo: Hopcroft 5.2.5.
- **Con la producción de cada paso:** la web la usa para resaltar el nodo del árbol, y la consola la muestra al lado de la forma.
- **`--tree k`** en el comando: en G0, A1 tiene 4 árboles, y mostrar dos derivaciones distintas del mismo relato es mostrar la ambigüedad con su definición formal.

---

## 4. Cómo se usa en el programa

| Quién                      | Llama a              | Recibe                         |
| -------------------------- | -------------------- | ------------------------------ |
| comando `derive` (paso 21) | `leftmostDerivation` | los pasos, para imprimirlos    |
| `parse` (paso 22)          | `leftmostDerivation` | la derivación del primer árbol |
| web (SPEC 03)              | `parse`              | el panel de derivación         |

---

## 5. El código, función por función

### 5.1 `leftmostDerivation(tree)`

```ts
if (tree.kind !== 'nonterminal') {
  return [];
}
const steps: DerivationStep[] = [{ form: [tree.symbol], production: null }];
let form: SymbolName[] = [tree.symbol];
for (const production of productionsInPreorder(tree)) {
  form = replaceLeftmostNonterminal({ form, production });
  steps.push({ form, production });
}
return steps;
```

- El paso 0 es el símbolo inicial solo, sin producción (`null`).
- Por cada producción del preorden, se arma la forma siguiente y se guarda con la producción que se aplicó.
- `form` se reemplaza por una lista **nueva** en cada paso (no se modifica la anterior), así cada paso conserva su propia forma.

### 5.2 `productionsInPreorder(tree)`

```ts
if (tree.kind !== 'nonterminal') {
  return [];
}
return [tree.production, ...tree.children.flatMap(productionsInPreorder)];
```

- **El preorden en una línea:** la producción del nodo, seguida de las de sus hijos, de izquierda a derecha.
- Las hojas (terminales y ε) no aportan producciones.

### 5.3 `replaceLeftmostNonterminal({ form, production })`

```ts
const position = form.indexOf(production.leftSide);
return [...form.slice(0, position), ...production.rightSide, ...form.slice(position + 1)];
```

- `indexOf` busca la **primera** aparición del lado izquierdo. Por el preorden, todo lo que está antes ya es terminal, y un terminal nunca se llama igual que un no terminal (N ∩ Σ = ∅, paso 2): esa primera aparición es el no terminal de más a la izquierda.
- Arma la forma nueva en tres partes: lo de antes, el lado derecho, lo de después. Con `A → ε` el lado derecho está vacío: A desaparece.

### 5.4 El comando `derive`

- Arma el árbol número k (`--tree k`, por defecto 1) con `parseTrees` y escribe una fila por paso: el número, la forma (con `⇒`) y la producción aplicada.
- Si la entrada se rechaza, no hay derivación (código 1). Si tiene menos de k árboles, es un error de uso (código 2).
- También acepta `--file` para el relato.

---

## 6. Ejemplo recorrido a mano

```sh
npm run sabueso -- derive --grammar g1 "CRI SOS PIS INT REV"
```

Los primeros pasos (los 18 coinciden con la sección 9.2 del spec):

| Paso | Forma sentencial                                 | Producción               | Qué se reemplazó                             |
| ---- | ------------------------------------------------ | ------------------------ | -------------------------------------------- |
| 0    | Relato                                           |                          |                                              |
| 1    | Planteo Investigacion Desenlace                  | Relato → …               | Relato                                       |
| 2    | Hecho MarcoOpc Investigacion Desenlace           | Planteo → Hecho MarcoOpc | Planteo, el primero                          |
| 3    | CRI HallazgoOpc MarcoOpc Investigacion Desenlace | Hecho → CRI HallazgoOpc  | Hecho                                        |
| 4    | CRI MarcoOpc Investigacion Desenlace             | HallazgoOpc → ε          | HallazgoOpc (CRI ya es terminal); desaparece |
| 5    | CRI Investigacion Desenlace                      | MarcoOpc → ε             | MarcoOpc; desaparece                         |

**La ambigüedad, con la definición formal:**

```sh
npm run sabueso -- derive --grammar g0 --tree 1 "CRI SOS PIS INT REV"
npm run sabueso -- derive --grammar g0 --tree 2 "CRI SOS PIS INT REV"
```

Las dos derivaciones empiezan igual y se separan cuando hay que expandir los Pasos: son dos derivaciones más a la izquierda distintas del mismo relato.

---

## 7. Errores

`leftmostDerivation` no lanza errores. El comando: entrada rechazada (código 1), `--tree` inválido o mayor que la cantidad de árboles (código 2).

---

## 8. Consola y pruebas

**`test/trees/derivation.test.ts`:**

| Prueba                 | Qué verifica                                                                                                    |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| A1 con G1              | las 19 formas de la sección 9.2, una por una (lo pide el spec)                                                  |
| las producciones       | el paso 0 sin producción; los pasos 1 y 4                                                                       |
| siempre a la izquierda | en cuatro gramáticas, cada paso reemplaza el no terminal de más a la izquierda, y la última forma es la entrada |
| ambigüedad             | los 4 árboles de A1 en G0 dan 4 derivaciones distintas                                                          |
| entrada vacía          | `parentheses`: S ⇒ ε                                                                                            |

**`test/command-line/derive.test.ts`:** los 18 pasos con su producción, `--tree 2`, un número de árbol inexistente, un rechazo y un `--tree` inválido.

---

## 9. Preguntas probables en la defensa

**¿Qué es una derivación más a la izquierda?**
Una sucesión de formas sentenciales desde S hasta la cadena, reemplazando en cada paso el no terminal de más a la izquierda.

**¿Cómo se obtiene del árbol?**
Recorriendo el árbol en preorden: el orden de sus producciones es exactamente el de la derivación más a la izquierda, porque el preorden termina todo lo de la izquierda antes de seguir a la derecha.

**¿Qué relación tiene con la ambigüedad?**
Árboles y derivaciones más a la izquierda se corresponden uno a uno. Por eso una gramática es ambigua si y solo si alguna cadena tiene dos derivaciones más a la izquierda distintas. Con `--tree` se ven dos en G0 para A1.

**¿Y con el autómata de pila?**
El autómata de pila de la gramática, en su camino de aceptación, expande los no terminales del tope en el mismo orden: sus expansiones son la derivación más a la izquierda (ficha 24).
