# 02 — Gramática libre de contexto

> Archivos: `packages/core/src/grammar/types.ts`, `packages/core/src/grammar/build.ts`, `packages/core/src/grammar/productions.ts` y `packages/core/src/command-line/format.ts`.

## 1. Teoría

Una **gramática libre de contexto** es una 4-upla **G = (N, Σ, P, S)**:

- **N:** conjunto finito de **no terminales** (variables).
- **Σ:** conjunto finito de **terminales** (el alfabeto), disjunto de N: N ∩ Σ = ∅.
- **P:** conjunto finito de **producciones** A → α, con A ∈ N y α ∈ (N ∪ Σ)\*. Si α = ε, es una **producción ε**.
- **S ∈ N:** el **símbolo inicial**.

Es "libre de contexto" porque el lado izquierdo es un único no terminal: A se puede reemplazar por α sin mirar lo que lo rodea. El lenguaje L(G) es el conjunto de cadenas de terminales que se derivan desde S.

### Ejemplo resuelto a mano

La gramática `expressions` (la misma de las pruebas):

```text
E -> E + T | T
T -> id
```

1. **N** son los lados izquierdos: N = {E, T}.
2. **Σ** son los demás símbolos: Σ = {+, id}.
3. **S** es el lado izquierdo de la primera regla: S = E.
4. **P**, numeradas en orden: 0 `E → E + T`, 1 `E → T`, 2 `T → id`.

Derivación de `id + id`:

E ⇒₀ E + T ⇒₁ T + T ⇒₂ id + T ⇒₂ id + id

Por lo tanto, `id + id` ∈ L(G). En general, L(G) = { id (+ id)ⁿ | n ≥ 0 }.

La sección 3 sigue a `buildGrammar` sobre esta misma gramática.

## 2. Por qué así

- **Convención de los archivos `.grammar`:** un identificador es no terminal si es lado izquierdo de alguna regla, y terminal en otro caso. Un literal entre comillas (`'+'`) es siempre terminal, con el contenido sin comillas como nombre. Funciona porque todo no terminal útil tiene al menos una producción, y Σ queda disjunto de N por construcción.
- **Descartado "mayúscula = no terminal"**, como en los libros: en este dominio las etiquetas (`CRI`) y los no terminales (`Relato`) empiezan con mayúscula.
- **Descartado declarar N:** es redundante, las reglas ya lo dicen.
- **`%terminals` es opcional:** obligarlo sería incómodo en gramáticas chicas de prueba. Las gramáticas del género (G0, G1) lo usan siempre, porque atrapa errores de tipeo.
- **Se construye solo si es válida.** Una gramática mal escrita se rechaza con un mensaje claro antes de que la usen Earley o los análisis. Nunca existe un `Grammar` inválido.
- **Dónde está en la cadena:** el lexer ([guía 03](03-lexer-afd.md)) corta el texto en tokens, el parser ([guía 04](04-parser-ll1.md)) arma las reglas (`GrammarRule[]`) y `buildGrammar` las convierte en la 4-upla validada.
- **El motor no conoce la consola.** `grammar/` no importa nada de `command-line/`. Por eso el mismo motor sirve para la consola y para la web.

## 3. El código, función por función

### 3.1 `types.ts`: el modelo

```ts
export type SymbolName = string;

export interface Production {
  id: number;
  leftSide: SymbolName;
  rightSide: SymbolName[];
}

export interface Grammar {
  name: string;
  start: SymbolName;
  nonterminals: ReadonlySet<SymbolName>;
  terminals: ReadonlySet<SymbolName>;
  productions: readonly Production[];
  productionsByLeftSide: ReadonlyMap<SymbolName, readonly Production[]>;
}

export const AUGMENTED_START = '$S';
```

