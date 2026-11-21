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

`buildGrammar` se escribió antes (paso 2), pero en la cadena se ejecuta al final. Con este paso la cadena queda completa: `parseGrammarText(texto, nombre)` recibe el texto de un archivo y devuelve G = (N, Σ, P, S). A partir de ahora, las gramáticas se leen de archivos y no se escriben en código.

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

**Ojo: lo que es LL(1) es el formato, no las gramáticas que se leen.** El parser recorre `meta.grammar`, la gramática del formato `.grammar`. La gramática que describe cada archivo puede ser cualquiera: `arithmetic.grammar` es recursiva a izquierda y G0 tiene conflictos, y las dos se leen sin problema. Después, Earley las acepta igual.

### 2.2 Por qué así, y no de otra forma

| Alternativa                                           | Por qué no                                                                                                       |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Earley**                                            | Huevo y gallina: Earley necesita una gramática ya cargada. Para leer la **primera** hace falta un lector a mano. |
| **Probar alternativas y retroceder** (_backtracking_) | Puede ser exponencial y da malos mensajes de error. El formato se diseñó para que alcance un token.              |

**¿Y un AFD sobre los tokens?** Alcanzaría: el formato no tiene anidamiento, así que el lenguaje de sus tokens es regular. Se eligió LL(1) igual, por tres motivos:

1. Sale **directo** de una gramática (`meta.grammar`): una función por no terminal.
2. Los mensajes de error salen de FIRST y FOLLOW ("Expected '|' or the end of the line").
3. Es la misma teoría que el paso 12 usa para **certificar que G1 no es ambigua**.

La idea para la defensa: **cada lenguaje se lee con una herramienta a su medida**. Caracteres → tokens con un AFD; tokens → reglas con un parser LL(1), que sale directo de `meta.grammar`; relatos con Earley, que sirve para cualquier gramática libre de contexto.

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
- **Directive:** `%start X` o `%terminals a b c`.
- **Rule:** nombre, flecha, alternativas y fin de línea.
- **Alternatives / MoreAlternatives:** una secuencia, y después cero o más `| secuencia`.
- **Sequence:** `ε` explícito, o una lista de símbolos (que puede estar vacía: `A -> a |` también es ε).
- **Symbol:** un nombre (`E`) o un literal entre comillas (`'+'`).

El lexer agrega siempre un `NEWLINE` antes de `END_OF_FILE`. Por eso `Rule` puede exigir el fin de línea aunque el archivo no termine con un salto (prueba `no final line break`).

El archivo `meta.grammar` se escribe en el paso 5. En el paso 12, el propio programa calcula su tabla LL(1) y verifica que tiene 0 conflictos.

---

## 3. Cómo se usa en el programa

| Quién                                                           | Llama a                                     | Para qué                                            |
| --------------------------------------------------------------- | ------------------------------------------- | --------------------------------------------------- |
| comando `grammar`                                               | `parseGrammarText(texto, nombre, onTrace?)` | mostrar G = (N, Σ, P, S) de un archivo              |
| (paso 5 en adelante) carga de G0, G1 y las gramáticas de prueba | `parseGrammarText`                          | toda gramática del programa se lee con esta función |

`parseGrammarText` encadena las tres etapas:

1. `tokenizeGrammar(texto)`: el lexer del paso 3.
2. `parseGrammarFile(tokens)`: el parser de este paso. Devuelve las reglas, `%start` y `%terminals`.
3. `buildGrammar({ name, rules, start, declaredTerminals })`: la construcción del paso 2, que valida.

---

## 4. Cómo funciona

### 4.1 Una función por no terminal

Cada no terminal de `meta.grammar` es un método del parser (`parseFile`, `parseElement`, `parseRule`…). Cada método:

1. **Mira el token actual** (el _lookahead_), sin consumirlo.
2. **Elige la única alternativa** que puede empezar con ese token.
3. **Recorre los símbolos** de esa alternativa en orden: un terminal se **consume** (`expect`), un no terminal se **llama** (su método).

