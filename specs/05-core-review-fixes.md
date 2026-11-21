# SPEC 05 — Arreglos del núcleo después de la revisión de código

> **Estado:** Aprobado (2026-11-21)
> **Depende de:** SPEC 02 (terminado), SPEC 03 (terminado)
> **Fecha:** 2026-11-21
> **Rama:** `core_fixes` (sale de `main`, con todo lo anterior ya commiteado)
> **Objetivo:** Corregir en `packages/core` los problemas que encontró la revisión de código (teoría dentro de la web, citas y comentarios equivocados, búsquedas y funciones repetidas, código muerto y el inicio repetido de los comandos), sin cambiar ningún resultado, para que el código sea más fácil de seguir y de explicar.

---

## 1. Por qué existe este spec

El 2026-11-21 se revisó todo el código del núcleo y de la web con un criterio: que sea sumamente entendible, sobre todo donde se aplica la teoría. El núcleo está sano: Earley tiene sus tres operaciones separadas, cada paso de la FNC vive en su archivo y el lexer usa una tabla δ explícita. Pero aparecieron problemas que pueden fallar en la defensa oral (una cita equivocada, dos comentarios que no dicen la verdad), lógica de Earley que quedó en la web y duplicaciones chicas.

Este spec es un **refactor**: no agrega conceptos. Por eso la regla de oro es que **todo funcione igual**. La única salida que cambia a propósito es la del comando `parse` con un relato rechazado (N1), que pasa a mostrar los ítems abiertos.

Los arreglos de la web (W1 a W5) van en un spec aparte. Este solo toca la web en lo mínimo que exige N1.

---

## 2. Alcance

**Entra:**

- **N1 · Ítems abiertos del diagnóstico, en el núcleo.** La lógica de `apps/web/src/domain/open-items.ts` pasa a `packages/core/src/earley/diagnostics.ts`. `parse()` devuelve `openItems` en el resultado de un relato rechazado, y el comando `parse` los muestra. La web solo los dibuja.
- **N2 · Cita de la FNC.** START y los nombres DEL, UNIT, TERM y BIN se citan a Sipser (sección 2.1). DEL, UNIT, USELESS, TERM y BIN, a Hopcroft 7.1.
- **N3 · Comentario de los ciclos.** El campo `cycles` no promete "todos los ciclos": la búsqueda encuentra uno por arista de retroceso.
- **N4 · Comentario de N en `Grammar`.** N son los no terminales; después de `buildGrammar`, exactamente los lados izquierdos.
- **N5 · El ítem que acepta, en un solo lugar.** `recognize` devuelve `acceptingItem` y desaparecen las dos búsquedas repetidas de `trees/`.
- **N6 · Funciones repetidas entre `grammar/` y la FNC.** `productionKey` y `groupByLeftSide` quedan una sola vez, en `grammar/`.
- **N7 · Parámetros internos en los árboles ε.** La función pública de `trees/epsilon.ts` no muestra el estado de la recursión.
- **N8 · Código muerto.** Se borran `computeProductive`, `computeFirst` y `computeFollow`. Las pruebas pasan a usar las funciones que quedan.
- **N9 · Inicio común de los comandos.** Un ayudante en `command-line/grammar-source.ts` reemplaza el inicio repetido de unos 23 comandos.
- **N10 · `formatRounds` en un solo lugar,** y el comando `chomsky-normal-form` usa los pasos de `toChomskyNormalForm`.
- **Documentación afectada:** las fichas, las guías, el documento oficial (español e inglés), `docs/console-demo.md` y el guion privado que nombren algo de lo que cambia. Sin guía nueva.
- **Validación final:** se comprueba que todo funciona igual, con una comparación de la salida de la consola antes y después.

**Fuera de alcance (para otros specs):**

- Los arreglos de la web W1 a W5 (título de Earley paso a paso, efecto escondido de Análisis, código muerto de la web, hook para pedir datos al servicio, funciones de dominio fuera de los componentes). Van en un spec propio.
- El pulido opcional de la revisión:
  - la traducción de T[i][l] a X_ij de Hopcroft en CYK;
  - reservar el literal `'ε'` en el formato `.grammar`;
  - el orden de los exports de `index.ts`;
  - juntar los comentarios partidos del lexer y del parser;
  - reorganizar las carpetas de `test/`.
- Cualquier cambio de algoritmo o de resultado. Si un paso cambia un resultado, es un error del paso.

