# Guía de estudio: 06 — El relato como cadena sobre Σ

> **Paso 6 del SPEC 02.** Archivos: `packages/core/src/input/sequence.ts`, `packages/core/src/earley/diagnostics.ts` (solo el tipo `ParseError`), `packages/core/src/command-line/commands/tokens.ts` y la opción `--grammar` en `packages/core/src/command-line/grammar-source.ts`.
> Ficha teórica relacionada: [`docs/concepts/01-alphabet-and-language.md`](../concepts/01-alphabet-and-language.md).

---

## 1. El problema que resuelve

Hasta el paso 5 el programa leía **gramáticas**. Desde ahora también lee **relatos**: el texto `CRI PIS REV` que el usuario quiere analizar.

Antes de que Earley pueda decidir si w ∈ L(G), hacen falta dos cosas:

1. **Separar** el texto en símbolos: `"CRI PIS REV"` → `[CRI, PIS, REV]`.
2. **Verificar que cada símbolo esté en Σ.** Si aparece `XYZ`, el relato ni siquiera es una cadena sobre el alfabeto (w ∉ Σ\*), así que no tiene sentido buscarle un árbol.

Este paso es la puerta de entrada de Earley:

| Etapa | Entrada            | Salida                         | Paso  |
| ----- | ------------------ | ------------------------------ | ----- |
| 1     | texto del relato   | lista de tokens                | **6** |
| 2     | tokens + gramática | ¿están todos en Σ?             | **6** |
| 3     | tokens sobre Σ     | ACEPTA / RECHAZA, con el chart | 13–17 |

---

## 2. Por qué esta herramienta

- **Qué se eligió:** separar por espacios con una expresión regular (`/\s+/`) y buscar cada token en el conjunto Σ de la gramática.
- **Por qué alcanza:** en un relato, cada símbolo es una palabra y el único separador es el espacio. No hay literales entre comillas, flechas de dos caracteres ni comentarios. El lenguaje de los tokens es trivial.
- **Alternativa descartada: un AFD como el del paso 3.** El lexer de `.grammar` necesita un autómata porque tiene 9 tipos de token y casos como `->` o `'+'`. Acá hay un solo tipo de token (la palabra), así que un autómata sería maquinaria sin función. Formalmente, separar por espacios **es** un AFD de dos estados (dentro de una palabra / entre palabras), y la expresión regular lo implementa.
- **Por qué verificar Σ antes de Earley:** con un símbolo desconocido, Earley rechazaría igual, pero con un mensaje engañoso ("se esperaba PIS, se encontró XYZ"). El problema no es el orden de los eventos sino el símbolo. La sección 3.17 del spec lo separa en su propio tipo de error: `unknown-symbol`.

---

## 3. Cómo se usa en el programa

| Quién                     | Llama a                         | Con qué                   | Recibe                   |
| ------------------------- | ------------------------------- | ------------------------- | ------------------------ |
| comando `tokens` (paso 6) | `tokenizeSequence`              | el texto del relato       | `['CRI', 'XYZ', 'REV']`  |
| comando `tokens` (paso 6) | `checkAlphabet`                 | los tokens y la gramática | un `ParseError` o `null` |
| `parse` (paso 22)         | las dos, antes de correr Earley | lo mismo                  | lo mismo                 |

`checkAlphabet` no conoce Earley: solo usa `grammar.terminals`, el Σ que calcula `buildGrammar` (paso 2).

El error se devuelve como **dato** (`ParseError`), no se lanza como excepción. Un relato rechazado es un resultado normal del programa, no una falla: la UI lo va a mostrar en pantalla, marcando el evento.

---

## 4. Cómo funciona

**Tokenizar:** w = s₁ s₂ … sₙ. Se corta el texto donde haya uno o más espacios, tabulaciones o saltos de línea, y se descartan los pedazos vacíos (los que aparecen si el texto empieza o termina con espacios). Cada pedazo es un símbolo sᵢ, en la posición i (desde 0).

**Verificar Σ:** se recorren los tokens en orden y se busca el primero con sᵢ ∉ Σ.