Si el lookahead no corresponde a ninguna alternativa, es un **error de sintaxis**, con línea, columna y la lista de tokens que se esperaban.

Por ejemplo, `Rule -> IDENTIFIER ARROW Alternatives NEWLINE` se traduce casi literalmente. Este fragmento está simplificado: el código real además avisa la decisión (`this.trace(...)`) y hace la llamada con `this.nested(...)`, para la sangría de la traza.

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
| File             | IDENTIFIER, START, TERMINALS, NEWLINE, END_OF_FILE | $ (nada viene después: File es el inicio)          |
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

**Ninguna celda tiene dos alternativas**: por eso `meta.grammar` es LL(1) y alcanza un token para decidir. Las tres decisiones delicadas son las de los no terminales que pueden derivar la cadena vacía, porque ahí también cuenta el FOLLOW:

- **MoreAlternatives:** `BAR` (hay otra alternativa) o `NEWLINE` (terminó la regla). Disjuntos.
- **Symbols:** `IDENTIFIER`/`LITERAL` (sigue la secuencia) o `BAR`/`NEWLINE` (terminó). Disjuntos.
- **Sequence:** `EPSILON` o FIRST(Symbols) ∪ FOLLOW(Sequence) = {IDENTIFIER, LITERAL, BAR, NEWLINE}. Disjuntos.

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

Para verlo por consola:

```sh
printf 'A -> a | ε\n' > /tmp/a.grammar
npm run sabueso -- grammar --grammar-file /tmp/a.grammar --parser-trace
```

```text
Parser trace (nonterminal [lookahead] → alternative):

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

/tmp/a.grammar: G = (N, Σ, P, S)
N = {A}
Σ = {a}
S = A
P:
   0  A → a
   1  A → ε
```

La prueba `the parser trace` (en `parser.test.ts`) compara estas 12 líneas una por una.

La sangría muestra la recursión: cada nivel es una llamada dentro de la anterior. Hay una excepción a propósito: `File` siempre queda en el nivel 0, porque `parseFile` se llama a sí mismo para el resto del archivo **sin** `nested`. Así la traza no se corre un nivel a la derecha por cada línea. Es una decisión de presentación: en el árbol de derivación, cada `File` sí es hijo del anterior.

---

## 6. Errores de sintaxis

Cada error dice **qué tokens se esperaban** (los de la fila de la tabla) y **cuál se encontró**, con línea y columna. Por consola se ve así, con código de salida 1:

```text
Error: Line 1, column 3: Expected '->', but found a name ("a")
```

En la tabla se muestra el mensaje sin el prefijo `Error: Line …, column …:`.

| Texto                           | Mensaje                                                                               | Por qué                                        |
| ------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `S a`                           | `Expected '->', but found a name ("a")`                                               | Rule exige ARROW después del nombre            |
| `-> b` al comienzo de una línea | `Expected a name, %start, %terminals or the end of the line, but found '->'`          | ARROW no está en FIRST(Element)                |
| `S -> ε a`                      | `Expected '\|' or the end of the line, but found a name ("a")`                        | después de ε solo puede venir FOLLOW(Sequence) |
| `S -> a ε`                      | `Expected a name, a quoted literal, '\|' or the end of the line, but found 'ε'`       | ε no está en FIRST(Symbols) ∪ FOLLOW(Symbols)  |
| `S -> -> a`                     | `Expected 'ε', a name, a quoted literal, '\|' or the end of the line, but found '->'` | ARROW no puede empezar una secuencia           |
| `%start` (sin nombre)           | `Expected a name, but found the end of the line`                                      | Directive → START IDENTIFIER NEWLINE           |
| `%start` dos veces              | `%start appears more than once`                                                       | ver la decisión de abajo                       |