---

## 3. Modelo de datos

Solo cambian dos tipos del núcleo. El resto es movimiento de código.

```ts
// packages/core/src/earley/diagnostics.ts (N1)
/** The Earley items still open in the set where a story fails. */
export interface OpenItems {
  /** k: the set S_k where the story failed (the position of the error). */
  set: number;
  /** Structures already started (something before the dot) that could not go on. */
  started: EarleyItem[];
  /** Predicted rules (dot 0) that would have read one of the expected tags. */
  waiting: EarleyItem[];
}

/** The open items of the set where the story failed, or null when Earley did not run. */
export function openItemsAt({
  chart,
  error,
}: {
  chart: Chart;
  error: ParseError;
}): OpenItems | null;
```

```ts
// packages/core/src/parse.ts (N1): the rejected result gains openItems
| {
    accepted: false;
    tokens: SymbolName[];
    error: ParseError;
    chart: Chart;
    trace: TraceEvent[];
    /** Null when a tag is outside Σ: Earley did not run. */
    openItems: OpenItems | null;
  }
```

```ts
// packages/core/src/earley/recognizer.ts (N5)
export interface Recognition {
  /** ($S → S •, 0) in the last set, or null: the item that proves w ∈ L(G). */
  acceptingItem: EarleyItem | null;
  /** True exactly when acceptingItem is not null. */
  accepted: boolean;
  chart: Chart;
  startProduction: Production;
  trace: TraceEvent[];
}
```

- `OpenItems` devuelve ítems (`EarleyItem`), no texto: cada interfaz (la consola, la web) los escribe con `label()`, que el núcleo ya exporta.
- Con I1 (`CTX PER PIS REV`) en G1: `set` 2, `started` = [`Planteo → Marco • Hecho, 0`], `waiting` = [`Hecho → • CRI HallazgoOpc, 2`, `Hecho → • HAL, 2`].

---

## 4. Plan de implementación

Cada paso deja el sistema funcionando: pasan `npm run typecheck`, `npm run lint`, `npm run format:check` y `npm test`. Los pasos que no cambian resultados se comprueban además contra la línea de base del paso 0.

0. **Línea de base (antes de tocar nada).**
   - En la rama `core_fixes`, guardar en una carpeta fuera del repositorio (no se commitea) la salida de cada comando de `docs/console-demo.md` y de `npm run sabueso -- help`: un archivo por comando, con su código de salida.
   - Agregar a la línea de base estos comandos, que los pasos tocan de cerca: `parse`, `trees` y `count` sobre G0 y G1 con A1, I1 y `CRI PIS REV`; `nullable --steps`, `useful --steps`, `first-follow --steps` y `cycles --graph` sobre G1 y G0; `chomsky-normal-form` con y sin `--until`.
   - Anotar la cantidad de pruebas del núcleo y de la web.
1. **Comentarios y citas (N2, N3, N4).**
   - N2: en `chomsky-normal-form/index.ts`, `add-new-start.ts`, `remove-useless-symbols.ts`, `binarize.ts` e `isolate-terminals.ts`, citar a Sipser (sección 2.1, Teorema 2.9) para START y los nombres de los pasos, y a Hopcroft 7.1 (7.1.1 a 7.1.5) para el resto. Lo mismo en `docs/concepts/22-chomsky-normal-form.md` y `docs/guides/24-chomsky-normal-form-useless-term-bin.md`. Antes, confirmar las secciones con la edición de los libros de la bibliografía.
   - N3: corregir el comentario de `cycles` en `analysis/index.ts`, y revisar la ficha y la guía de ciclos. Agregar una prueba con A→B, B→C, C→A, A→C que documente que se informa un ciclo por arista de retroceso.
   - N4: corregir el comentario de `nonterminals` en `grammar/types.ts`.
   - Verificación: la salida de la consola es idéntica a la línea de base.
2. **Código muerto (N8).**
   - Borrar `computeProductive` (`analysis/useful.ts`), `computeFirst` y `computeFollow` (`analysis/first-follow.ts`).
   - Pasar sus pruebas a `analyzeUsefulSymbols`, `productiveRounds`, `computeFirstFollow`, `firstRounds` o `followRounds`, con los mismos valores esperados.
   - Actualizar `docs/guides/09-useless-symbols-and-emptiness.md` (sección 5.2), `docs/concepts/08-useless-symbols-and-emptiness.md` y las guías de FIRST y FOLLOW que los nombren.
   - Verificación: consola idéntica a la línea de base.
