# 13 — Predictor

## 1. Definición formal

- Si en el conjunto Sk está el ítem (A → α • B β, j), con B **no terminal**, el Predictor agrega a Sk el ítem (B → • γ, k) por **cada** producción B → γ.
- Se lee: "acá voy a necesitar un B; cualquiera de sus reglas puede empezar en la posición k".
- Es la parte **descendente** (_top-down_) de Earley: baja desde lo que se espera hacia las reglas que lo pueden construir.
- No lee entrada. Un ítem ya presente no se agrega de nuevo: por eso la recursión a izquierda (`E → E + T`) no lo hace entrar en un bucle.

## 2. Ejemplo resuelto a mano

`arithmetic`, conjunto S0. Empieza con ($S → • E, 0):

| Ítem procesado | Después del punto | Agrega                       |
| -------------- | ----------------- | ---------------------------- |
| $S → • E, 0    | E                 | E → • E + T, 0 y E → • T, 0  |
| E → • E + T, 0 | E                 | nada nuevo: ya están         |
| E → • T, 0     | T                 | T → • T * F, 0 y T → • F, 0  |
| T → • F, 0     | F                 | F → • ( E ), 0 y F → • id, 0 |

## 3. Dónde está en el código

| Qué     | Dónde                                                                                      |
| ------- | ------------------------------------------------------------------------------------------ |
| Función | `predict(grammar, chart, item, symbol)` en `packages/core/src/earley/recognizer.ts`        |
| Consola | `npm run sabueso -- earley --grammar arithmetic --chart "id + id"`: los ítems marcados `P` |

## 4. Qué prueba lo verifica

| Prueba                                         | Qué verifica                                            |
| ---------------------------------------------- | ------------------------------------------------------- |
| `packages/core/test/earley/recognizer.test.ts` | S0 de `arithmetic`; `E → E + T` se predice una sola vez |

## 5. Referencia bibliográfica

- Earley, J., "An efficient context-free parsing algorithm", _Communications of the ACM_ 13(2), 1970.
- SPEC 02, sección 3.13.
