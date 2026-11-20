# 04 — Parser descendente recursivo predictivo (LL(1))

## 1. Definición formal

Un **parser descendente** construye una derivación desde el símbolo inicial hacia la cadena. Es **predictivo** si, en cada paso, decide qué producción aplicar sin retroceder, mirando los próximos k símbolos de la entrada.

Una gramática es **LL(1)** si para cada no terminal A y cada terminal a hay a lo sumo una producción aplicable. Se define con dos conjuntos:

- **FIRST(α):** los terminales con que puede empezar una cadena derivada de α (más ε si α ⇒\* ε).
- **FOLLOW(A):** los terminales que pueden aparecer inmediatamente después de A en alguna forma sentencial.

La tabla M[A, a] recibe A → α para cada a ∈ FIRST(α), y para cada a ∈ FOLLOW(A) si ε ∈ FIRST(α). G es LL(1) si ninguna celda tiene dos producciones.

LL(1): lectura de izquierda a derecha (_Left to right_), derivación más a la izquierda (_Leftmost_), 1 símbolo de anticipación.

En un **parser descendente recursivo**, cada no terminal es una función que elige su alternativa por el símbolo siguiente y llama a las funciones de los símbolos de esa alternativa.

## 2. Ejemplo resuelto a mano

Gramática (parte de `meta.grammar`):

```text
Alternatives     -> Sequence MoreAlternatives
MoreAlternatives -> BAR Sequence MoreAlternatives | ε
Sequence         -> EPSILON | Symbols
Symbols          -> Symbol Symbols | ε
Symbol           -> IDENTIFIER | LITERAL
```

FOLLOW(MoreAlternatives) = {NEWLINE} y FOLLOW(Symbols) = {BAR, NEWLINE}.

Tokens de `a | ε` seguidos de NEWLINE:

| Paso | No terminal      | Lookahead  | Elige                         | Por qué                            |
| ---- | ---------------- | ---------- | ----------------------------- | ---------------------------------- |
| 1    | Alternatives     | IDENTIFIER | Sequence MoreAlternatives     | única                              |
| 2    | Sequence         | IDENTIFIER | Symbols                       | IDENTIFIER ∈ FIRST(Symbols)        |
| 3    | Symbols          | IDENTIFIER | Symbol Symbols                | IDENTIFIER ∈ FIRST(Symbol)         |
| 4    | Symbol           | IDENTIFIER | IDENTIFIER                    | consume `a`                        |
| 5    | Symbols          | BAR        | ε                             | BAR ∈ FOLLOW(Symbols)              |
| 6    | MoreAlternatives | BAR        | BAR Sequence MoreAlternatives | BAR ∈ FIRST                        |
| 7    | Sequence         | EPSILON    | EPSILON                       | consume `ε`                        |
| 8    | MoreAlternatives | NEWLINE    | ε                             | NEWLINE ∈ FOLLOW(MoreAlternatives) |

Resultado: dos alternativas, `a` y ε. En cada paso hubo una sola opción: la gramática es LL(1).

## 3. Dónde está en el código

| Qué                                                  | Dónde                                                                                      |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Parser (una función por no terminal)                 | `packages/core/src/grammar-format/parser.ts`, clase `GrammarFileParser`                    |
| Cadena completa (lexer → parser → construcción)      | `packages/core/src/grammar-format/parser.ts`, `parseGrammarText`                           |
| Tabla LL(1) de `meta.grammar` y explicación completa | `docs/guides/04-predictive-recursive-descent-parser.md`                                    |
| Comando de consola                                   | `npm run sabueso -- grammar arithmetic [--parser-trace]` o `grammar --grammar-file <ruta>` |

## 4. Qué prueba lo verifica

| Prueba                                             | Qué verifica                                                                                                                                           |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/core/test/grammar-format/parser.test.ts` | Los casos de `test/fixtures/parser-cases.ts` (8 archivos válidos y 12 rechazados), `arithmetic.grammar`, y la traza exacta del ejemplo de la sección 2 |
| `packages/core/test/command-line/grammar.test.ts`  | El comando `grammar`, con y sin `--parser-trace`, con `--grammar-file`, y sus errores                                                                  |

## 5. Referencia bibliográfica

- Aho, Lam, Sethi y Ullman, _Compiladores: principios, técnicas y herramientas_ (2.ª ed.), sección 4.4 (análisis sintáctico descendente: descenso recursivo, FIRST y FOLLOW, gramáticas LL(1)).
- Hopcroft, Motwani y Ullman, _Introducción a la teoría de autómatas, lenguajes y computación_, sección 5.1 (derivaciones más a la izquierda).