3. **El ítem que acepta (N5).**
   - `recognize` busca `($S → S •, 0)` una sola vez en el último conjunto y devuelve `acceptingItem`; `accepted` sale de ahí.
   - `trees/count.ts` y `trees/enumerate.ts` usan `recognition.acceptingItem` y se borran sus búsquedas.
   - Verificación: consola idéntica (`parse`, `trees`, `count`, `earley --chart`).
4. **Funciones repetidas (N6).**
   - Mover `productionKey` y `groupByLeftSide` a `grammar/` (por ejemplo, `grammar/productions.ts`) y usarlas desde `grammar/build.ts` y `chomsky-normal-form/rewrite.ts`. La consola deja de importar desde `chomsky-normal-form/rewrite.js`.
   - Verificación: consola idéntica (`grammar`, `chomsky-normal-form`).
5. **Árboles ε (N7).**
   - En `trees/epsilon.ts`, la función pública recibe solo lo necesario. Un ayudante privado recursivo lleva `inProgress`.
   - Verificación: consola idéntica (`epsilon-trees`, `count`, `trees`).
6. **Ítems abiertos en el núcleo (N1).**
   - Agregar `OpenItems` y `openItemsAt` a `earley/diagnostics.ts`, con la cabecera de concepto (fichas 11, 12 y 17). Exportarlos en `index.ts`.
   - `parse()` agrega `openItems` al resultado rechazado.
   - El comando `parse` muestra, después del diagnóstico, los ítems abiertos del conjunto del error (en inglés, como el resto de la consola), con `label()`.
   - Mover `apps/web/test/open-items.test.ts` al núcleo (`test/earley/open-items.test.ts`), con los tres casos: I1, el relato vacío y una etiqueta fuera de Σ. Agregar una prueba del comando `parse` con I1.
   - **Web, solo lo mínimo:** borrar `apps/web/src/domain/open-items.ts`. `DiagnosticPanel` recibe `openItems` del resultado y lo pasa a `OpenItems`, que escribe cada ítem con `label()`. Las pruebas de la web que miran los ítems abiertos siguen pasando con los mismos textos.
   - Actualizar la ficha del diagnóstico, la guía 16, el documento oficial (español e inglés), `docs/console-demo.md` y la sección de I1 del guion privado.
   - Verificación: toda la consola es idéntica **salvo** `parse` con un relato rechazado, que suma los ítems abiertos. Ese cambio se revisa a mano y se anota.
7. **`formatRounds` y los pasos de la FNC en la consola (N10).**
   - Una sola `formatRounds` en `command-line/format.ts`, usada por `nullable`, `useful` y `first-follow`.
   - `commands/chomsky-normal-form.ts` toma los pasos de `toChomskyNormalForm(grammar).steps` en lugar de repetir el bucle.
   - Verificación: consola idéntica (`nullable --steps`, `useful --steps`, `first-follow --steps`, `chomsky-normal-form` con y sin `--until`).
8. **Inicio común de los comandos (N9).**
   - Agregar `readGrammarCommandInput({ commandArguments, rules, usage, environment })` a `command-line/grammar-source.ts`. Devuelve `{ grammar, parsed }` o un código de salida.
   - Pasar los comandos de a grupos chicos, corriendo sus pruebas después de cada grupo.
   - Verificación: consola idéntica, códigos de salida incluidos, también con argumentos inválidos (gramática que no existe, opción desconocida, falta el relato).
9. **Validación final: todo funciona igual.**
   - Volver a correr la línea de base completa y compararla con `diff`. La única diferencia permitida es la salida de `parse` con relatos rechazados (paso 6).
   - Pasan `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build` y `npm test` desde la raíz. La cantidad de pruebas solo cambia por las movidas, borradas y agregadas en este spec, y la diferencia queda explicada.
   - La web funciona igual en el navegador: analizar A1, I1 (con sus ítems abiertos) y el relato vacío, y abrir las seis vistas.
   - Revisar con `grep` que no queden nombres borrados en `packages/core`, `apps/web` ni `docs`: `computeProductive`, `computeFirst(`, `computeFollow(`, `openItemsAt` dentro de `apps/web/src`, y la cita "Hopcroft 7.1.5" para START.
   - Agregar una nota corta de cierre en la sección 6 de este spec.

---

## 5. Criterios de aceptación

