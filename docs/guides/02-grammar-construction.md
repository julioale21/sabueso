# Guía de estudio: la gramática libre de contexto en el núcleo

> **Paso 2 del SPEC 02.** Archivos: `packages/core/src/grammar/types.ts`, `packages/core/src/grammar/build.ts`, y `packages/core/src/command-line/format.ts`. En consola, la gramática se muestra con el comando `grammar` (paso 4).
> Ficha teórica relacionada: [`docs/concepts/02-context-free-grammar.md`](../concepts/02-context-free-grammar.md).

Esta guía explica **qué hace cada pieza, cómo funciona por dentro y por qué está diseñada así**. Es la base de todo el núcleo: el lexer, el parser, los análisis, Earley, CNF, CYK y el autómata de pila trabajan sobre el objeto `Grammar` que se construye acá.

---

## Índice

1. [El problema que resuelve](#1-el-problema-que-resuelve)
2. [Por qué esta convención](#2-por-qué-esta-convención)
3. [Cómo se usa en el programa](#3-cómo-se-usa-en-el-programa)
4. [Cómo funciona](#4-cómo-funciona)
5. [El código, función por función](#5-el-código-función-por-función)
6. [Ejemplo recorrido a mano](#6-ejemplo-recorrido-a-mano)
7. [Errores](#7-errores)
8. [Consola y pruebas](#8-consola-y-pruebas)
9. [Preguntas probables en la defensa](#9-preguntas-probables-en-la-defensa)

Anexo: [Detalles de TypeScript que aparecen en el código](#anexo-detalles-de-typescript-que-aparecen-en-el-código)

---

## 1. El problema que resuelve

En la teoría, una **gramática libre de contexto** es una 4-upla **G = (N, Σ, P, S)**:

| Componente | Qué es                                                               | Ejemplo (expresiones)    |
| ---------- | -------------------------------------------------------------------- | ------------------------ |
| **N**      | conjunto finito de **no terminales** (variables)                     | {E, T}                   |
| **Σ**      | conjunto finito de **terminales** (el alfabeto), con N ∩ Σ = ∅       | {+, id}                  |
| **P**      | conjunto finito de **producciones** A → α, con A ∈ N y α ∈ (N ∪ Σ)\* | E → E + T, E → T, T → id |
| **S**      | el **símbolo inicial**, S ∈ N                                        | E                        |

El programa necesita dos cosas:

1. **Representar** esa 4-upla en memoria, con una estructura que los algoritmos puedan recorrer rápido.
2. **Construirla solo si es válida.** Una gramática mal escrita (un símbolo con un error de tipeo, una producción repetida, un inicio que no existe) tiene que rechazarse con un mensaje claro, **antes** de que la usen Earley o los análisis.

`types.ts` resuelve lo primero y `build.ts` lo segundo.

---

## 2. Por qué esta convención

- **Qué se eligió:** N se deduce (los lados izquierdos) y todo lo demás es terminal. `%terminals` es opcional, y cuando está, convierte en error cualquier identificador desconocido.
- **Por qué es correcto:** todo no terminal útil tiene al menos una producción. Entonces "ser lado izquierdo" identifica a N sin declararlo, y Σ queda disjunto de N por construcción.
- **Alternativas descartadas:**
  - _Mayúscula = no terminal_, como en los libros: no sirve en este dominio, porque las etiquetas (`CRI`) y los no terminales (`Relato`) empiezan con mayúscula.
  - _Declarar N explícitamente:_ es redundante, porque las reglas ya lo dicen.
  - _`%terminals` obligatorio:_ es incómodo en gramáticas chicas de prueba (`E → E + T`). Por eso es opcional, y las gramáticas del género (G0, G1) lo usan siempre.

---

## 3. Cómo se usa en el programa

### El mapa: cómo se conectan las piezas

Este paso implementa **solo** la construcción de la gramática a partir de reglas ya separadas. El texto del archivo lo leen el lexer y el parser de los pasos 3 y 4. La cadena completa es:

| #   | Etapa               | Entrada                      | Salida          | Paso          | Archivo                            |
| --- | ------------------- | ---------------------------- | --------------- | ------------- | ---------------------------------- |
| 1   | Lexer (AFD)         | texto del archivo `.grammar` | tokens          | 3             | `grammar-format/lexer.ts`          |
| 2   | Parser (LL(1))      | tokens                       | `GrammarRule[]` | 4             | `grammar-format/parser.ts`         |
| 3   | **`buildGrammar`**  | **`GrammarRule[]`**          | **`Grammar`**   | **2**         | **`grammar/build.ts`** (este paso) |
| 4   | Análisis, Earley, … | `Grammar`                    | resultados      | 7 en adelante | todavía no existen                 |

`parseGrammarText` (paso 4) une las tres primeras etapas. `npm run sabueso -- grammar g1` las recorre con un archivo real.

- **Entrada de `buildGrammar`:** una lista de `GrammarRule`, es decir, reglas "tal como se escriben", donde todavía no se sabe qué símbolo es terminal.
- **Salida:** un `Grammar`, la 4-upla validada, con N y Σ ya clasificados y las producciones numeradas.

Dependencias entre archivos (cada fila: el archivo de la izquierda importa al de la derecha):

| Archivo                            | Importa a                  | Para qué                                                            |
| ---------------------------------- | -------------------------- | ------------------------------------------------------------------- |
| `command-line/commands/grammar.ts` | `grammar-format/parser.ts` | leer el archivo (`parseGrammarText`, que termina en `buildGrammar`) |
| `command-line/commands/grammar.ts` | `command-line/format.ts`   | convertirla en texto (`formatGrammar`)                              |
| `command-line/format.ts`           | `grammar/build.ts`         | escribir cada producción (`formatProduction`)                       |
| `grammar/build.ts`                 | `grammar/types.ts`         | los tipos `Grammar`, `Production`, `SymbolName`                     |

**Regla de arquitectura:** `grammar/` (el motor) **no importa nada** de `command-line/` (la consola). La consola usa al motor, nunca al revés. Por eso el mismo motor sirve para la consola, la web (SPEC 03) y la entrada en español controlado (SPEC 04), que convierte frases en etiquetas.

### La presentación: `format.ts`

#### `formatGrammar(grammar)` en `command-line/format.ts`

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

- **`formatSet(...)`:** escribe un conjunto como `{a, b}`, **ordenado**. Así la salida es siempre la misma y se puede comparar en una prueba.
- **`formatNumberedProduction`:** el `id` alineado a la derecha en 2 caracteres (`padStart(2)`), seguido de la producción escrita por `formatProduction` del motor.
- **Por qué está en `command-line/`:** decide detalles de la **terminal** (alineación con espacios, texto plano). La web va a mostrar la gramática con componentes, no con este texto. El motor no sabe de consola.

#### El recorrido de `npm run sabueso -- grammar arithmetic`

1. **`command-line.ts`** arma el `environment` real (escribe en `process.stdout`, lee archivos del disco) y llama a `runCommandLine(['grammar', 'arithmetic'], environment)`.
2. **`program.ts`** define `runCommandLine` con `createCommandLineProgram(...)`, que recibe la lista de comandos. `help` se agrega solo.
3. **`run.ts`** busca el comando llamado `grammar` y llama a `command.run(['arithmetic'], environment)`.
4. **`commands/grammar.ts`**:
   1. lee `grammars/test/arithmetic.grammar` por el `environment`;
   2. llama a `parseGrammarText(...)`: lexer → parser → **`buildGrammar`** (este paso), y obtiene el `Grammar`;
   3. llama a `formatGrammar(...)` y obtiene el texto (presentación);
   4. llama a `environment.writeOutput(texto)` y devuelve `0`.
5. **`command-line.ts`** asigna `process.exitCode = 0`.

Escribe por el `environment` y no con `console.log`, así que una prueba puede capturar la salida en memoria.

Salida:

```
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

---

## 4. Cómo funciona

`buildGrammar` hace siete pasos. Cada uno es una función con nombre propio, así que el código se lee como el algoritmo:

1. **`requireAtLeastOneRule`:** hay al menos una regla. Obtiene la primera, para el inicio por defecto.
2. **`createSymbolTable`:** calcula N (los lados izquierdos) y valida los terminales declarados.
3. **`createProductions`:** recorre los lados derechos, valida cada símbolo y numera las producciones. No modifica nada: solo devuelve P.
4. **`rejectDuplicateProductions`:** P no tiene repetidos.
5. **`requireNonterminalStart`:** S es el declarado o, si no hay, el lado izquierdo de la primera regla, y tiene que pertenecer a N.
6. **`collectTerminals`:** calcula Σ en su propio paso, igual que N: los declarados más todo símbolo de un lado derecho que no está en N.
7. **`groupByLeftSide`:** arma el índice.

**El orden importa:**

- N tiene que estar completo **antes** de recorrer los lados derechos (paso 2 antes del 3) y antes de calcular Σ (paso 6). Para saber si `T` es no terminal hay que conocer **todos** los lados izquierdos, incluidos los de reglas que aparecen más abajo. Por ejemplo, en `E -> T` / `T -> id`, cuando se lee `T` en la primera regla todavía no se "llegó" a la segunda.
- Las comprobaciones que pueden fallar van **antes** del `return`. Si algo falla, se lanza `GrammarBuildError` y nunca se devuelve una gramática a medio validar.

---

## 5. El código, función por función

### 5.1 `types.ts`: el modelo de una gramática

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

#### `SymbolName`

Un símbolo es un texto: `'E'`, `'+'`, `'CRI'`, `'Pistas'`. Es un alias de `string` que sirve como documentación: cuando una función recibe un `SymbolName`, se entiende que es un símbolo de la gramática y no un texto cualquiera.

**El símbolo no dice si es terminal o no terminal.** Eso lo decide la gramática, según el símbolo esté en `nonterminals` (N) o en `terminals` (Σ). Es igual que en la teoría: "a" es terminal porque a ∈ Σ, no por cómo se escribe.

#### `Production`: una producción A → α

| Campo       | Significado                             | En E → E + T      |
| ----------- | --------------------------------------- | ----------------- |
| `id`        | número de la producción, empezando en 0 | `0`               |
| `leftSide`  | A, el no terminal que se reemplaza      | `'E'`             |
| `rightSide` | α, la secuencia por la que se reemplaza | `['E', '+', 'T']` |

**ε se representa con `rightSide: []`.** La producción A → ε tiene un lado derecho de largo 0. ε **no** es un símbolo: es la cadena vacía. Si fuera un símbolo `'ε'`, un algoritmo podría tratarlo por error como un terminal que hay que leer en la entrada. Con la lista vacía eso no puede pasar, y coincide con la definición |ε| = 0.

**¿Por qué un `id`?** Los comandos y la defensa hablan de "la producción 2", Earley guarda qué producción usó cada ítem y los árboles muestran qué regla se aplicó. El número tiene que ser **estable**: el mismo cada vez que se carga la gramática. Por eso es la posición en el orden en que se escribieron las reglas.

#### `Grammar`: la 4-upla

| Campo                   | Teoría     | Tipo                                             | Por qué ese tipo                                                                                            |
| ----------------------- | ---------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `name`                  | —          | `string`                                         | Para mostrarla (`expressions: G = …`) y en los mensajes de error.                                           |
| `start`                 | S          | `SymbolName`                                     | Un único símbolo.                                                                                           |
| `nonterminals`          | N          | `ReadonlySet<SymbolName>`                        | Es un conjunto: sin repetidos y con pertenencia instantánea (`has`).                                        |
| `terminals`             | Σ          | `ReadonlySet<SymbolName>`                        | Igual que N.                                                                                                |
| `productions`           | P          | `readonly Production[]`                          | Lista y no conjunto, porque **el orden importa** (define los `id`). Los repetidos se rechazan al construir. |
| `productionsByLeftSide` | — (índice) | `ReadonlyMap<SymbolName, readonly Production[]>` | Acceso directo a las producciones de cada no terminal.                                                      |

#### `productions` y `productionsByLeftSide`: la misma P, organizada de dos maneras

Con `E → E + T | T`, `T → id`:

|              | `productions`                                    | `productionsByLeftSide`                        |
| ------------ | ------------------------------------------------ | ---------------------------------------------- |
| Qué es       | P completa, en orden: la posición es el `id`     | P agrupada por lado izquierdo                  |
| Contenido    | `[E → E + T, E → T, T → id]`                     | `E ⇒ [0, 1]`, `T ⇒ [2]`                        |
| Pregunta     | "¿Cuál es la producción 2?" o "Dame todas"       | "¿Cuáles son las producciones de E?"           |
| Acceso       | `productions[2]`                                 | `productionsByLeftSide.get('E')`               |
| Quién la usa | `formatGrammar`, análisis de punto fijo, árboles | Predictor de Earley, FIRST/FOLLOW, tabla LL(1) |

**Por qué las dos:** por velocidad. Sin el índice, para cada no terminal habría que recorrer y filtrar P entera (`productions.filter(…)`). El Predictor de Earley hace esa pregunta una vez por cada ítem que espera un no terminal, miles de veces en una entrada larga. El índice se arma una sola vez, en `groupByLeftSide` (§5.4.13).

**No son copias.** El índice guarda referencias a los mismos objetos: `productionsByLeftSide.get('E')![0] === productions[0]`. Por eso nunca quedan desincronizadas, y por eso las dos son de solo lectura.

| Parte del tipo          | Qué es  | Ejemplo                        | Qué impide                                  |
| ----------------------- | ------- | ------------------------------ | ------------------------------------------- |
| `SymbolName`            | clave   | `'E'`                          | —                                           |
| `readonly Production[]` | valor   | `[producción 0, producción 1]` | modificar la lista (`push`)                 |
| `ReadonlyMap<…>`        | el mapa | —                              | agregar o quitar entradas (`set`, `delete`) |

#### `Readonly…`: la gramática es inmutable

Los campos usan `ReadonlySet`, `ReadonlyMap` y `readonly …[]`. TypeScript impide modificarla después de construida: un `grammar.terminals.add('x')` no compila. Así ningún algoritmo puede "romper" una gramática que otro algoritmo está usando. Los que transforman gramáticas (por ejemplo, la forma normal de Chomsky) crean una gramática nueva.

#### `AUGMENTED_START = '$S'`

Earley usa la **gramática aumentada**: agrega la producción $S → S. Así hay un único punto de aceptación: "se completó $S → S• en la posición final". FOLLOW no la usa: usa solo el marcador `$` de fin de entrada. El nombre `$S` lleva `$`, que ninguna gramática puede usar (ver `rejectReservedName`), así que nunca choca con un símbolo del usuario.

### 5.2 `build.ts`: tipos de entrada

#### `RightSideSymbol`

```ts
export type RightSideSymbol = SymbolName | { literal: string };
```

Es un símbolo del lado derecho **tal como se escribió**, antes de clasificarlo. Hay dos formas, que corresponden a las dos maneras de escribir un símbolo en un archivo `.grammar`:

| En el archivo                  | Valor en `RightSideSymbol` | Qué será en la gramática                                          |
| ------------------------------ | -------------------------- | ----------------------------------------------------------------- |
| `T` (identificador)            | `'T'`                      | No terminal si es lado izquierdo de alguna regla; terminal si no. |
| `'+'` (literal entre comillas) | `{ literal: '+' }`         | **Siempre** terminal, llamado `+` (sin comillas).                 |

**¿Por qué existen los literales?** Símbolos como `+`, `(`, `)` o `*` no son identificadores válidos: un identificador está hecho de letras. Se escriben entre comillas y el constructor los convierte en terminales con el nombre de su contenido. Así el terminal se llama `+`, igual que lo que escribe el usuario en la entrada `id + id`.

**¿Por qué un objeto `{ literal }` y no simplemente `'+'`?** Para no perder información. `T` y `'T'` se escriben distinto en el archivo y significan cosas distintas: el primero puede ser un no terminal, el segundo es siempre terminal. Si los dos llegaran como el texto `'T'`, el constructor no podría distinguirlos.

#### `GrammarRule`

```ts
export interface GrammarRule {
  leftSide: SymbolName;
  rightSide: readonly RightSideSymbol[];
}
```

Una producción **tal como se escribió**: `E -> E '+' T` llega como `{ leftSide: 'E', rightSide: ['E', { literal: '+' }, 'T'] }`. Una línea con alternativas (`E -> E '+' T | T`) se convierte en **dos** `GrammarRule`: cada alternativa es una producción distinta.

Diferencia con `Production`:

|              | `GrammarRule` (entrada)                              | `Production` (salida)                        |
| ------------ | ---------------------------------------------------- | -------------------------------------------- |
| Lado derecho | `RightSideSymbol[]`: identificadores **o** literales | `SymbolName[]`: solo nombres ya clasificados |
| `id`         | no tiene                                             | tiene                                        |
| Validada     | no                                                   | sí                                           |

#### `GrammarBuildError`

```ts
export class GrammarBuildError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GrammarBuildError';
  }
}
```

Es un tipo de error propio. Extiende `Error`, así que tiene mensaje y traza como cualquier error, pero con nombre propio. Sirve para:

- **Distinguir** "la gramática está mal escrita", que es culpa del autor de la gramática, de un error del programa. Quien llama puede hacer `if (error instanceof GrammarBuildError)`.
- **Mensajes útiles:** cada mensaje nombra al culpable, el símbolo o la producción. No trae línea ni columna, porque `buildGrammar` recibe reglas y no texto. Solo los errores del lexer y del parser (`GrammarSyntaxError`) traen la posición en el archivo.

`this.name = 'GrammarBuildError'` hace que el error se muestre como `GrammarBuildError: …` y no como `Error: …`.

#### `SymbolTable` (interno, no se exporta)

```ts
interface SymbolTable {
  nonterminals: ReadonlySet<SymbolName>;
  /** The %terminals declaration, if the grammar has one. */
  declaredTerminals: ReadonlySet<SymbolName> | undefined;
}
```

Junta en un solo objeto lo que se sabe de los símbolos **antes** de leer los lados derechos, para no pasar dos parámetros a cada función:

| Campo               | Cuándo se llena                                          | Mutable            |
| ------------------- | -------------------------------------------------------- | ------------------ |
| `nonterminals`      | al principio, con todos los lados izquierdos             | no (`ReadonlySet`) |
| `declaredTerminals` | al principio, con `%terminals` (o `undefined` si no hay) | no                 |

Los dos campos son de solo lectura y la tabla es privada de `build.ts`. Σ **no** está en la tabla: se calcula al final, en su propio paso, con `collectTerminals` (§5.4.7). Así ninguna función cambia algo "por debajo" mientras recorre las reglas.

### 5.3 `build.ts`: la función principal `buildGrammar`

```ts
export function buildGrammar(
  name: string,
  rules: readonly GrammarRule[],
  start?: SymbolName,
  declaredTerminals?: Iterable<SymbolName>,
): Grammar {
  const firstRule = requireAtLeastOneRule(name, rules);
  const symbols = createSymbolTable(rules, declaredTerminals);
  const productions = createProductions(rules, symbols);
  rejectDuplicateProductions(productions);

  return {
    name,
    start: requireNonterminalStart(start ?? firstRule.leftSide, symbols.nonterminals),
    nonterminals: symbols.nonterminals,
    terminals: collectTerminals(productions, symbols),
    productions,
    productionsByLeftSide: groupByLeftSide(symbols.nonterminals, productions),
  };
}
```

#### Parámetros

| Parámetro           | Obligatorio | Qué es                                 | En un `.grammar` viene de       |
| ------------------- | ----------- | -------------------------------------- | ------------------------------- |
| `name`              | sí          | nombre para mostrar y para los errores | el nombre del archivo           |
| `rules`             | sí          | las producciones como se escribieron   | las líneas `A -> …`             |
| `start`             | no          | el símbolo inicial                     | la directiva `%start S`         |
| `declaredTerminals` | no          | los terminales declarados              | la directiva `%terminals a b c` |

`declaredTerminals` es un `Iterable` y no un array: acepta cualquier cosa que se pueda recorrer (un array, un `Set`…). Es más flexible para quien llama.

`start ?? firstRule.leftSide` significa: "si `start` vino, úsalo; si es `undefined`, usa el lado izquierdo de la primera regla". Es la convención habitual de los libros: el inicio es el de la primera regla.

Los siete pasos y por qué van en ese orden están en §4.

### 5.4 `build.ts`: cada función auxiliar, en detalle

Para cada función: qué hace, cómo, qué devuelve y qué errores lanza.

#### 5.4.1 `formatProduction(production)` (exportada)

```ts
export function formatProduction(production: Production): string {
  const rightSide = production.rightSide.length === 0 ? 'ε' : production.rightSide.join(' ');
  return `${production.leftSide} → ${rightSide}`;
}
```

- **Qué hace:** escribe una producción con la notación de la teoría.
- **Cómo:** si el lado derecho está vacío escribe `ε`; si no, une los símbolos con un espacio.
- **Ejemplos:**
  - `{ leftSide: 'E', rightSide: ['E', '+', 'T'] }` → `'E → E + T'`
  - `{ leftSide: 'S', rightSide: [] }` → `'S → ε'`
- **Por qué vive en el motor y no en la consola:** la notación `A → α` es parte del concepto, no de la presentación. La usan los mensajes de error del propio motor (`Duplicate production: T → id`), y la va a usar la web.

#### 5.4.2 `requireAtLeastOneRule(name, rules)`

```ts
function requireAtLeastOneRule(name: string, rules: readonly GrammarRule[]): GrammarRule {
  const firstRule = rules[0];
  if (firstRule === undefined) {
    throw new GrammarBuildError(`Grammar "${name}" has no rules`);
  }
  return firstRule;
}
```

- **Qué hace:** verifica que haya reglas y devuelve la primera.
- **Por qué:** P no puede estar vacío. Sin producciones no hay N, y por lo tanto no puede haber un S ∈ N.
- **Detalle:** `rules[0]` en un array vacío da `undefined`. La configuración estricta del proyecto (`noUncheckedIndexedAccess`) obliga a comprobarlo: TypeScript tipa `rules[0]` como `GrammarRule | undefined`. Después del `if`, TypeScript ya sabe que `firstRule` es una `GrammarRule`.
- **Error:** `Grammar "X" has no rules`.

#### 5.4.3 `createSymbolTable(rules, declaredTerminals)`

```ts
function createSymbolTable(
  rules: readonly GrammarRule[],
  declaredTerminals: Iterable<SymbolName> | undefined,
): SymbolTable {
  const nonterminals = collectNonterminals(rules);
  const declared = declaredTerminals === undefined ? undefined : new Set(declaredTerminals);
  declared?.forEach((terminal) => checkDeclaredTerminal(terminal, nonterminals));
  return { nonterminals, declaredTerminals: declared };
}
```

- **Qué hace:** arma la tabla de símbolos inicial.
- **Paso a paso:**
  1. Calcula N con `collectNonterminals`.
  2. Si hay `%terminals`, los convierte en un `Set`. Esto elimina repetidos y permite `has` instantáneo. Si no hay, queda `undefined`, que significa "esta gramática no declara terminales". No es lo mismo que "declara cero terminales".
  3. Valida cada terminal declarado con `checkDeclaredTerminal`. `declared?.forEach(...)` solo se ejecuta si `declared` no es `undefined`.
- **Qué no hace:** no calcula Σ. Σ depende de los lados derechos, y se calcula después con `collectTerminals` (§5.4.7).

#### 5.4.4 `collectNonterminals(rules)`

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

- **Qué hace:** calcula **N = { A | existe una regla A → … }**.
- **La convención del formato:** N no se declara, **se deduce**. Un símbolo es no terminal exactamente cuando aparece como lado izquierdo de alguna regla. Es natural: un no terminal es algo que se reemplaza, así que tiene que tener al menos una producción.
- **El `Set` elimina repetidos:** `E` aparece dos veces como lado izquierdo (E → E + T y E → T), pero en N está una vez.
- **El orden se conserva:** un `Set` de JavaScript recuerda el orden de inserción. N sale en el orden de aparición (`E`, `T`), y así la salida es predecible.
- **Valida** que ningún lado izquierdo use `$`.

#### 5.4.5 `checkDeclaredTerminal(terminal, nonterminals)`

```ts
function checkDeclaredTerminal(terminal: SymbolName, nonterminals: ReadonlySet<SymbolName>): void {
  rejectReservedName(terminal);
  if (nonterminals.has(terminal)) {
    throw new GrammarBuildError(
      `"${terminal}" is declared as a terminal but is the left-hand side of a rule`,
    );
  }
}
```

- **Qué hace:** valida un terminal declarado en `%terminals`.
- **Por qué:** la definición exige **N ∩ Σ = ∅**. Si `E` está declarado como terminal y también tiene una regla `E → …`, sería terminal y no terminal a la vez.
- **Error:** `"E" is declared as a terminal but is the left-hand side of a rule`. También rechaza `$`.
- **Devuelve `void`:** no calcula nada; si no lanza un error, el terminal es válido.

#### 5.4.6 `createProductions(rules, symbols)`

```ts
function createProductions(rules: readonly GrammarRule[], symbols: SymbolTable): Production[] {
  return rules.map((rule, index) => ({
    id: index,
    leftSide: rule.leftSide,
    rightSide: rule.rightSide.map((symbol) => checkRightSideSymbol(symbol, symbols)),
  }));
}
```

- **Qué hace:** convierte cada `GrammarRule` en una `Production`.
- **Cómo:**
  - `rules.map((rule, index) => …)` recorre las reglas en orden y da la posición `index`, que es el `id`. Por eso la numeración empieza en 0 y sigue el orden del archivo.
  - El lado izquierdo se copia tal cual: ya se sabe que es un no terminal.
  - Cada símbolo del lado derecho pasa por `checkRightSideSymbol`, que lo valida y devuelve su nombre.
- **Es una función pura:** solo lee `symbols` y devuelve P. No agrega nada a Σ ni a ningún otro conjunto. Σ se calcula después, a partir de P, con `collectTerminals` (§5.4.7).
- **Un lado derecho vacío** (`rightSide: []`) da un `.map` vacío, es decir, la producción ε. No necesita un caso especial.

#### 5.4.7 `collectTerminals(productions, symbols)`

```ts
function collectTerminals(
  productions: readonly Production[],
  symbols: SymbolTable,
): Set<SymbolName> {
  const terminals = new Set(symbols.declaredTerminals);
  for (const symbol of productions.flatMap((production) => production.rightSide)) {
    if (!symbols.nonterminals.has(symbol)) {
      terminals.add(symbol);
    }
  }
  return terminals;
}
```

- **Qué hace:** calcula **Σ = declarados ∪ { símbolos de los lados derechos que no están en N }**.
- **Por qué en su propio paso:** igual que N tiene `collectNonterminals`, Σ tiene `collectTerminals`. Cada conjunto de la 4-upla sale de una función con nombre propio. Ninguna validación lo va llenando de a poco.
- **Paso a paso:**
  1. Σ **empieza** con los declarados. `new Set(undefined)` crea un conjunto vacío, así que sin `%terminals` Σ arranca vacío.
  2. `productions.flatMap((production) => production.rightSide)` junta los lados derechos de todas las producciones en una sola lista.
  3. Cada símbolo que **no** está en N es terminal y se agrega. Agregar un elemento que ya está en un `Set` no hace nada, así que `+` usado tres veces queda una vez en Σ.
- **Por qué recibe `productions` y no `rules`:** en P los símbolos ya están validados y los literales ya son nombres (`'+'` → `+`). No hace falta distinguir identificadores de literales.
- **Por qué los declarados entran a Σ aunque ninguna regla los use:** el autor dijo explícitamente "estos son mis terminales". Por ejemplo, una gramática del policial declara las 14 etiquetas aunque una versión simplificada no use todas. Σ es el alfabeto: el usuario puede escribir esas etiquetas en la entrada, y la gramática simplemente no las acepta en ninguna posición.
- **El orden se conserva:** primero los declarados, después los demás en orden de aparición.

#### 5.4.8 `checkRightSideSymbol(symbol, symbols)`

```ts
function checkRightSideSymbol(symbol: RightSideSymbol, symbols: SymbolTable): SymbolName {
  return typeof symbol === 'string'
    ? checkIdentifier(symbol, symbols)
    : checkLiteral(symbol.literal, symbols);
}
```

- **Qué hace:** transforma un símbolo "como se escribió" en su nombre definitivo, después de validarlo.
- **Cómo distingue las dos clases:** `typeof symbol === 'string'`.
  - Si es un `string`, es un **identificador**: se valida con `checkIdentifier`.
  - Si no, es un objeto `{ literal }`, un **literal**: se valida con `checkLiteral`. TypeScript entiende que en esa rama `symbol` tiene la propiedad `literal` (ver el Anexo, "narrowing").
- **Devuelve** el nombre (`'E'`, `'+'`, `'id'`), que es lo que se guarda en `Production.rightSide`.
- **No clasifica:** decidir si el nombre es terminal le toca a `collectTerminals` (§5.4.7).

#### 5.4.9 `checkIdentifier(identifier, symbols)`

```ts
function checkIdentifier(identifier: SymbolName, symbols: SymbolTable): SymbolName {
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

- **Qué hace:** valida un identificador del lado derecho.
- **Las dos preguntas:**
  - `isTerminal`: ¿**no** es un lado izquierdo? Entonces, por la convención, es un terminal.
  - `isUndeclared`: ¿la gramática **tiene** `%terminals` y este identificador **no** está en esa lista?
- **El error solo ocurre si se cumplen las dos:** es un terminal (por convención) que no fue declarado.
- **Por qué es la validación más importante:** protege contra **errores de tipeo**. En la gramática

  ```
  Relato -> CRI Pistass REV      # se quiso escribir Pistas
  Pistas -> PIS Pistas | PIS
  ```

  `Pistass` no es lado izquierdo de ninguna regla. **Sin** `%terminals`, la convención lo convierte en terminal **sin avisar**: la gramática se construye, pero acepta otro lenguaje, uno donde hay que escribir literalmente "Pistass". **Con** `%terminals CRI PIS REV`, el constructor detecta que `Pistass` no es no terminal ni terminal declarado, y lo rechaza con un mensaje que lo nombra.

- **Sin `%terminals`** (`declaredTerminals === undefined`), `isUndeclared` es siempre `false` y la convención se aplica libremente. Es cómodo para gramáticas chicas de prueba como `E → E + T | T`.

#### 5.4.10 `checkLiteral(literal, symbols)`

```ts
function checkLiteral(literal: string, symbols: SymbolTable): SymbolName {
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

- **Qué hace:** valida un literal (`'+'`) y devuelve su contenido como nombre del terminal.
- **Tres validaciones:**
  1. **Literal vacío (`''`):** un terminal no puede ser la cadena vacía, porque los terminales son los símbolos del alfabeto y la cadena vacía no es uno de ellos. Si se quería ε, se escribe `ε`. El mensaje lo dice.
  2. **`$` reservado.**
  3. **Mismo nombre que un no terminal:** si existe la regla `E → …` y además se escribe `'E'`, el símbolo `E` sería a la vez no terminal (por la regla) y terminal (por el literal). Eso viola N ∩ Σ = ∅.
- **Los literales no se comparan con `%terminals`:** las comillas ya son una declaración explícita de que el símbolo es terminal.

#### 5.4.11 `rejectDuplicateProductions(productions)`

```ts
function rejectDuplicateProductions(productions: readonly Production[]): void {
  const seen = new Set<string>();
  for (const production of productions) {
    const key = JSON.stringify([production.leftSide, ...production.rightSide]);
    if (seen.has(key)) {
      throw new GrammarBuildError(`Duplicate production: ${formatProduction(production)}`);
    }
    seen.add(key);
  }
}
```

- **Qué hace:** verifica que no haya dos producciones iguales.
- **Por qué:** en la teoría P es un **conjunto**, y una producción repetida casi siempre es un error de edición. Además, una producción duplicada haría que Earley encuentre **dos árboles idénticos** para la misma entrada, y la gramática parecería ambigua sin serlo.
- **Cómo compara:** convierte cada producción en una **clave de texto** y la guarda en un `Set` de claves vistas. Si una clave ya estaba, la producción es repetida.
- **¿Por qué `JSON.stringify` y no unir con espacios?** Para que dos producciones distintas nunca den la misma clave. Con espacios, `A → 'b c'` (un literal con un espacio adentro, un solo símbolo) y `A → b c` (dos símbolos) darían las dos `"A b c"`. Con JSON dan `["A","b c"]` y `["A","b","c"]`, que son distintas. JSON marca con comillas dónde empieza y termina cada símbolo.
- **Por qué compara después de validar:** compara `Production` y no `GrammarRule`, así que `S → 'a'` y `S → a` (un literal y un identificador terminal con el mismo nombre) se detectan como la misma producción. En la gramática resultante lo son.
- **Error:** `Duplicate production: T → id`.

#### 5.4.12 `requireNonterminalStart(start, nonterminals)`

```ts
function requireNonterminalStart(
  start: SymbolName,
  nonterminals: ReadonlySet<SymbolName>,
): SymbolName {
  if (!nonterminals.has(start)) {
    throw new GrammarBuildError(`Start symbol "${start}" is not the left-hand side of any rule`);
  }
  return start;
}
```

- **Qué hace:** verifica que S ∈ N y lo devuelve.
- **Por qué:** la definición lo exige. Las derivaciones empiezan reemplazando S: si S no tiene producciones, no se puede derivar nada y L(G) = ∅ de manera trivial. Casi seguro es un error de tipeo en `%start`.
- **Cuándo puede fallar:** solo con un `%start` explícito. El inicio por defecto (el lado izquierdo de la primera regla) siempre pertenece a N.
- **Error:** `Start symbol "X" is not the left-hand side of any rule`.

#### 5.4.13 `groupByLeftSide(nonterminals, productions)`

```ts
function groupByLeftSide(
  nonterminals: ReadonlySet<SymbolName>,
  productions: readonly Production[],
): Map<SymbolName, Production[]> {
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

- **Qué hace:** construye el índice A → [producciones de A].
- **Dos pasadas:**
  1. Crea una lista vacía para **cada** no terminal. Así, para todo A ∈ N, `productionsByLeftSide.get(A)` devuelve una lista y nunca `undefined`, y los algoritmos no necesitan comprobarlo.
  2. Recorre P en orden y agrega cada producción a la lista de su lado izquierdo. Como P se recorre en orden, cada lista queda **ordenada por `id`**.
- **`?.push`:** `get` puede devolver `undefined` para TypeScript, aunque acá nunca pase, porque todo lado izquierdo está en N. El `?.` satisface al compilador sin agregar un caso que no ocurre.
- **Resultado del ejemplo:** `E → [0, 1]`, `T → [2]`.

#### 5.4.14 `rejectReservedName(symbol)`

```ts
function rejectReservedName(symbol: SymbolName): void {
  if (symbol.includes('$')) {
    throw new GrammarBuildError(`"${symbol}" contains '$', which is reserved`);
  }
}
```

- **Qué hace:** rechaza cualquier símbolo que contenga `$`.
- **Por qué:** el motor usa `$` para dos cosas internas:
  - **`$` como marcador de fin de entrada en FOLLOW.** FOLLOW(S) incluye `$`, que significa "después de S puede terminar la cadena". Si un usuario tuviera un terminal `$`, no se distinguiría "puede venir el terminal `$`" de "puede terminar la entrada".
  - **`$S` como inicio aumentado** (`AUGMENTED_START`).
- **Se llama desde varios lugares:** `collectNonterminals` (lados izquierdos), `checkDeclaredTerminal` (`%terminals`), `checkIdentifier` y `checkLiteral` (lados derechos). Ningún símbolo entra a la gramática sin pasar por ella.

---

## 6. Ejemplo recorrido a mano

**Entrada** (escrita en código; con un archivo `.grammar`, la misma lista la produce el parser del paso 4):

```ts
buildGrammar('expressions', [
  { leftSide: 'E', rightSide: ['E', '+', 'T'] },
  { leftSide: 'E', rightSide: ['T'] },
  { leftSide: 'T', rightSide: ['id'] },
]);
// start: undefined, declaredTerminals: undefined
```

| Paso | Función                      | Resultado                                                                              |
| ---- | ---------------------------- | -------------------------------------------------------------------------------------- |
| 1    | `requireAtLeastOneRule`      | hay 3 reglas → `firstRule = E → E + T`                                                 |
| 2    | `collectNonterminals`        | N = {E, T}                                                                             |
| 2    | `createSymbolTable`          | sin `%terminals` → `declaredTerminals = undefined`                                     |
| 3    | `createProductions`, regla 0 | `E`, `+` y `T` son válidos (ninguno usa `$`, no hay `%terminals`)                      |
| 3    | reglas 1 y 2                 | `T` e `id` son válidos                                                                 |
| 3    | numeración                   | 0: E → E + T, 1: E → T, 2: T → id                                                      |
| 4    | `rejectDuplicateProductions` | claves `["E","E","+","T"]`, `["E","T"]`, `["T","id"]`: todas distintas                 |
| 5    | `requireNonterminalStart`    | `start` no vino → S = `E` (lado izquierdo de la primera regla); E ∈ N ✓                |
| 6    | `collectTerminals`           | Σ arranca vacío · lados derechos `E + T`, `T`, `id` · `+` ∉ N y `id` ∉ N → Σ = {+, id} |
| 7    | `groupByLeftSide`            | E → [0, 1], T → [2]                                                                    |

**Salida:**

```ts
{
  name: 'expressions',
  start: 'E',
  nonterminals: Set { 'E', 'T' },
  terminals: Set { '+', 'id' },
  productions: [
    { id: 0, leftSide: 'E', rightSide: ['E', '+', 'T'] },
    { id: 1, leftSide: 'E', rightSide: ['T'] },
    { id: 2, leftSide: 'T', rightSide: ['id'] },
  ],
  productionsByLeftSide: Map { 'E' => [prod 0, prod 1], 'T' => [prod 2] },
}
```

### Variante con `%terminals` y un error de tipeo

```ts
buildGrammar(
  'story',
  [
    { leftSide: 'Relato', rightSide: ['CRI', 'Pistass', 'REV'] },
    { leftSide: 'Pistas', rightSide: ['PIS'] },
  ],
  undefined,
  ['CRI', 'PIS', 'REV'],
);
```

1. N = {Relato, Pistas}. Los declarados son {CRI, PIS, REV} y ninguno es lado izquierdo ✓.
2. Al validar la regla 0 (en `createProductions`):
   - `CRI` no está en N y sí está declarado ✓.
   - `Pistass` **no** está en N (`isTerminal = true`) y **no** está declarado (`isUndeclared = true`), así que lanza el error:

   `GrammarBuildError: Undeclared symbol "Pistass": it is not the left-hand side of any rule and is not listed in %terminals`

Por consola, con un archivo `.grammar` que tiene ese error de tipeo:

```text
$ npm run sabueso -- grammar --grammar-file typo.grammar
Error: Undeclared symbol "Pistass": it is not the left-hand side of any rule and is not listed in %terminals
```

`run.ts` atrapa el error, escribe `Error: ` y el mensaje, y termina con código 1.

---

## 7. Errores

| Mensaje                                                             | Función                      | Qué regla de la teoría protege   | Ejemplo que lo provoca                    |
| ------------------------------------------------------------------- | ---------------------------- | -------------------------------- | ----------------------------------------- |
| `Grammar "X" has no rules`                                          | `requireAtLeastOneRule`      | P ≠ ∅ (si no, no hay S ∈ N)      | `buildGrammar('x', [])`                   |
| `"E" is declared as a terminal but is the left-hand side of a rule` | `checkDeclaredTerminal`      | N ∩ Σ = ∅                        | `%terminals E` y una regla `E → …`        |
| `Undeclared symbol "X": …`                                          | `checkIdentifier`            | evitar terminales "accidentales" | `%terminals a` y `S → X` sin regla para X |
| `Empty literal: write ε for the empty string`                       | `checkLiteral`               | ε ∉ Σ                            | `S → ''`                                  |
| `Literal 'E' has the same name as a nonterminal`                    | `checkLiteral`               | N ∩ Σ = ∅                        | regla `E → …` y `S → 'E'`                 |
| `Duplicate production: T → id`                                      | `rejectDuplicateProductions` | P es un conjunto                 | `T → id` escrita dos veces                |
| `Start symbol "X" is not the left-hand side of any rule`            | `requireNonterminalStart`    | S ∈ N                            | `%start X` sin regla para X               |
| `"X" contains '$', which is reserved`                               | `rejectReservedName`         | `$` reservado para FOLLOW y $S   | un símbolo `$S` o `'$'`                   |

Todos son `GrammarBuildError`, y todos se lanzan **antes** de devolver la gramática: nunca existe un `Grammar` inválido.

---

## 8. Consola y pruebas

El recorrido de `npm run sabueso -- grammar arithmetic` y su salida están en §3. Con el relato: `npm run sabueso -- grammar g1`.

### `packages/core/test/grammar-build.test.ts` (solo el motor)

Llama a `buildGrammar` y revisa el objeto devuelto, sin pasar por la consola.

| Prueba        | Qué verifica                                               |
| ------------- | ---------------------------------------------------------- |
| clasificación | N = {E, T} y Σ = {+, id}                                   |
| numeración    | ids 0, 1, 2 en el orden escrito                            |
| índice        | E → [0, 1], T → [2]                                        |
| inicio        | por defecto `E`; con `start = 'T'`, `T`                    |
| ε             | `S → ε` se guarda con `rightSide: []` y se escribe `S → ε` |
| literales     | `{ literal: '+' }` se llama `+`                            |
| `%terminals`  | los declarados entran a Σ aunque ninguna regla los use     |
| errores       | un caso por cada mensaje de §7                             |

### Suite de casos: `packages/core/test/grammar-build-cases.test.ts`

Prueba **guiada por datos**: los casos están en `packages/core/test/fixtures/grammar-build-cases.ts`, cada uno con su gramática, su propósito y el resultado esperado. El archivo de prueba los recorre con `it.each`. Para agregar un caso, se suma un objeto a la lista y no hace falta tocar el archivo de prueba.

Cada caso válido compara **la 4-upla completa**: S, N (en orden de aparición), Σ (primero los declarados, después en orden de aparición), P escrita con `formatProduction` (la posición en la lista es el `id`) y el índice `productionsByLeftSide`. Además, sobre **todos** los casos válidos se verifican tres invariantes:

- **`id` = posición:** cada `id` coincide con la posición de la producción en P.
- **N ∩ Σ = ∅:** ningún símbolo es a la vez terminal y no terminal.
- **Símbolos conocidos:** todo símbolo de un lado derecho pertenece a N o a Σ.

#### Gramáticas válidas

Notación: los literales van entre comillas, como en un archivo `.grammar`.

| Caso                     | Gramática                                                                                                   | Qué demuestra                                                                                                                                                         | Resultado esperado                                       |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `expressions`            | `E → E + T \| T`, `T → id`                                                                                  | Solo identificadores: los lados izquierdos forman N y los demás identificadores van a Σ.                                                                              | N = {E, T}, Σ = {+, id}, S = E, E → [0, 1], T → [2]      |
| `arithmetic`             | `E → E '+' T \| T`, `T → T '*' F \| F`, `F → '(' E ')' \| 'id'`                                             | Los literales son terminales con el nombre de su contenido. Tres niveles de precedencia.                                                                              | N = {E, T, F}, Σ = {+, \*, (, ), id}, 6 producciones     |
| `parentheses`            | `S → '(' S ')' S \| ε`                                                                                      | Una producción ε es un lado derecho vacío, y ε **no** entra a Σ.                                                                                                      | Σ = {(, )}, P = `S → ( S ) S`, `S → ε`                   |
| `epsilon-trap`           | `S → A A 'x'`, `A → ε`                                                                                      | Un no terminal cuya única producción es ε sigue siendo no terminal.                                                                                                   | N = {S, A}, Σ = {x}                                      |
| `a-n-b-n`                | `S → 'a' S 'b' \| ε`                                                                                        | El lenguaje no regular clásico aⁿbⁿ: autoinclusión más ε.                                                                                                             | Σ = {a, b}, 2 producciones                               |
| `palindromes`            | `S → 'a' S 'a' \| 'b' S 'b' \| 'a' \| 'b' \| ε`                                                             | Cinco alternativas de un mismo no terminal conservan su orden en el índice.                                                                                           | S → [0, 1, 2, 3, 4]                                      |
| `story`                  | `Relato → CRI Pistas REV`, `Pistas → PIS Pistas \| PIS`, con `%start Relato` y `%terminals CRI PIS REV EPI` | `%terminals`: los declarados van primero en Σ, incluso `EPI`, que ninguna regla usa.                                                                                  | Σ = {CRI, PIS, REV, EPI}                                 |
| `explicit-start`         | `A → 'a' B`, `B → 'b'`, con `%start B`                                                                      | `%start` reemplaza al inicio por defecto (el lado izquierdo de la primera regla).                                                                                     | S = B                                                    |
| `scattered-rules`        | `S → A`, `A → 'x'`, `S → 'y'`                                                                               | Las reglas de un no terminal pueden estar separadas: los `id` siguen el texto y el índice las agrupa.                                                                 | S → [0, 2], A → [1]                                      |
| `useless`                | `S → A 'a' \| 'b'`, `A → A 'a'`, `C → 'c'`                                                                  | Los símbolos inútiles (A no produce nada, C no es alcanzable) son válidos al construir. Detectarlos es un análisis posterior (paso 9).                                | N = {S, A, C}, 4 producciones                            |
| `empty-language`         | `S → S 'a'`                                                                                                 | L(G) = ∅ es una gramática bien formada. La vacuidad es un análisis posterior (paso 9).                                                                                | N = {S}, Σ = {a}                                         |
| `cyclic`                 | `S → A \| 'a'`, `A → S`                                                                                     | El ciclo S ⇒ A ⇒ S es válido al construir. Detectar ciclos es un análisis posterior (paso 10).                                                                        | S → [0, 1], A → [2]                                      |
| `literal-and-identifier` | `S → 'a' a`                                                                                                 | El literal `'a'` y el identificador terminal `a` son **el mismo** terminal.                                                                                           | Σ = {a}, P = `S → a a`                                   |
| `keywords`               | `S → 'if' C 'then' S \| 'skip'`, `C → 'true'`                                                               | Un literal puede tener varios caracteres: `if`, `then` y `skip` son un solo terminal cada uno.                                                                        | Σ = {if, then, skip, true}                               |
| `literal-with-space`     | `A → 'b c'`, `A → b c`                                                                                      | `'b c'` es **un** símbolo y `b c` son **dos**: son producciones distintas aunque se escriban igual. Verifica la clave JSON de `rejectDuplicateProductions` (§5.4.11). | Σ = {b c, b, c}; lados derechos `['b c']` y `['b', 'c']` |

**¿Por qué incluir `useless`, `empty-language` y `cyclic`?** Para dejar claro qué valida la **construcción** y qué valida el **análisis**. `buildGrammar` verifica la forma (la 4-upla está bien definida). Que el lenguaje sea vacío, que haya símbolos inútiles o ciclos son **propiedades** de una gramática válida, y las calculan los pasos 9 y 10. Rechazarlas al construir impediría analizarlas.

#### Gramáticas rechazadas

Cada caso verifica que se lance un `GrammarBuildError` (no otro tipo de error) con el **mensaje exacto**. Hay un caso por cada mensaje de §7, más estas variantes:

| Caso                                    | Gramática                                       | Qué agrega                                         |
| --------------------------------------- | ----------------------------------------------- | -------------------------------------------------- |
| `start is a terminal`                   | `S → 'a'`, `%start a`                           | Un terminal tampoco puede ser S.                   |
| `repeated production through a literal` | `S → 'a'`, `S → a`                              | Se comparan ya resueltas: las dos son `S → a`.     |
| `repeated ε-production`                 | `S → 'a' S \| ε \| ε`                           | Dos lados derechos vacíos son la misma producción. |
| `$ in …` (4 casos)                      | `$S → 'a'`, `S → a$`, `S → '$'`, `%terminals $` | `$` se rechaza en cualquier posición.              |

#### `formatGrammar`

| Prueba                                     | Qué verifica                                                                              |
| ------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `parentheses` completa                     | ε se escribe `ε`, N y Σ salen ordenados (`{(, )}`) y la salida es exacta línea por línea. |
| 11 producciones (`D → 'd0' \| … \| 'd10'`) | Los `id` de dos dígitos quedan alineados: `   9  D → d9` y `  10  D → d10`.               |

### El recorrido completo

Las pruebas del comando `grammar`, que pasa por `buildGrammar` con archivos reales, están en `packages/core/test/command-line/grammar.test.ts` (guía 04). Usan `createMemoryEnvironment()`, un environment falso que guarda en memoria lo que se escribe.

Para correrlas: `npm test`.

---

## 9. Preguntas probables en la defensa

**¿Cómo sabe el programa qué símbolos son terminales?**
Por convención: un símbolo es no terminal si y solo si es lado izquierdo de alguna regla. Todo lo demás es terminal. Los literales entre comillas son siempre terminales. Opcionalmente, `%terminals` declara Σ y convierte en error cualquier identificador que no sea no terminal ni esté declarado.

**¿Qué pasa si escribo mal el nombre de un no terminal?**
Sin `%terminals`, se convierte en un terminal y la gramática acepta otro lenguaje sin avisar. Con `%terminals`, el constructor lo rechaza y nombra el símbolo. Por eso las gramáticas del proyecto declaran sus terminales.

**¿Cómo se representa ε?**
Como un lado derecho vacío (`rightSide: []`), no como un símbolo. ε es la cadena de largo 0, no un elemento de Σ.

**¿Por qué P es una lista si en la teoría es un conjunto?**
Porque cada producción necesita un número estable para mostrarla y referirla ("producción 2"). La propiedad de conjunto (sin repetidos) se garantiza con `rejectDuplicateProductions`.

**¿Para qué sirve `productionsByLeftSide`?**
Es un índice que da en un solo paso las producciones de un no terminal. Lo usa el Predictor de Earley, que lo consulta cada vez que espera un no terminal.

**¿Por qué no se puede usar `$`?**
Está reservado: `$` es el fin de entrada en FOLLOW y `$S` es el inicio de la gramática aumentada que usa Earley.

**¿Qué garantiza `buildGrammar` a los algoritmos que vienen después?**

- N ∩ Σ = ∅;
- S ∈ N;
- todo símbolo de un lado derecho pertenece a N o a Σ;
- P no tiene repetidos;
- todo no terminal tiene entrada en el índice;
- ningún símbolo usa `$`.

Los algoritmos pueden confiar en esto sin volver a comprobarlo.

**¿Por qué el motor no imprime nada?**
Porque es una librería pura que usan la consola y la web. La presentación (`formatGrammar`) está en `command-line/`. El motor solo usa `formatProduction`, para escribir sus propios mensajes de error.

**¿Por qué `buildGrammar` acepta una gramática con símbolos inútiles, ciclos o L(G) = ∅?**
Porque está bien formada: la 4-upla cumple la definición. Esas son propiedades del lenguaje, y las calculan los análisis de los pasos 9 y 10. Si se rechazaran al construir, no se podrían analizar.

**¿Por qué no se usa "mayúscula = no terminal", como en los libros?**
Porque en el dominio las etiquetas (`CRI`, `PIS`) y los no terminales (`Relato`, `Pistas`) empiezan con mayúscula. La convención "es no terminal si es lado izquierdo" no depende de cómo se escribe el nombre.

---

## Anexo: Detalles de TypeScript que aparecen en el código

| Construcción                                 | Dónde                                   | Qué significa                                                                                                                                |
| -------------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `type A = B \| C`                            | `RightSideSymbol`                       | **Unión:** un valor es de tipo B **o** de tipo C.                                                                                            |
| `typeof x === 'string'`                      | `checkRightSideSymbol`                  | **Narrowing:** dentro de cada rama del `?:`, TypeScript sabe cuál de los dos tipos de la unión es `x`. En la rama falsa permite `x.literal`. |
| `param?: T`                                  | `start?`, `declaredTerminals?`          | Parámetro **opcional**: si no se pasa, vale `undefined`.                                                                                     |
| `a ?? b`                                     | `start ?? firstRule.leftSide`           | `a` si no es `null`/`undefined`; si no, `b`.                                                                                                 |
| `x?.metodo()`                                | `declared?.forEach`, `get(...)?.push`   | Llama al método solo si `x` no es `null`/`undefined`.                                                                                        |
| `readonly T[]`, `ReadonlySet`, `ReadonlyMap` | tipos de `Grammar`                      | Versiones de solo lectura: no permiten `push`, `add`, `set`.                                                                                 |
| `Iterable<T>`                                | `declaredTerminals`                     | Cualquier cosa que se pueda recorrer con `for…of`: array, `Set`, etc.                                                                        |
| `new Set(iterable)`                          | `createSymbolTable`, `collectTerminals` | Conjunto con los elementos del iterable, sin repetidos. `new Set(undefined)` es vacío.                                                       |
| `lista.flatMap(f)`                           | `collectTerminals`                      | Aplica `f` a cada elemento y junta las listas resultantes en una sola.                                                                       |
| `[a, ...lista]`                              | `rejectDuplicateProductions`            | **Spread:** un array con `a` seguido de los elementos de `lista`.                                                                            |
| `` `texto ${x}` ``                           | mensajes                                | **Template literal:** inserta `x` dentro del texto.                                                                                          |
| `export` / sin `export`                      | `buildGrammar` / `collectNonterminals`  | Lo exportado es la API del módulo. Lo demás es privado del archivo y es un detalle de implementación.                                        |
| `class X extends Error`                      | `GrammarBuildError`                     | Error propio que hereda mensaje y traza; se reconoce con `instanceof`.                                                                       |