Todos son `GrammarSyntaxError`, el mismo error del lexer. Los errores de **construcción** (un símbolo no declarado, una producción repetida) siguen siendo `GrammarBuildError`, de `buildGrammar`: el parser verifica la **sintaxis**; `buildGrammar`, que la gramática sea **válida**.

**Decisión de diseño:** el spec original no decía qué pasa si `%start` o `%terminals` aparecen dos veces. Se eligió que sea un error en la posición de la segunda aparición, porque si no, la segunda pisaría a la primera sin aviso. La decisión quedó registrada en el paso 4 del spec (2026-11-19). Lo hace `onlyOnce`.

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

Los métodos devuelven los datos que necesita `buildGrammar` (`RightSideSymbol`, del paso 2), así que el parser no clasifica terminales ni no terminales: eso sigue siendo trabajo de la construcción.

### 7.3 Los métodos de los no terminales

Uno por regla de `meta.grammar`. Todos siguen el mismo patrón: miran `lookahead()`, eligen una fila de la tabla de la sección 4.2, avisan la decisión con `trace` y recorren la alternativa.

#### `parseFile()`: File → Element File | END_OF_FILE

```ts
if (this.lookahead().kind === 'END_OF_FILE') {
  this.trace('File', 'END_OF_FILE');
  return this.file;
}
this.trace('File', 'Element File');
this.nested(() => this.parseElement());
return this.parseFile();
```

- `END_OF_FILE` es la única salida. El lexer siempre lo pone al final, así que el parser nunca pregunta "¿quedan tokens?".
- `return this.file`: el resultado no se arma con los valores de retorno. Se va llenando en el campo `file` desde `parseDirective` y `parseRule`.
- Cualquier otro token elige `Element File` sin verificarlo: si no sirve, `parseElement` lanza el error con todo FIRST(Element).
- `return this.parseFile()` es la regla `File → Element File` tal cual. Va fuera de `nested`: por eso todos los `Element` salen en la traza con la misma sangría, y no en escalera.

#### `parseElement()`: Element → NEWLINE | Directive | Rule

```ts
switch (this.lookahead().kind) {
  case 'NEWLINE':
    this.trace('Element', 'NEWLINE');
    this.expect('NEWLINE');
    return;
  case 'START':
  case 'TERMINALS':
    this.trace('Element', 'Directive');
    this.nested(() => this.parseDirective());
    return;
  case 'IDENTIFIER':
    this.trace('Element', 'Rule');
    this.nested(() => this.parseRule());
    return;
  default:
    throw this.unexpected(['IDENTIFIER', 'START', 'TERMINALS', 'NEWLINE']);
}
```

- El `switch` es la fila Element de la tabla LL(1): cada `case` es un token de FIRST de una alternativa.
- `START` y `TERMINALS` comparten `case` porque los dos empiezan `Directive`. Cuál de las dos es lo decide `parseDirective`.
- Una línea vacía (`NEWLINE`) se consume y no produce nada.
- `default`: el token no está en FIRST(Element). El error lista los cuatro válidos. `END_OF_FILE` nunca llega aquí: `parseFile` ya lo atendió.

#### `parseDirective()` y `onlyOnce`: Directive → START IDENTIFIER NEWLINE | TERMINALS Symbols NEWLINE

```ts
const directive = this.lookahead();
if (directive.kind === 'START') {
  this.trace('Directive', 'START IDENTIFIER NEWLINE');
  this.expect('START');
  const start = this.expect('IDENTIFIER').text;
  this.expect('NEWLINE');
  this.file.start = this.onlyOnce(directive, this.file.start, start);
  return;
}
this.trace('Directive', 'TERMINALS Symbols NEWLINE');
this.expect('TERMINALS');
const terminals = this.nested(() => this.parseSymbols()).map(symbolName);
this.expect('NEWLINE');
this.file.declaredTerminals = this.onlyOnce(directive, this.file.declaredTerminals, terminals);
```

