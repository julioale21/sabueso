# NN — Nombre del concepto

> Plantilla de ficha. Copiarla como `docs/concepts/NN-concept-name.md` (nombre de archivo en inglés, contenido en español), donde NN es el número de la tabla 7.1 del spec (no el número de paso). Completar las cinco partes en no más de unas 2 páginas: una ficha es una o dos diapositivas.

## 1. Definición formal

La definición tal como la da la bibliografía de la materia, con su notación. Por ejemplo, para una gramática: _G = (N, Σ, P, S)_, donde…

## 2. Ejemplo resuelto a mano

Un caso chico del dominio (un relato como `CRI PIS REV`, o una de las gramáticas del proyecto), resuelto paso a paso sin el programa, con la entrada, cada paso intermedio y el resultado. Es el mismo caso que después se muestra por consola y que verifica la prueba.

## 3. Dónde está en el código

| Qué                | Dónde                  |
| ------------------ | ---------------------- |
| Archivo            | `packages/core/src/…`  |
| Función            | `functionName`         |
| Comando de consola | `npm run sabueso -- …` |

## 4. Qué prueba lo verifica

| Prueba                         | Qué verifica                                  |
| ------------------------------ | --------------------------------------------- |
| `packages/core/test/….test.ts` | El ejemplo de la sección 2, y los casos borde |

## 5. Referencia bibliográfica

- Hopcroft, Motwani y Ullman, _Introducción a la teoría de autómatas, lenguajes y computación_, sección 5.1 (tema).
- Augusto, sección 2.4.
