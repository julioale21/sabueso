# 22 — La API pública y el comando `parse`

> Archivos: `packages/core/src/parse.ts`, `packages/core/src/index.ts`, `renderDerivation` en `packages/core/src/trees/derivation.ts` y el comando `packages/core/src/command-line/commands/parse.ts`.

## 1. Teoría

Este paso no trae un concepto nuevo. Junta en una sola llamada **reconocer** (decidir si w ∈ L(G)) y **analizar** (dar los árboles y la derivación de w). La web (SPEC 03) no quiere llamar a cinco funciones: quiere **una**. Este paso agrega:

| Qué                | Para quién                     | Qué hace                                                  |
| ------------------ | ------------------------------ | --------------------------------------------------------- |
| **`parse()`**      | la web, el SPEC 04, la consola | analiza un relato completo en una llamada                 |
| **`src/index.ts`** | los otros paquetes             | define qué se puede usar desde afuera: la **API pública** |
| comando `parse`    | la consola                     | muestra lo mismo que la pantalla principal de la web      |

`parse()` **no agrega ningún algoritmo**. Llama a las piezas que ya existen, en este orden, y junta sus resultados:

1. `tokenizeSequence` ([guía 06](06-relato-como-cadena.md)): separa el texto en etiquetas.
2. `checkAlphabet` ([guía 06](06-relato-como-cadena.md)): ¿todas están en Σ? Si no, rechazado, sin correr Earley.
3. `recognize` (guías [14](14-reconocedor-de-earley.md) a [17](17-traza-de-earley.md)): Earley, con la traza si se pide.
4. `diagnose` ([guía 16](16-diagnostico-de-errores.md)): ¿se aceptó? Si no, rechazado, con el error.
5. `parseTrees` ([guía 19](19-arboles-de-un-relato.md)): los primeros árboles.
6. `countTrees` ([guía 20](20-conteo-de-arboles.md)): cuántos hay en total.
7. `leftmostDerivation` ([guía 21](21-derivacion-mas-a-la-izquierda.md)): la derivación del primer árbol.

**Ejemplo:** A1 con G0.

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

## 2. Por qué así

- **Una función que orquesta, no un algoritmo nuevo:** cada pieza sigue probada por separado; `parse()` solo las encadena. Si algo falla, se sabe en qué paso.
- **El error como dato:** un relato rechazado es un resultado normal, no una excepción. La web lo dibuja.
- **Unión discriminada:** quien usa el resultado no puede pedir `trees` de un relato rechazado sin preguntar antes `accepted`. TypeScript no lo deja.
- **La API pública en un solo archivo:** `index.ts` es el "contrato" del motor. Lo que no está ahí es interno y se puede cambiar sin romper la web.
- **El motor no depende de la consola:** `parse()` está en `src/`, no en `command-line/`. La consola es un cliente más, como la web.

## 3. El código, función por función

### 3.1 `parse({ grammar, input, options })`

```ts
const tokens = typeof input === 'string' ? tokenizeSequence(input) : [...input];
const unknown = checkAlphabet({ tokens, grammar });
if (unknown !== null) {
  return { accepted: false, tokens, error: unknown, chart: [], trace: [], openItems: null };
}
const recognition = recognize({
  grammar,
  tokens,
  options: {
    trace: options.trace ?? false,
    classicEpsilon: options.classicEpsilon ?? false,
  },
});
const { chart, trace } = recognition;
const error = diagnose({ grammar, chart, tokens, accepted: recognition.accepted });
if (error !== null) {
  return {
    accepted: false,
    tokens,
    error,
    chart,
    trace,
    openItems: openItemsAt({ chart, error }),
  };
}
const trees = parseTrees({ grammar, recognition, limit: options.maxTrees ?? DEFAULT_TREE_LIMIT });
const [firstTree] = trees;
return {
  accepted: true,
  tokens,
  trees,
  treeCount: (options.countTrees ?? true) ? countTrees({ grammar, recognition }) : null,
  derivation: firstTree === undefined ? [] : leftmostDerivation(firstTree),
  chart,
  trace,
};
```

- **La entrada puede ser texto o etiquetas:** `typeof input === 'string'` decide si hay que separarla.
- **Dos salidas tempranas:**
  - un símbolo fuera de Σ, antes de Earley: el chart queda vacío y `openItems` es `null`;
  - un relato rechazado: con el chart y los ítems abiertos (`openItemsAt`), para que la web muestre dónde se trabó.
- `options.trace ?? false`: si no se pasa la opción, el valor por defecto. Es el operador `??` ("si es `undefined`, usar esto").
- **La derivación es la del primer árbol:** en G1 hay uno solo; en G0, la web deja elegir.
- No lanza errores por un relato inválido: lo devuelve en `error`.

