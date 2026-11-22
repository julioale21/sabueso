# 04 — El parser LL(1) del formato `.grammar`

> Archivos: `packages/core/src/grammar-format/parser.ts`, `packages/core/src/command-line/commands/grammar.ts` y `packages/core/grammars/meta.grammar`.

## 1. Teoría

Un **parser descendente** construye la derivación desde el símbolo inicial hacia la cadena. Es **predictivo** si en cada paso sabe qué producción usar sin probar ni retroceder.

**LL(1)**: lee de izquierda a derecha (_Left to right_), construye una derivación más a la izquierda (_Leftmost_) y decide mirando **un** símbolo por adelantado (el _lookahead_).

Para decidir se usan dos conjuntos:

- **FIRST(α):** los terminales con que puede empezar α (más ε si α ⇒\* ε).
- **FOLLOW(A):** los terminales que pueden venir justo después de A. Incluye `$` (fin de la entrada) si A puede quedar al final.

Se elige A → α con el token `a` si a ∈ FIRST(α), o si α puede ser vacía y a ∈ FOLLOW(A). Una gramática es **LL(1)** si nunca hay dos producciones posibles para el mismo par (A, a), es decir, si su tabla M[A, a] no tiene celdas con dos producciones.

En un **parser descendente recursivo**, cada no terminal es una función que elige su alternativa por el token siguiente y llama a las funciones de los símbolos de esa alternativa.

### 1.1 La gramática LL(1) del proyecto: `meta.grammar`

Lo que es LL(1) es el **formato** `.grammar`, no las gramáticas que se leen (`arithmetic` y G0 no son LL(1) y se leen igual). Su gramática tiene como terminales los tipos de token del lexer:

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

Su tabla M[A, lookahead], que es exactamente lo que hace cada método del parser:

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

Ninguna celda tiene dos alternativas: `meta.grammar` es LL(1). La [guía 12](12-tabla-ll1-y-no-ambiguedad.md) lo verifica en código.

### 1.2 Ejemplo

La línea `A -> a | ε`. Después de que `File`, `Element` y `Rule` consumen `A` y `->`, el lado derecho se lee así:

| Paso | No terminal      | Lookahead  | Elige                         | Por qué                     |
| ---- | ---------------- | ---------- | ----------------------------- | --------------------------- |
| 1    | Alternatives     | IDENTIFIER | Sequence MoreAlternatives     | única                       |
| 2    | Sequence         | IDENTIFIER | Symbols                       | IDENTIFIER ∈ FIRST(Symbols) |
| 3    | Symbols          | IDENTIFIER | Symbol Symbols                | IDENTIFIER ∈ FIRST(Symbol)  |
| 4    | Symbol           | IDENTIFIER | IDENTIFIER                    | consume `a`                 |
| 5    | Symbols          | BAR        | ε                             | BAR ∈ FOLLOW(Symbols)       |
| 6    | MoreAlternatives | BAR        | BAR Sequence MoreAlternatives | consume `\|`                |
| 7    | Sequence         | EPSILON    | EPSILON                       | consume `ε`                 |
| 8    | MoreAlternatives | NEWLINE    | ε                             | NEWLINE ∈ FOLLOW            |

Resultado: `A → a` y `A → ε`. En cada paso hubo una sola opción. La secuencia de decisiones es la derivación más a la izquierda; `--parser-trace` la muestra (sección 4).

## 2. Por qué así

