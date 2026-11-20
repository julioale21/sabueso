# 10 — Longitud mínima derivable (minYield)

## 1. Definición formal

- minYield(X) es la longitud de la cadena de terminales más corta que deriva X:
  - minYield(a) = 1 para todo terminal a;
  - minYield(A) = mín { minYield(X₁) + … + minYield(Xₖ) | A → X₁…Xₖ ∈ P }, con suma 0 para A → ε;
  - minYield(A) = ∞ si A no deriva ninguna cadena de terminales (A no es productivo).
- Para una secuencia, se suman: minYield(X₁…Xₖ) = Σ minYield(Xᵢ).
- minYield(S) es el largo de la oración más corta de L(G). minYield(A) = 0 si y solo si A es anulable (ficha 07).
- Se calcula por **punto fijo**: se parte de ∞ para todo no terminal y cada ronda mejora los valores con los de la ronda anterior. Los valores solo bajan y son naturales, así que se estabilizan.

## 2. Ejemplo resuelto a mano: G1

De abajo hacia arriba, usando las producciones de G1:

| No terminal                                                | Mejor producción                           | Cuenta    | minYield |
| ---------------------------------------------------------- | ------------------------------------------ | --------- | -------- |
| partes `…Opc`, `Libres`, `Lineas`, `CuerpoLinea`, `Cierre` | la producción ε                            | 0         | 0        |
| Hecho                                                      | `Hecho → HAL` (o `CRI HallazgoOpc`)        | 1         | 1        |
| Planteo                                                    | `Planteo → Hecho MarcoOpc`                 | 1 + 0     | 1        |
| Evidencia                                                  | `Evidencia → PIS`                          | 1         | 1        |
| Pasos                                                      | `Pasos → Evidencia Libres Lineas`          | 1 + 0 + 0 | 1        |
| Investigacion                                              | `Investigacion → Pasos`                    | 1         | 1        |
| Resolucion                                                 | `Resolucion → REV Cierre`                  | 1 + 0     | 1        |
| Desenlace                                                  | `Desenlace → Resolucion EpiOpc`            | 1 + 0     | 1        |
| **Relato**                                                 | `Relato → Planteo Investigacion Desenlace` | 1 + 1 + 1 | **3**    |

**Conclusión sobre el género:** todo policial de enigma tiene al menos 3 eventos: un hecho, un paso de investigación y la revelación (`CRI PIS REV`). G0 da el mismo valor.

## 3. Dónde está en el código

| Qué                | Dónde                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------- |
| Archivo            | `packages/core/src/analysis/min-yield.ts`                                             |
| Funciones          | `computeMinYield(grammar)` y `minYieldOfSequence(symbols, minYield)`                  |
| Comando de consola | `npm run sabueso -- min-yield --grammar g1`                                           |
| Quién lo usa       | la poda del autómata de pila (paso 26) y la generación acotada de oraciones (paso 27) |

## 4. Qué prueba lo verifica

| Prueba                                              | Qué verifica                                                                                                                                       |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core/test/analysis/min-yield.test.ts`     | minYield(Relato) = 3 en G0 y G1, minYield(S) = 0 en `parentheses`; minYield 0 ⇔ anulable; ∞ para lo que no produce; ciclos y recursión a izquierda |
| `packages/core/test/command-line/min-yield.test.ts` | la tabla, el largo de la oración más corta, ε ∈ L(G) y L(G) = ∅                                                                                    |

## 5. Referencia bibliográfica

- SPEC 02, sección 3.10. Es un cálculo de punto fijo como los de Hopcroft 7.1 (anulables, productivos), con números en lugar de valores de verdad.