```ts
private onlyOnce<T>(directive: Token, previous: T | undefined, value: T): T {
  if (previous !== undefined) {
    throw new GrammarSyntaxError(
      `${directive.text} appears more than once`,
      directive.line,
      directive.column,
    );
  }
  return value;
}
```

- `const directive = this.lookahead()` guarda el token `%start` o `%terminals` antes de consumirlo. Su línea y columna son la posición del error si la directiva se repite.
- No hay `else` con error: `parseElement` solo llama aquí con `START` o `TERMINALS`. Si no es `START`, es `TERMINALS`.
- `%terminals` reusa `parseSymbols`: acepta la misma sintaxis que un lado derecho, nombres y literales.
- `.map(symbolName)`: `parseSymbols` devuelve nombres o `{ literal }`; para `%terminals` solo importa el nombre.
- `onlyOnce`: si `previous` ya tiene valor, la directiva apareció antes y es error. Si no, devuelve `value` para guardarlo.
- `onlyOnce` es genérica (`<T>`) porque sirve para `start` (un texto) y para `declaredTerminals` (una lista).

#### `parseRule()`: Rule → IDENTIFIER ARROW Alternatives NEWLINE

```ts
this.trace('Rule', 'IDENTIFIER ARROW Alternatives NEWLINE');
const leftSide = this.expect('IDENTIFIER').text;
this.expect('ARROW');
const alternatives = this.nested(() => this.parseAlternatives());
this.expect('NEWLINE');
for (const rightSide of alternatives) {
  this.file.rules.push({ leftSide, rightSide });
}
```

- Rule tiene una sola alternativa: no hay nada que decidir. Si el primer token no es `IDENTIFIER`, el error lo da `expect`.
- Las cuatro líneas del medio son la regla, símbolo por símbolo: terminal (`expect`), terminal, no terminal (`parseAlternatives`), terminal.
- El `for`: `E -> E '+' T | T` da **dos** `GrammarRule`, una por alternativa. Así P tiene una producción por cada lado derecho.

#### `parseAlternatives()`: Alternatives → Sequence MoreAlternatives

Una sola alternativa: lee una `Sequence`, después las demás (`parseMoreAlternatives`) y las junta en una lista (`[first, ...rest]`).

#### `parseMoreAlternatives()`: MoreAlternatives → BAR Sequence MoreAlternatives | ε

```ts
const kind = this.lookahead().kind;
if (kind === 'NEWLINE') {
  // ε is chosen when the lookahead is in FOLLOW(MoreAlternatives) = {NEWLINE}.
  this.trace('MoreAlternatives', 'ε');
  return [];
}
if (kind !== 'BAR') {
  throw this.unexpected(['BAR', 'NEWLINE']);
}
this.trace('MoreAlternatives', 'BAR Sequence MoreAlternatives');
this.expect('BAR');
const sequence = this.nested(() => this.parseSequence());
const rest = this.nested(() => this.parseMoreAlternatives());
return [sequence, ...rest];
```

- `kind === 'NEWLINE'` elige ε. `NEWLINE` no puede empezar la otra alternativa, pero está en FOLLOW(MoreAlternatives) = {NEWLINE}. Es la regla LL(1) para una alternativa que deriva ε.
- `return []`: ε no consume nada. El `NEWLINE` queda para `parseRule`, que lo consume con `expect`.
- `kind !== 'BAR'`: el token no está ni en FIRST ni en FOLLOW. El error sale aquí mismo y lista los dos.
- La llamada a sí misma reemplaza un ciclo: cada `|` es una vuelta más.

#### `parseSequence()`: Sequence → EPSILON | Symbols

```ts
const kind = this.lookahead().kind;
if (kind === 'EPSILON') {
  this.trace('Sequence', 'EPSILON');
  this.expect('EPSILON');
  return [];
}
// Symbols is chosen on FIRST(Symbols) ∪ FOLLOW(Sequence) = {IDENTIFIER, LITERAL, BAR, NEWLINE}.
if (!symbolsOrSequenceEnd.includes(kind)) {
  throw this.unexpected(['EPSILON', ...symbolsOrSequenceEnd]);
}
this.trace('Sequence', 'Symbols');
return this.nested(() => this.parseSymbols());
```

