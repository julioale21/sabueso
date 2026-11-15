# SPEC 03 — Interfaz web de Sabueso: análisis visual y vistas didácticas

> **Estado:** Borrador
> **Depende de:** SPEC 01, SPEC 02
> **Fecha:** 2026-11-14
> **Objetivo:** Construir `apps/web`, una aplicación React de una sola página y sin servidor que usa `@sabueso/core` sin modificarlo, para cargar un relato, ver su árbol, su derivación y su diagnóstico, y recorrer visualmente cada concepto teórico del núcleo durante la exposición.

---

## 1. Por qué existe este spec

El anteproyecto pide "una aplicación web de una sola página, organizada en paneles que siguen el orden del análisis". El SPEC 02 deja toda la lógica en una librería probada por consola. Este spec agrega **solo presentación**: ningún algoritmo teórico vive en `apps/web`.

Esa frontera es deliberada por tres razones:

1. **Correctitud verificable.** Si la UI no tiene lógica teórica, toda la correctitud ya está verificada por las pruebas del núcleo.
2. **Defensa.** En la exposición, cada vista se presenta como "la visualización del módulo X". Así cada pantalla se relaciona con una ficha de `docs/conceptos/`.
3. **Riesgo de plazos.** El anteproyecto identifica que "la interfaz consume tiempo del núcleo". Con un spec aparte, la UI se encara recién cuando el núcleo está terminado.

La única lógica no trivial de la UI es el **posicionamiento del árbol** (sección 3.3). Es geometría, no teoría de lenguajes, y tiene sus propias pruebas.

---

## 2. Alcance

**Entra:**

- El workspace `apps/web` (`@sabueso/web`) con Vite, React 19 y TypeScript estricto.
- **Vista "Análisis"** (la principal, según el boceto del anteproyecto):
  - entrada de secuencia con paleta de terminales y campo de texto;
  - ejemplos precargados;
  - selector de género (hoy solo Policial) y de versión (G1 oficial o G0 para ver la ambigüedad), con la gramática activa en solo lectura y su resumen de análisis;
  - resultado: árbol en SVG, derivación paso a paso y árboles alternativos paginados con el total;
  - diagnóstico de errores.
- **Pestañas didácticas:**
  - "Earley paso a paso", un reproductor de la traza;
  - "LL(1)": FIRST, FOLLOW y tabla con los conflictos resaltados;
  - "FNC y CYK": los 6 pasos y la tabla triangular;
  - "Autómata de pila": transiciones y camino de aceptación;
  - "G0 vs G1": testigo de ambigüedad y comparación acotada de lenguajes.
- Un cliente del núcleo que corre en un **Web Worker**, para que las operaciones pesadas no congelen la UI.
- Persistencia mínima en `localStorage` (clave `sabueso:v1`): la gramática elegida y la última entrada.
- Estilos con CSS plano: tokens en custom properties, CSS Modules por componente y tema claro/oscuro por `prefers-color-scheme`.
- Pruebas de componentes con Vitest, Testing Library y jsdom, y pruebas unitarias del posicionamiento del árbol.
- Build estático (`apps/web/dist`) y workflow de GitHub Actions para publicar en GitHub Pages.
- Una lista de verificación manual en el navegador (`docs/verificacion-manual-ui.md`).
- Un guion de exposición (`docs/guion-exposicion.md`) que ordena las vistas según los conceptos.

**Fuera de alcance (para specs futuros):**

- Español controlado (SPEC 04, que agregará un modo a esta misma pantalla).
- Cualquier cambio en `@sabueso/core`. Si la UI necesita algo nuevo del núcleo, va en un spec propio.
- Router, internacionalización (la UI está solo en español), autenticación y backend.
- Cargar, editar o importar gramáticas. El programa trabaja solo con las gramáticas incorporadas (sección 3.5).
- Exportar e importar secuencias.
- Reordenar etiquetas con drag & drop.
- Diseño específico para móviles. Debe funcionar en pantallas de 1280 px o más; en anchos menores, alcanza con que no se rompa.
- Crear el repositorio en GitHub. Es un paso manual documentado en el README.

---

## 3. Diseño

### 3.1 Organización de la pantalla