- **`SymbolName`** es un texto (`'E'`, `'+'`, `'CRI'`). El símbolo no dice si es terminal: eso lo decide la gramática, según esté en `nonterminals` (N) o en `terminals` (Σ). Igual que en la teoría: "a" es terminal porque a ∈ Σ.
- **`Production`** es A → α: `leftSide` es A y `rightSide` es α. En `E → E + T`: `{ id: 0, leftSide: 'E', rightSide: ['E', '+', 'T'] }`.
- **ε es `rightSide: []`.** La producción ε tiene un lado derecho de largo 0, igual que |ε| = 0. Si ε fuera un símbolo `'ε'`, un algoritmo podría tratarlo como un terminal que hay que leer en la entrada.
- **El `id`** es la posición en el orden en que se escribieron las reglas. Es estable: Earley guarda qué producción usó cada ítem, los árboles muestran qué regla se aplicó y los comandos hablan de "la producción 2".
- **N y Σ son `ReadonlySet`:** conjuntos sin repetidos y con pertenencia instantánea (`has`).
- **P es una lista y no un conjunto**, porque el orden define los `id`. Los repetidos se rechazan al construir.
- **`productionsByLeftSide`** es la misma P agrupada por lado izquierdo: `E ⇒ [0, 1]`, `T ⇒ [2]`. Responde "¿cuáles son las producciones de E?" sin recorrer P entera. Lo usan el Predictor de Earley (miles de veces en una entrada larga), FIRST/FOLLOW y la tabla LL(1). No son copias: guarda referencias a los mismos objetos (`productionsByLeftSide.get('E')![0] === productions[0]`), así que nunca se desincronizan.
- **Todo es `Readonly…`:** un `grammar.terminals.add('x')` no compila. Ningún algoritmo puede romper una gramática que otro está usando; los que transforman (como la FNC) crean una nueva.
- **`AUGMENTED_START = '$S'`:** Earley usa la gramática aumentada, con $S → S, para tener un único punto de aceptación. Lleva `$`, que ninguna gramática puede usar, así que nunca choca con un símbolo del usuario.

### 3.2 `build.ts`: los tipos de entrada

```ts
export type RightSideSymbol = SymbolName | { literal: string };

export interface GrammarRule {
  leftSide: SymbolName;
  rightSide: readonly RightSideSymbol[];
}
```

- **`RightSideSymbol`** es un símbolo **tal como se escribió**, antes de clasificarlo: `T` llega como `'T'` (no terminal si es lado izquierdo; terminal si no) y `'+'` llega como `{ literal: '+' }` (siempre terminal, llamado `+`).
- **Por qué existen los literales:** `+`, `(` o `*` no son identificadores válidos. Entre comillas, el terminal se llama igual que lo que escribe el usuario en `id + id`.
- **Por qué un objeto y no el texto `'+'`:** `T` y `'T'` significan cosas distintas. Si los dos llegaran como `'T'`, el constructor no podría distinguirlos.
- **`GrammarRule`** es una producción tal como se escribió: `E -> E '+' T` llega como `{ leftSide: 'E', rightSide: ['E', { literal: '+' }, 'T'] }`. Una línea con alternativas da una `GrammarRule` por alternativa. A diferencia de `Production`, no tiene `id` ni está validada.

```ts
export class GrammarBuildError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GrammarBuildError';
  }
}
```

- Un error propio: quien llama distingue "la gramática está mal escrita" de un error del programa con `instanceof GrammarBuildError`.
- Cada mensaje nombra al culpable (el símbolo o la producción). No trae línea ni columna, porque `buildGrammar` recibe reglas y no texto.

```ts
interface SymbolTable {
  nonterminals: ReadonlySet<SymbolName>;
  /** The %terminals declaration, if the grammar has one. */
  declaredTerminals: ReadonlySet<SymbolName> | undefined;
}
```

- Junta lo que se sabe **antes** de leer los lados derechos: N y los terminales declarados. Es privada y de solo lectura. Σ no está acá: se calcula al final, en su propio paso.

**Errores que lanza este paso** (todos `GrammarBuildError`, todos antes del `return`):

| Mensaje                                                             | Función                      | Regla que protege              |
| ------------------------------------------------------------------- | ---------------------------- | ------------------------------ |
| `Grammar "X" has no rules`                                          | `requireAtLeastOneRule`      | P ≠ ∅ (si no, no hay S ∈ N)    |
| `"E" is declared as a terminal but is the left-hand side of a rule` | `checkDeclaredTerminal`      | N ∩ Σ = ∅                      |
| `Undeclared symbol "X": …`                                          | `checkIdentifier`            | evitar terminales accidentales |
| `Empty literal: write ε for the empty string`                       | `checkLiteral`               | ε ∉ Σ                          |
| `Literal 'E' has the same name as a nonterminal`                    | `checkLiteral`               | N ∩ Σ = ∅                      |
| `Duplicate production: T → id`                                      | `rejectDuplicateProductions` | P es un conjunto               |
| `Start symbol "X" is not the left-hand side of any rule`            | `requireNonterminalStart`    | S ∈ N                          |
| `"X" contains '$', which is reserved`                               | `rejectReservedName`         | `$` es de FOLLOW y de $S       |

