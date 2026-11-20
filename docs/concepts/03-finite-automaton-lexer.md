# 03 — Autómata finito determinista como lexer

## 1. Definición formal

Un **autómata finito determinista** (AFD) es una 5-upla M = (Q, Σ, δ, q₀, F):

- Q: conjunto finito de **estados**.
- Σ: **alfabeto** de entrada, finito.
- δ: Q × Σ → Q, la **función de transición**. En un AFD, para cada estado y cada símbolo hay a lo sumo un estado siguiente, y no hay transiciones ε.
- q₀ ∈ Q: el **estado inicial**.
- F ⊆ Q: los **estados de aceptación**.

M acepta una cadena w si, partiendo de q₀ y siguiendo δ símbolo por símbolo, termina en un estado de F. El lenguaje L(M) es siempre **regular**.

**Como lexer**, el AFD se usa de otra manera: no decide si todo el texto pertenece a L(M), sino que lo **corta en tokens**. Cada token se lee desde q₀ siguiendo δ **mientras haya transición** (_maximal munch_, el token más largo posible). Si se detiene en un estado de F, emite el token asociado a ese estado, o lo descarta si es un espacio o un comentario. Si se detiene fuera de F, hay un error léxico.

En el lexer, Σ no son los caracteres sino **clases de caracteres** (`letter`, `digit`, `hyphen`, …, 13 en total). Una función fija, `classifyCharacter`, convierte cada carácter en su clase antes de consultar δ. Así la tabla tiene 13 columnas en lugar de una por carácter, y sigue siendo un AFD.

## 2. Ejemplo resuelto a mano

AFD de juguete para enteros separados por espacios (es el de la prueba, sin el signo `-` opcional que esta agrega):

| Estado | dígito | espacio | Acepta      |
| ------ | ------ | ------- | ----------- |
| q₀     | q₁     | q₂      | no          |
| q₁     | q₁     |         | `INTEGER`   |
| q₂     |        | q₂      | se descarta |

Texto `12 345`:

| Paso | Estado | Lee           | Siguiente  | Qué pasa                                                    |
| ---- | ------ | ------------- | ---------- | ----------------------------------------------------------- |
| 1    | q₀     | `1`           | q₁         |                                                             |
| 2    | q₁     | `2`           | q₁         |                                                             |
| 3    | q₁     | ` `           | —          | no hay transición; q₁ ∈ F: emite INTEGER "12" y vuelve a q₀ |
| 4    | q₀     | ` `           | q₂         |                                                             |
| 5    | q₂     | `3`           | —          | q₂ ∈ F: se descarta el espacio                              |
| 6    | q₀     | `3`, `4`, `5` | q₁, q₁, q₁ |                                                             |
| 7    | q₁     | (fin)         | —          | emite INTEGER "345"                                         |

Resultado: `INTEGER(12) INTEGER(345)`. Por _maximal munch_, `12` es un token y no dos.

## 3. Dónde está en el código

| Qué                                                           | Dónde                                                                                       |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Ejecutor genérico de AFD                                      | `packages/core/src/automata/deterministic-finite-automaton.ts`, `runDeterministicAutomaton` |
| Tabla δ del formato `.grammar` (q₀…q₁₂)                       | `packages/core/src/grammar-format/lexer.ts`, `grammarLexerAutomaton`                        |
| Lexer completo (tokens, directivas, `NEWLINE` final, errores) | `packages/core/src/grammar-format/lexer.ts`, `tokenizeGrammar`                              |
| Grafo de estados y explicación completa                       | `docs/guides/03-finite-automaton-lexer.md`                                                  |
| Comando de consola                                            | `npm run sabueso -- lex arithmetic [--states]` o `lex --grammar-file <ruta>`                |

## 4. Qué prueba lo verifica

| Prueba                                                               | Qué verifica                                                                                                                                                                  |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core/test/automata/deterministic-finite-automaton.test.ts` | El ejemplo de la sección 2 con el AFD de juguete: _maximal munch_, líneas y columnas, detención fuera de F, eventos de traza                                                  |
| `packages/core/test/grammar-format/lexer.test.ts`                    | Los casos de `test/fixtures/lexer-cases.ts` (12 textos válidos y 8 errores), y que los estados, F, la fila de q₀ y las clases de caracteres coinciden con el grafo de la guía |
| `packages/core/test/command-line/lex.test.ts`                        | El comando `lex` con un nombre o con `--grammar-file`, con y sin `--states`, y sus errores                                                                                    |

## 5. Referencia bibliográfica

- Hopcroft, Motwani y Ullman, _Introducción a la teoría de autómatas, lenguajes y computación_, sección 2.2 (autómatas finitos deterministas).
- Augusto, sección 1.3 (autómatas finitos).
- Aho, Lam, Sethi y Ullman, _Compiladores_ (2.ª ed.), sección 3.3 y 3.6 (análisis léxico y la regla del token más largo).
