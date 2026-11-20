# 12 — Conjuntos de Earley (chart)

## 1. Definición formal

- Para una entrada a₁ … aₙ, Earley arma **n + 1 conjuntos** S0 … Sn, uno por cada posición **entre** tokens.
- Sk contiene los ítems (A → α • β, j) tales que α deriva exactamente aⱼ₊₁ … aₖ: lo reconocido desde j hasta k.
- Se arranca con S0 = { ($S → • S, 0) }, donde `$S` es un símbolo inicial aumentado que ninguna gramática puede usar (`$` está reservado).
- La entrada se **acepta** si y solo si ($S → S •, 0) ∈ Sn.
- Un mismo ítem aparece **una sola vez** en cada conjunto. Si se alcanza por otro camino, se registra un **enlace** más (la representación de la ambigüedad).
- Cada conjunto es una **lista de solo agregado con un índice por clave**: recorrerla con un índice que avanza mientras crece es la cola de trabajo del algoritmo.

## 2. Ejemplo resuelto a mano

`Relato → CRI Pistas REV`, `Pistas → PIS Pistas | PIS`, entrada `CRI PIS REV`:

| Conjunto | Ítems                                                                                                                      |
| -------- | -------------------------------------------------------------------------------------------------------------------------- |
| S0       | $S → • Relato, 0 · Relato → • CRI Pistas REV, 0                                                                            |
| S1       | Relato → CRI • Pistas REV, 0 · Pistas → • PIS Pistas, 1 · Pistas → • PIS, 1                                                |
| S2       | Pistas → PIS • Pistas, 1 · Pistas → PIS •, 1 · Pistas → • PIS Pistas, 2 · Pistas → • PIS, 2 · Relato → CRI Pistas • REV, 0 |
| S3       | Relato → CRI Pistas REV •, 0 · **$S → Relato •, 0** (acepta)                                                               |

## 3. Dónde está en el código

| Qué       | Dónde                                                                                   |
| --------- | --------------------------------------------------------------------------------------- |
| Archivo   | `packages/core/src/earley/chart.ts`                                                     |
| Funciones | `createChart(tokenCount)` y `addItem(set, production, dot, origin, link?)`              |
| Consola   | desde el paso 14: `npm run sabueso -- earley --grammar … --chart` imprime los conjuntos |

## 4. Qué prueba lo verifica

| Prueba                                    | Qué verifica                                                                                       |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `packages/core/test/earley/chart.test.ts` | n + 1 conjuntos; sin ítems repetidos; otro origen es otro ítem; un segundo camino agrega un enlace |

## 5. Referencia bibliográfica

- Earley, J., "An efficient context-free parsing algorithm", _Communications of the ACM_ 13(2), 1970.
- SPEC 02, secciones 3.12 y 3.18.