- **Dónde va el parser.** El lexer da tokens; el parser reconoce la estructura (`E -> E '+' T | T` es una regla con dos alternativas; `E E` sin flecha está mal escrito); `buildGrammar` construye y valida. `parseGrammarText({ text, name })` encadena las tres etapas y devuelve G = (N, Σ, P, S). Desde aquí, las gramáticas se leen de archivos, no se escriben en código.
- **No Earley:** es huevo y gallina. Earley necesita una gramática ya cargada; para leer la primera hace falta un lector a mano.
- **No probar y retroceder** (_backtracking_): puede ser exponencial y da malos mensajes de error. El formato se diseñó para que alcance un token.
- **¿Y un AFD sobre los tokens?** Alcanzaría: el formato no tiene anidamiento, así que el lenguaje de sus tokens es regular. Se eligió LL(1) igual porque sale directo de `meta.grammar` (una función por no terminal), porque los mensajes de error salen de FIRST y FOLLOW ("Expected '|' or the end of the line"), y porque es la misma teoría que la [guía 12](12-tabla-ll1-y-no-ambiguedad.md) usa para certificar que G1 no es ambigua.
- **Cada lenguaje con su herramienta:** caracteres → tokens con un AFD; tokens → reglas con LL(1); relatos con Earley, que sirve para cualquier gramática libre de contexto.
- **Sintaxis contra validez.** El parser verifica la sintaxis (`GrammarSyntaxError`, el mismo error del lexer); `buildGrammar` verifica que la gramática sea válida (`GrammarBuildError`: un símbolo no declarado, una producción repetida).
- **`%start` o `%terminals` dos veces** es un error en la posición de la segunda aparición. Si no, la segunda pisaría a la primera sin aviso. La decisión quedó registrada en el paso 4 del spec (2026-11-19).
- **El parser no imprime:** guarda cada decisión en el campo `trace` del resultado, igual que el ejecutor del AFD devuelve sus `events`. El comando decide si la imprime, y las pruebas la leen directamente.

## 3. El código, función por función

### 3.1 Funciones y tipos públicos

| Nombre                             | Qué es                                                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `parseGrammarText({ text, name })` | la cadena completa: `tokenizeGrammar` → `parseGrammarFile` → `buildGrammar`. Devuelve un `Grammar`           |
| `parseGrammarFile(tokens)`         | solo el parser: recibe tokens y devuelve `ParsedGrammarFile` (reglas, `start`, `declaredTerminals`, `trace`) |
| `ParsedGrammarFile`                | lo que dice el archivo antes de construir. `start` y `declaredTerminals` son `undefined` si faltan           |
| `ParserTraceStep`                  | una decisión: la profundidad, el no terminal, el token que decidió y la alternativa elegida                  |

### 3.2 La clase `GrammarFileParser` (interna)

Guarda la lista de tokens, la **posición** del token actual y lo que va reconociendo (`file`: reglas, directivas y traza). Devuelve `RightSideSymbol` (de la [guía 02](02-gramatica-libre-de-contexto.md)): no clasifica terminales ni no terminales, eso lo hace `buildGrammar`.

Hay un método por regla de `meta.grammar`. Todos siguen el mismo patrón:

1. Miran el token actual con `lookahead()`, sin consumirlo.
2. Eligen la fila de la tabla de la sección 1.1 y guardan la decisión con `record`.
3. Recorren la alternativa: un terminal se consume (`expect`), un no terminal se llama (su método, con `depth + 1`).

Si el lookahead no corresponde a ninguna alternativa, es un error de sintaxis con línea, columna y la lista de tokens esperados.

#### `parseFile(depth)`: File → Element File | END_OF_FILE

```ts
if (this.lookahead().kind === 'END_OF_FILE') {
  this.record({ depth, nonterminal: 'File', alternative: 'END_OF_FILE' });
  return this.file;
}
this.record({ depth, nonterminal: 'File', alternative: 'Element File' });
this.parseElement(depth + 1);
return this.parseFile(depth);
```

- `END_OF_FILE` es la única salida. El lexer siempre lo pone al final, así que el parser nunca pregunta "¿quedan tokens?".
- `return this.file`: el resultado no se arma con los valores de retorno. Se va llenando en el campo `file` desde `parseDirective` y `parseRule`.
- Cualquier otro token elige `Element File` sin verificarlo: si no sirve, `parseElement` lanza el error con todo FIRST(Element).
- `return this.parseFile(depth)` es la regla `File → Element File` tal cual. Usa la misma profundidad, no `depth + 1`: así los `Element` salen en la traza con la misma sangría, y no en escalera. Es una decisión de presentación: en el árbol de derivación, cada `File` sí es hijo del anterior.

