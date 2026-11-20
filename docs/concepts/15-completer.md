# 15 — Completer

## 1. Definición formal

- Si en Sk está el ítem completo (B → γ •, i), el Completer busca en **Si** (el conjunto de origen) todos los ítems (A → α • B β, j) que esperaban un B, y agrega a Sk el ítem (A → α B • β, j).
- Se lee: "terminé un B que empezó en i: los que lo esperaban en i avanzan".
- Es la parte **ascendente** (_bottom-up_) de Earley: sube desde lo reconocido hacia quien lo necesitaba.
- El **origen** i es lo que dice a qué conjunto volver.
- Relación con el autómata de pila: Earley simula todas las pilas posibles del AP a la vez y las comparte. Un ítem es un pedazo de pila; su origen apunta a lo que estaba debajo (ficha 24).
- **Limitación del algoritmo clásico con ε:** si B → ε se completa en Sk **antes** de que otro ítem de Sk empiece a esperar un B, ese ítem no avanza nunca. Lo arregla el paso 15 (ficha 16).

## 2. Ejemplo resuelto a mano

`arithmetic`, entrada `id + id`, conjunto S1:

| Ítem completo | Vuelve a | Esperaba…                    | Agrega a S1                  |
| ------------- | -------- | ---------------------------- | ---------------------------- |
| F → id •, 0   | S0       | T → • F, 0                   | T → F •, 0                   |
| T → F •, 0    | S0       | E → • T, 0 y T → • T * F, 0  | E → T •, 0 y T → T • * F, 0  |
| E → T •, 0    | S0       | $S → • E, 0 y E → • E + T, 0 | $S → E •, 0 y E → E • + T, 0 |

`$S → E •, 0` en S1: `id` solo ya es una expresión. Con `id + id` no termina ahí, porque falta leer `+ id`.

## 3. Dónde está en el código

| Qué     | Dónde                                                               |
| ------- | ------------------------------------------------------------------- |
| Función | `complete(chart, item)` en `packages/core/src/earley/recognizer.ts` |
| Consola | `earley --chart`: los ítems marcados `C from Sk#i`                  |

## 4. Qué prueba lo verifica

| Prueba                                         | Qué verifica                                                                                     |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `packages/core/test/earley/recognizer.test.ts` | S1 de `id + id`; el enlace `complete` guarda el hijo; `epsilon-trap` muestra la limitación con ε |

## 5. Referencia bibliográfica

- Earley, J., "An efficient context-free parsing algorithm", _Communications of the ACM_ 13(2), 1970.
- SPEC 02, sección 3.15.
