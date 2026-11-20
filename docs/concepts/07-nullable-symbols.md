# 07 — Símbolos anulables

## 1. Definición formal

- Un no terminal A es **anulable** si A ⇒\* ε: existe una derivación de A a la cadena vacía.
- Se calcula como el **menor punto fijo** de esta regla (Hopcroft 7.1.3):
  - **Base:** si A → ε ∈ P, A es anulable.
  - **Inducción:** si A → X₁X₂…Xₖ ∈ P y todos los Xᵢ son anulables, A es anulable.
- Un terminal nunca es anulable: siempre aporta un símbolo a la cadena.
- Por rondas: N₀ = ∅ y Nᵢ = { A | A → α ∈ P, α ∈ Nᵢ₋₁\* }. La sucesión crece y está acotada por N, así que se estabiliza en a lo sumo |N| + 1 rondas. La ronda i encuentra los símbolos cuyo árbol de derivación a ε más bajo tiene altura i.

## 2. Ejemplo resuelto a mano

Gramática `S → A B x | B B`, `B → A A | b`, `A → a | ε` (archivo `examples/grammars/nullable-chain.grammar`):

| Ronda | Qué regla dispara       | Agrega | Anulables |
| ----- | ----------------------- | ------ | --------- |
| 1     | `A → ε`                 | A      | {A}       |
| 2     | `B → A A` (A ∈ ronda 1) | B      | {A, B}    |
| 3     | `S → B B` (B ∈ ronda 2) | S      | {A, B, S} |
| 4     | ninguna nueva           | —      | {A, B, S} |

`S → A B x` nunca dispara: x es terminal.

En G1, las 10 partes opcionales (`MarcoOpc`, `PerOpc`, `CtxOpc`, `HallazgoOpc`, `Libres`, `Lineas`, `CuerpoLinea`, `EpiOpc`, `Cierre`, `CapOpc`) tienen una producción ε, así que entran todas en la ronda 1, y la ronda 2 confirma el punto fijo. G0 no tiene producciones ε: sus anulables son ∅.

## 3. Dónde está en el código

| Qué                | Dónde                                                                                                                                                                         |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Archivo            | `packages/core/src/analysis/nullable.ts`                                                                                                                                      |
| Función            | `computeNullable(grammar, onIteration?)`, sobre el esquema general `leastFixedPoint` de `analysis/fixed-point.ts` (lo comparten los productivos y los alcanzables del paso 9) |
| Comando de consola | `npm run sabueso -- nullable --grammar g1 --steps` (ronda por ronda)                                                                                                          |
| Quién lo usa       | Earley, en el arreglo de ε (paso 15); FIRST/FOLLOW (paso 11); FNC (paso 23)                                                                                                   |

## 4. Qué prueba lo verifica

| Prueba                                             | Qué verifica                                                                                                   |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `packages/core/test/analysis/nullable.test.ts`     | G0 da ∅, `parentheses` da {S}, `epsilon-trap` da {A}, G1 da los 10; el ejemplo de la sección 2 ronda por ronda |
| `packages/core/test/command-line/nullable.test.ts` | El comando muestra las rondas y el resultado, y escribe ∅ para G0                                              |

## 5. Referencia bibliográfica

- Hopcroft, Motwani y Ullman, _Introducción a la teoría de autómatas, lenguajes y computación_, sección 7.1.3 (eliminación de producciones ε).
- Augusto, sección 2.3.