#### `parseElement(depth)`: Element → NEWLINE | Directive | Rule

```ts
switch (this.lookahead().kind) {
  case 'NEWLINE':
    this.record({ depth, nonterminal: 'Element', alternative: 'NEWLINE' });
    this.expect('NEWLINE');
    return;
  case 'START':
  case 'TERMINALS':
    this.record({ depth, nonterminal: 'Element', alternative: 'Directive' });
    this.parseDirective(depth + 1);
    return;
  case 'IDENTIFIER':
    this.record({ depth, nonterminal: 'Element', alternative: 'Rule' });
    this.parseRule(depth + 1);
    return;
  default:
    throw this.unexpected(['IDENTIFIER', 'START', 'TERMINALS', 'NEWLINE']);
}
```

- El `switch` es la fila Element de la tabla: cada `case` es un token de FIRST de una alternativa.
- `START` y `TERMINALS` comparten `case` porque los dos empiezan `Directive`. Cuál de las dos es lo decide `parseDirective`.
- Una línea vacía (`NEWLINE`) se consume y no produce nada.
- `default`: el token no está en FIRST(Element). El error lista los cuatro válidos. `END_OF_FILE` nunca llega aquí: `parseFile` ya lo atendió.

#### `parseDirective(depth)` y `onlyOnce`: Directive → START IDENTIFIER NEWLINE | TERMINALS Symbols NEWLINE

```ts
const directive = this.lookahead();
if (directive.kind === 'START') {
  this.record({ depth, nonterminal: 'Directive', alternative: 'START IDENTIFIER NEWLINE' });
  this.expect('START');
  const start = this.expect('IDENTIFIER').text;
  this.expect('NEWLINE');
  this.file.start = this.onlyOnce({ directive, previous: this.file.start, value: start });
  return;
}
this.record({ depth, nonterminal: 'Directive', alternative: 'TERMINALS Symbols NEWLINE' });
this.expect('TERMINALS');
const terminals = this.parseSymbols(depth + 1).map(symbolName);
this.expect('NEWLINE');
this.file.declaredTerminals = this.onlyOnce({
  directive,
  previous: this.file.declaredTerminals,
  value: terminals,
});
```

