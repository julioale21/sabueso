# 21 — La derivación más a la izquierda

> Archivos: `packages/core/src/trees/derivation.ts` y el comando `packages/core/src/command-line/commands/derive.ts`.

## 1. Teoría

El árbol ([guía 19](19-arboles-de-un-relato.md)) muestra la estructura del relato. La **derivación** muestra **cómo se llega** al relato desde el símbolo inicial, reemplazo por reemplazo.

- Una **derivación** de w es una sucesión S ⇒ α₁ ⇒ α₂ ⇒ … ⇒ w. Cada paso reemplaza un no terminal por el lado derecho de una de sus producciones.
- Es **más a la izquierda** si cada paso reemplaza el no terminal **de más a la izquierda**.
- Árboles y derivaciones más a la izquierda se corresponden **uno a uno**: el orden de las producciones es el **preorden** del árbol (un nodo antes que sus hijos, de izquierda a derecha). El preorden termina todo lo de la izquierda antes de seguir: cuando le toca a un nodo, lo de su izquierda ya es terminal.
- Por eso, G es **ambigua** si y solo si alguna w tiene dos derivaciones más a la izquierda distintas.

**Ejemplo:** A1 = `CRI SOS PIS INT REV` con G1.

| Paso | Forma sentencial                                 | Producción                               |
| ---- | ------------------------------------------------ | ---------------------------------------- |
| 0    | Relato                                           |                                          |
| 1    | Planteo Investigacion Desenlace                  | Relato → Planteo Investigacion Desenlace |
| 2    | Hecho MarcoOpc Investigacion Desenlace           | Planteo → Hecho MarcoOpc                 |
| 3    | CRI HallazgoOpc MarcoOpc Investigacion Desenlace | Hecho → CRI HallazgoOpc                  |
| 4    | CRI MarcoOpc Investigacion Desenlace             | HallazgoOpc → ε                          |
| …    | …                                                | …                                        |
| 18   | CRI SOS PIS INT REV                              | EpiOpc → ε                               |

En el paso 4, CRI ya es terminal: se reemplaza HallazgoOpc, que desaparece. Son 18 pasos, los de la sección 9.2 del spec. En G0, los 4 árboles de A1 dan 4 derivaciones distintas.

## 2. Por qué así

- **Del árbol, no del chart:** el árbol ya tiene toda la información. La derivación es solo otra forma de mostrarlo (Hopcroft 5.2.5).
- **Con la producción de cada paso:** la consola la muestra al lado de la forma. La web la usa en el panel "Derivación más a la izquierda": al elegir un paso, resalta el nodo del árbol que se reemplazó.
- **`--tree k`** en el comando: en G0, mostrar dos derivaciones distintas del mismo relato es mostrar la ambigüedad con su definición formal.
- **El autómata de pila** ([guía 26](26-automata-de-pila.md)): las expansiones de su camino de aceptación son esta misma derivación.
- **Quién lo usa:** el comando `derive`, y `parse` ([guía 22](22-api-publica.md)), que devuelve la derivación del primer árbol para la web.

## 3. El código, función por función

### 3.1 `leftmostDerivation(tree)`

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
- Por cada producción del preorden, arma la forma siguiente y la guarda con la producción aplicada.
- `form` se reemplaza por una lista **nueva** en cada paso (no se modifica la anterior). Así cada paso conserva su propia forma.
- No lanza errores.

### 3.2 `productionsInPreorder(tree)`

```ts
if (tree.kind !== 'nonterminal') {
  return [];
}
return [tree.production, ...tree.children.flatMap(productionsInPreorder)];
```

- **El preorden en una línea:** la producción del nodo, seguida de las de sus hijos, de izquierda a derecha.
- Las hojas (terminales y ε) no aportan producciones.

### 3.3 `replaceLeftmostNonterminal({ form, production })`

```ts
const position = form.indexOf(production.leftSide);
return [...form.slice(0, position), ...production.rightSide, ...form.slice(position + 1)];
```

- `indexOf` busca la **primera** aparición del lado izquierdo.
- Por el preorden, todo lo que está antes ya es terminal. Un terminal nunca se llama igual que un no terminal (N ∩ Σ = ∅, [guía 02](02-gramatica-libre-de-contexto.md)). Entonces esa primera aparición es el no terminal de más a la izquierda.
- Arma la forma nueva en tres partes: lo de antes, el lado derecho, lo de después.
- Con `A → ε` el lado derecho está vacío: A desaparece.

### 3.4 El comando `derive`

- Arma el árbol número k (`--tree k`, por defecto 1) con `parseTrees`. Escribe una fila por paso: el número, la forma (con `⇒`) y la producción aplicada.
- También acepta `--file` para el relato.
- Termina con código 1 si la entrada se rechaza (no hay derivación) y con código 2 si `--tree` es inválido o mayor que la cantidad de árboles.

## 4. Consola y pruebas

```sh
npm run sabueso -- derive --grammar g1 "CRI SOS PIS INT REV"            # the 18 steps of section 9.2
npm run sabueso -- derive --grammar g0 --tree 1 "CRI SOS PIS INT REV"
npm run sabueso -- derive --grammar g0 --tree 2 "CRI SOS PIS INT REV"   # another leftmost derivation
```

**`packages/core/test/trees/derivation.test.ts`:**

| Prueba                 | Qué verifica                                                                                                    |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| A1 con G1              | las 19 formas de la sección 9.2, una por una (lo pide el spec)                                                  |
| las producciones       | el paso 0 sin producción; los pasos 1 y 4                                                                       |
| siempre a la izquierda | en cuatro gramáticas, cada paso reemplaza el no terminal de más a la izquierda, y la última forma es la entrada |
| ambigüedad             | los 4 árboles de A1 en G0 dan 4 derivaciones distintas                                                          |
| entrada vacía          | `parentheses`: S ⇒ ε                                                                                            |

**`packages/core/test/command-line/derive.test.ts`:** los 18 pasos con su producción, `--tree 2`, un número de árbol inexistente, un rechazo y un `--tree` inválido.

## 5. Referencias

- Hopcroft, Motwani y Ullman, _Introducción a la teoría de autómatas, lenguajes y computación_, secciones 5.1.4 (derivaciones más a la izquierda) y 5.2.5 (de los árboles a las derivaciones).