- `EPSILON` es la `ε` escrita en el archivo. Se consume y da la lista vacía.
- `symbolsOrSequenceEnd.includes(kind)` elige `Symbols` con cuatro tokens, no solo con FIRST(Symbols) = {IDENTIFIER, LITERAL}. Como Symbols puede derivar ε, también se elige con FOLLOW(Sequence) = {BAR, NEWLINE}.
- Ejemplo: en `S -> | a`, la primera Sequence ve `BAR`, elige `Symbols`, y Symbols deriva ε. Por eso `S -> ε` y `S ->` (nada) dan el mismo lado derecho vacío.
- FOLLOW(Sequence) = FOLLOW(Symbols) = {BAR, NEWLINE}: por eso una sola constante sirve a `parseSequence` y a `parseSymbols`.
- El error agrega `EPSILON` a la lista: son todos los tokens de la fila Sequence de la tabla.

#### `parseSymbols()`: Symbols → Symbol Symbols | ε

```ts
const kind = this.lookahead().kind;
if (kind === 'BAR' || kind === 'NEWLINE') {
  // ε is chosen when the lookahead is in FOLLOW(Symbols) = {BAR, NEWLINE}.
  this.trace('Symbols', 'ε');
  return [];
}
if (kind !== 'IDENTIFIER' && kind !== 'LITERAL') {
  throw this.unexpected(symbolsOrSequenceEnd);
}
this.trace('Symbols', 'Symbol Symbols');
const symbol = this.nested(() => this.parseSymbol());
const rest = this.nested(() => this.parseSymbols());
return [symbol, ...rest];
```

- `kind === 'BAR' || kind === 'NEWLINE'`: ε se elige solo si el token está en FOLLOW(Symbols). Es el caso clave de LL(1) con ε: no se elige ε "porque no hay otra cosa", sino porque ese token puede venir después de Symbols.
- `kind !== 'IDENTIFIER' && kind !== 'LITERAL'`: el token no está ni en FIRST ni en FOLLOW. Error inmediato, y `symbolsOrSequenceEnd` (FIRST ∪ FOLLOW) es la lista de esperados. Ejemplo: `S -> a ε` falla en la `ε`.
- `[symbol, ...rest]`: un símbolo y, por recursión, los demás. Termina cuando llega `|` o el fin de línea.

#### `parseSymbol()`: Symbol → IDENTIFIER | LITERAL

```ts
const token = this.lookahead();
if (token.kind === 'LITERAL') {
  this.trace('Symbol', 'LITERAL');
  this.expect('LITERAL');
  return { literal: token.text };
}
this.trace('Symbol', 'IDENTIFIER');
return this.expect('IDENTIFIER').text;
```

- Solo pregunta por `LITERAL`. Si no lo es, va a `IDENTIFIER`, y `expect` da el error si tampoco lo es (en la práctica `parseSymbols` ya filtró el token).
- Un literal vuelve como `{ literal: token.text }` y un nombre como texto. Un literal siempre es terminal; un nombre lo clasifica después `buildGrammar`.

### 7.4 Los métodos auxiliares

#### `lookahead()`

```ts
const token = this.tokens[this.position] ?? this.tokens.at(-1);
if (token === undefined) {
  throw new Error('The token list is empty: it must end with END_OF_FILE');
}
return token;
```

- `this.tokens[this.position]` es el token actual. Mirarlo no avanza la posición.
- `?? this.tokens.at(-1)`: si la posición se pasó del final, devuelve el último token, que es `END_OF_FILE`. Leer más allá del final sigue viendo "fin de archivo", como el `$` de la teoría. En el uso normal no pasa (nadie consume `END_OF_FILE`); es una red de seguridad.
- El `throw` solo ocurre con una lista vacía. Es un error de programación, no de sintaxis: por eso es `Error` y no `GrammarSyntaxError`.