- Si no hay ninguno, w ∈ Σ\*: se devuelve `null` y Earley puede trabajar.
- Si lo hay, se devuelve el error `unknown-symbol` en la posición i, con `found` = sᵢ.

Costo: O(n), porque buscar en un `Set` cuesta O(1).

**El relato vacío:** ε ∈ Σ\* (la cadena vacía está sobre cualquier alfabeto), así que **no** es un error de este paso. Que ε ∉ L(G1) lo decide Earley: es el caso I2 del spec.

---

## 5. El código, función por función

### 5.1 `ParseError` (`src/earley/diagnostics.ts`)

```ts
export interface ParseError {
  kind: 'unexpected-token' | 'unexpected-end' | 'unknown-symbol';
  position: number; // índice del token, desde 0
  found: SymbolName | null; // null = fin de la entrada
  expected: SymbolName[]; // ordenados alfabéticamente
}
```

Es el formato de **todo** rechazo del programa, definido en la sección 3.17 del spec. Este paso solo produce `unknown-symbol`. Los otros dos tipos los arma Earley en el paso 16, y por eso el tipo ya vive en `earley/`.

En `unknown-symbol`, `expected` queda vacío: no hay un "se esperaba" que tenga sentido, porque el problema es el símbolo, no su lugar.

### 5.2 `tokenizeSequence(text)`

```ts
export function tokenizeSequence(text: string): SymbolName[] {
  return text.split(/\s+/).filter((word) => word !== '');
}
```

- `/\s+/` es "uno o más espacios en blanco" (espacio, tabulación, salto de línea).
- `filter` quita los pedazos vacíos: `' CRI '.split(/\s+/)` da `['', 'CRI', '']`.
- No valida nada: `cri` y `XYZ` salen como tokens. Separar y validar son dos responsabilidades distintas.

### 5.3 `checkAlphabet({ tokens, grammar })`

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

### 5.4 El comando `tokens` (`src/command-line/commands/tokens.ts`)

1. Lee las opciones: `--grammar <nombre>` o `--grammar-file <ruta>`. Los argumentos sueltos son el relato.
2. Lee la gramática con la cadena completa (lexer → parser → `buildGrammar`).
3. Une los argumentos sueltos con espacios y llama a `tokenizeSequence`. Así da lo mismo escribir `"CRI PIS REV"` entre comillas que `CRI PIS REV` suelto.
4. Llama a `checkAlphabet` e imprime una tabla con `formatTable`: posición, token y si está en Σ.
5. Termina con código 0 si todo está en Σ, o 1 si hay un símbolo desconocido. En ese caso también imprime Σ completo con `formatSet` (`Σ = {…}`, ordenado), para que el usuario vea qué etiquetas existen.
6. Un error de uso se informa con `reportUsageError` (de `types.ts`, el mismo de todos los comandos) y termina con código 2.

### 5.5 La opción `--grammar` (`src/command-line/grammar-source.ts`)

Los comandos de los pasos 3 a 5 reciben la gramática como argumento suelto (`lex g1`). Los que leen un relato no pueden: sus argumentos sueltos son el relato. Por eso usan `--grammar g1`, como pide el spec para `earley`, `trees`, `count` y los demás.

| Función                | Para qué comandos                                  | De dónde saca el nombre                          |
| ---------------------- | -------------------------------------------------- | ------------------------------------------------ |
| `resolveGrammarSource` | los que leen solo una gramática (`lex`, `grammar`) | el argumento suelto                              |
| `resolveGrammarOption` | los que leen un relato (`tokens`)                  | la opción `--grammar`                            |
| `chooseGrammarSource`  | (interna, la usan las dos)                         | exige exactamente uno: nombre o `--grammar-file` |

Desde el SPEC 05, los comandos con `--grammar` no llaman a `resolveGrammarOption` a mano: usan `readGrammarCommandArguments`, que en una sola llamada lee los argumentos, elige la gramática y, para los comandos que no reciben un relato, rechaza los argumentos sobrantes. Devuelve `{ parsed, source }` o el código de salida del error. No lee la gramática, para que cada comando siga validando sus otras opciones antes, en el mismo orden de siempre.