### 3.3 `buildGrammar`: la función principal

```ts
export function buildGrammar({
  name,
  rules,
  start,
  declaredTerminals,
}: {
  name: string;
  /** The rules in order; the first one gives the default start symbol. */
  rules: readonly GrammarRule[];
  /** S, if it is not the left side of the first rule (%start). */
  start?: SymbolName | undefined;
  /** The %terminals declaration, if the grammar has one. */
  declaredTerminals?: Iterable<SymbolName> | undefined;
}): Grammar {
  // Builds the 4-tuple G = (N, Σ, P, S) in an order that matters:
  // 1. N first: the left-hand sides. Without N nothing can be classified.
  // 2. P: with N known, each right-side symbol is a nonterminal (∈ N) or a
  //    terminal (∉ N). Each symbol is checked here, but nothing is changed.
  // 3. Σ: the terminals in P, plus those of %terminals. N ∩ Σ = ∅ by construction.
  // 4. S: must be a nonterminal; otherwise L(G) would have nothing to derive from.
  const firstRule = requireAtLeastOneRule({ name, rules });
  const symbols = createSymbolTable({ rules, declaredTerminals });
  const productions = createProductions({ rules, symbols });
  rejectDuplicateProductions(productions);

  return {
    name,
    start: requireNonterminalStart({
      start: start ?? firstRule.leftSide,
      nonterminals: symbols.nonterminals,
    }),
    nonterminals: symbols.nonterminals,
    terminals: collectTerminals({ productions, symbols }),
    productions,
    productionsByLeftSide: groupByLeftSide({ nonterminals: symbols.nonterminals, productions }),
  };
}
```

- Los parámetros van por nombre en un solo objeto. `name` viene del nombre del archivo, `rules` de las líneas `A -> …`, `start` de `%start` y `declaredTerminals` de `%terminals`. Los dos últimos son opcionales.
- `declaredTerminals` es un `Iterable`: acepta un array, un `Set` o cualquier cosa que se recorra con `for…of`.
- `start ?? firstRule.leftSide`: si `start` vino, se usa; si es `undefined`, el inicio es el lado izquierdo de la primera regla, como en los libros.
- **El orden importa:** N tiene que estar completo antes de recorrer los lados derechos. En `E -> T` / `T -> id`, cuando se lee `T` en la primera regla todavía no se llegó a la segunda.
- Todo lo que puede fallar va antes del `return`: nunca se devuelve una gramática a medio validar.

Los siete pasos sobre `expressions` (sin `start` ni `declaredTerminals`):

| Paso | Función                      | Resultado                                                              |
| ---- | ---------------------------- | ---------------------------------------------------------------------- |
| 1    | `requireAtLeastOneRule`      | hay 3 reglas → `firstRule = E → E + T`                                 |
| 2    | `createSymbolTable`          | N = {E, T}; sin `%terminals` → `declaredTerminals = undefined`         |
| 3    | `createProductions`          | `E`, `+`, `T`, `id` son válidos · 0: E → E + T, 1: E → T, 2: T → id    |
| 4    | `rejectDuplicateProductions` | claves `["E","E","+","T"]`, `["E","T"]`, `["T","id"]`: todas distintas |
| 5    | `requireNonterminalStart`    | S = `E` (lado izquierdo de la primera regla); E ∈ N ✓                  |
| 6    | `collectTerminals`           | Σ arranca vacío · `+` ∉ N e `id` ∉ N → Σ = {+, id}                     |
| 7    | `groupByLeftSide`            | E → [0, 1], T → [2]                                                    |

### 3.4 Las funciones auxiliares

**`formatProduction(production)`** (exportada) escribe `A → α`, con `ε` si el lado derecho está vacío. Vive en el motor porque la notación es parte del concepto: la usan los mensajes de error (`Duplicate production: T → id`) y la web.

```ts
export function formatProduction(production: Production): string {
  const rightSide = production.rightSide.length === 0 ? 'ε' : production.rightSide.join(' ');
  return `${production.leftSide} → ${rightSide}`;
}
```

**`requireAtLeastOneRule`** devuelve la primera regla o lanza `Grammar "X" has no rules`. Con `noUncheckedIndexedAccess`, `rules[0]` es `GrammarRule | undefined`, así que el `if` es obligatorio.

#### `createSymbolTable({ rules, declaredTerminals })`

