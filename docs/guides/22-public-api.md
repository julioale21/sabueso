# Guía de estudio: 22 — La API pública y el comando `parse`

> **Paso 22 del SPEC 02.** Archivos: `packages/core/src/parse.ts`, `packages/core/src/index.ts`, `renderDerivation` en `packages/core/src/trees/derivation.ts` y el comando `packages/core/src/command-line/commands/parse.ts`.

---

## 1. El problema que resuelve

Hasta ahora, cada pieza del motor tenía su propio comando: `earley`, `trees`, `count`, `derive`… La web (SPEC 03) no quiere llamar a cinco funciones: quiere **una** llamada que le dé todo sobre un relato.

Este paso agrega dos cosas:

| Qué                | Para quién                     | Qué hace                                                  |
| ------------------ | ------------------------------ | --------------------------------------------------------- |
| **`parse()`**      | la web, el SPEC 04, la consola | analiza un relato completo en una llamada                 |
| **`src/index.ts`** | los otros paquetes             | define qué se puede usar desde afuera: la **API pública** |

Y el comando `parse`, que muestra en la consola lo mismo que va a mostrar la pantalla principal de la web.

---

## 2. Cómo funciona `parse()`

```text
texto del relato
  → tokenizeSequence (paso 6)      separar en etiquetas
  → checkAlphabet (paso 6)         ¿todas están en Σ? si no: rechazado, sin correr Earley
  → recognize (pasos 13 a 17)      Earley, con la traza si se pide
  → diagnose (paso 16)             ¿se aceptó? si no: rechazado, con el error
  → parseTrees (paso 19)           los primeros árboles
  → countTrees (paso 20)           cuántos hay en total
  → leftmostDerivation (paso 21)   la derivación del primer árbol
```

`parse()` **no agrega ningún algoritmo**: llama a las piezas que ya existen, en orden, y junta sus resultados.

### 2.1 Qué devuelve

Dos formas posibles, según `accepted` (una **unión discriminada**: TypeScript sabe qué campos hay mirando `accepted`):

| Campo        | Aceptado | Rechazado | Qué es                                                 |
| ------------ | -------- | --------- | ------------------------------------------------------ |
| `accepted`   | `true`   | `false`   | el veredicto                                           |
| `tokens`     | ✓        | ✓         | las etiquetas del relato                               |
| `chart`      | ✓        | ✓         | los conjuntos de Earley (vacío si falló el alfabeto)   |
| `trace`      | ✓        | ✓         | los eventos, si se pidió `trace: true`                 |
| `error`      |          | ✓         | el diagnóstico: tipo, posición, encontrado, esperado   |
| `trees`      | ✓        |           | los primeros árboles (hasta `maxTrees`)                |
| `treeCount`  | ✓        |           | cuántos árboles hay en total (o `null` si no se contó) |
| `derivation` | ✓        |           | la derivación más a la izquierda del primer árbol      |

### 2.2 Las opciones

| Opción           | Por defecto | Qué hace                                                      |
| ---------------- | ----------- | ------------------------------------------------------------- |
| `maxTrees`       | 50          | cuántos árboles construir                                     |
| `trace`          | `false`     | registrar la traza (para el reproductor de la web)            |
| `countTrees`     | `true`      | contar todos los árboles; con `false`, `treeCount` es `null`  |
| `classicEpsilon` | `false`     | el algoritmo clásico, sin el arreglo de ε (solo para enseñar) |

---

## 3. Por qué así

- **Una función que orquesta, no un algoritmo nuevo:** cada pieza sigue probada por separado; `parse()` solo las encadena. Si algo falla, se sabe en qué paso.
- **El error como dato:** un relato rechazado es un resultado normal, no una excepción. La web lo dibuja.
- **Unión discriminada:** quien usa el resultado no puede pedir `trees` de un relato rechazado sin preguntar antes `accepted`: TypeScript no lo deja.
- **La API pública en un solo archivo:** `index.ts` es el "contrato" del motor. Lo que no está ahí es interno y se puede cambiar sin romper la web.
- **El motor no depende de la consola:** `parse()` está en `src/`, no en `command-line/`. La consola es un cliente más, como la web.

---

## 4. Qué exporta la API pública (`src/index.ts`)

| Grupo      | Exporta                                                                                                              | Para qué                                 |
| ---------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Gramáticas | `buildGrammar`, `parseGrammarText`, `formatProduction`, `tokenizeGrammar`, los errores y los tipos                   | armar y leer gramáticas                  |
| Autómata   | `runDeterministicAutomaton` y sus tipos                                                                              | el SPEC 04 lo reutiliza para su lexer    |
| Análisis   | `analyzeGrammar`, `GrammarAnalysis`                                                                                  | la pestaña de análisis y LL(1) de la web |
| Relatos    | `parse`, `ParseOptions`, `ParseResult`, `tokenizeSequence`, `checkAlphabet`                                          | la pantalla principal                    |
| Resultados | `ParseError`, `Chart`, `EarleyItem`, `TraceEvent`, `ParseTree`, `TreeCount`, `DerivationStep`, `dottedRule`, `label` | dibujar el resultado                     |
| Dibujo     | `renderTree`, `renderDerivation`                                                                                     | versiones en texto                       |
| Géneros    | `genres`, `Genre`, `TagInfo`                                                                                         | el selector de género de la web          |
| Consola    | `createCommandLineProgram`, `Command`, `EXIT_CODES`, `formatTable`, `formatSet`                                      | el SPEC 04 agrega sus comandos           |