---

## 6. Ejemplo recorrido a mano

Caso I6 del spec, con G1: `CRI XYZ REV`.

| Paso              | Estado                                                                |
| ----------------- | --------------------------------------------------------------------- |
| texto             | `"CRI XYZ REV"`                                                       |
| `split(/\s+/)`    | `['CRI', 'XYZ', 'REV']`                                               |
| `filter`          | igual (no hay pedazos vacíos)                                         |
| posición 0: `CRI` | ∈ Σ, sigue                                                            |
| posición 1: `XYZ` | ∉ Σ, se detiene                                                       |
| resultado         | `{ kind: 'unknown-symbol', position: 1, found: 'XYZ', expected: [] }` |

`REV` no se llega a mirar: alcanza con el primer error.

---

## 7. Errores

| Mensaje                                                                        | Dónde                         | Qué lo provoca                                       | Código |
| ------------------------------------------------------------------------------ | ----------------------------- | ---------------------------------------------------- | ------ |
| `Unknown symbol XYZ at position 1 (event 2): it is not in Σ`                   | `tokens`, con `checkAlphabet` | un token que no es terminal de la gramática          | 1      |
| `Usage: sabueso tokens --grammar <grammar> \| --grammar-file <path> "<story>"` | `resolveGrammarOption`        | falta la gramática, o vienen las dos opciones        | 2      |
| `Unknown grammar: g2. Available grammars: …`                                   | `chooseGrammarSource`         | un nombre que no es de ninguna gramática incorporada | 2      |
| `Unknown option: --states`                                                     | `parseArguments`              | una opción que `tokens` no acepta                    | 2      |

"Position 1 (event 2)": la posición se cuenta desde 0, como en el spec. La UI y la consola la muestran también como número de evento, desde 1, que es como lo cuenta una persona.

---

## 8. Consola y pruebas

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

Termina con código 1. Con `"CRI PIS REV"` imprime `3 tokens, all in Σ` y termina con 0.

**`test/input/sequence.test.ts`:**

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

**`test/command-line/tokens.test.ts`:** la salida de I6 y su código 1, un relato válido con código 0, el relato en palabras sueltas, el relato vacío, `--grammar-file`, los errores de uso (código 2) y una gramática desconocida.

---

## 9. Preguntas probables en la defensa

**¿Por qué no se usa el AFD del paso 3 para separar el relato?**
Porque el relato tiene un solo tipo de token, la palabra, y un solo separador, el espacio. Separar por espacios ya es un AFD de dos estados; la expresión regular lo implementa sin una tabla.

**¿Qué diferencia hay entre `CRI XYZ REV` y `REV CRI`?**
`CRI XYZ REV` ∉ Σ\*: tiene un símbolo que no existe. `REV CRI` ∈ Σ\* pero ∉ L(G1): sus símbolos existen, pero el orden no es el de un policial. El primero lo detecta este paso; el segundo, Earley.

**¿Por qué verificar Σ antes de Earley, si Earley igual lo rechazaría?**
Por el mensaje. Earley diría "se esperaba PIS, INT… y se encontró XYZ", como si el problema fuera el orden. El problema es que `XYZ` no es una etiqueta. Por eso es otro tipo de error, `unknown-symbol`.

**¿El relato vacío es un error de este paso?**
No. ε ∈ Σ\*: la cadena vacía está sobre cualquier alfabeto. Que ε ∉ L(G1) (un relato sin crimen) lo decide Earley: es el caso I2.

**¿Por qué el error se devuelve en lugar de lanzarse?**
Porque rechazar un relato es un resultado esperado, no una falla del programa. La UI muestra el error marcando el evento; una excepción es para lo que no debería pasar (un archivo que no existe, una gramática mal escrita).

**¿Por qué `--grammar` y no un argumento suelto, como en `lex g1`?**
Porque en los comandos que leen un relato, los argumentos sueltos son el relato. Con una opción con nombre no hay confusión entre la gramática y el primer evento.