```ts
function createSymbolTable({
  rules,
  declaredTerminals,
}: {
  rules: readonly GrammarRule[];
  declaredTerminals?: Iterable<SymbolName> | undefined;
}): SymbolTable {
  const nonterminals = collectNonterminals(rules);
  const declared = declaredTerminals === undefined ? undefined : new Set(declaredTerminals);
  declared?.forEach((terminal) => checkDeclaredTerminal({ terminal, nonterminals }));
  return { nonterminals, declaredTerminals: declared };
}
```

- Calcula N con `collectNonterminals`.
- Si hay `%terminals`, los convierte en un `Set` (sin repetidos, `has` instantáneo). Si no hay, queda `undefined`: "no declara terminales", que no es lo mismo que "declara cero".
- `declared?.forEach(...)` valida cada declarado con `checkDeclaredTerminal`, solo si `declared` existe.
- No calcula Σ: Σ depende de los lados derechos.

#### `collectNonterminals(rules)`

```ts
function collectNonterminals(rules: readonly GrammarRule[]): Set<SymbolName> {
  const nonterminals = new Set<SymbolName>();
  for (const rule of rules) {
    rejectReservedName(rule.leftSide);
    nonterminals.add(rule.leftSide);
  }
  return nonterminals;
}
```

- Calcula **N = { A | existe una regla A → … }**.
- El `Set` elimina repetidos: `E` es lado izquierdo dos veces, pero está una vez en N.
- Un `Set` recuerda el orden de inserción, así que N sale en orden de aparición y la salida es predecible.

#### `checkDeclaredTerminal({ terminal, nonterminals })`

```ts
function checkDeclaredTerminal({
  terminal,
  nonterminals,
}: {
  terminal: SymbolName;
  nonterminals: ReadonlySet<SymbolName>;
}): void {
  rejectReservedName(terminal);
  if (nonterminals.has(terminal)) {
    throw new GrammarBuildError(
      `"${terminal}" is declared as a terminal but is the left-hand side of a rule`,
    );
  }
}
```

- Si un declarado en `%terminals` también tiene una regla, sería terminal y no terminal a la vez: viola N ∩ Σ = ∅. No devuelve nada; si no lanza, el terminal es válido.

#### `createProductions({ rules, symbols })`

```ts
function createProductions({
  rules,
  symbols,
}: {
  rules: readonly GrammarRule[];
  symbols: SymbolTable;
}): Production[] {
  return rules.map((rule, index) => ({
    id: index,
    leftSide: rule.leftSide,
    rightSide: rule.rightSide.map((symbol) => checkRightSideSymbol({ symbol, symbols })),
  }));
}
```

- `rules.map((rule, index) => …)` da la posición `index`, que es el `id`: la numeración empieza en 0 y sigue el archivo.
- El lado izquierdo se copia tal cual (ya se sabe que está en N).
- Cada símbolo del lado derecho pasa por `checkRightSideSymbol`, que lo valida y devuelve su nombre.
- Es pura: solo lee `symbols` y devuelve P. Un lado derecho vacío da un `.map` vacío, la producción ε, sin caso especial.

#### `collectTerminals({ productions, symbols })`

```ts
function collectTerminals({
  productions,
  symbols,
}: {
  productions: readonly Production[];
  symbols: SymbolTable;
}): Set<SymbolName> {
  const terminals = new Set(symbols.declaredTerminals);
  for (const symbol of productions.flatMap((production) => production.rightSide)) {
    if (!symbols.nonterminals.has(symbol)) {
      terminals.add(symbol);
    }
  }
  return terminals;
}
```

- Calcula **Σ = declarados ∪ { símbolos de los lados derechos que no están en N }**.
- Σ empieza con los declarados. `new Set(undefined)` es vacío, así que sin `%terminals` arranca vacío.
- `flatMap` junta todos los lados derechos en una sola lista.
- Cada símbolo que no está en N se agrega. Agregar algo que ya está no hace nada: `+` usado tres veces queda una vez.
- Recibe `productions` y no `rules`: en P los literales ya son nombres, no hace falta distinguirlos.
- Los declarados entran aunque ninguna regla los use: el autor dijo "estos son mis terminales". Σ es el alfabeto; la gramática simplemente no acepta esas etiquetas en ninguna posición.
- Orden: primero los declarados, después los demás en orden de aparición.

#### `checkRightSideSymbol({ symbol, symbols })`

```ts
function checkRightSideSymbol({
  symbol,
  symbols,
}: {
  symbol: RightSideSymbol;
  symbols: SymbolTable;
}): SymbolName {
  return typeof symbol === 'string'
    ? checkIdentifier({ identifier: symbol, symbols })
    : checkLiteral({ literal: symbol.literal, symbols });
}
```

