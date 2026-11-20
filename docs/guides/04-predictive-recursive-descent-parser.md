# Guía de estudio: el parser LL(1) del formato `.grammar`

> **Paso 4 del SPEC 02.** Archivos: `packages/core/src/grammar-format/parser.ts` y `packages/core/src/command-line/commands/grammar.ts`.
> Ficha teórica relacionada: [`docs/concepts/04-predictive-recursive-descent-parser.md`](../concepts/04-predictive-recursive-descent-parser.md).

---

## 1. El problema que resuelve

Después del paso 3, el lexer convierte el texto en una lista de tokens:

```text
IDENTIFIER(E) ARROW IDENTIFIER(E) LITERAL(+) IDENTIFIER(T) BAR IDENTIFIER(T) NEWLINE …
```

Pero una lista de palabras todavía no es una gramática. Falta reconocer la **estructura**: que `E -> E '+' T | T` es **una regla** con lado izquierdo `E` y **dos alternativas**, que `%start E` fija el inicio, y que `E E` (sin flecha) está mal escrito. Esa es la tarea del **parser**:

| #   | Etapa              | Entrada              | Salida                                      | Paso  | Estado        |
| --- | ------------------ | -------------------- | ------------------------------------------- | ----- | ------------- |
| 1   | Lexer (AFD)        | texto del `.grammar` | tokens                                      | 3     | ✅            |
| 2   | **Parser (LL(1))** | **tokens**           | **`GrammarRule[]`, `%start`, `%terminals`** | **4** | **este paso** |
| 3   | `buildGrammar`     | `GrammarRule[]`      | `Grammar`                                   | 2     | ✅            |

Con este paso la cadena queda completa: `parseGrammarText(texto, nombre)` recibe el texto de un archivo y devuelve G = (N, Σ, P, S). A partir de ahora, las gramáticas se leen de archivos y no se escriben en código.

---

## 2. Por qué un parser LL(1)

### 2.1 Qué es LL(1)

Un **parser descendente** construye la derivación desde el símbolo inicial hacia abajo: empieza en `File` y va reemplazando no terminales hasta llegar a los tokens. Es **predictivo** cuando, en cada paso, sabe qué producción usar **sin probar ni retroceder**.

**LL(1)** se lee así:

| Letra   | Significa                                                            |
| ------- | -------------------------------------------------------------------- |
| **L**   | lee la entrada de izquierda a derecha (_Left to right_)              |
| **L**   | construye una derivación más a la izquierda (_Leftmost derivation_)  |
| **(1)** | para decidir, mira **un solo** token por adelantado (el _lookahead_) |

Una gramática es **LL(1)** si, para cada no terminal, las alternativas se pueden distinguir mirando un solo token. Formalmente: en la tabla M[A, a] (sección 4) no hay ninguna celda con dos producciones. (Aho, Lam, Sethi y Ullman, _Compiladores_, 4.4.)

### 2.2 Por qué así, y no de otra forma

| Alternativa                                           | Por qué no                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Earley**                                            | El problema del huevo y la gallina: Earley necesita una gramática ya cargada para funcionar. Para leer la **primera** gramática hace falta un lector escrito a mano.                                                                                                                                                                                                                                                                    |
| **Probar alternativas y retroceder** (_backtracking_) | Funciona, pero puede ser exponencial y da malos mensajes de error ("no encontré nada"). El formato lo diseñamos nosotros, y lo diseñamos para que un token alcance.                                                                                                                                                                                                                                                                     |
| **Un AFD sobre los tokens**                           | Honestamente, alcanzaría: el formato no tiene estructuras anidadas, así que el lenguaje de sus tokens es regular. Se eligió LL(1) porque es el método **sistemático** que sale directo de una gramática (`meta.grammar`): una función por no terminal. Además, los mensajes de error salen de FIRST y FOLLOW ("se esperaba `\|` o fin de línea"), y la misma teoría LL(1) se usa en el paso 6 para **certificar que G1 no es ambigua**. |