#### `expect(kind)`

```ts
// This is "matching" a terminal: in the pushdown automaton, pop the terminal from the
// top and advance the input. If it does not match, the string is not in L(meta.grammar).
const token = this.lookahead();
if (token.kind !== kind) {
  throw this.unexpected([kind]);
}
this.position++;
return token;
```

- Es el paso de "match" del autómata de pila: el terminal esperado coincide con la entrada y se avanza.
- `this.position++` es el único lugar donde avanza la entrada.
- `[kind]`: el mensaje espera un solo token, el que exige la regla.
- Devuelve el token porque a veces se necesita su texto (`this.expect('IDENTIFIER').text`).

#### `unexpected(expected)`, `listWithOr` y `describeToken`

```ts
const found = this.lookahead();
const options = listWithOr(expected.map((kind) => tokenDescriptions[kind]));
return new GrammarSyntaxError(
  `Expected ${options}, but found ${describeToken(found)}`,
  found.line,
  found.column,
);
```

```ts
return items.length <= 1
  ? (items[0] ?? '')
  : `${items.slice(0, -1).join(', ')} or ${items.at(-1) ?? ''}`;
```

```ts
const description = tokenDescriptions[token.kind];
return token.kind === 'IDENTIFIER' || token.kind === 'LITERAL'
  ? `${description} ("${token.text}")`
  : description;
```

- `unexpected` **devuelve** el error, no lo lanza: quien llama escribe `throw this.unexpected(...)`. Así TypeScript ve que el método termina ahí (por ejemplo, en el `default` del `switch`).
- `expected` es la fila de la tabla LL(1): los tokens que tenían alternativa. Por eso el mensaje dice exactamente qué se podía escribir.
- `found.line`, `found.column`: la posición es la del token que no sirvió.
- `listWithOr`: con 0 o 1 elementos devuelve ese único (o `''`). Si hay más, une todos menos el último con comas y agrega `or` y el último. Los `?? ''` son para TypeScript: `items[0]` y `at(-1)` pueden ser `undefined` en el tipo.
- `describeToken` agrega el texto solo a `IDENTIFIER` y `LITERAL`. En los demás tipos el texto no aporta: `'->'` siempre es `->`.

#### `nested(parse)`

```ts
this.depth++;
try {
  return parse();
} finally {
  this.depth--;
}
```

- Sube la profundidad, corre la llamada y la baja. Esa profundidad es la sangría de `--parser-trace`.
- Recibe una función (`() => this.parseElement()`) y no un resultado, porque la profundidad tiene que subir **antes** de que la llamada empiece.
- `finally` baja la profundidad salga como salga `parse()`: con `return` o con un error. Es la forma segura de deshacer un cambio de estado.
- Es genérica (`<T>`): devuelve lo mismo que la llamada.

#### `trace(nonterminal, alternative)`

Avisa la decisión al observador con `this.onTrace?.(...)`: si no hay observador, no hace nada. Se llama antes de consumir, así `lookahead()` es el token que decidió.

### 7.5 Fuera de la clase