- `typeof symbol === 'string'` separa los identificadores de los literales. En la rama falsa, TypeScript sabe que `symbol` es `{ literal }` y permite `symbol.literal` (_narrowing_).
- Devuelve el nombre que se guarda en `Production.rightSide`. No clasifica: eso lo hace `collectTerminals`.

#### `checkIdentifier({ identifier, symbols })`

```ts
function checkIdentifier({
  identifier,
  symbols,
}: {
  identifier: SymbolName;
  symbols: SymbolTable;
}): SymbolName {
  rejectReservedName(identifier);
  const isTerminal = !symbols.nonterminals.has(identifier);
  const isUndeclared =
    symbols.declaredTerminals !== undefined && !symbols.declaredTerminals.has(identifier);
  if (isTerminal && isUndeclared) {
    throw new GrammarBuildError(
      `Undeclared symbol "${identifier}": it is not the left-hand side of any rule and is not listed in %terminals`,
    );
  }
  return identifier;
}
```

- `isTerminal`: no es lado izquierdo, así que por la convención es terminal.
- `isUndeclared`: la gramática tiene `%terminals` y el identificador no está ahí.
- El error ocurre solo si se cumplen las dos. Sin `%terminals`, `isUndeclared` es siempre `false` y la convención se aplica libremente.
- **Protege contra errores de tipeo.** En

  ```text
  Relato -> CRI Pistass REV      # se quiso escribir Pistas
  Pistas -> PIS Pistas | ε
  ```

  `Pistass` no es lado izquierdo. Sin `%terminals`, se convierte en terminal sin avisar, y L(G) = {CRI Pistass REV}: un error silencioso. Con `%terminals CRI PIS REV`, la construcción falla con `Undeclared symbol "Pistass"`. Por consola (`grammar --grammar-file typo.grammar`), `run.ts` escribe `Error: ` y el mensaje, y termina con código 1.

#### `checkLiteral({ literal, symbols })`

```ts
function checkLiteral({ literal, symbols }: { literal: string; symbols: SymbolTable }): SymbolName {
  if (literal === '') {
    throw new GrammarBuildError('Empty literal: write ε for the empty string');
  }
  rejectReservedName(literal);
  if (symbols.nonterminals.has(literal)) {
    throw new GrammarBuildError(`Literal '${literal}' has the same name as a nonterminal`);
  }
  return literal;
}
```

- **Literal vacío:** la cadena vacía no es un símbolo del alfabeto. Si se quería ε, se escribe `ε`.
- **`$`** está reservado.
- **Mismo nombre que un no terminal:** con `E → …` y `'E'`, `E` sería terminal y no terminal a la vez (N ∩ Σ = ∅).
- Los literales no se comparan con `%terminals`: las comillas ya declaran que es terminal.

#### `rejectDuplicateProductions(productions)`

```ts
function rejectDuplicateProductions(productions: readonly Production[]): void {
  const seen = new Set<string>();
  for (const production of productions) {
    const key = productionKey(production);
    if (seen.has(key)) {
      throw new GrammarBuildError(`Duplicate production: ${formatProduction(production)}`);
    }
    seen.add(key);
  }
}
```

- P es un **conjunto**. Además, una producción repetida haría que Earley encuentre dos árboles idénticos, y la gramática parecería ambigua sin serlo.
- Cada producción se convierte en una clave de texto y se guarda en `seen`. Si la clave ya estaba, es repetida.
- `productionKey` (en `grammar/productions.ts`, compartida con la FNC) usa `JSON.stringify([leftSide, ...rightSide])`.
- **Por qué JSON y no unir con espacios:** `A → 'b c'` (un símbolo) y `A → b c` (dos) darían las dos `"A b c"`. Con JSON dan `["A","b c"]` y `["A","b","c"]`: las comillas marcan dónde empieza y termina cada símbolo.
- Compara `Production` ya validadas: `S → 'a'` y `S → a` son la misma producción, y se detectan.

**`requireNonterminalStart`** verifica S ∈ N o lanza `Start symbol "X" is not the left-hand side of any rule`. Solo puede fallar con un `%start` explícito: el inicio por defecto siempre está en N.

#### `groupByLeftSide({ nonterminals, productions })`

Vive en `grammar/productions.ts`, porque la usan `buildGrammar` y la FNC.