La idea para la defensa: **cada lenguaje se lee con la herramienta mínima que alcanza**. Los caracteres → tokens con un AFD; los tokens → reglas con un parser LL(1); los relatos con Earley, que sirve para cualquier gramática libre de contexto.

### 2.3 La gramática del formato: `meta.grammar`

El formato `.grammar` tiene su propia gramática, escrita en el mismo formato. Sus **terminales son los tipos de token** del lexer:

```text
File             -> Element File | END_OF_FILE
Element          -> NEWLINE | Directive | Rule
Directive        -> START IDENTIFIER NEWLINE | TERMINALS Symbols NEWLINE
Rule             -> IDENTIFIER ARROW Alternatives NEWLINE
Alternatives     -> Sequence MoreAlternatives
MoreAlternatives -> BAR Sequence MoreAlternatives | ε
Sequence         -> EPSILON | Symbols
Symbols          -> Symbol Symbols | ε
Symbol           -> IDENTIFIER | LITERAL
```

Cómo se lee:

- **File:** un archivo es una lista de elementos que termina en `END_OF_FILE`.
- **Element:** cada línea es una línea en blanco (o un comentario, que el lexer ya descartó), una directiva o una regla.
- **Rule:** nombre, flecha, alternativas y fin de línea.
- **Alternatives / MoreAlternatives:** una secuencia, y después cero o más `| secuencia`.
- **Sequence:** `ε` explícito, o una lista de símbolos (que puede estar vacía: `A -> a |` también es ε).

El archivo `meta.grammar` se escribe en el paso 5. En el paso 6, el propio programa calcula su tabla LL(1) y verifica que tiene 0 conflictos.

---

## 3. Cómo se usa en el programa

| Quién                                                           | Llama a                                     | Para qué                                            |
| --------------------------------------------------------------- | ------------------------------------------- | --------------------------------------------------- |
| comando `grammar`                                               | `parseGrammarText(texto, nombre, onTrace?)` | mostrar G = (N, Σ, P, S) de un archivo              |
| (paso 5 en adelante) carga de G0, G1 y las gramáticas de prueba | `parseGrammarText`                          | toda gramática del programa se lee con esta función |

`parseGrammarText` encadena las tres etapas:

1. `tokenizeGrammar(texto)`: el lexer del paso 3.
2. `parseGrammarFile(tokens)`: el parser de este paso. Devuelve las reglas, `%start` y `%terminals`.
3. `buildGrammar(nombre, reglas, inicio, terminales)`: la construcción del paso 2, que valida.

---

## 4. Cómo funciona

### 4.1 Una función por no terminal

Cada no terminal de `meta.grammar` es un método del parser (`parseFile`, `parseElement`, `parseRule`…). Cada método:

1. **Mira el token actual** (el _lookahead_), sin consumirlo.
2. **Elige la única alternativa** que puede empezar con ese token.
3. **Recorre los símbolos** de esa alternativa en orden: un terminal se **consume** (`expect`), un no terminal se **llama** (su método).

Si el lookahead no corresponde a ninguna alternativa, es un **error de sintaxis**, con línea, columna y la lista de tokens que se esperaban.

Por ejemplo, `Rule -> IDENTIFIER ARROW Alternatives NEWLINE` se traduce casi literalmente:

```ts
private parseRule(): void {
  const leftSide = this.expect('IDENTIFIER').text;   // IDENTIFIER
  this.expect('ARROW');                               // ARROW
  const alternatives = this.parseAlternatives();     // Alternatives
  this.expect('NEWLINE');                             // NEWLINE
  …
}
```

### 4.2 La tabla LL(1): cómo sabe qué alternativa elegir

Para elegir con un solo token se usan dos conjuntos por no terminal:

- **FIRST(α):** los tokens con que puede **empezar** α.
- **FOLLOW(A):** los tokens que pueden venir **después** de A.

