# 16 — El problema de ε y el arreglo de Aycock y Horspool

## 1. Definición formal

- **El problema del Earley clásico:** si un ítem (A → α • B β, j) aparece en Sk **después** de que (B → •, k) ya se completó en Sk, ese ítem nunca avanza sobre B. El Completer de B ya corrió, y un ítem que ya está no se vuelve a procesar.
- Solo ocurre con símbolos **anulables** (B ⇒\* ε) que se reconocen vacíos, de k a k. Un B no vacío empezó antes, y todo lo que lo esperaba ya estaba anotado.
- **Arreglo (Aycock y Horspool, 2002):** en el Predictor, si B es anulable, además de agregar (B → • γ, k) se agrega (A → α B • β, j) con un enlace `nullable`.
- **Regla complementaria de este proyecto:** el Completer ignora los ítems completos con origen igual al conjunto actual (lapso vacío), porque el Predictor ya hizo esos avances. Evita enlaces duplicados y, con ellos, el doble conteo de árboles.
- **Correcto:** solo se avanza sobre B si B ⇒\* ε (anulable, ficha 07); todo avance sobre un B vacío lo hace el Predictor, sin importar el orden; los B no vacíos los sigue avanzando el Completer.

## 2. Ejemplo resuelto a mano

`epsilon-trap`: `S → A A x`, `A → ε`, entrada `x`. Conjunto S0:

| Ítem             | Clásico                                 | Con el arreglo                          |
| ---------------- | --------------------------------------- | --------------------------------------- |
| `$S → • S, 0`    | inicial                                 | inicial                                 |
| `S → • A A x, 0` | P                                       | P                                       |
| `A → •, 0`       | P; el Completer avanza `S → • A A x`    | P (ignorado por el Completer)           |
| `S → A • A x, 0` | C; predice A, que ya está: **se traba** | ε (avance del Predictor, A es anulable) |
| `S → A A • x, 0` | **nunca aparece**                       | ε: espera `x`                           |
| S1               | vacía: **rechaza**                      | `S → A A x •`: **acepta**               |

## 3. Dónde está en el código

| Qué          | Dónde                                                                                                 |
| ------------ | ----------------------------------------------------------------------------------------------------- |
| Arreglo      | `predict` en `packages/core/src/earley/recognizer.ts` (el `if (context.nullableSymbols.has(symbol))`) |
| Lapso vacío  | `complete` e `isEmptySpan` en el mismo archivo                                                        |
| Modo clásico | opción `classicEpsilon` de `recognize`                                                                |
| Consola      | `npm run sabueso -- earley --grammar epsilon-trap --chart [--no-epsilon-fix] "x"`                     |

## 4. Qué prueba lo verifica

| Prueba                                           | Qué verifica                                                                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core/test/earley/recognizer.test.ts`   | `epsilon-trap` acepta (y en modo clásico rechaza); el chart de G1 con `CRI PIS REV` es el de la sección 9.6; no hay enlaces repetidos |
| `packages/core/test/command-line/earley.test.ts` | `--chart` con G1 da los 54 ítems del spec; `--no-epsilon-fix` muestra el error                                                        |

## 5. Referencia bibliográfica

- Aycock, J. y Horspool, R. N., "Practical Earley Parsing", _The Computer Journal_ 45(6), 2002.
- Earley, J., "An efficient context-free parsing algorithm", _Communications of the ACM_ 13(2), 1970.