```ts
function groupByLeftSide({
  nonterminals,
  productions,
}: {
  nonterminals: ReadonlySet<SymbolName>;
  productions: readonly Production[];
}): Map<SymbolName, Production[]> {
  const productionsByLeftSide = new Map<SymbolName, Production[]>();
  for (const nonterminal of nonterminals) {
    productionsByLeftSide.set(nonterminal, []);
  }
  for (const production of productions) {
    productionsByLeftSide.get(production.leftSide)?.push(production);
  }
  return productionsByLeftSide;
}
```

- Primera pasada: una lista vacía para **cada** no terminal. Así `get(A)` nunca da `undefined` para A ∈ N, y los algoritmos no lo comprueban.
- Segunda pasada: cada producción va a la lista de su lado izquierdo. Como P se recorre en orden, cada lista queda ordenada por `id`.
- `?.push` solo satisface a TypeScript: todo lado izquierdo está en N.

#### `rejectReservedName(symbol)`

```ts
function rejectReservedName(symbol: SymbolName): void {
  if (symbol.includes('$')) {
    throw new GrammarBuildError(`"${symbol}" contains '$', which is reserved`);
  }
}
```

- `$` es el fin de entrada en FOLLOW: con un terminal `$`, no se distinguiría "puede venir `$`" de "puede terminar la entrada". Y `$S` es el inicio aumentado.
- La llaman `collectNonterminals`, `checkDeclaredTerminal`, `checkIdentifier` y `checkLiteral`: ningún símbolo entra sin pasar por ella.

### 3.5 `formatGrammar` en `command-line/format.ts`

```ts
export function formatGrammar(grammar: Grammar): string {
  return [
    `${grammar.name}: G = (N, Σ, P, S)`,
    `N = ${formatSet(grammar.nonterminals)}`,
    `Σ = ${formatSet(grammar.terminals)}`,
    `S = ${grammar.start}`,
    'P:',
    ...grammar.productions.map(formatNumberedProduction),
  ].join('\n');
}

function formatNumberedProduction(production: Production): string {
  return `  ${String(production.id).padStart(2)}  ${formatProduction(production)}`;
}
```

- `formatSet` escribe los conjuntos **ordenados**, así la salida siempre es la misma y se compara en una prueba.
- `padStart(2)` alinea los `id` a la derecha. Está en `command-line/` porque son detalles de la terminal; la web muestra la gramática con componentes.

## 4. Consola y pruebas

```text
$ npm run sabueso -- grammar arithmetic
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

Con el relato: `npm run sabueso -- grammar g1` (21 no terminales, 14 terminales y 40 producciones).

- **`packages/core/test/grammar-build.test.ts`:** sobre `expressions`, la clasificación de N y Σ, la numeración, el índice, el inicio (por defecto y con `start`), `S → ε` como `rightSide: []`, los literales, que los declarados entran a Σ, y un caso por cada mensaje de error.
- **`packages/core/test/grammar-build-cases.test.ts`:** guiada por datos (casos en `test/fixtures/grammar-build-cases.ts`, recorridos con `it.each`).
  - 15 gramáticas válidas, comparando la 4-upla completa: `expressions`, `arithmetic`, `parentheses`, `epsilon-trap`, `a-n-b-n`, `palindromes`, `story`, `explicit-start`, `scattered-rules`, `useless`, `empty-language`, `cyclic`, `literal-and-identifier`, `keywords` y `literal-with-space` (la clave JSON).
  - `useless`, `empty-language` y `cyclic` están para mostrar que construir no es analizar: son gramáticas bien formadas, y esas propiedades las calculan las guías [09](09-simbolos-inutiles-y-vacuidad.md) y [10](10-ciclos.md).
  - Sobre todos los casos válidos, tres invariantes: `id` = posición, N ∩ Σ = ∅ y todo símbolo de un lado derecho está en N o en Σ.
  - 14 gramáticas rechazadas, con el mensaje exacto: uno por error, más un inicio terminal, una producción repetida por un literal, una ε repetida y `$` en cuatro posiciones.
  - `formatGrammar`: la salida exacta de `parentheses` y los `id` de dos dígitos alineados.
- **`packages/core/test/command-line/grammar.test.ts`:** el comando `grammar` con archivos reales ([guía 04](04-parser-ll1.md)).

## 5. Referencias

- Augusto, sección 2.4.
- Hopcroft, Motwani y Ullman, _Introducción a la teoría de autómatas, lenguajes y computación_, sección 5.1.