```text
┌ Sabueso ─────────────────────────────── [Análisis] [Earley] [LL(1)] [FNC·CYK] [AP] [G0 vs G1] ┐
│ ┌ Entrada ───────────────────────────┐ ┌ Gramática ──────────────────────────────────────┐ │
│ │ [CTX][PER][CRI][HAL][ENC][PIS]…    │ │ Gramática: [G1 ▾]   LL(1) ✓   ε: 10   inútiles: 0│ │
│ │ CTX HAL ENC INT SOS PIS DSC REV …  │ │ ┌ gramática activa (solo lectura) ────────────┐ │ │
│ │ Ejemplos: [V1][A1][I1][I5][L1]     │ │ │ Relato -> Planteo Investigacion Desenlace   │ │ │
│ │ [Analizar]                         │ │ └─────────────────────────────────────────────┘ │ │
│ └────────────────────────────────────┘ └─────────────────────────────────────────────────┘ │
│ ┌ Resultado ──────────────────────────────────────────────────────────────────────────────┐ │
│ │ ✓ Aceptado · 4 árboles   [◀ árbol 1/4 ▶]   [colapsar ε]                                  │ │
│ │  (árbol SVG)                         │ Derivación más a la izquierda (paso 3/18)         │ │
│ └─────────────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌ Diagnóstico (solo si hay error) ────────────────────────────────────────────────────────┐ │
│ │ CTX PER [PIS] REV   Posición 2 (evento 3): se encontró PIS; se esperaba: CRI, HAL       │ │
│ └─────────────────────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Las pestañas comparten estado:** gramática activa y secuencia actual. Cambiar de pestaña no pierde la entrada.
- **Navegación:** las pestañas se implementan con `role="tablist"` y se navegan con las flechas del teclado.

### 3.2 Cliente del núcleo y Web Worker

Las operaciones son síncronas en el núcleo, pero algunas tardan segundos:

- G0 con 200 eventos: hasta 3 s (SPEC 02, sección 9.5).
- Búsquedas acotadas y simulación del AP.

Si corrieran en el hilo principal, la UI quedaría congelada. Por eso se define una interfaz única, `CoreClient`, con dos implementaciones:

- **`createWorkerClient()`:** usa el Web Worker nativo (`new Worker(new URL('./core.worker.ts', import.meta.url), { type: 'module' })`). Vite lo soporta sin plugins. Es el cliente de producción.
- **`createDirectClient()`:** llama al núcleo en el mismo hilo. Lo usan las pruebas, porque jsdom no implementa Workers.

Detalles del protocolo:

- Un mensaje es `{ id, op, args }` y su respuesta es `{ id, ok, value | error }`.
- El *structured clone* del navegador soporta referencias cíclicas, `Map`, `Set` y `bigint`, así que `Chart` y `ParseResult` viajan sin serialización manual.
- Cada operación nueva cancela la anterior del mismo tipo: se ignoran las respuestas con `id` viejo.

### 3.3 Posicionamiento del árbol (SVG propio)

Es una función pura en `src/tree-layout/layout.ts`:

1. **Hojas.** Recorrido en postorden. Cada hoja (terminal, o ε si no está colapsado) recibe `x = siguienteColumna++`.
2. **Nodos internos.** Cada nodo interno recibe `x = (x del primer hijo + x del último hijo) / 2`.
3. **Altura.** `y = profundidad`.
4. **Escala.** Se pasa a píxeles con `dx = 72` y `dy = 64`. El ancho del SVG es `hojas × dx`. Si no entra en pantalla, el contenedor tiene scroll horizontal.
5. **Colapso de ε.** Los subárboles que derivan solo ε se dibujan como un nodo atenuado sin hijos. Responde al costo de la factorización de G1, que se registró en el SPEC 02.

La función garantiza dos cosas: los nodos no se superponen (cada hoja tiene su propia columna) y cada padre queda centrado sobre sus hijos.

Se descarta Reingold-Tilford porque es más compacto, pero más largo de explicar. Además no es teoría de la materia.

### 3.4 Visualización de cada concepto del núcleo

| Pestaña | Muestra | Fuente en el núcleo | Fichas | Equivalente en consola |
| --- | --- | --- | --- | --- |
| Análisis | Árbol, derivación con el no terminal reemplazado resaltado y sincronizado con el nodo del árbol, total de árboles y diagnóstico | `parse`, `renderDerivation` | 17–21 | `sabueso parse` |
| Earley paso a paso | Columnas S0…Sn. El evento actual resaltado con su operación (Predictor, Scanner, Completer o anulable) y su causa. Controles ⏮ ◀ ▶ ⏭, reproducir/pausar y velocidad | `parse(..., { trace: true })` | 11–16 | `sabueso trace` |
| LL(1) | FIRST y FOLLOW por no terminal. Tabla M[A, a] con las celdas en conflicto en rojo. Insignia "LL(1) ✓ ⇒ no ambigua" o "k conflictos" | `analyzeGrammar` | 5–10 | `sabueso ll1`, `sabueso first-follow` |
| FNC y CYK | Lista de los 6 pasos con la gramática después de cada uno. Tabla triangular CYK para la secuencia actual. Árbol FNC al lado del árbol de Earley | `toCNF`, `cykRecognize` | 22–23 | `sabueso cnf`, `sabueso cyk --comparar` |
| Autómata de pila | Transiciones expand/match. Camino de aceptación como tabla de descripciones instantáneas (posición, entrada restante, pila) y el resultado acepta, rechaza o indeterminado | `grammarToPda`, `runPda` | 24 | `sabueso pda` |
| G0 vs G1 | Selector k entre 1 y 6. Testigo de ambigüedad de G0 y de G1. Listas "solo en G0" y "solo en G1" | `findAmbiguityWitness`, `compareLanguages` | 21, 25 | `sabueso ambiguity`, `sabueso compare` |

**Límites de la UI y sus fundamentos:**

- **Reproductor de Earley:** acepta entradas de hasta 15 tokens. Con más columnas, el chart no se lee. Si se excede, muestra el aviso "acortá la entrada para la vista paso a paso".
- **Selector k de "G0 vs G1":** el máximo es 6. Con 7 o más, la generación tarda demasiado para una demo en vivo.
- **Pestaña "Autómata de pila":** acepta hasta 10 tokens. Más largo, el BFS puede llegar a `indeterminado`.
- **Total de árboles:** se muestra con todos los dígitos si tiene 15 o menos. Si tiene más, se muestra en notación aproximada con la cantidad de dígitos (por ejemplo, "≈ 3.6 × 10¹¹² (113 dígitos)"), porque C(197) no entra en pantalla.

### 3.5 Panel de gramática (solo lectura)

- **Selector:** se construye desde el **catálogo de géneros** del núcleo (SPEC 02, sección 4.6). Tiene dos niveles: género (hoy solo "Policial de enigma") y versión ("G1: oficial" o "G0: ambigua"). Por defecto, la versión oficial. Las gramáticas internas (`meta` y las de `pruebas/`) no se ofrecen: no identifican ningún género. Si en el futuro se suma un género al catálogo, aparece en el selector sin cambiar la UI.
- **Texto de la gramática:** se muestra en solo lectura, con las producciones tal como están en el `.glc`. Así, durante la defensa, se ve contra qué se está analizando.
- **Resumen:** LL(1) ✓/✗, cantidad de anulables, inútiles, si es vacía y si tiene ciclos (de `analyzeGrammar`).
- **Paleta:** muestra las **etiquetas del género activo** (`Genre.tags`), con su función narrativa como tooltip.
- **Origen:** las gramáticas son archivos fijos de `packages/core/grammars/`. Se importan con `?raw` **dentro del worker** y se parsean una vez al iniciar. El usuario no puede cargar ni editar gramáticas. Si la cátedra pide un cambio, se edita el `.glc` en el repositorio, sin tocar el código (anteproyecto).

### 3.6 Metadatos de las etiquetas

Las etiquetas, su función narrativa y su ejemplo (tabla del anteproyecto) vienen del catálogo de géneros del núcleo (`Genre.tags`). La web no define datos de dominio propios: así la CLI y la UI usan la misma fuente, y un género nuevo trae sus etiquetas.

---

## 4. Modelo de datos

```ts
// src/core-client/types.ts
interface CoreClient {
  grammar(id: GrammarId): Promise<{ text: string; grammar: Grammar; analysis: GrammarAnalysis }>;
  parse(id: GrammarId, input: string, options: ParseOptions): Promise<ParseResult>;
  cnfAndCyk(id: GrammarId, input: string): Promise<{ cnf: CnfResult; cyk: CykResult }>;
  pda(id: GrammarId, input: string): Promise<{ pda: Pda; run: PdaRun }>;
  ambiguity(id: GrammarId, maxLength: number): Promise<AmbiguityWitness | null>;
  compare(first: GrammarId, second: GrammarId, maxLength: number): Promise<LanguageComparison>;
}
// Se pasa el identificador de la gramática: el worker tiene las gramáticas incorporadas, ya parseadas.
// El mensaje es mínimo y no hay forma de enviar una gramática arbitraria.

