# SPEC 06 — Arreglos de la web después de la revisión de código

> **Estado:** Aprobado
> **Depende de:** SPEC 03 (terminado), SPEC 05 (implementado)
> **Fecha:** 2026-11-21
> **Rama:** `ui_fixes` (sale de `main`, con `core_fixes` ya mergeado)
> **Objetivo:** Corregir en `apps/web` los problemas que encontró la revisión de código (el título de Earley paso a paso, el análisis que se repite al volver a la pestaña Análisis, el código muerto, la carga de datos copiada en cinco lugares y las funciones de dominio dentro de componentes), para que la web sea más fácil de seguir sin cambiar lo que muestra.

---

## 1. Por qué existe este spec

La revisión de código del 2026-11-21 encontró la web sana: la frontera con el núcleo (`AnalysisService`) es limpia, las vistas pasan ids y no hay teoría en `apps/web` (la última que había, los ítems abiertos, pasó al núcleo en el SPEC 05). Pero dejó cinco arreglos:

- un error visible: el título de Earley paso a paso;
- un comportamiento escondido: el análisis se repite al volver a la pestaña Análisis;
- código muerto y comentarios viejos;
- la misma carga de datos copiada en cinco lugares;
- tres funciones de dominio dentro de componentes.

Como en el SPEC 05, la regla es que **la web muestre lo mismo**. El único comportamiento que cambia a propósito es el de W2: al volver a Análisis, el último resultado aparece al instante, sin volver a analizar.

---

## 2. Alcance

**Entra:**

- **W1 · Título de Earley paso a paso.** Usa el relato analizado, no lo que se está escribiendo.
- **W2 · El último resultado se conserva.** El resultado del análisis sube al nivel de la página. Al volver a Análisis se muestra al instante: sin "Analizando…", sin la animación del resultado, sin que el árbol se vuelva a armar solo y sin bajar la página. Solo se vuelve a analizar con Analizar o al cambiar la gramática. El efecto deja de apagar `exhaustive-deps`.
- **W3 · Código muerto.** Se borran `PendingView` y las ramas y la prop `isAnalyzing` de `ResultPanel`, que nunca corren, y se corrigen tres comentarios viejos.
- **W4 · Un hook para pedir datos al servicio.** `useServiceResult` reemplaza el patrón copiado en `use-grammars.ts`, `CnfCykView`, `EarleyPlayerView`, `PdaView` y `CompareView`.
- **W5 · Funciones de dominio fuera de los componentes.** `leftmostNonterminal`, `nonterminalsOf` y `stepText` pasan a `src/domain/`, con prueba.
- **Validación final:** todas las pruebas, los chequeos y una recorrida en el navegador de las seis vistas.

**Fuera de alcance (para otros specs):**

- El pulido opcional de la revisión:
  - las filas de la tabla del autómata, que no se pueden usar con el teclado;
  - el foco al abrir el drawer, que no pasa a "Cerrar";
  - el `aria-live` del reproductor, que anuncia cada paso durante la animación;
  - el nombre de la gramática, armado en tres lugares, y los textos repetidos ("ε (relato vacío)", unir con espacios o ε);
  - reorganizar las carpetas de `test/`;
  - mover los hooks a una carpeta `hooks/`.
- Conservar el estado de las otras vistas al cambiar de pestaña (por ejemplo, el paso del reproductor de Earley). W2 solo cubre el resultado de Análisis.
- Cualquier cambio en `packages/core`.

---

## 3. Modelo de datos

```ts
// apps/web/src/state/app-state.ts (W2): what every view receives
export interface ViewProps {
  state: AppState;
  dispatch: Dispatch<AppAction>;
  /** The analysis of the story, owned by the page so it survives changing tabs. */
  analysis: AnalysisRun;
}
```