---

## 5. El código, función por función

### 5.1 `parse(grammar, input, options?)`

```ts
const tokens = typeof input === 'string' ? tokenizeSequence(input) : [...input];
const unknown = checkAlphabet(tokens, grammar);
if (unknown !== null) {
  return { accepted: false, tokens, error: unknown, chart: [], trace: [] };
}
const recognition = recognize(grammar, tokens, {
  trace: options.trace ?? false,
  classicEpsilon: options.classicEpsilon ?? false,
});
const { chart, trace } = recognition;
const error = diagnose(grammar, chart, tokens, recognition.accepted);
if (error !== null) {
  return { accepted: false, tokens, error, chart, trace };
}
const trees = parseTrees(grammar, recognition, options.maxTrees ?? DEFAULT_TREE_LIMIT);
const [firstTree] = trees;
return {
  accepted: true,
  tokens,
  trees,
  treeCount: (options.countTrees ?? true) ? countTrees(grammar, recognition) : null,
  derivation: firstTree === undefined ? [] : leftmostDerivation(firstTree),
  chart,
  trace,
};
```

- **La entrada puede ser texto o etiquetas:** `typeof input === 'string'` decide si hay que separarla.
- **Dos salidas tempranas:** un símbolo fuera de Σ (antes de Earley: el chart queda vacío) y un relato rechazado (con el chart, para que la web pueda mostrar dónde se trabó).
- `options.trace ?? false`: si no se pasa la opción, el valor por defecto. Es el operador `??` ("si es `undefined`, usar esto").
- **La derivación es la del primer árbol:** en G1 hay uno solo; en G0, la web deja elegir.

### 5.2 `renderDerivation(steps)`

Escribe la derivación como texto, un paso numerado por línea (`0   Relato`, `1 ⇒ …`). Calcula el ancho del número más grande (`padStart`) para que las flechas queden alineadas.

### 5.3 El comando `parse`

- Lee la gramática y el relato (palabras o `--file`), llama a `parse()` y arma el informe: el veredicto, la cuenta de árboles, los primeros árboles (`--trees n`, por defecto 1), la derivación del primero y, con `--trace`, los eventos.
- El mensaje de rechazo (`formatRejection`) es el mismo que usa `earley`: vive en `command-line/format.ts`.

---

## 6. Ejemplo

```sh
npm run sabueso -- parse --grammar g0 "CRI SOS PIS INT REV"
```

```text
detective/g0: CRI SOS PIS INT REV

ACCEPTED: the input is a sentence of L(G)

Trees: 4 (ambiguous for this input)

Tree 1:
Relato
├─ Planteo
…

Leftmost derivation of tree 1:
 0   Relato
 1 ⇒ Planteo Investigacion Desenlace
 …
```

```sh
npm run sabueso -- parse --grammar g1 "CTX PER PIS REV"
# REJECTED · position 2 (event 3) · found PIS · expected: CRI, HAL
```

---

## 7. Errores

`parse()` no lanza errores por un relato inválido: lo devuelve en `error`. El comando termina con código 1 si se rechaza y con código 2 si `--trees` no es un entero mayor que 0.

---

## 8. Consola y pruebas

**`test/integration/public-api.test.ts`** usa **solo** lo que exporta `src/index.ts`, como lo va a usar la web:

| Prueba                            | Qué verifica                                                |
| --------------------------------- | ----------------------------------------------------------- |
| el catálogo                       | la gramática oficial del policial es `detective/g1`         |
| `analyzeGrammar`                  | G1 es LL(1); G0 no                                          |
| `parse` acepta A1                 | 4 árboles en G0, 1 en G1, con su derivación de 19 formas    |
| `parse` rechaza I1                | el diagnóstico exacto                                       |
| símbolo fuera de Σ                | rechazado antes de Earley, sin chart                        |
| traza, conteo y modo clásico      | las opciones `trace`, `countTrees` y `classicEpsilon`       |
| `renderTree` y `renderDerivation` | el dibujo del árbol y la derivación de `CRI PIS REV`        |
| gramática en código               | `buildGrammar` funciona igual que un archivo                |
| el AFD                            | `runDeterministicAutomaton` está disponible para el SPEC 04 |

**`test/command-line/parse.test.ts`:** A1 con G0, `--trees`, un rechazo, `--trace`, L1 desde un archivo y un uso incorrecto.

---

## 9. Preguntas probables en la defensa

**¿Qué hace `parse()`?**
Encadena las piezas del motor: separa el relato, verifica Σ, corre Earley, diagnostica, arma los primeros árboles, los cuenta y escribe la derivación del primero. No agrega ningún algoritmo.

**¿Por qué una API pública?**
Para que la web y el SPEC 04 usen el motor sin depender de su organización interna. Lo que está en `index.ts` es el contrato; lo demás se puede cambiar sin romperlos.

**¿Por qué el motor no depende de la consola?**
Porque la consola es solo una forma de mostrar los resultados. `parse()` está en el motor; la consola y la web son clientes. Así el mismo motor funciona en la terminal, en el navegador y en las pruebas.