// src/state/app-state.ts
type TabId = 'analysis' | 'earley' | 'll1' | 'cnf-cyk' | 'pda' | 'compare';
interface AppState {
  activeTab: TabId;
  genreId: string;                             // 'policial' (del catálogo)
  grammarId: GrammarId;                        // 'policial/g1' | 'policial/g0': solo gramáticas de género
  input: string;                               // secuencia separada por espacios
  selectedTree: number;                        // índice en la página de árboles
  collapseEpsilon: boolean;                    // por defecto true
}

// src/state/persistence.ts — clave 'sabueso:v1'
interface PersistedState { version: 1; genreId: string; grammarId: GrammarId; input: string }

// src/tree-layout/layout.ts
interface LayoutNode { id: string; label: string; kind: 'terminal' | 'nonterminal' | 'epsilon' | 'collapsed'; x: number; y: number; children: LayoutNode[] }
interface TreeLayout { root: LayoutNode; width: number; height: number; leafCount: number }

// TagInfo y Genre se importan de @sabueso/core (catálogo de géneros)
```

**Reglas de persistencia:**

- Se guarda solo lo indicado. Los resultados no se guardan porque se recalculan.
- Si `localStorage` lanza una excepción (modo privado o cuota llena), la app funciona igual sin guardar y sin mostrar errores al usuario.
- Si `version` no es 1, se ignora lo guardado.

---

## 5. Estructura de archivos

```text
apps/web/
  package.json            # @sabueso/web; dependencies: react, react-dom, @sabueso/core (workspace)
  tsconfig.json           # moduleResolution bundler (Vite)
  vite.config.ts          # base: process.env.VITE_BASE ?? '/'
  vitest.config.ts        # environment jsdom
  index.html
  src/
    main.tsx
    App.tsx
    core-client/types.ts
    core-client/core.worker.ts
    core-client/worker-client.ts
    core-client/direct-client.ts
    state/app-state.ts
    state/persistence.ts
    domain/examples.ts           # casos de la sección 9.1 del SPEC 02
    tree-layout/layout.ts
    components/Tabs.tsx
    components/SequenceInput.tsx
    components/GrammarPanel.tsx
    components/TreeView.tsx
    components/DerivationView.tsx
    components/ResultPanel.tsx
    components/DiagnosticPanel.tsx
    views/AnalysisView.tsx
    views/EarleyPlayerView.tsx
    views/Ll1View.tsx
    views/CnfCykView.tsx
    views/PdaView.tsx
    views/CompareView.tsx
    styles/tokens.css
    styles/global.css
    (cada componente y vista con su .module.css)
  test/
    layout.test.ts
    persistence.test.ts
    SequenceInput.test.tsx
    DiagnosticPanel.test.tsx
    App.test.tsx               # integración con createDirectClient