```ts
private onlyOnce<T>({
  directive,
  previous,
  value,
}: {
  directive: Token;
  previous: T | undefined;
  value: T;
}): T {
  if (previous !== undefined) {
    throw new GrammarSyntaxError({ message: `${directive.text} appears more than once`, line: directive.line, column: directive.column }
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

#### `parseRule(depth)`: Rule → IDENTIFIER ARROW Alternatives NEWLINE

```ts
this.record({ depth, nonterminal: 'Rule', alternative: 'IDENTIFIER ARROW Alternatives NEWLINE' });
const leftSide = this.expect('IDENTIFIER').text;
this.expect('ARROW');
const alternatives = this.parseAlternatives(depth + 1);
this.expect('NEWLINE');
for (const rightSide of alternatives) {
  this.file.rules.push({ leftSide, rightSide });
}
```

- Rule tiene una sola alternativa: no hay nada que decidir. Si el primer token no es `IDENTIFIER`, el error lo da `expect`.
- Las cuatro líneas del medio son la regla, símbolo por símbolo: terminal (`expect`), terminal, no terminal (`parseAlternatives`), terminal.
- El `for`: `E -> E '+' T | T` da **dos** `GrammarRule`, una por alternativa. Así P tiene una producción por cada lado derecho.

#### `parseAlternatives(depth)`: Alternatives → Sequence MoreAlternatives

Una sola alternativa: lee una `Sequence`, después las demás (`parseMoreAlternatives`) y las junta en una lista (`[first, ...rest]`).

#### `parseMoreAlternatives(depth)`: MoreAlternatives → BAR Sequence MoreAlternatives | ε

```ts
const kind = this.lookahead().kind;
if (kind === 'NEWLINE') {
  // ε is chosen when the lookahead is in FOLLOW(MoreAlternatives) = {NEWLINE}.
  this.record({ depth, nonterminal: 'MoreAlternatives', alternative: 'ε' });
  return [];
}
if (kind !== 'BAR') {
  throw this.unexpected(['BAR', 'NEWLINE']);
}
this.record({
  depth,
  nonterminal: 'MoreAlternatives',
  alternative: 'BAR Sequence MoreAlternatives',
});
this.expect('BAR');
const sequence = this.parseSequence(depth + 1);
const rest = this.parseMoreAlternatives(depth + 1);
return [sequence, ...rest];
```

- `kind === 'NEWLINE'` elige ε. `NEWLINE` no puede empezar la otra alternativa, pero está en FOLLOW(MoreAlternatives). Es la regla LL(1) para una alternativa que deriva ε.
- `return []`: ε no consume nada. El `NEWLINE` queda para `parseRule`, que lo consume con `expect`.
- `kind !== 'BAR'`: el token no está ni en FIRST ni en FOLLOW. El error sale aquí mismo y lista los dos.
- La llamada a sí misma reemplaza un ciclo: cada `|` es una vuelta más.

#### `parseSequence(depth)`: Sequence → EPSILON | Symbols

```ts
const kind = this.lookahead().kind;
if (kind === 'EPSILON') {
  this.record({ depth, nonterminal: 'Sequence', alternative: 'EPSILON' });
  this.expect('EPSILON');
  return [];
}
// Symbols is chosen on FIRST(Symbols) ∪ FOLLOW(Sequence) = {IDENTIFIER, LITERAL, BAR, NEWLINE}.
if (!symbolsOrSequenceEnd.includes(kind)) {
  throw this.unexpected(['EPSILON', ...symbolsOrSequenceEnd]);
}
this.record({ depth, nonterminal: 'Sequence', alternative: 'Symbols' });
return this.parseSymbols(depth + 1);
```

- `EPSILON` es la `ε` escrita en el archivo. Se consume y da la lista vacía.
- `symbolsOrSequenceEnd.includes(kind)` elige `Symbols` con cuatro tokens, no solo con FIRST(Symbols) = {IDENTIFIER, LITERAL}. Como Symbols puede derivar ε, también se elige con FOLLOW(Sequence) = {BAR, NEWLINE}.
- Ejemplo: en `S -> | a`, la primera Sequence ve `BAR`, elige `Symbols`, y Symbols deriva ε. Por eso `S -> ε` y `S ->` (nada) dan el mismo lado derecho vacío.
- FOLLOW(Sequence) = FOLLOW(Symbols) = {BAR, NEWLINE}: por eso una sola constante sirve a `parseSequence` y a `parseSymbols`.
- El error agrega `EPSILON` a la lista: son todos los tokens de la fila Sequence de la tabla.

#### `parseSymbols(depth)`: Symbols → Symbol Symbols | ε

```ts
const kind = this.lookahead().kind;
if (kind === 'BAR' || kind === 'NEWLINE') {
  // ε is chosen when the lookahead is in FOLLOW(Symbols) = {BAR, NEWLINE}.
  this.record({ depth, nonterminal: 'Symbols', alternative: 'ε' });
  return [];
}
if (kind !== 'IDENTIFIER' && kind !== 'LITERAL') {
  throw this.unexpected(symbolsOrSequenceEnd);
}
this.record({ depth, nonterminal: 'Symbols', alternative: 'Symbol Symbols' });
const symbol = this.parseSymbol(depth + 1);
const rest = this.parseSymbols(depth + 1);
return [symbol, ...rest];
```

- `kind === 'BAR' || kind === 'NEWLINE'`: ε se elige solo si el token está en FOLLOW(Symbols). Es el caso clave de LL(1) con ε: no se elige ε "porque no hay otra cosa", sino porque ese token puede venir después de Symbols.
- `kind !== 'IDENTIFIER' && kind !== 'LITERAL'`: el token no está ni en FIRST ni en FOLLOW. Error inmediato, y `symbolsOrSequenceEnd` (FIRST ∪ FOLLOW) es la lista de esperados. Ejemplo: `S -> a ε` falla en la `ε`.
- `[symbol, ...rest]`: un símbolo y, por recursión, los demás. Termina cuando llega `|` o el fin de línea.

#### `parseSymbol(depth)`: Symbol → IDENTIFIER | LITERAL

```ts
const token = this.lookahead();
if (token.kind === 'LITERAL') {
  this.record({ depth, nonterminal: 'Symbol', alternative: 'LITERAL' });
  this.expect('LITERAL');
  return { literal: token.text };
}
this.record({ depth, nonterminal: 'Symbol', alternative: 'IDENTIFIER' });
return this.expect('IDENTIFIER').text;
```

- Solo pregunta por `LITERAL`. Si no lo es, va a `IDENTIFIER`, y `expect` da el error si tampoco lo es (en la práctica `parseSymbols` ya filtró el token).
- Un literal vuelve como `{ literal: token.text }` y un nombre como texto. Un literal siempre es terminal; un nombre lo clasifica después `buildGrammar`.

### 3.3 Los métodos auxiliares

#### `lookahead()`

```ts
const token = this.tokens[this.position] ?? this.tokens.at(-1);
if (token === undefined) {
  throw new Error('The token list is empty: it must end with END_OF_FILE');
}
return token;
```

- `this.tokens[this.position]` es el token actual. Mirarlo no avanza la posición.
- `?? this.tokens.at(-1)`: si la posición se pasó del final, devuelve el último token, que es `END_OF_FILE`. Leer más allá del final sigue viendo "fin de archivo", como el `$` de la teoría. Es una red de seguridad: en el uso normal nadie consume `END_OF_FILE`.
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
return new GrammarSyntaxError({
  message: `Expected ${options}, but found ${describeToken(found)}`,
  line: found.line,
  column: found.column,
});
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

#### `depth` y `record({ depth, nonterminal, alternative })`

```ts
this.file.trace.push({ depth, nonterminal, lookahead: this.lookahead(), alternative });
```

- `depth` es qué tan profunda es la llamada: `parseFile(0)` es el nivel 0 y cada método llama a sus hijos con `depth + 1`. Es la sangría de `--parser-trace`.
- Es un **parámetro**, no un campo de la clase: cada llamada tiene el suyo, así que no hay nada que "deshacer" al volver de un hijo, ni siquiera si el hijo lanza un error.
- `record` se llama antes de consumir, así `lookahead()` es el token que decidió.

### 3.4 Fuera de la clase

| Nombre                 | Qué es                                                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tokenDescriptions`    | cómo se nombra cada tipo de token en los mensajes (`'->'`, `a name`, `the end of the line`…)                                                           |
| `symbolsOrSequenceEnd` | {IDENTIFIER, LITERAL, BAR, NEWLINE} = FIRST(Symbols) ∪ FOLLOW(Symbols). `parseSequence` la usa para elegir `Symbols`, y `parseSymbols` para el mensaje |
| `symbolName`           | convierte un símbolo de `%terminals` en su nombre (el identificador, o el contenido del literal)                                                       |