**Qué devuelve.** Dos formas posibles según `accepted` (una **unión discriminada**: TypeScript sabe qué campos hay mirando `accepted`):

| Campo        | Aceptado | Rechazado | Qué es                                                                    |
| ------------ | -------- | --------- | ------------------------------------------------------------------------- |
| `accepted`   | `true`   | `false`   | el veredicto                                                              |
| `tokens`     | ✓        | ✓         | las etiquetas del relato                                                  |
| `chart`      | ✓        | ✓         | los conjuntos de Earley (vacío si falló el alfabeto)                      |
| `trace`      | ✓        | ✓         | los eventos, si se pidió `trace: true`                                    |
| `error`      |          | ✓         | el diagnóstico: tipo, posición, encontrado, esperado                      |
| `openItems`  |          | ✓         | los ítems que quedaron abiertos donde falla el relato (`null` si falló Σ) |
| `trees`      | ✓        |           | los primeros árboles (hasta `maxTrees`)                                   |
| `treeCount`  | ✓        |           | cuántos árboles hay en total (o `null` si no se contó)                    |
| `derivation` | ✓        |           | la derivación más a la izquierda del primer árbol                         |

**Las opciones:**

| Opción           | Por defecto | Qué hace                                                      |
| ---------------- | ----------- | ------------------------------------------------------------- |
| `maxTrees`       | 3           | cuántos árboles construir (la cantidad total la da el conteo) |
| `trace`          | `false`     | registrar la traza (para el reproductor de la web)            |
| `countTrees`     | `true`      | contar todos los árboles; con `false`, `treeCount` es `null`  |
| `classicEpsilon` | `false`     | el algoritmo clásico, sin el arreglo de ε (solo para enseñar) |

### 3.2 `src/index.ts`: qué exporta la API pública

| Grupo      | Exporta                                                                                                                                          | Para qué                                 |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| Gramáticas | `buildGrammar`, `parseGrammarText`, `formatProduction`, `tokenizeGrammar`, los errores y los tipos                                               | armar y leer gramáticas                  |
| Autómata   | `runDeterministicAutomaton` y sus tipos                                                                                                          | el SPEC 04 lo reutiliza para su lexer    |
| Análisis   | `analyzeGrammar`, `GrammarAnalysis`                                                                                                              | la pestaña de análisis y LL(1) de la web |
| Relatos    | `parse`, `ParseOptions`, `ParseResult`, `tokenizeSequence`, `checkAlphabet`                                                                      | la pantalla principal                    |
| Resultados | `ParseError`, `OpenItems`, `openItemsAt`, `Chart`, `EarleyItem`, `TraceEvent`, `ParseTree`, `TreeCount`, `DerivationStep`, `dottedRule`, `label` | dibujar el resultado                     |
| Dibujo     | `renderTree`, `renderDerivation`                                                                                                                 | versiones en texto                       |
| Géneros    | `genres`, `Genre`, `TagInfo`                                                                                                                     | el selector de género de la web          |
| Consola    | `createCommandLineProgram`, `Command`, `EXIT_CODES`, `formatTable`, `formatSet`                                                                  | el SPEC 04 agrega sus comandos           |

Las guías 23 a 28 agregan después sus propias exportaciones: la FNC, CYK, el autómata de pila, las búsquedas acotadas, las pruebas diferenciales y la medición de tiempos.

### 3.3 `renderDerivation(steps)`

Escribe la derivación como texto, un paso numerado por línea (`0   Relato`, `1 ⇒ …`). Calcula el ancho del número más grande (`padStart`) para que las flechas queden alineadas.

### 3.4 El comando `parse`

- Lee la gramática y el relato (palabras o `--file`) y llama a `parse()`.
- Arma el informe: el veredicto, la cuenta de árboles, los primeros árboles (`--trees n`, por defecto 1), la derivación del primero y, con `--trace`, los eventos.
- El mensaje de rechazo (`formatRejection`) es el mismo que usa `earley`: vive en `command-line/format.ts`.
- Termina con código 1 si el relato se rechaza y con código 2 si `--trees` no es un entero mayor que 0.

## 4. Consola y pruebas

```sh
npm run sabueso -- parse --grammar g1 "CTX PER PIS REV"
# REJECTED · position 2 (event 3) · found PIS · expected: CRI, HAL
```

**`packages/core/test/integration/public-api.test.ts`** usa **solo** lo que exporta `src/index.ts`, como lo usa la web:

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

**`packages/core/test/command-line/parse.test.ts`:** A1 con G0, `--trees`, un rechazo, `--trace`, L1 desde un archivo y un uso incorrecto.