```ts
// apps/web/src/analysis/use-analyze.ts (W2): unchanged shape, now called once, in App
export interface AnalysisRun {
  result: StoryAnalysis | null;
  isAnalyzing: boolean;
  /** How many analyses have finished: a new number means a new result to show. */
  runCount: number;
  analyze: (grammarId: GrammarId, input: string) => void;
  reset: () => void;
}
```

```ts
// apps/web/src/analysis/use-service-result.ts (W4)
/**
 * Asks the service once per change of deps and returns its answer, or null while it waits.
 * An answer that arrives after the deps changed is dropped.
 */
export function useServiceResult<T>(load: () => Promise<T>, deps: readonly unknown[]): T | null;
```

- **W2, qué es "nuevo":** `AnalysisView` recuerda el `runCount` que vio al montarse. Solo un `runCount` mayor es un resultado nuevo: ese anima, baja la página y deja que el árbol se arme solo. Al volver a la pestaña, el `runCount` es el mismo y el resultado se muestra quieto.
- **W2, cuándo se analiza:** un efecto en `App` (o en la vista, si el paso lo justifica) depende de la gramática, del relato analizado y de un contador de pedidos (`analysisRequest`) que incrementa la acción `'analyze'`. Analizar solo despacha la acción. Cambiar la gramática con un relato analizado vuelve a analizar, como hoy.
- No hay datos nuevos guardados entre visitas: no hay persistencia (decisión del SPEC 03).

---

## 4. Plan de implementación

Cada paso deja la web funcionando: pasan `npx tsc -p apps/web --noEmit`, `npx eslint apps/web`, `npm run format:check` y `npx vitest run --project web`.

0. **Punto de partida.**
   - En `ui_fixes`, anotar la cantidad de pruebas de la web y del núcleo.
   - Recorrer en el navegador A1, I1, el relato vacío y las seis vistas, y anotar los valores clave (los mismos de `docs/verificacion-manual-web.md`), para compararlos al final.
1. **Código muerto (W3).**
   - Borrar `components/PendingView.tsx`.
   - Corregir los comentarios de `views/view-tabs.tsx`, `views/AnalysisView.tsx` ("the result arrives in step 9") y `components/cnf-cyk/TreeComparison.tsx` ("on by default").
   - En `ResultPanel`, sacar la prop `isAnalyzing` y las ramas "Analizando…" y "Escribe un relato…", y tipar `result` como `StoryAnalysis`.
   - Verificación: pasan las pruebas de la web sin cambiar sus valores esperados.
2. **Título de Earley paso a paso (W1).**
   - `EarleyPlayerView` usa el relato analizado en el título, como `PdaView` y `CnfCykView`.
   - Prueba nueva en `test/EarleyPlayerView.test.tsx`: con `input` y `analyzedInput` distintos, el título muestra `analyzedInput`.
3. **Funciones de dominio (W5).**
   - `leftmostNonterminal` (de `DerivationView.tsx`) a `domain/derivation.ts`; `nonterminalsOf` (de `TreeComparison.tsx`) a `domain/normal-form.ts`; `stepText` (de `CykPlayer.tsx`) a un `domain/cyk.ts` nuevo.
   - Una prueba por función en `test/domain.test.ts` (o en un archivo propio si queda más claro), con valores de G1: el no terminal de más a la izquierda de una forma sentencial, los no terminales del árbol de CYK de `CRI PIS REV` y el texto de los largos 0, 1, 2 y n.
4. **El hook `useServiceResult` (W4).**
   - Crearlo en `src/analysis/use-service-result.ts`, con su comentario.
   - Configurar `react-hooks/exhaustive-deps` con `additionalHooks: 'useServiceResult'` para que revise las dependencias de quien lo llame. Dentro del hook, que pasa `deps` a `useEffect`, queda una sola excepción comentada.
   - Pruebas del hook: devuelve `null` mientras espera, el resultado al llegar, y descarta una respuesta vieja si cambian las dependencias.
   - Usarlo en `use-grammars.ts`, `CnfCykView`, `EarleyPlayerView`, `PdaView` y `CompareView`. Cada uno queda con una línea de carga.
   - Verificación: pasan todas las pruebas de las vistas sin cambiar sus valores esperados.