.github/workflows/deploy-pages.yml
docs/verificacion-manual-ui.md
docs/guion-exposicion.md
```

Los comentarios van en español y los identificadores en inglés, con la misma convención que el SPEC 02. Cada componente de vista empieza con un comentario que nombra el concepto que visualiza y su ficha.

---

## 6. Plan de implementación

Se aplica la regla del SPEC 02 (sección 8.1), adaptada a la UI. Cada paso termina con dos cosas:

1. **Ejecutable:** el resultado del paso se ve funcionando en `npm run dev -w @sabueso/web`. Ningún paso deja la app sin arrancar o con pantallas rotas.
2. **Testeable:** una prueba automatizada. Si el paso tiene lógica pura (posicionamiento, persistencia, cliente), se prueba con Vitest. Si es un componente, se prueba con Testing Library.

Toda la lógica teórica que la UI muestra ya es ejecutable por consola desde el SPEC 02 (columna "Equivalente en consola" de la tabla 3.4). Si una vista muestra algo raro, se compara con su comando.

Cada paso deja `npm test` y `npm run build` en verde, y es un commit propio.

1. **Punto de partida (cubierto por el SPEC 01).**
   - El esqueleto de `apps/web` (Vite, React 19, TS, Vitest con jsdom y Testing Library, prueba de humo) lo crea el SPEC 01. Este paso no agrega código.
   - Verificación antes de empezar: `npm run dev -w @sabueso/web` muestra "Sabueso" y la versión del núcleo, y `npm test` pasa.
2. **Tokens y estilos base.**
   - `tokens.css` (colores, tipografía, espaciado y tema claro/oscuro) y `global.css`.
   - Componente `Tabs` accesible, con las 6 pestañas vacías.
   - Prueba: la navegación con las flechas del teclado cambia de pestaña.
3. **Cliente del núcleo.**
   - `types.ts`, `direct-client.ts`, `core.worker.ts` y `worker-client.ts`, con las gramáticas incorporadas parseadas al iniciar y descarte de respuestas viejas.
   - Prueba del cliente directo: `parse` de A1 con G0 da 4 árboles.
4. **Estado y persistencia.**
   - `app-state.ts` (un `useReducer`) y `persistence.ts`.
   - Pruebas: guardar y recuperar; un `localStorage` que lanza no rompe nada; una versión distinta se ignora.
5. **Entrada de secuencia.**
   - `SequenceInput` con paleta de terminales (etiquetas y tooltips desde el catálogo de géneros), campo de texto, ejemplos de `examples.ts` y botón Analizar (también Ctrl+Enter).
   - Prueba: hacer clic en `CRI` y después en `PIS` deja "CRI PIS" en el campo.
6. **Panel de gramática.**
   - `GrammarPanel` con selector, texto de la gramática en solo lectura y resumen del análisis.
   - Prueba: al elegir G0 el resumen dice "LL(1) ✗", y al elegir G1 dice "LL(1) ✓".
7. **Posicionamiento del árbol.**
   - `layout.ts` según la sección 3.3.
   - Pruebas:
     - un árbol de 3 hojas da x = 0, 1, 2 y la raíz en x = 1;
     - ningún par de nodos del mismo nivel comparte x;
     - con `collapseEpsilon`, G1 sobre A1 tiene 11 hojas: 5 terminales y 6 nodos ε colapsados (HallazgoOpc, MarcoOpc, el último CuerpoLinea, Lineas, Cierre y EpiOpc). Su altura es menor que sin colapsar.
8. **TreeView y DerivationView.**
   - El árbol se dibuja en SVG. La derivación es una lista de formas sentenciales.
   - Seleccionar un paso resalta el nodo expandido.
9. **Vista Análisis completa.**
   - `ResultPanel` con el total, el paginador de árboles (hasta 50) y el colapso de ε. `DiagnosticPanel` con la secuencia y la posición marcada.
   - Prueba de integración (`App.test.tsx`): A1 con G0 muestra "4 árboles", e I1 muestra "se esperaba: CRI, HAL".
10. **Earley paso a paso.**
    - `EarleyPlayerView`: columnas S0…Sn, resaltado del evento, controles, reproducción con `setInterval` y límite de 15 tokens.
11. **Vista LL(1).**
    - `Ll1View`: tablas de FIRST/FOLLOW y M[A, a] con los conflictos resaltados.
    - Prueba: con G0 hay al menos una celda con la clase de conflicto en (Linea, SOS).
12. **Vista FNC y CYK.**
    - `CnfCykView`: pasos de la FNC, tabla triangular y los dos árboles lado a lado.
13. **Vista del autómata de pila.**
    - `PdaView`: transiciones y tabla de descripciones instantáneas del camino de aceptación.
14. **Vista G0 vs G1.**
    - `CompareView`: selector k, testigos, listas y estado "calculando…" mientras responde el worker.
15. **Persistencia conectada.**
    - Se guarda al cambiar la gramática o la entrada.
16. **Build y Pages.**
    - Se usa `base` desde `VITE_BASE`.
    - Workflow `deploy-pages.yml`: en cada push a `main` corre `npm ci`, después `npm test`, después `npm run build` con `VITE_BASE=/sabueso/`, y publica `apps/web/dist` con `actions/upload-pages-artifact` y `actions/deploy-pages`.
    - En el README, los pasos manuales: crear el repo público `sabueso`, hacer push y elegir "GitHub Actions" como fuente de Pages.
17. **Documentación de verificación y exposición.**
    - `docs/verificacion-manual-ui.md` con los casos de la sección 8.
    - `docs/guion-exposicion.md` con el orden sugerido: Análisis (V1, A1, I1) → Earley paso a paso (A1) → LL(1) (G0 contra G1) → G0 vs G1 (k = 3 y k = 4) → FNC y CYK → AP. Cada paso con la ficha correspondiente.

---

## 7. Criterios de aceptación

- [ ] `npm install`, `npm test`, `npm run build` y `npm run lint` terminan sin errores en la raíz con Node 24, incluyendo `apps/web`.
- [ ] `@sabueso/web` solo tiene como `dependencies` `react`, `react-dom` y `@sabueso/core`. No hay librerías de UI, de gráficos ni de árboles.
- [ ] Ningún archivo de `apps/web/src` implementa algoritmos de lenguajes formales. Todo resultado teórico viene de una llamada a `CoreClient`. Se verifica por revisión.
- [ ] `apps/web/dist/index.html` servido con `npx vite preview` carga sin errores en la consola del navegador.
- [ ] Con G0 y la entrada A1, la vista Análisis muestra "4 árboles" y permite recorrer los 4.
- [ ] Con G1 y la entrada A1, se ve un único árbol. La derivación tiene 18 pasos, y al seleccionar el paso 7 se resalta el nodo `Pasos` en el árbol.
- [ ] Con G1 y la entrada I1, el diagnóstico marca el tercer evento (`PIS`) y dice "se esperaba: CRI, HAL".
- [ ] Con G0 y la entrada L1 (200 eventos), la UI sigue respondiendo (las pestañas cambian) mientras calcula, y al terminar muestra el total en notación aproximada con la cantidad de dígitos.
- [ ] El reproductor de Earley con A1 y G1 recorre todos los eventos de la traza, y el último evento ocurre en el conjunto S5.
- [ ] La vista LL(1) muestra "LL(1) ✓" para G1 y conflictos resaltados para G0.
- [ ] La vista G0 vs G1 con k = 3 lista exactamente `CRI DSC REV` y `HAL DSC REV` como "solo en G0".
- [ ] El selector ofrece solo el género Policial con sus versiones G1 y G0, y la paleta muestra sus 14 etiquetas con su función narrativa. No aparece ninguna gramática interna (meta ni de libro).
- [ ] El panel de gramática muestra el texto de la gramática activa sin permitir editarlo, y la UI no ofrece ninguna forma de cargar una gramática.
- [ ] Al recargar la página se conservan la gramática elegida y la entrada.
- [ ] Con `localStorage` bloqueado, la app funciona sin errores visibles.
- [ ] El workflow `deploy-pages.yml` existe y es válido. Con el repo creado y Pages habilitado, el sitio carga en `https://<usuario>.github.io/sabueso/`.
- [ ] Existen `docs/verificacion-manual-ui.md` y `docs/guion-exposicion.md`, y cada caso de la verificación manual fue marcado como verificado.

