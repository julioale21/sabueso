# 11 — Ítem de Earley (regla punteada)

## 1. Definición formal

- Una **regla punteada** es una producción A → αβ con un punto en algún lugar del lado derecho: A → α • β. Lo que está antes del punto ya se reconoció; lo que está después, falta.
- Un **ítem de Earley** es una regla punteada con un **origen**: (A → α • β, j). Se lee: "estoy reconociendo A, ya reconocí α a partir de la posición j de la entrada, y me falta β".
- El ítem está **completo** cuando β = ε (el punto al final): A → α •.
- El símbolo después del punto decide qué hacer: un no terminal → **Predictor**; un terminal → **Scanner**; nada → **Completer**.
- Una producción con k símbolos tiene k + 1 reglas punteadas. Hay finitas reglas punteadas y el origen va de 0 a n: hay finitos ítems posibles. Por eso Earley siempre termina.

## 2. Ejemplo resuelto a mano

Las reglas punteadas de `parentheses` (`S → ( S ) S | ε`):

| Regla punteada  | Después del punto | Operación |
| --------------- | ----------------- | --------- |
| `S → • ( S ) S` | `(` (terminal)    | Scanner   |
| `S → ( • S ) S` | S (no terminal)   | Predictor |
| `S → ( S • ) S` | `)`               | Scanner   |
| `S → ( S ) • S` | S                 | Predictor |
| `S → ( S ) S •` | nada              | Completer |
| `S → •`         | nada              | Completer |

En G1, el ítem `(Relato → Planteo • Investigacion Desenlace, 0)` dice: "ya reconocí el planteo empezando en el evento 0; falta la investigación y el desenlace".

## 3. Dónde está en el código

| Qué                | Dónde                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------- |
| Archivo            | `packages/core/src/earley/item.ts`                                                          |
| Funciones          | `createItem`, `itemKey`, `nextSymbol`, `isComplete`, `dottedRule`, `label`, `dottedRulesOf` |
| Comando de consola | `npm run sabueso -- items --grammar parentheses`                                            |

## 4. Qué prueba lo verifica

| Prueba                                          | Qué verifica                                                                                  |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `packages/core/test/earley/item.test.ts`        | la clave, el próximo símbolo, completo, el texto con el punto y las 6 reglas de `parentheses` |
| `packages/core/test/command-line/items.test.ts` | el comando lista las reglas y la operación de cada una                                        |

## 5. Referencia bibliográfica

- Earley, J., "An efficient context-free parsing algorithm", _Communications of the ACM_ 13(2), 1970.
- Aho, Lam, Sethi y Ullman, _Compiladores_ (2.ª ed.), sección 4.6 (ítems LR, la misma idea de regla punteada).
