# 04 — Parser descendente recursivo predictivo (LL(1))

## 1. Definición formal

Un **parser descendente** construye una derivación desde el símbolo inicial hacia la cadena. Es **predictivo** si, en cada paso, decide qué producción aplicar sin retroceder, mirando los próximos k símbolos de la entrada.

**LL(1)**: lectura de izquierda a derecha (_Left to right_), derivación más a la izquierda (_Leftmost_), y 1 símbolo de anticipación (el _lookahead_).

Una gramática es **LL(1)** si para cada no terminal A y cada terminal a hay a lo sumo una producción aplicable. Se define con dos conjuntos:

- **FIRST(α):** los terminales con que puede empezar una cadena derivada de α (más ε si α ⇒\* ε).
- **FOLLOW(A):** los terminales que pueden aparecer inmediatamente después de A en alguna forma sentencial. Incluye `$` (el fin de la entrada) si A puede quedar al final.

La tabla M[A, a] recibe A → α para cada a ∈ FIRST(α), y para cada a ∈ FOLLOW(A) si ε ∈ FIRST(α). G es LL(1) si ninguna celda tiene dos producciones.

En un **parser descendente recursivo**, cada no terminal es una función que elige su alternativa por el símbolo siguiente y llama a las funciones de los símbolos de esa alternativa.

En este proyecto, la gramática LL(1) es **`meta.grammar`**, la gramática del formato `.grammar`, cuyos terminales son los tipos de token del lexer. Las gramáticas que se leen con este parser no tienen que ser LL(1): `arithmetic` es recursiva a izquierda y G0 tiene conflictos, y las dos se leen igual. El paso 12 certifica en código que `meta.grammar` tiene 0 conflictos.

## 2. Ejemplo resuelto a mano

Gramática (parte de `meta.grammar`):

```text
Alternatives     -> Sequence MoreAlternatives
MoreAlternatives -> BAR Sequence MoreAlternatives | ε
Sequence         -> EPSILON | Symbols
Symbols          -> Symbol Symbols | ε
Symbol           -> IDENTIFIER | LITERAL
```

Dos reglas más de `meta.grammar`, que no están en el fragmento: `Rule -> IDENTIFIER ARROW Alternatives NEWLINE` y `Directive -> TERMINALS Symbols NEWLINE`. Con ellas:

- FOLLOW(MoreAlternatives) = FOLLOW(Alternatives) = {NEWLINE}: después de las alternativas de una regla viene el fin de línea.
- FOLLOW(Symbols) = {BAR, NEWLINE}: una secuencia termina antes de otra alternativa (`|`) o del fin de línea.

Entrada: la línea `A -> a | ε`. Tokens: `IDENTIFIER(A) ARROW IDENTIFIER(a) BAR EPSILON NEWLINE END_OF_FILE`. Antes de la tabla, `File`, `Element` y `Rule` ya consumieron `A` y `->`. La tabla recorre el lado derecho:

| Paso | No terminal      | Lookahead  | Elige                         | Por qué                                          |
| ---- | ---------------- | ---------- | ----------------------------- | ------------------------------------------------ |
| 1    | Alternatives     | IDENTIFIER | Sequence MoreAlternatives     | única                                            |
| 2    | Sequence         | IDENTIFIER | Symbols                       | IDENTIFIER ∈ FIRST(Symbols)                      |
| 3    | Symbols          | IDENTIFIER | Symbol Symbols                | IDENTIFIER ∈ FIRST(Symbol Symbols)               |
| 4    | Symbol           | IDENTIFIER | IDENTIFIER                    | la única que empieza con IDENTIFIER. Consume `a` |
| 5    | Symbols          | BAR        | ε                             | BAR ∈ FOLLOW(Symbols)                            |
| 6    | MoreAlternatives | BAR        | BAR Sequence MoreAlternatives | BAR ∈ FIRST(BAR Sequence MoreAlternatives)       |
| 7    | Sequence         | EPSILON    | EPSILON                       | la única que empieza con EPSILON. Consume `ε`    |
| 8    | MoreAlternatives | NEWLINE    | ε                             | NEWLINE ∈ FOLLOW(MoreAlternatives)               |

Resultado: dos producciones, `A → a` y `A → ε`. En cada paso hubo una sola opción: eso es ser LL(1).

Por consola (la traza completa tiene 12 líneas; estas 8 son las del medio):

```sh
printf 'A -> a | ε\n' > /tmp/a.grammar
npm run sabueso -- grammar --grammar-file /tmp/a.grammar --parser-trace
```

```text
      Alternatives [IDENTIFIER] → Sequence MoreAlternatives
        Sequence [IDENTIFIER] → Symbols
          Symbols [IDENTIFIER] → Symbol Symbols
            Symbol [IDENTIFIER] → IDENTIFIER
            Symbols [BAR] → ε
        MoreAlternatives [BAR] → BAR Sequence MoreAlternatives
          Sequence [EPSILON] → EPSILON
          MoreAlternatives [NEWLINE] → ε
```

## 3. Dónde está en el código

| Qué                                                  | Dónde                                                                                      |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Parser (una función por no terminal)                 | `packages/core/src/grammar-format/parser.ts`, clase `GrammarFileParser`                    |
| La gramática LL(1) que implementa el parser          | `packages/core/grammars/meta.grammar` (también copiada en el comentario de `parser.ts`)    |
| Solo el parser (tokens → reglas y directivas)        | `packages/core/src/grammar-format/parser.ts`, `parseGrammarFile`                           |
| Cadena completa (lexer → parser → construcción)      | `packages/core/src/grammar-format/parser.ts`, `parseGrammarText`                           |
| Tabla LL(1) de `meta.grammar` y explicación completa | `docs/guides/04-predictive-recursive-descent-parser.md`                                    |
| Comando de consola                                   | `npm run sabueso -- grammar arithmetic [--parser-trace]` o `grammar --grammar-file <ruta>` |

## 4. Qué prueba lo verifica

| Prueba                                             | Qué verifica                                                                                                                                                                                                     |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core/test/grammar-format/parser.test.ts` | Los casos de `test/fixtures/parser-cases.ts` (8 archivos válidos y 12 rechazados), `arithmetic.grammar`, y la traza exacta de `A -> a \| ε` (prueba `the parser trace`), que contiene el ejemplo de la sección 2 |
| `packages/core/test/command-line/grammar.test.ts`  | El comando `grammar`, con y sin `--parser-trace`, con `--grammar-file`, y sus errores                                                                                                                            |

## 5. Referencia bibliográfica

- Aho, Lam, Sethi y Ullman, _Compiladores: principios, técnicas y herramientas_ (2.ª ed.), sección 4.4 (análisis sintáctico descendente: descenso recursivo, FIRST y FOLLOW, gramáticas LL(1)).
- Hopcroft, Motwani y Ullman, _Introducción a la teoría de autómatas, lenguajes y computación_, sección 5.1 (derivaciones más a la izquierda).