### 3.5 Errores

Todos son `GrammarSyntaxError`, con línea y columna. Por consola terminan con código 1:

| Texto                 | Mensaje                                                                               |
| --------------------- | ------------------------------------------------------------------------------------- |
| `S a`                 | `Expected '->', but found a name ("a")`                                               |
| `-> b` (inicio)       | `Expected a name, %start, %terminals or the end of the line, but found '->'`          |
| `S -> ε a`            | `Expected '\|' or the end of the line, but found a name ("a")`                        |
| `S -> a ε`            | `Expected a name, a quoted literal, '\|' or the end of the line, but found 'ε'`       |
| `S -> -> a`           | `Expected 'ε', a name, a quoted literal, '\|' or the end of the line, but found '->'` |
| `%start` (sin nombre) | `Expected a name, but found the end of the line`                                      |
| `%start` dos veces    | `%start appears more than once` (de `onlyOnce`)                                       |

### 3.6 El comando `grammar`

`command-line/commands/grammar.ts` acepta un nombre de gramática incorporada **o** `--grammar-file <ruta>`, y la opción `--parser-trace`. El nombre (`arithmetic`) no es un archivo: se busca en el registro `built-in-grammars.ts` (ver la [guía 05](05-gramaticas-del-proyecto.md)); `--grammar-file` recibe una ruta relativa a la carpeta actual.