| Nombre                 | Qué es                                                                                                                                                                     |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tokenDescriptions`    | constante: cómo se nombra cada tipo de token en los mensajes (`'->'`, `a name`, `the end of the line`…)                                                                    |
| `symbolsOrSequenceEnd` | constante: {IDENTIFIER, LITERAL, BAR, NEWLINE} = FIRST(Symbols) ∪ FOLLOW(Symbols). `parseSequence` la usa para elegir `Symbols`, y `parseSymbols` para el mensaje de error |
| `listWithOr`           | "a, b or c", para los mensajes (ver 7.4)                                                                                                                                   |
| `describeToken`        | el token encontrado, con su texto si es un nombre o un literal (ver 7.4)                                                                                                   |
| `symbolName`           | convierte un símbolo de `%terminals` en su nombre (el identificador, o el contenido del literal)                                                                           |

### 7.6 El comando `grammar`

`command-line/commands/grammar.ts`, con la misma estructura que `lex`: acepta un nombre de gramática incorporada **o** `--grammar-file <ruta>`, y la opción `--parser-trace`.

| Función              | Qué hace                                                                                                                                                                     |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `grammarCommand.run` | interpreta los argumentos, lee la gramática (con `resolveGrammarSource` y `readGrammarSource`, de `grammar-source.ts`) e imprime. Error de uso: `reportUsageError`, código 2 |
| `printGrammar`       | corre `parseGrammarText` con un observador (si se pidió la traza), imprime la traza y después la gramática con `formatGrammar`                                               |
| `formatTraceStep`    | una línea de la traza: `Sequence [IDENTIFIER] → Symbols`, con sangría según la profundidad                                                                                   |

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

No: es el **nombre** de una gramática incorporada. El programa no busca un archivo `arithmetic.grammar`. Busca el nombre en el registro `packages/core/src/command-line/built-in-grammars.ts`, y el registro dice dónde está el archivo:

1. `findBuiltInGrammar('arithmetic')` busca la entrada con ese nombre (o alias).
2. Su `location` es una ruta **relativa al código**, no a la carpeta donde ejecutas el comando. Por eso funciona desde cualquier carpeta.
3. `readGrammarSource` (de `command-line/grammar-source.ts`) lee el archivo.

Un nombre que no está en el registro es un error de uso (código 2), aunque exista un archivo con ese nombre:

```text
Unknown grammar: story. Available grammars: detective/g1, detective/g0, meta, arithmetic-ambiguous, arithmetic, parentheses, epsilon-trap, test-useless, test-empty, test-cyclic
```

Para leer un archivo cualquiera está `--grammar-file`, que recibe una **ruta** relativa a la carpeta actual. `grammar --grammar-file packages/core/grammars/test/arithmetic.grammar` da la misma gramática que `grammar arithmetic`; solo cambia la etiqueta de la primera línea (la ruta en lugar del nombre).

En el paso 4 el registro solo tenía `arithmetic`. El paso 5 lo completa con alias y grupos: ver la guía 05, sección 9.1.

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

| Prueba                                | Qué verifica                                                                                                       |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `grammar arithmetic`                  | la salida exacta de la 4-upla                                                                                      |
| `--parser-trace`                      | la traza antes de la gramática, con sangría                                                                        |
| `--grammar-file`                      | lee un archivo propio                                                                                              |
| error de sintaxis                     | código 1 y el mensaje con posición                                                                                 |
| gramática inválida                    | código 1 y el error de `buildGrammar`                                                                              |
| errores de uso                        | sin gramática, nombre y archivo a la vez, una opción de otro comando (`--states`), un nombre desconocido: código 2 |
| `grammar detective/g0` y `grammar g0` | el nombre y el alias dan la misma gramática, con 28 producciones (agregada en el paso 5)                           |

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

**¿Las gramáticas que lee el parser tienen que ser LL(1)?**
No. LL(1) es `meta.grammar`, la gramática del formato. `arithmetic` (recursiva a izquierda) y G0 (con conflictos) no son LL(1), y el parser las lee igual, porque lo que recorre es la sintaxis del archivo, no el lenguaje que la gramática genera.

**¿Qué devuelve el parser? ¿Ya es la gramática?**
No. `parseGrammarFile` devuelve un `ParsedGrammarFile`: las reglas (una por alternativa), `start` y `declaredTerminals`, sin clasificar terminales y no terminales. Eso lo hace `buildGrammar`, que además valida.

**¿Por qué el parser no imprime la traza?**
Avisa cada decisión a un observador opcional (`onTrace`). El comando decide si imprime o no. Es el mismo patrón que `onEvent` en el AFD: el núcleo no depende de la consola, y la prueba puede capturar la traza.
