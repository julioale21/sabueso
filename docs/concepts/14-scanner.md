# 14 — Scanner

## 1. Definición formal

- Si en Sk está el ítem (A → α • a β, j), con a **terminal**, y el token número k+1 de la entrada es a, el Scanner agrega a S(k+1) el ítem (A → α a • β, j).
- Se lee: "esperaba un a, y vino un a: avanzo el punto y paso al conjunto siguiente".
- Es la **única** operación que consume entrada. Si el token no coincide, el ítem no pasa: esa posibilidad muere.
- Si un conjunto S(k+1) queda vacío, ningún ítem pudo leer el token k+1: la entrada se rechaza, y el error está ahí.

## 2. Ejemplo resuelto a mano

`arithmetic`, entrada `id + id`:

| Conjunto | Ítem que espera un terminal | Token | Resultado en el siguiente |
| -------- | --------------------------- | ----- | ------------------------- |
| S0       | F → • id, 0                 | id    | S1: F → id •, 0           |
| S0       | F → • ( E ), 0              | id    | no coincide: muere        |
| S1       | E → E • + T, 0              | +     | S2: E → E + • T, 0        |
| S1       | T → T • * F, 0              | +     | no coincide: muere        |

## 3. Dónde está en el código

| Qué     | Dónde                                                                             |
| ------- | --------------------------------------------------------------------------------- |
| Función | `scan(chart, tokens, item, terminal)` en `packages/core/src/earley/recognizer.ts` |
| Consola | `earley --chart`: los ítems marcados `S from Sk#i`                                |

## 4. Qué prueba lo verifica

| Prueba                                         | Qué verifica                                                                             |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `packages/core/test/earley/recognizer.test.ts` | S1 empieza con F → id •; el enlace `scan` guarda el token; un conjunto vacío al rechazar |

## 5. Referencia bibliográfica

- Earley, J., "An efficient context-free parsing algorithm", _Communications of the ACM_ 13(2), 1970.
- SPEC 02, sección 3.14.