5. **El último resultado se conserva (W2).**
   - `App` llama a `useAnalyze` una sola vez y pasa el resultado a las vistas como `analysis` dentro de `ViewProps`. Reiniciar y Limpiar también lo borran.
   - Agregar al estado (`app-state.ts`) el contador `analysisRequest`, que incrementa la acción `'analyze'` y vuelve a 0 con `'reset'`. El efecto que analiza depende de la gramática, del relato analizado y de ese contador. Se va el `eslint-disable`.
   - `AnalysisView` anima el resultado, baja la página y deja que el árbol se arme solo **solo** si el resultado es nuevo (su `runCount` es mayor que el que vio al montarse).
   - Pruebas:
     - analizar, ir a otra pestaña y volver a Análisis: el resultado está, el botón no dice "Analizando…" y el servicio no se volvió a llamar;
     - cambiar la gramática con un relato analizado vuelve a analizar (la prueba que ya existe sigue pasando);
     - Limpiar y Reiniciar dejan la vista sin resultado.
6. **Validación final.**
   - Pasan `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build` y `npm test` desde la raíz. Las pruebas del núcleo no cambian; las de la web solo suman las nuevas de este spec.
   - Recorrer en el navegador lo mismo que en el paso 0 y comparar. Además: con un relato analizado, escribir otro y abrir Earley paso a paso (W1); analizar A1, ir a LL(1) y volver (W2: sin "Analizando…", sin animación, sin scroll y con el árbol completo).
   - `grep` en `apps/web/src`: no quedan `PendingView`, `let current = true` fuera del hook, ni `eslint-disable` de `exhaustive-deps` fuera del hook.
   - Agregar una nota corta de cierre en la sección 6 de este spec y en el SPEC 03 (las vistas usan `useServiceResult`, y el resultado vive en la página).

---

## 5. Criterios de aceptación

- [ ] Existe la rama `ui_fixes` y todos los cambios están en ella.
- [ ] `components/PendingView.tsx` no existe, y ningún comentario de `apps/web/src` la nombra ni habla de "the result arrives in step 9" ni de "Colapsar ε on by default".
- [ ] `ResultPanel` no recibe `isAnalyzing` y su `result` es `StoryAnalysis`.
- [ ] Con `input` distinto de `analyzedInput`, el título de Earley paso a paso muestra `analyzedInput`, y una prueba lo verifica.
- [ ] `leftmostNonterminal`, `nonterminalsOf` y `stepText` viven en `src/domain/` y tienen prueba.
- [ ] `useServiceResult` existe en `src/analysis/`, tiene pruebas (espera, llega, descarta la vieja) y lo usan `use-grammars.ts` y las cuatro vistas.
- [ ] Fuera de `useServiceResult`, ningún archivo de `apps/web/src` tiene el patrón `let current = true` ni apaga `exhaustive-deps`.
- [ ] Al volver a la pestaña Análisis después de analizar, el resultado aparece sin llamar otra vez al servicio, sin "Analizando…", sin animación, sin bajar la página y con el árbol completo; una prueba lo verifica.
- [ ] Cambiar la gramática con un relato analizado vuelve a analizar.
- [ ] Limpiar y Reiniciar dejan la vista Análisis sin resultado.
- [ ] Los valores del paso 0 son los mismos en el navegador al final.
- [ ] Pasan `typecheck`, `lint`, `format:check`, `build` y `npm test` desde la raíz.

---

## 6. Decisiones tomadas y descartadas

