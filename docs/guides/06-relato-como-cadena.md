# 06 — El relato como cadena sobre Σ

> Archivos: `packages/core/src/input/sequence.ts`, `packages/core/src/earley/diagnostics.ts` (solo el tipo `ParseError`), `packages/core/src/command-line/commands/tokens.ts` y la opción `--grammar` en `packages/core/src/command-line/grammar-source.ts`.

## 1. Teoría

- Un **alfabeto** Σ es un conjunto finito y no vacío de símbolos.
- Una **cadena** sobre Σ es una secuencia finita de símbolos de Σ. Su **longitud** |w| es la cantidad de símbolos. La cadena vacía es ε, con |ε| = 0. Σ\* es el conjunto de todas las cadenas sobre Σ, incluida ε.
- Un **lenguaje** sobre Σ es cualquier subconjunto L ⊆ Σ\*. El lenguaje de una gramática es L(G) = { w ∈ Σ\* | S ⇒\* w }.

En Sabueso, cada evento narrativo es un símbolo y un relato es una cadena. Σ = {CTX, PER, CRI, HAL, ENC, PIS, INT, SOS, DSC, ATQ, REV, CNF, CAP, EPI}, con |Σ| = 14. Este paso decide si **w ∈ Σ\***: separa el texto en símbolos y busca el primero que no esté en Σ. Si w ∈ L(G) lo decide después Earley ([guía 14](14-reconocedor-de-earley.md)).

### Ejemplo

| Relato        | ¿∈ Σ\*?        | ¿∈ L(G1)?                                     |
| ------------- | -------------- | --------------------------------------------- |
| `CRI PIS REV` | sí (\|w\| = 3) | sí                                            |
| `REV CRI`     | sí             | no: la revelación no puede preceder al crimen |
| `CRI XYZ REV` | no: `XYZ` ∉ Σ  | no puede pertenecer a ningún L(G)             |

`CRI XYZ REV` es el caso I6 del spec: este paso informa `unknown-symbol` en la posición 1 (desde 0), y `REV` no se llega a mirar.

## 2. Por qué así

- **Una expresión regular, no un AFD como el de la [guía 03](03-lexer-afd.md).** En un relato cada símbolo es una palabra y el único separador es el espacio: no hay literales, flechas de dos caracteres ni comentarios. Con un solo tipo de token, un autómata explícito sería maquinaria sin función. Formalmente, separar por espacios **es** un AFD de dos estados (dentro de una palabra / entre palabras), y `/\s+/` lo implementa.
- **Verificar Σ antes de Earley.** Con un símbolo desconocido Earley rechazaría igual, pero con un mensaje engañoso ("se esperaba PIS, se encontró XYZ"). El problema no es el orden sino el símbolo. La sección 3.17 del spec lo separa en su propio tipo de error: `unknown-symbol`.
- **El error es un dato, no una excepción.** Un relato rechazado es un resultado normal, no una falla: la UI lo muestra marcando el evento.
- **El relato vacío no es error de este paso:** ε ∈ Σ\*. Que ε ∉ L(G1) lo decide Earley.
- **`checkAlphabet` no conoce Earley:** solo usa `grammar.terminals`, el Σ que calcula `buildGrammar` ([guía 02](02-gramatica-libre-de-contexto.md)). La usan el comando `tokens` y, antes de correr Earley, `parse` ([guía 22](22-api-publica.md)).

## 3. El código, función por función

### 3.1 `ParseError` (`packages/core/src/earley/diagnostics.ts`)

```ts
export interface ParseError {
  kind: 'unexpected-token' | 'unexpected-end' | 'unknown-symbol';
  position: number; // índice del token, desde 0
  found: SymbolName | null; // null = fin de la entrada
  expected: SymbolName[]; // ordenados alfabéticamente
}
```

Es el formato de **todo** rechazo del programa (sección 3.17 del spec). Este paso solo produce `unknown-symbol`; los otros dos los arma Earley ([guía 16](16-diagnostico-de-errores.md)), y por eso el tipo vive en `earley/`. En `unknown-symbol`, `expected` queda vacío: el problema es el símbolo, no su lugar.

### 3.2 `tokenizeSequence(text)`

```ts
export function tokenizeSequence(text: string): SymbolName[] {
  return text.split(/\s+/).filter((word) => word !== '');
}
```

- `/\s+/` es "uno o más espacios en blanco" (espacio, tabulación, salto de línea).
- `filter` quita los pedazos vacíos: `' CRI '.split(/\s+/)` da `['', 'CRI', '']`.
- No valida nada: `cri` y `XYZ` salen como tokens. Separar y validar son dos responsabilidades distintas.

### 3.3 `checkAlphabet({ tokens, grammar })`

```ts
export function checkAlphabet(tokens: readonly SymbolName[], grammar: Grammar): ParseError | null {
  const position = tokens.findIndex((token) => !grammar.terminals.has(token));
  if (position === -1) {
    return null;
  }
  return { kind: 'unknown-symbol', position, found: tokens[position] ?? null, expected: [] };
}
```

- `findIndex` devuelve la posición del primer token que no está en Σ, o −1.
- Informa solo el **primero**, como los demás errores del programa: una posición, un mensaje.
- Un **no terminal** (`Pasos`) tampoco está en Σ: un relato se escribe solo con terminales.
- Distingue mayúsculas: `cri` no es `CRI`.