Regla: A → α se elige con el token `a` si `a` ∈ FIRST(α), o si α puede ser vacía (ε) y `a` ∈ FOLLOW(A).

Calculados a mano para `meta.grammar`:

| No terminal      | FIRST                                              | FOLLOW                                             |
| ---------------- | -------------------------------------------------- | -------------------------------------------------- |
| File             | IDENTIFIER, START, TERMINALS, NEWLINE, END_OF_FILE | (fin)                                              |
| Element          | IDENTIFIER, START, TERMINALS, NEWLINE              | IDENTIFIER, START, TERMINALS, NEWLINE, END_OF_FILE |
| Directive        | START, TERMINALS                                   | igual que Element                                  |
| Rule             | IDENTIFIER                                         | igual que Element                                  |
| Alternatives     | EPSILON, IDENTIFIER, LITERAL, BAR, ε               | NEWLINE                                            |
| MoreAlternatives | BAR, ε                                             | NEWLINE                                            |
| Sequence         | EPSILON, IDENTIFIER, LITERAL, ε                    | BAR, NEWLINE                                       |
| Symbols          | IDENTIFIER, LITERAL, ε                             | BAR, NEWLINE                                       |
| Symbol           | IDENTIFIER, LITERAL                                | IDENTIFIER, LITERAL, BAR, NEWLINE                  |

Con eso, la **tabla de decisiones** M[A, lookahead], que es exactamente lo que hace cada método:

| No terminal      | Lookahead                                  | Alternativa elegida                   |
| ---------------- | ------------------------------------------ | ------------------------------------- |
| File             | IDENTIFIER, START, TERMINALS, NEWLINE      | Element File                          |
| File             | END_OF_FILE                                | END_OF_FILE                           |
| Element          | NEWLINE                                    | NEWLINE                               |
| Element          | START, TERMINALS                           | Directive                             |
| Element          | IDENTIFIER                                 | Rule                                  |
| Directive        | START                                      | START IDENTIFIER NEWLINE              |
| Directive        | TERMINALS                                  | TERMINALS Symbols NEWLINE             |
| Rule             | IDENTIFIER                                 | IDENTIFIER ARROW Alternatives NEWLINE |
| Alternatives     | EPSILON, IDENTIFIER, LITERAL, BAR, NEWLINE | Sequence MoreAlternatives             |
| MoreAlternatives | BAR                                        | BAR Sequence MoreAlternatives         |
| MoreAlternatives | NEWLINE (su FOLLOW)                        | ε                                     |
| Sequence         | EPSILON                                    | EPSILON                               |
| Sequence         | IDENTIFIER, LITERAL, BAR, NEWLINE          | Symbols                               |
| Symbols          | IDENTIFIER, LITERAL                        | Symbol Symbols                        |
| Symbols          | BAR, NEWLINE (su FOLLOW)                   | ε                                     |
| Symbol           | IDENTIFIER                                 | IDENTIFIER                            |
| Symbol           | LITERAL                                    | LITERAL                               |

**Ninguna celda tiene dos alternativas**: por eso `meta.grammar` es LL(1) y alcanza un token para decidir. Las tres decisiones delicadas son las de ε:

- **MoreAlternatives:** `BAR` (hay otra alternativa) o `NEWLINE` (terminó la regla). Disjuntos.
- **Symbols:** `IDENTIFIER`/`LITERAL` (sigue la secuencia) o `BAR`/`NEWLINE` (terminó). Disjuntos.
- **Sequence:** `EPSILON` o lo demás. Disjuntos.

### 4.3 La traza es la derivación más a la izquierda

Cada decisión del parser reemplaza el no terminal de más a la izquierda por una alternativa. Por eso la secuencia de decisiones es una **derivación más a la izquierda** de la lista de tokens en `meta.grammar` (la segunda L de LL(1)). `--parser-trace` la muestra.

---

## 5. Ejemplo recorrido a mano