- **Sí:** la rama `ui_fixes` sale de `main` con `core_fixes` ya mergeado (2026-11-21). Así la web ya recibe los ítems abiertos del núcleo.
- **Sí:** para W2, el último resultado sube al nivel de la página (2026-11-21). Al volver a Análisis se muestra al instante y no se repite el trabajo.
- **No:** mantener montadas todas las vistas. Nada se desmontaría, pero todas quedarían vivas a la vez, con sus animaciones y sus pedidos al servicio.
- **No:** reanalizar en silencio al volver. Más simple, pero repite el trabajo.
- **Sí:** un hook genérico chico, `useServiceResult(load, deps)` (2026-11-21). Recibe una función, pero es la única de ese tipo y la carga y el descarte de respuestas viejas quedan explicados una sola vez.
- **No:** un hook por método del servicio. Sin funciones como parámetro, pero cinco hooks que comparten la misma lógica por dentro.
- **Sí:** solo W1 a W5 (2026-11-21). El pulido de accesibilidad y de textos repetidos queda para otro spec.
- **Sí:** el efecto que analiza vive en `App` (en un componente `Page`, dentro del proveedor del servicio), junto al resultado. Así no depende de que la vista Análisis esté montada.
- **Sí:** `useServiceResult` acepta que `load` devuelva `null` para no pedir nada (un relato demasiado largo para la vista, una gramática que falta). Así las vistas con esa condición también quedan en una línea.
- **Cierre (2026-11-21, paso 6).** La validación final pasó:
  - `typecheck`, `lint`, `format:check`, `build` y `npm test` desde la raíz: 1033 pruebas (923 del núcleo, sin cambios, y 110 de la web; antes eran 99). Las 11 nuevas son: 1 de W1, 4 de W5 (dominio), 3 del hook de W4, 1 del contador de W2 y 2 de W2 en `App` (volver a la pestaña y analizar dos veces el mismo relato);
  - en el navegador, los valores del paso 0 son los mismos: A1 con G1 da 1 árbol y 18 pasos; I1 muestra el error y sus ítems abiertos; el relato vacío espera CRI, CTX, HAL o PER; Earley tiene 53 eventos; la FNC va de 40 a 78 producciones; el autómata explora 23 configuraciones; LL(1) ✓; G0 vs G1 lista 2 relatos;
  - W1: con `CRI PIS REV` analizado y `CRI PIS REV CNF` escrito, el título dice "Earley paso a paso · CRI PIS REV";
  - W2: al volver de LL(1) a Análisis, el resultado está al instante, sin "Analizando…", sin la animación, sin bajar la página y con el árbol completo (29 nodos, paso 18/18);
  - el `grep` no encuentra `PendingView`, `let current = true` ni `eslint-disable` de `exhaustive-deps` fuera del hook.
- **Quedó anotado:** al volver a la pestaña Análisis, la vista recarga el catálogo de gramáticas y muestra un instante "Cargando las gramáticas…" en lugar del campo. El resultado no se pierde. Se puede resolver subiendo el catálogo al nivel de la página, en otro spec.

---

## 7. Riesgos identificados

- **W2 cambia por dónde pasa el resultado.** `ViewProps` suma `analysis`, y todas las vistas lo reciben aunque solo Análisis lo use. Mitigación: es una sola prop, tipada, y las pruebas de `App` cubren analizar, cambiar de pestaña, cambiar de gramática, Limpiar y Reiniciar.
- **El árbol que se arma solo al volver.** Si el criterio de "resultado nuevo" falla, el árbol se volvería a animar o la página bajaría al volver. Mitigación: la prueba de volver a la pestaña verifica que el árbol está completo y que no se llamó al servicio.
- **`useServiceResult` y la regla de dependencias.** Pasar `deps` a `useEffect` dentro del hook necesita una excepción de lint, y si no se configura `additionalHooks`, las vistas podrían olvidar una dependencia sin aviso. Mitigación: configurar `additionalHooks` en el paso 4 y comprobar que el lint marca una dependencia faltante.
- **Una respuesta vieja que llega tarde.** Si el hook no la descarta, una vista podría mostrar el resultado de un relato anterior. Mitigación: la prueba del hook con dependencias que cambian.