### 3.4 El comando `tokens` (`packages/core/src/command-line/commands/tokens.ts`)

1. Lee `--grammar <nombre>` o `--grammar-file <ruta>`. Los argumentos sueltos son el relato.
2. Lee la gramática con la cadena completa (lexer → parser → `buildGrammar`).
3. Une los argumentos sueltos con espacios y llama a `tokenizeSequence`. Da lo mismo `"CRI PIS REV"` entre comillas que `CRI PIS REV` suelto.
4. Llama a `checkAlphabet` e imprime una tabla con `formatTable`: posición, token y si está en Σ.
5. Termina con código 0 si todo está en Σ, o 1 si hay un símbolo desconocido. En ese caso también imprime Σ completo con `formatSet`, para que se vea qué etiquetas existen.
6. Un error de uso se informa con `reportUsageError` y termina con código 2.

"Position 1 (event 2)": la posición se cuenta desde 0, como en el spec; la consola y la UI también la muestran como número de evento, desde 1.

### 3.5 La opción `--grammar` (`packages/core/src/command-line/grammar-source.ts`)

Los comandos que leen un relato no pueden recibir la gramática como argumento suelto (`lex g1`): sus argumentos sueltos son el relato. Por eso usan `--grammar g1`.

| Función                | Para qué comandos                                  | De dónde saca el nombre                          |
| ---------------------- | -------------------------------------------------- | ------------------------------------------------ |
| `resolveGrammarSource` | los que leen solo una gramática (`lex`, `grammar`) | el argumento suelto                              |
| `resolveGrammarOption` | los que leen un relato (`tokens`)                  | la opción `--grammar`                            |
| `chooseGrammarSource`  | (interna, la usan las dos)                         | exige exactamente uno: nombre o `--grammar-file` |

Desde el SPEC 05, los comandos con `--grammar` usan `readGrammarCommandArguments`: en una sola llamada lee los argumentos, elige la gramática y, para los comandos que no reciben un relato, rechaza los sobrantes. Devuelve `{ parsed, source }` o el código de salida del error. No lee la gramática, para que cada comando valide sus otras opciones antes, en el mismo orden de siempre.

### 3.6 Errores

| Mensaje                                                                        | Dónde                  | Código |
| ------------------------------------------------------------------------------ | ---------------------- | ------ |
| `Unknown symbol XYZ at position 1 (event 2): it is not in Σ`                   | `checkAlphabet`        | 1      |
| `Usage: sabueso tokens --grammar <grammar> \| --grammar-file <path> "<story>"` | `resolveGrammarOption` | 2      |
| `Unknown grammar: g2. Available grammars: …`                                   | `chooseGrammarSource`  | 2      |
| `Unknown option: --states`                                                     | `parseArguments`       | 2      |

## 4. Consola y pruebas

```sh
npm run sabueso -- tokens --grammar g1 "CRI XYZ REV"
```

```text
detective/g1: tokens of the story

Position  Token  In Σ
--------  -----  ----
0         CRI    yes
1         XYZ    no
2         REV    yes

Unknown symbol XYZ at position 1 (event 2): it is not in Σ
Σ = {ATQ, CAP, CNF, CRI, CTX, DSC, ENC, EPI, HAL, INT, PER, PIS, REV, SOS}
```

Termina con código 1. Con `"CRI PIS REV"` imprime `3 tokens, all in Σ` y termina con 0. `npm run sabueso -- grammar g1` muestra el mismo Σ, las 14 etiquetas.

**`packages/core/test/input/sequence.test.ts`:**

| Prueba                     | Qué verifica                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------ |
| separar por espacios       | `CRI PIS REV` da tres tokens; espacios, tabulaciones y saltos de línea separan igual |
| relato vacío               | `''` y `' \n '` dan cero tokens                                                      |
| no valida                  | `cri XYZ +` sale tal cual: validar es otro paso                                      |
| I6                         | `unknown-symbol` en la posición 1, `found` = `XYZ`, con G1 y con G0                  |
| solo el primero            | `ABC CRI XYZ` informa `ABC`, en la posición 0                                        |
| mayúsculas y no terminales | `cri` y `Pasos` no están en Σ                                                        |
| V1, I1, I5                 | están sobre Σ aunque la gramática después rechace I1 e I5                            |
| ε y L1                     | el relato vacío y los 200 eventos de L1 están sobre Σ                                |
| otra gramática             | `id + id * id` está sobre Σ de `arithmetic`; `CRI` no                                |

**`packages/core/test/command-line/tokens.test.ts`:** la salida de I6 y su código 1, un relato válido con código 0, el relato en palabras sueltas, el relato vacío, `--grammar-file`, los errores de uso (código 2) y una gramática desconocida.

**Σ de una gramática:** `packages/core/test/grammar-build.test.ts` verifica que Σ contiene exactamente los símbolos que no son lado izquierdo, más los declarados con `%terminals`; `packages/core/test/built-in-grammars.test.ts`, que G0 y G1 tienen |Σ| = 14.

## 5. Referencias

- Augusto, sección 1.2.
- Hopcroft, Motwani y Ullman, _Introducción a la teoría de autómatas, lenguajes y computación_, sección 1.5.