La línea `A -> a | ε`. Tokens: `IDENTIFIER(A) ARROW IDENTIFIER(a) BAR EPSILON NEWLINE END_OF_FILE`.

| Decisión                                         | Lookahead   | Por qué esa alternativa                          |
| ------------------------------------------------ | ----------- | ------------------------------------------------ |
| File → Element File                              | IDENTIFIER  | IDENTIFIER ∈ FIRST(Element File)                 |
| Element → Rule                                   | IDENTIFIER  | una línea que empieza con un nombre es una regla |
| Rule → IDENTIFIER ARROW Alternatives NEWLINE     | IDENTIFIER  | única alternativa. Consume `A` y `->`            |
| Alternatives → Sequence MoreAlternatives         | IDENTIFIER  | única alternativa                                |
| Sequence → Symbols                               | IDENTIFIER  | no es EPSILON                                    |
| Symbols → Symbol Symbols                         | IDENTIFIER  | hay un símbolo más                               |
| Symbol → IDENTIFIER                              | IDENTIFIER  | consume `a`                                      |
| Symbols → ε                                      | BAR         | BAR ∈ FOLLOW(Symbols): la secuencia terminó      |
| MoreAlternatives → BAR Sequence MoreAlternatives | BAR         | hay otra alternativa. Consume `\|`               |
| Sequence → EPSILON                               | EPSILON     | consume `ε`: lado derecho vacío                  |
| MoreAlternatives → ε                             | NEWLINE     | NEWLINE ∈ FOLLOW: no hay más alternativas        |
| (Rule consume NEWLINE)                           | NEWLINE     | fin de la regla                                  |
| File → END_OF_FILE                               | END_OF_FILE | fin del archivo                                  |

Resultado: dos producciones, `A → a` y `A → ε`.

Es exactamente la salida de:

```sh
npm run sabueso -- grammar --grammar-file <archivo con esa línea> --parser-trace
```

```text
File [IDENTIFIER] → Element File
  Element [IDENTIFIER] → Rule
    Rule [IDENTIFIER] → IDENTIFIER ARROW Alternatives NEWLINE
      Alternatives [IDENTIFIER] → Sequence MoreAlternatives
        Sequence [IDENTIFIER] → Symbols
          Symbols [IDENTIFIER] → Symbol Symbols
            Symbol [IDENTIFIER] → IDENTIFIER
            Symbols [BAR] → ε
        MoreAlternatives [BAR] → BAR Sequence MoreAlternatives
          Sequence [EPSILON] → EPSILON
          MoreAlternatives [NEWLINE] → ε
File [END_OF_FILE] → END_OF_FILE
```

La sangría muestra la recursión: cada nivel es una llamada dentro de la anterior. `File` siempre queda en el nivel 0, porque cada elemento del archivo se procesa desde el mismo `File`.

---

## 6. Errores de sintaxis

Cada error dice **qué tokens se esperaban** (los de la fila de la tabla) y **cuál se encontró**, con línea y columna:

| Texto                           | Mensaje                                                                               | Por qué                                                         |
| ------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `S a`                           | `Expected '->', but found a name ("a")`                                               | Rule exige ARROW después del nombre                             |
| `-> b` al comienzo de una línea | `Expected a name, %start, %terminals or the end of the line, but found '->'`          | ARROW no está en FIRST(Element)                                 |
| `S -> ε a`                      | `Expected '\|' or the end of the line, but found a name ("a")`                        | después de ε solo puede venir FOLLOW(Sequence)                  |
| `S -> a ε`                      | `Expected a name, a quoted literal, '\|' or the end of the line, but found 'ε'`       | ε no está en FIRST(Symbols) ∪ FOLLOW(Symbols)                   |
| `S -> -> a`                     | `Expected 'ε', a name, a quoted literal, '\|' or the end of the line, but found '->'` | ARROW no puede empezar una secuencia                            |
| `%start` (sin nombre)           | `Expected a name, but found the end of the line`                                      | Directive → START IDENTIFIER NEWLINE                            |
| `%start` dos veces              | `%start appears more than once`                                                       | decisión de diseño: la segunda pisaría a la primera en silencio |