---

## 8. Verificación manual (contenido mínimo de `docs/verificacion-manual-ui.md`)

- Todos los casos de la tabla 9.1 del SPEC 02, con G0 y con G1: aceptación, cantidad de árboles y diagnóstico tal como se muestran en pantalla.
- Cada pestaña didáctica con su caso del guion de exposición.
- Tema oscuro (cambiando la preferencia del sistema operativo) y navegación con teclado por las pestañas.
- Chrome y Firefox en sus versiones actuales.

---

## 9. Decisiones tomadas y descartadas

- **Sí:** cada paso visible en `npm run dev` y con su prueba, más un comando de consola equivalente para cada vista. Es el requisito del autor (cada etapa ejecutable y testeable), adaptado a una UI. La consola sirve además de oráculo para depurar una vista.
- **Sí:** Vite + React 19 + TS. Es una SPA estática sin servidor, como pide el anteproyecto, y Vite soporta Workers y `?raw` sin configuración.
- **No:** Next.js. Su routing, SSR y servidor no se usan, y suma complejidad.
- **Sí:** paleta de terminales más campo de texto editable. Es rápido para una demo en vivo y no pierde la edición libre.
- **No:** drag & drop. Sin librería es mucho trabajo de UI que no suma a la materia.
- **Sí:** SVG propio con posicionamiento por hojas. Son unas 60 líneas explicables, sin dependencias, y garantiza que no haya superposiciones.
- **No:** d3-hierarchy ni Reingold-Tilford. Suma una dependencia, o un algoritmo largo, para algo que no es teoría de la materia.
- **No:** el árbol como lista anidada. No se parece al árbol del pizarrón, que es lo que se defiende.
- **Sí:** solo gramáticas incorporadas, en solo lectura. El propósito del programa es decidir si un relato respeta la gramática del policial, no ser un editor de gramáticas. Permitir gramáticas arbitrarias abre un frente enorme (gramáticas mal escritas, cíclicas o gigantes) sin aportar al objetivo.
- **No:** editor de gramáticas en vivo. Se propuso para responder cambios de la cátedra en la defensa, pero esos cambios se hacen editando el `.glc` del repositorio, que es lo que prevé el anteproyecto.
- **Sí:** vista Análisis más pestañas de teoría, sin router. Sigue el boceto del anteproyecto para el flujo principal y separa las vistas didácticas sin sumar `react-router`.
- **No:** todo en una página con scroll. Sería demasiado larga para navegarla durante la exposición.
- **Sí:** CSS plano con custom properties y CSS Modules. Cero dependencias, los CSS Modules ya vienen en Vite, y el tema oscuro sale gratis con `prefers-color-scheme`.
- **No:** Tailwind. Suma dependencia y configuración para una UI chica.
- **No:** Triangle UI. Es una librería privada del trabajo del autor y no tiene lugar en un trabajo universitario.
- **Sí:** reproductor de traza para Earley. Es la mejor forma de explicar Predictor, Scanner y Completer, y el núcleo ya expone `trace`.
- **No:** solo el chart final. Se pierde la dinámica del algoritmo, que es lo que se explica.
- **Sí:** Web Worker nativo con `CoreClient` intercambiable. G0 con 200 eventos tarda hasta 3 s y congelaría la UI. El Worker es una API del navegador, no una dependencia. El cliente directo permite probar en jsdom.
- **No:** correr todo en el hilo principal limitando la entrada. Contradice el criterio de 200 eventos del anteproyecto.
- **Sí:** pasar al worker el identificador de la gramática. Las gramáticas viven dentro del worker, ya parseadas. El mensaje es mínimo y no existe un camino para enviar una gramática arbitraria.
- **Sí:** `localStorage` mínimo con clave versionada. Recordar entrada y ediciones ayuda a preparar la demo, y la versión permite cambiar el esquema más adelante.
- **No:** persistir resultados. Se recalculan en milisegundos o segundos, y guardarlos solo agrega estado inconsistente.
- **Sí:** Testing Library + jsdom solo como `devDependencies`. Son herramientas de prueba sin lógica de dominio, igual que Vitest en el SPEC 02.
- **Sí:** GitHub Pages con un workflow. La cátedra puede probar la herramienta sin instalar nada. El build sigue funcionando en local gracias a `VITE_BASE`.
- **Sí:** límites de la UI (15 tokens en Earley, 10 en el AP, k ≤ 6). Son visualizaciones para exponer. El núcleo no tiene esos límites, y la CLI sigue disponible para casos grandes.
- **Sí:** selector y etiquetas construidos desde el catálogo de géneros del núcleo. Las gramáticas visibles son solo las que identifican un género. Un género futuro aparece sin cambiar la UI.
- **Sí:** guion de exposición. Es un costo chico que relaciona cada pantalla con su ficha, y ese es el objetivo final del proyecto.

---

## 10. Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| El *structured clone* de un `Chart` grande (G0 con 200 eventos) es lento | Para L1, la vista Análisis pide el resultado sin traza y con `maxTrees: 50`. Si el clone sigue pesando, el worker devuelve un resultado resumido (sin `chart`) cuando la entrada supera los 15 tokens. Es un cambio local al worker. |
| El árbol de 200 hojas es muy ancho | Scroll horizontal y colapso de ε. El total y la derivación siguen visibles. |
| Las rutas de GitHub Pages rompen la carga de recursos | `base` configurable por `VITE_BASE`. El criterio de aceptación verifica la URL publicada. |
| El Worker no carga en algún navegador | Si `new Worker` lanza, se usa `createDirectClient()` y se muestra un aviso de que puede haber demoras. |
| La UI consume tiempo del núcleo | Este spec se implementa recién con el SPEC 02 en estado Implementado. |

---

## Lo que **no** está en este spec

- Modo de español controlado (SPEC 04).
- Cambios en `@sabueso/core`.
- Router, i18n, backend y autenticación.
- Exportar e importar archivos.
- Drag & drop.
- Carga o edición de gramáticas.
- Diseño para móviles.

Cada uno de esos puntos, si se hace, va en su propio spec.