| Función              | Qué hace                                                                                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `grammarCommand.run` | interpreta los argumentos, lee la gramática (con `resolveGrammarSource` y `readGrammarSource`) e imprime. Error de uso: `reportUsageError`, código 2    |
| `printGrammar`       | corre `parseGrammarText`; si se pidió la traza, la toma de `parseGrammarFile(...).trace` y la imprime; después imprime la gramática con `formatGrammar` |
| `formatTraceStep`    | una línea de la traza: `Sequence [IDENTIFIER] → Symbols`, con sangría según la profundidad                                                              |

## 4. Consola y pruebas

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

Contiene las decisiones del ejemplo de la sección 1.2. `npm run sabueso -- grammar arithmetic` imprime la gramática de prueba leída de su archivo.

**`packages/core/test/grammar-format/parser.test.ts`**, guiada por los casos de `test/fixtures/parser-cases.ts`:

| Prueba                        | Qué verifica                                                                                                                                                |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8 archivos válidos            | una alternativa, varias, `ε` explícito, alternativa vacía, `%start` y `%terminals`, comentarios y las dos flechas, sin salto final, literal en `%terminals` |
| 10 rechazados por sintaxis    | los mensajes de la sección 3.5 con su posición, más `%start S T`, `%terminals` repetido y un error del lexer (`T -> 'b`)                                    |
| 2 rechazados por construcción | `%terminals a` / `S -> a b` (símbolo no declarado) y un archivo vacío: el parser acepta, `buildGrammar` rechaza                                             |
| `arithmetic.grammar`          | leída del archivo, da las mismas 6 producciones que antes se escribían a mano                                                                               |
| literales e identificadores   | `parseGrammarFile` conserva `{ literal: '+' }` separado de `'E'`                                                                                            |
| `the parser trace`            | las 12 decisiones exactas para `A -> a \| ε`                                                                                                                |
| Directive                     | elige por el lookahead: `[START]` o `[TERMINALS]`                                                                                                           |

**`packages/core/test/command-line/grammar.test.ts`:** la salida exacta de `grammar arithmetic`; la traza con sangría; `--grammar-file`; un error de sintaxis y una gramática inválida (código 1); los errores de uso (código 2); `grammar detective/g0` y `grammar g0` dan la misma gramática.

## 5. Referencias

- Aho, Lam, Sethi y Ullman, _Compiladores: principios, técnicas y herramientas_ (2.ª ed.), sección 4.4 (análisis sintáctico descendente: descenso recursivo, FIRST y FOLLOW, gramáticas LL(1)).
- Hopcroft, Motwani y Ullman, _Introducción a la teoría de autómatas, lenguajes y computación_, sección 5.1 (derivaciones más a la izquierda).