Todos son `GrammarSyntaxError`, el mismo error del lexer. Los errores de **construcción** (un símbolo no declarado, una producción repetida) siguen siendo `GrammarBuildError`, de `buildGrammar`: el parser verifica la **sintaxis**; `buildGrammar`, que la gramática sea **válida**.

**Decisión de diseño:** el spec no dice qué pasa si `%start` o `%terminals` aparecen dos veces. Se eligió que sea un error, con la posición de la segunda aparición, porque aceptar la segunda haría que la primera se ignore sin aviso.

---

## 7. El código, función por función

### 7.1 Funciones públicas

| Función                                  | Qué hace                                                                                            |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `parseGrammarText(text, name, onTrace?)` | la cadena completa: lexer → parser → `buildGrammar`. Devuelve un `Grammar`                          |
| `parseGrammarFile(tokens, onTrace?)`     | solo el parser: recibe tokens y devuelve `ParsedGrammarFile` (reglas, `start`, `declaredTerminals`) |

**`ParsedGrammarFile`**: lo que dice el archivo antes de construir la gramática. `start` y `declaredTerminals` son `undefined` si el archivo no tiene esas directivas.

**`ParserTraceStep`**: una decisión del parser, para `--parser-trace`: la profundidad de la llamada, el no terminal, el token que decidió y la alternativa elegida. El parser se la avisa a un observador opcional (`onTrace`), igual que el ejecutor del AFD con `onEvent`: el parser no imprime nada.

### 7.2 La clase `GrammarFileParser` (interna)

Guarda el estado del recorrido: la lista de tokens, la **posición** del token actual, la **profundidad** (para la traza) y lo que va reconociendo (`file`: reglas y directivas).

**Los métodos de los no terminales**, uno por regla de `meta.grammar`:

| Método                  | Regla                                        | Qué devuelve o guarda                                       |
| ----------------------- | -------------------------------------------- | ----------------------------------------------------------- |
| `parseFile`             | File → Element File \| END_OF_FILE           | el archivo completo. Se llama a sí mismo por cada elemento  |
| `parseElement`          | Element → NEWLINE \| Directive \| Rule       | decide por el lookahead qué tipo de línea es                |
| `parseDirective`        | Directive → START … \| TERMINALS …           | guarda `start` o `declaredTerminals`, una sola vez          |
| `parseRule`             | Rule → IDENTIFIER ARROW Alternatives NEWLINE | agrega **una regla por alternativa**                        |
| `parseAlternatives`     | Alternatives → Sequence MoreAlternatives     | la lista de lados derechos                                  |
| `parseMoreAlternatives` | MoreAlternatives → BAR … \| ε                | elige ε solo con NEWLINE (su FOLLOW); con otro token, error |
| `parseSequence`         | Sequence → EPSILON \| Symbols                | un lado derecho; `ε` da la lista vacía                      |
| `parseSymbols`          | Symbols → Symbol Symbols \| ε                | elige ε solo con BAR o NEWLINE (su FOLLOW)                  |
| `parseSymbol`           | Symbol → IDENTIFIER \| LITERAL               | un nombre, o `{ literal }` para lo que iba entre comillas   |

Los métodos devuelven los datos que necesita `buildGrammar` (`RightSideSymbol`, del paso 2), así que el parser no clasifica terminales ni no terminales: eso sigue siendo trabajo de la construcción.

**Los métodos auxiliares**:

| Método                                 | Qué hace                                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------------------------- |
| `lookahead()`                          | el token actual, sin consumirlo. Siempre hay uno, porque el lexer termina con `END_OF_FILE` |
| `expect(kind)`                         | consume el token si es del tipo esperado; si no, lanza el error de sintaxis                 |
| `unexpected(expected)`                 | arma el mensaje "Expected …, but found …" con la posición del token encontrado              |
| `onlyOnce(directive, previous, value)` | rechaza una directiva repetida                                                              |
| `nested(parse)`                        | ejecuta una llamada un nivel más adentro, para la sangría de la traza                       |
| `trace(nonterminal, alternative)`      | avisa la decisión al observador, si hay uno                                                 |

**Funciones sueltas**:

| Función                   | Qué hace                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------ |
| `tokenDescriptions`       | cómo se llama cada tipo de token en los mensajes (`'->'`, `a name`, `the end of the line`…)      |
| `SYMBOLS_OR_SEQUENCE_END` | FIRST(Symbols) ∪ FOLLOW(Symbols): los tokens con que puede empezar o terminar una secuencia      |
| `listWithOr`              | "a, b or c", para los mensajes                                                                   |
| `describeToken`           | el token encontrado, con su texto si es un nombre o un literal                                   |
| `symbolName`              | el nombre de un símbolo declarado en `%terminals` (el identificador, o el contenido del literal) |

### 7.3 El comando `grammar`

`command-line/commands/grammar.ts`, con la misma estructura que `lex`: acepta un nombre de gramática incorporada **o** `--grammar-file <ruta>`, y la opción `--parser-trace`.

| Función              | Qué hace                                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `grammarCommand.run` | interpreta los argumentos, lee la gramática e imprime. Error de uso: código 2                                                  |
| `printGrammar`       | corre `parseGrammarText` con un observador (si se pidió la traza), imprime la traza y después la gramática con `formatGrammar` |
| `formatTraceStep`    | una línea de la traza: `Sequence [IDENTIFIER] → Symbols`, con sangría según la profundidad                                     |

---

## 8. Consola

```sh
npm run sabueso -- grammar arithmetic
npm run sabueso -- grammar arithmetic --parser-trace
npm run sabueso -- grammar --grammar-file examples/grammars/story.grammar
```

`grammar arithmetic` imprime la misma gramática que antes había que escribir en código, ahora leída del archivo:

```text
arithmetic: G = (N, Σ, P, S)
N = {E, F, T}
Σ = {(, ), *, +, id}
S = E
P:
   0  E → E + T
   1  E → T
   2  T → T * F
   3  T → F
   4  F → ( E )
   5  F → id
```

Un error de sintaxis o una gramática inválida terminan con código 1 y el mensaje; un error de uso, con código 2.

### 8.1 ¿`arithmetic` es el nombre del archivo?

No exactamente: `arithmetic` es el **nombre** de una gramática incorporada, no el nombre del archivo. Coinciden porque el archivo se llama `arithmetic.grammar`, pero el programa no busca un archivo con ese nombre. Busca el nombre en una lista, y la lista dice dónde está el archivo.

La lista está en `packages/core/src/command-line/grammars.ts`:

```ts
const builtInGrammars: readonly BuiltInGrammar[] = [
  {
    id: 'arithmetic', // el nombre que se escribe
    location: new URL('../../grammars/test/arithmetic.grammar', import.meta.url), // el archivo
  },
];
```

Con `grammar arithmetic`:

1. `findBuiltInGrammar('arithmetic')` busca en la lista una entrada con `id: 'arithmetic'`.
2. Toma su `location`, la ruta del archivo **relativa al código**, no a la carpeta donde se ejecuta el comando. Por eso funciona desde cualquier carpeta.
3. `readGrammarSource` lee ese archivo.

Un nombre que no está en la lista da error, aunque exista un archivo con ese nombre:

```text
Unknown grammar: story. Available grammars: arithmetic
```

**Por qué un nombre y no el archivo.** Se ve mejor en el paso 5, cuando la lista crezca y el nombre deje de coincidir con el archivo:

| Nombre que se escribe          | Archivo                                |
| ------------------------------ | -------------------------------------- |
| `arithmetic`                   | `grammars/test/arithmetic.grammar`     |
| `detective/g1` o su alias `g1` | `grammars/genres/detective/g1.grammar` |
| `test-useless`                 | `grammars/test/useless.grammar`        |

- **Nombres cortos y estables:** se escribe `g1`, no `packages/core/grammars/genres/detective/g1.grammar`.
- **Alias:** dos nombres pueden apuntar al mismo archivo (`g1` y `detective/g1`).
- **Independencia:** si un archivo se mueve de carpeta, el nombre no cambia. Solo cambia la `location` en la lista.

**Para usar un archivo directamente** está `--grammar-file`, que sí recibe una **ruta**, relativa a la carpeta donde se ejecuta el comando:

```sh
npm run sabueso -- grammar --grammar-file examples/grammars/story.grammar
npm run sabueso -- grammar --grammar-file packages/core/grammars/test/arithmetic.grammar
```

El segundo comando lee el mismo archivo que `grammar arithmetic`, pero indicando la ruta. La única diferencia en la salida es la etiqueta: muestra la ruta en lugar del nombre.

---

## 9. Las pruebas

### 9.1 Suite de casos: `test/grammar-format/parser.test.ts`

Guiada por datos (`test/fixtures/parser-cases.ts`). Cada caso válido compara S, Σ y P.

#### Archivos válidos

| Caso                                    | Texto                                              | Qué demuestra                                                                |
| --------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------- |
| `one rule, one alternative`             | `S -> a b`                                         | Rule con una sola secuencia                                                  |
| `alternatives`                          | `E -> E '+' T \| T` / `T -> 'id'`                  | cada alternativa es una producción más                                       |
| `ε written explicitly`                  | `S -> '(' S ')' S \| ε`                            | Sequence → EPSILON da el lado derecho vacío                                  |
| `ε as an empty alternative`             | `S -> 'a' S \|`                                    | una alternativa vacía también es ε                                           |
| `directives`                            | `%start Relato` / `%terminals CRI PIS REV EPI` / … | `%start` cambia el inicio; `%terminals` declara Σ, incluso EPI que no se usa |
| `comments, blank lines and both arrows` | comentarios, líneas en blanco, `->` y `→`          | Element → NEWLINE salta las líneas sin reglas                                |
| `no final line break`                   | `S -> a`                                           | el NEWLINE que agrega el lexer permite cerrar la última regla                |
| `literal declared in %terminals`        | `%terminals 'if' x`                                | un literal en `%terminals` declara el terminal con su contenido              |

#### Archivos rechazados

| Caso                              | Texto                       | Tipo                 | Mensaje (resumido)                                                     | Posición |
| --------------------------------- | --------------------------- | -------------------- | ---------------------------------------------------------------------- | -------- |
| `missing arrow`                   | `S a`                       | sintaxis             | `Expected '->'…`                                                       | 1:3      |
| `line starting with an arrow`     | `-> b` en la línea 2        | sintaxis             | `Expected a name, %start, %terminals or the end of the line…`          | 2:1      |
| `symbol after ε`                  | `S -> ε a`                  | sintaxis             | `Expected '\|' or the end of the line…`                                | 1:8      |
| `ε after symbols`                 | `S -> a ε`                  | sintaxis             | `Expected a name, a quoted literal, '\|' or the end of the line…`      | 1:8      |
| `two arrows`                      | `S -> -> a`                 | sintaxis             | `Expected 'ε', a name, a quoted literal, '\|' or the end of the line…` | 1:6      |
| `%start without a name`           | `%start`                    | sintaxis             | `Expected a name, but found the end of the line`                       | 1:7      |
| `%start with two names`           | `%start S T`                | sintaxis             | `Expected the end of the line…`                                        | 1:10     |
| `repeated %start`                 | dos `%start`                | sintaxis             | `%start appears more than once`                                        | 2:1      |
| `repeated %terminals`             | dos `%terminals`            | sintaxis             | `%terminals appears more than once`                                    | 2:1      |
| `lexical error`                   | `T -> 'b`                   | sintaxis (del lexer) | `Unterminated literal…`                                                | 2:6      |
| `well-formed but invalid grammar` | `%terminals a` / `S -> a b` | construcción         | `Undeclared symbol "b"…`                                               | —        |
| `empty file`                      | solo un comentario          | construcción         | `Grammar "test" has no rules`                                          | —        |