- [ ] Existe la rama `core_fixes` y todos los cambios están en ella.
- [ ] `openItemsAt` vive en `packages/core/src/earley/diagnostics.ts`, se exporta en `index.ts`, y `apps/web/src/domain/open-items.ts` ya no existe.
- [ ] `parse({ grammar: g1, input: 'CTX PER PIS REV' })` devuelve `openItems` con `set` 2, una estructura empezada (`Planteo → Marco • Hecho, 0`) y dos reglas en espera (`Hecho → • CRI HallazgoOpc, 2` y `Hecho → • HAL, 2`).
- [ ] Con el relato vacío, `openItems.started` está vacío. Con una etiqueta fuera de Σ, `openItems` es `null`.
- [ ] `npm run sabueso -- parse --grammar g1 "CTX PER PIS REV"` muestra los ítems abiertos después del diagnóstico.
- [ ] En la web, I1 muestra los mismos ítems abiertos que antes.
- [ ] Ningún archivo del núcleo cita "Hopcroft 7.1.5" para el paso START; START cita a Sipser.
- [ ] El comentario de `cycles` no dice "todos los ciclos", y una prueba documenta el caso A→C→A.
- [ ] El comentario de `nonterminals` dice que, después de `buildGrammar`, N son exactamente los lados izquierdos.
- [ ] `Recognition` tiene `acceptingItem`, y ni `trees/count.ts` ni `trees/enumerate.ts` buscan el ítem que acepta.
- [ ] `productionKey` y `groupByLeftSide` existen una sola vez, en `grammar/`.
- [ ] La función pública de `trees/epsilon.ts` no recibe `inProgress`.
- [ ] `computeProductive`, `computeFirst` y `computeFollow` no existen, y ninguna guía ni ficha los nombra.
- [ ] `formatRounds` existe una sola vez, y el comando `chomsky-normal-form` usa `toChomskyNormalForm(grammar).steps`.
- [ ] Los comandos que leen una gramática usan `readGrammarCommandInput`.
- [ ] El `diff` contra la línea de base del paso 0 no muestra diferencias, salvo `parse` con relatos rechazados.
- [ ] Pasan `typecheck`, `lint`, `format:check`, `build` y `npm test` desde la raíz.

---

## 6. Decisiones tomadas y descartadas

- **Sí:** los ítems abiertos salen en `parse()` y en la consola (2026-11-21). Así la consola y la web muestran lo mismo, y la web no tiene que llamar a nada extra.
- **No:** solo una función exportada que llame la web. Dejaba la consola sin el dato y obligaba a la web a armar el resultado.
- **Sí:** `OpenItems` devuelve `EarleyItem`, no texto. El núcleo devuelve datos, y cada interfaz los escribe con `label()` (regla "resultados como datos" del SPEC 02).
- **Sí:** el ajuste mínimo de la web entra en este spec. Sin él, la web dejaría de compilar o seguiría con su copia. El resto de los arreglos de la web va en otro spec.
- **Sí:** borrar `computeFirst` y `computeFollow`, además de `computeProductive` (2026-11-21). Las pruebas pueden usar `computeFirstFollow` y las rondas, y hay menos API pública que explicar.
- **Sí:** solo se corrige la documentación afectada, sin guía nueva. Es un refactor sin conceptos nuevos.
- **Sí:** N9 entra como último paso de código. Es el más grande y no toca teoría; si se complica, se puede cortar ahí sin perder lo demás.
- **Sí:** línea de base al principio y `diff` al final. "Todo funciona igual" tiene que ser verificable, no una impresión.
- **No:** el pulido opcional de la revisión (sección 2). Se puede retomar después.

---

## 7. Riesgos identificados

- **Una cita mal confirmada (N2).** Si la edición de Sipser o de Hopcroft numera distinto, la corrección repetiría el error. Mitigación: confirmar con la edición de la bibliografía antes de cambiar, y citar por sección y teorema.
- **N9 toca muchos archivos.** Un comando podría cambiar su código de salida con argumentos inválidos. Mitigación: grupos chicos, pruebas después de cada grupo, y la línea de base con casos de error.
- **N1 cambia un tipo público** (`ParseResult` rechazado). Cualquier código que lo construya a mano dejaría de compilar. Mitigación: `typecheck` en el núcleo y en la web en el mismo paso.
- **Las guías y las fichas pueden quedar desactualizadas.** Mitigación: el `grep` del paso 9.
