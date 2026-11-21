# 23 — CYK (Cocke–Younger–Kasami)

## 1. Definición formal

- **Entrada:** una gramática G en Forma Normal de Chomsky (ficha 22) y una cadena w = w0 … w(n−1).
- **Tabla:** T[i][l] = { A ∈ N | A ⇒\* wi … w(i+l−1) }: los no terminales que derivan las l etiquetas que empiezan en la posición i.
- **Base (l = 1):** A ∈ T[i][1] si A → wi ∈ P.
- **Inducción (l ≥ 2):** A ∈ T[i][l] si existen A → B C ∈ P y una división k (1 ≤ k < l) con B ∈ T[i][k] y C ∈ T[i+k][l−k].
- **Aceptación:** w ∈ L(G) si S ∈ T[0][n]. Para w = ε, si S → ε ∈ P.
- **Costo:** O(n³·|G|): n² celdas, n divisiones por celda, |P| producciones por división. Siempre, aunque G no sea ambigua.
- **Por qué alcanza con dos partes:** en FNC toda cadena de largo ≥ 2 sale de una A → B C, así que se parte en exactamente dos pedazos; cada pedazo es más corto y ya está en la tabla (programación dinámica).

## 2. Ejemplo resuelto a mano

`parentheses` en FNC (19 producciones; ficha 22) y w = `( ) ( )`:

| l \ i | 0: `(`  | 1: `)`           | 2: `(`  | 3: `)` |
| ----- | ------- | ---------------- | ------- | ------ |
| l = 4 | {S, S0} |                  |         |        |
| l = 3 | ∅       | {X2, X4, X6, X8} |         |        |
| l = 2 | {S, S0} | ∅                | {S, S0} |        |
| l = 1 | {T\_(}  | {T\_)}           | {T\_(}  | {T\_)} |

- T[0][2]: `( )` = `(` + `)`, con S → T\_( T\_) y S0 → T\_( T\_).
- T[1][3]: `) ( )` = `)` + `( )`, con las cuatro X → T\_) S que creó BIN.
- T[0][4]: `( ) ( )` = `(` + `) ( )`, con S0 → T\_( X4. **S0 ∈ T[0][4]: acepta.**

**La comparación con Earley** (`CRI PIS REV` con G1): el árbol de CYK tiene 5 nodos internos (`Relato`, `Planteo`, `X1`, `Investigacion`, `Desenlace`) y el de Earley 14. El de CYK agrega `X1`, que no es del género, y pierde `Hecho`, `MarcoOpc`, `Pasos`, `Evidencia`, `Cierre` y los demás nodos unitarios y ε. El lenguaje es el mismo; los árboles no. Por eso el proyecto usa Earley para mostrar la estructura del relato.

## 3. Dónde está en el código

| Qué                          | Dónde                                                                                                       |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------- |
| CYK: tabla, veredicto, árbol | `packages/core/src/cocke-younger-kasami/recognizer.ts`: `recognizeCockeYoungerKasami`                       |
| Llenar la tabla              | `fillTable`, con `splitMatches` y `explainsSplit` (la regla A → B C)                                        |
| Leer un árbol de la tabla    | `buildTree`, con la misma `explainsSplit`                                                                   |
| La FNC de entrada            | `toChomskyNormalForm` (ficha 22)                                                                            |
| Comando de consola           | `npm run sabueso -- cocke-younger-kasami --grammar parentheses "( ) ( )"` (con `--compare`: junto a Earley) |

## 4. Qué prueba lo verifica

| Prueba                                                         | Qué verifica                                                                                                                                                                        |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core/test/cocke-younger-kasami/recognizer.test.ts`   | La tabla de la sección 2 celda por celda; el árbol de `CRI PIS REV` con G0 (tiene `X1`, pierde `Hecho`); CYK sobre FNC(G) y Earley sobre G aceptan lo mismo (G0 y G1 hasta largo 3) |
| `packages/core/test/command-line/cocke-younger-kasami.test.ts` | La tabla triangular, `ACCEPTED`/`REJECTED`, el árbol y la comparación con `--compare`                                                                                               |

## 5. Referencia bibliográfica

- Hopcroft, Motwani y Ullman, _Introducción a la teoría de autómatas, lenguajes y computación_, sección 7.4.4 (el algoritmo CYK).
- Augusto, sección 2.4.3.