Los dos últimos muestran la división de trabajo: la **sintaxis** es correcta (el parser acepta), pero la **gramática** no es válida (`buildGrammar` rechaza).

#### Otras pruebas

| Prueba                      | Qué verifica                                                                    |
| --------------------------- | ------------------------------------------------------------------------------- |
| `arithmetic.grammar`        | leída del archivo, da las mismas 6 producciones que antes se escribían a mano   |
| literales e identificadores | `parseGrammarFile` conserva `{ literal: '+' }` separado de `'E'`                |
| la traza                    | la secuencia exacta de decisiones para `A -> a \| ε` (la tabla de la sección 5) |
| Directive                   | elige por el lookahead: `[START]` o `[TERMINALS]`                               |

### 9.2 El comando: `test/command-line/grammar.test.ts`

| Prueba               | Qué verifica                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `grammar arithmetic` | la salida exacta de la 4-upla                                                                                      |
| `--parser-trace`     | la traza antes de la gramática, con sangría                                                                        |
| `--grammar-file`     | lee un archivo propio                                                                                              |
| error de sintaxis    | código 1 y el mensaje con posición                                                                                 |
| gramática inválida   | código 1 y el error de `buildGrammar`                                                                              |
| errores de uso       | sin gramática, nombre y archivo a la vez, una opción de otro comando (`--states`), un nombre desconocido: código 2 |

---

## 10. Preguntas probables en la defensa

**¿Qué significa LL(1)?**
Que el parser lee de izquierda a derecha, construye una derivación más a la izquierda y decide mirando un solo token por adelantado.

**¿Cómo sabe el parser qué alternativa elegir?**
Mira el token actual y elige la única alternativa cuyo FIRST lo contiene (o ε, si el token está en el FOLLOW). La tabla de la sección 4.2 no tiene celdas con dos alternativas: eso es ser LL(1).

**¿Por qué no se usa Earley para leer las gramáticas?**
Porque Earley necesita una gramática para funcionar: para leer la primera hace falta un lector escrito a mano. Y el formato se diseñó para que un token alcance, así que un parser LL(1) es lineal, simple y da errores precisos.

**¿El lenguaje de los archivos `.grammar` necesita un parser? ¿No alcanzaría un AFD?**
A nivel de tokens el formato no tiene anidamiento, así que un AFD alcanzaría. Se usa LL(1) porque sale directamente de la gramática del formato, una función por no terminal, porque los mensajes de error salen de FIRST y FOLLOW, y porque la misma teoría LL(1) certifica después que G1 no es ambigua.

**¿Qué relación tiene la traza con una derivación?**
Cada decisión reemplaza el no terminal de más a la izquierda: la traza es la derivación más a la izquierda de los tokens del archivo en `meta.grammar`.

**¿Qué diferencia hay entre un error de sintaxis y uno de construcción?**
El de sintaxis (`GrammarSyntaxError`) es un archivo mal escrito: falta una flecha, sobra un símbolo. El de construcción (`GrammarBuildError`) es un archivo bien escrito que describe una gramática inválida: un símbolo no declarado, una producción repetida.

**¿Cuándo elige el parser la alternativa ε?**
Solo cuando el lookahead está en el FOLLOW del no terminal. Por ejemplo, `MoreAlternatives → ε` solo con NEWLINE. Con cualquier otro token no elige ε a ciegas: informa el error con la lista de lo que se esperaba.
