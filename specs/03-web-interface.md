# SPEC 03 — Interfaz web de Sabueso: análisis visual y vistas didácticas

> **Estado:** Aprobado (2026-11-21). Se implementa en la rama `ui_v1`: primera versión de la UI, con un diseño simple
> **Depende de:** SPEC 01, SPEC 02 (terminado)
> **Fecha:** 2026-11-14 · **Revisión:** 2026-11-21 (con el núcleo terminado)
> **Objetivo:** Construir `apps/web`, una aplicación React de una sola página y sin servidor que usa `@sabueso/core` sin modificarlo, para cargar un relato, ver su árbol, su derivación y su diagnóstico, y recorrer visualmente cada concepto teórico del núcleo durante la exposición.

---

## 1. Por qué existe este spec

El anteproyecto pide "una aplicación web de una sola página, organizada en paneles que siguen el orden del análisis". El SPEC 02 deja toda la lógica en una librería probada por consola. Este spec agrega **solo presentación**: ningún algoritmo teórico vive en `apps/web`.

Esa frontera es deliberada por tres razones:

1. **Correctitud verificable.** Si la UI no tiene lógica teórica, toda la correctitud ya está verificada por las pruebas del núcleo.
2. **Defensa.** En la exposición, cada vista se presenta como "la visualización del módulo X". Así cada pantalla se relaciona con una ficha de `docs/concepts/`.
3. **Riesgo de plazos.** El anteproyecto identifica que "la interfaz consume tiempo del núcleo". Con un spec aparte, la UI se encara recién cuando el núcleo está terminado, como ahora.

La única lógica no trivial de la UI es el **posicionamiento del árbol** (sección 3.3). Es geometría, no teoría de lenguajes, y tiene sus propias pruebas.

**Criterio de alcance** (el mismo del SPEC 02 al cerrarse): la materia evalúa conceptos. Entra lo que muestra un concepto o lo que pide el anteproyecto; lo demás se mantiene mínimo.

**Primera versión: conectar todo, con un diseño simple.** El objetivo es que cada vista muestre bien su concepto, con datos reales del núcleo. El diseño es sobrio (tipografía clara, tablas legibles, colores solo donde comunican algo: aceptado, rechazado, conflicto, evento actual). El pulido visual queda para después, sin cambiar la estructura.

---

## 2. Alcance

**Entra:**

- El workspace `apps/web` (`@sabueso/web`) con Vite, React 19 y TypeScript estricto.
- **Vista "Análisis"** (la principal, según el boceto del anteproyecto):
  - entrada de secuencia: campo de texto libre, con la paleta de etiquetas válidas siempre visible y las etiquetas desconocidas marcadas mientras se escribe (sección 3.7);
  - ejemplos precargados;
  - selector de género (hoy solo el policial de enigma) y de versión (G1 oficial o G0 para ver la ambigüedad), con la gramática activa en solo lectura y su resumen de análisis;
  - resultado: árbol en SVG, derivación paso a paso, el total de árboles y los primeros 3 para recorrer;
  - diagnóstico de errores.
- **Pestañas didácticas:**
  - "Earley paso a paso", un reproductor de la traza;
  - "LL(1)": FIRST, FOLLOW y tabla con los conflictos resaltados;
  - "FNC y CYK": los 6 pasos y la tabla triangular;
  - "Autómata de pila": transiciones y camino de aceptación;
  - "G0 vs G1": testigo de ambigüedad y comparación acotada de lenguajes.
- Un servicio de análisis (`AnalysisService`, sección 3.2): una interfaz asíncrona por la que pasa toda llamada al núcleo. La primera implementación corre el núcleo en el navegador, en el mismo hilo; la interfaz deja lista una futura API web o un Worker sin cambiar las vistas.
- Persistencia mínima en `localStorage` (clave `sabueso:v1`): la gramática elegida y la última entrada.
- Estilos con **Tailwind CSS v4** (solo como dependencia de desarrollo, con `@tailwindcss/vite`), tema claro/oscuro con la variante `dark:` (sigue a `prefers-color-scheme`).
- Pruebas de componentes con Vitest, Testing Library y jsdom, y pruebas unitarias del posicionamiento del árbol.
- Build estático (`apps/web/dist`) y workflow de GitHub Actions para publicar en GitHub Pages, para que la cátedra pueda probar la herramienta sin instalar nada.
- Una lista corta de verificación manual en el navegador (`docs/web-manual-check.md`).

**Fuera de alcance (para specs futuros):**

- Español controlado (SPEC 04, que agregará un modo a esta misma pantalla).
- Cualquier cambio en `@sabueso/core`. Si la UI necesita algo nuevo del núcleo, va en un spec propio.
- Una API web (un servidor que analice) y un Web Worker: hoy no hacen falta (sección 9), pero la interfaz `AnalysisService` los deja listos.
- Router, internacionalización (la UI está solo en español), autenticación y backend.
- Cargar, editar o importar gramáticas. El programa trabaja solo con las gramáticas incorporadas (sección 3.5).
- Exportar e importar secuencias.
- Reordenar etiquetas con drag & drop.
- Diseño específico para móviles. Debe funcionar en pantallas de 1280 px o más; en anchos menores, alcanza con que no se rompa.
- Un guion de exposición público: el orden de la exposición vive en las notas privadas del autor.
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
│ │ ✓ Aceptado · 4 árboles (se muestran 3)   [◀ árbol 1/3 ▶]   [colapsar ε]                  │ │
│ │  (árbol SVG)                         │ Derivación más a la izquierda (paso 3/18)         │ │
│ └─────────────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌ Diagnóstico (solo si hay error) ────────────────────────────────────────────────────────┐ │
│ │ CTX PER [PIS] REV   Posición 2 (evento 3): se encontró PIS; se esperaba: CRI, HAL       │ │
│ └─────────────────────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Las pestañas comparten estado:** gramática activa y secuencia actual. Cambiar de pestaña no pierde la entrada.
- **Navegación:** las pestañas se implementan con `role="tablist"` y se navegan con las flechas del teclado.

### 3.2 El servicio de análisis

Toda llamada al núcleo pasa por una interfaz, `AnalysisService` (sección 4). Las vistas solo conocen esa interfaz y pasan el identificador de la gramática, nunca una gramática.

- **Es asíncrona** (cada operación devuelve una `Promise`) aunque hoy el cálculo sea síncrono. Así una implementación futura que tarde, como una API web o un Worker, entra sin cambiar ninguna vista.
- **Primera implementación: `createLocalAnalysisService()`** (`src/analysis/local-service.ts`). Corre el núcleo en el navegador, en el mismo hilo: importa con `?raw` los `.grammar` de los géneros del catálogo, los parsea **una vez** y llama a la API pública (`parse`, `analyzeGrammar`, `toChomskyNormalForm`, `recognizeCockeYoungerKasami`, `buildPushdownAutomaton`, `simulatePushdownAutomaton`, `findAmbiguityWitness`, `compareLanguages`).
- **Las pruebas usan la misma implementación** que producción.
- **Futuras implementaciones** (no en este spec): `createHttpAnalysisService(baseUrl)`, contra una API que exponga las mismas operaciones, o `createWorkerAnalysisService()`. La app elige la implementación en un solo lugar (`App.tsx`) y se la pasa a las vistas por un contexto de React.

**Por qué alcanza con correr en el mismo hilo.** Con el núcleo terminado, las operaciones más pesadas que pide la UI tardan (medido el 2026-11-21):

| Operación                                     | Tiempo   |
| --------------------------------------------- | -------- |
| `parse` de G0 con L1 (200 eventos), sin traza | ~240 ms  |
| testigo de ambigüedad, k = 6                  | ≤ 115 ms |
| comparar G0 y G1, k = 6                       | ~25 ms   |
| autómata de pila, 10 etiquetas                | ~1 ms    |
| conversión a FNC                              | ~1 ms    |

El peor caso congela la pantalla un cuarto de segundo, aceptable para una demo. La traza (lo único más caro: ~850 ms con L1) solo la pide el reproductor de Earley, que acepta hasta 15 etiquetas.

**Datos que viajan.** Los resultados del núcleo usan `Map`, `Set` y `bigint`. En la implementación local no importa. Una API web tendría que serializarlos (por ejemplo, `bigint` como texto); por eso los tipos de la interfaz son los del núcleo, y la conversión queda dentro de la implementación HTTP, nunca en las vistas.

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

| Pestaña            | Muestra                                                                                                                                                                  | Fuente en el núcleo                                   | Fichas | Equivalente en consola                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- | ------ | ----------------------------------------------------------------------- |
| Análisis           | Árbol, derivación con el no terminal reemplazado resaltado y sincronizado con el nodo del árbol, total de árboles, los primeros 3 y diagnóstico                          | `parse`, `renderDerivation`                           | 17–21  | `sabueso parse`, `sabueso trees`                                        |
| Earley paso a paso | Columnas S0…Sn. El evento actual resaltado con su operación (Predictor, Scanner, Completer o anulable) y su causa. Controles ⏮ ◀ ▶ ⏭, reproducir/pausar y velocidad      | `parse(…, { trace: true })`                           | 11–16  | `sabueso trace`                                                         |
| LL(1)              | FIRST y FOLLOW por no terminal. Tabla M[A, a] con las celdas en conflicto en rojo. Insignia "LL(1) ✓ ⇒ no ambigua" o "k conflictos"                                      | `analyzeGrammar`                                      | 5–10   | `sabueso predictive-table`, `sabueso first-follow`                      |
| FNC y CYK          | Lista de los 6 pasos con la gramática después de cada uno. Tabla triangular CYK para la secuencia actual. Árbol FNC al lado del árbol de Earley                          | `toChomskyNormalForm`, `recognizeCockeYoungerKasami`  | 22–23  | `sabueso chomsky-normal-form`, `sabueso cocke-younger-kasami --compare` |
| Autómata de pila   | Transiciones expandir/emparejar. Camino de aceptación como tabla de descripciones instantáneas (entrada que falta, pila) y el resultado: acepta, rechaza o indeterminado | `buildPushdownAutomaton`, `simulatePushdownAutomaton` | 24     | `sabueso pushdown-automaton`                                            |
| G0 vs G1           | Selector k entre 1 y 6. Testigo de ambigüedad de G0 y de G1. Listas "solo en G0" y "solo en G1", con la aclaración de que no encontrar nada no demuestra nada            | `findAmbiguityWitness`, `compareLanguages`            | 21, 25 | `sabueso ambiguity`, `sabueso compare`                                  |

**Límites de la UI y sus fundamentos:**

- **Reproductor de Earley:** acepta entradas de hasta 15 etiquetas. Con más columnas, el chart no se lee. Si se excede, muestra el aviso "acorta la entrada para la vista paso a paso".
- **Selector k de "G0 vs G1":** el máximo es 6. Alcanza para los resultados que interesan (el testigo de G0 aparece en k = 4) y responde al instante.
- **Pestaña "Autómata de pila":** acepta hasta 10 etiquetas. Es una vista para leer la tabla de descripciones; con más, la tabla no se lee.
- **Árboles:** se muestra siempre el total (contado sin armar árboles) y se pueden recorrer los primeros 3, el valor por defecto del núcleo (SPEC 02, paso 19). Con A1 en G0: "4 árboles (se muestran 3)". La consola (`trees --max n`) queda para ver más.
- **Total de árboles:** se muestra con todos los dígitos si tiene 15 o menos. Si tiene más, en notación aproximada con la cantidad de dígitos (por ejemplo, "≈ 5,0 × 10¹¹⁴ (115 dígitos)" para C(197)), porque no entra en pantalla.

### 3.5 Panel de gramática (solo lectura)

- **Selector:** se construye desde el **catálogo de géneros** del núcleo (`genres`). Tiene dos niveles: género (hoy solo "Policial de enigma") y versión ("G1: oficial" o "G0: ambigua"). Por defecto, la versión oficial. Las gramáticas internas (`meta` y las de `grammars/test/`) no se ofrecen: no identifican ningún género. Si en el futuro se suma un género al catálogo, aparece en el selector sin cambiar la UI.
- **Texto de la gramática:** se muestra en solo lectura, con las producciones tal como están en el `.grammar`. Así, durante la defensa, se ve contra qué se está analizando.
- **Resumen:** LL(1) ✓/✗, cantidad de anulables, inútiles, si es vacía y si tiene ciclos (de `analyzeGrammar`).
- **Paleta:** muestra las **etiquetas del género activo** (`Genre.tags`), cada una con su nombre y su función narrativa corta (sección 3.7).
- **Origen:** las gramáticas son archivos fijos de `packages/core/grammars/`. El usuario no puede cargar ni editar gramáticas. Si la cátedra pide un cambio, se edita el `.grammar` en el repositorio, sin tocar el código (anteproyecto).

### 3.6 Metadatos de las etiquetas

Las etiquetas, su función narrativa y su ejemplo (tabla del anteproyecto) vienen del catálogo de géneros del núcleo (`Genre.tags`). La web no define datos de dominio propios: así la CLI y la UI usan la misma fuente, y un género nuevo trae sus etiquetas.

### 3.7 La entrada del relato

En esta primera etapa la entrada es la **cadena de etiquetas**, como en la consola (el texto en español llega con el SPEC 04). Se escribe libremente, con la lista de valores válidos siempre a la vista:

| Pieza                      | Qué hace                                                                                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Paleta siempre visible** | las 14 etiquetas del género como botones, cada una con su nombre y su función corta (`PIS · pista`). Es la lista de valores válidos; un clic agrega la etiqueta al final |
| **Campo de texto libre**   | se escribe o se edita a mano, separado por espacios                                                                                                                      |
| **Marcado inmediato**      | mientras se escribe, cada palabra que no está en Σ de la gramática activa se marca en rojo, antes de analizar                                                            |
| **Ejemplos**               | V1, A1, I1, I5 y L1 cargan la secuencia directamente                                                                                                                     |
| **Analizar**               | botón y Ctrl+Enter                                                                                                                                                       |

- **Por qué no un selector cerrado:** los errores son parte de lo que se muestra. El anteproyecto pide informar la posición del error y los símbolos esperados. Una etiqueta inexistente (`XYZ`) solo se puede mostrar si se puede escribir; y el error más interesante, etiquetas válidas en mal orden (`CRI REV`), lo produce cualquier forma de entrada.
- **El marcado no es un algoritmo de la materia:** compara cada palabra con el alfabeto Σ que entrega el servicio (buscar en un conjunto). El veredicto lo da siempre el núcleo, al analizar.

---

## 4. Modelo de datos

```ts
// src/analysis/service.ts: la única puerta hacia el núcleo (sección 3.2)
type GrammarId = string; // 'detective/g1' | 'detective/g0': solo gramáticas de género
interface LoadedGrammar {
  id: GrammarId;
  text: string; // el .grammar tal cual, para el panel en solo lectura
  alphabet: string[]; // Σ, para marcar las etiquetas desconocidas mientras se escribe
  analysis: GrammarAnalysis;
}
interface AnalysisService {
  grammars(): Promise<{ genres: Genre[]; grammars: LoadedGrammar[] }>;
  analyze(id: GrammarId, input: string): Promise<ParseResult>; // maxTrees 3, sin traza
  trace(id: GrammarId, input: string): Promise<ParseResult>; // con traza; hasta 15 etiquetas
  normalFormAndCyk(
    id: GrammarId,
    input: string,
  ): Promise<{ normalForm: ChomskyNormalFormResult; cyk: CockeYoungerKasamiResult }>;
  pushdown(
    id: GrammarId,
    input: string,
  ): Promise<{ automaton: PushdownAutomaton; run: PushdownRun }>;
  ambiguity(id: GrammarId, maxLength: number): Promise<AmbiguityWitness | null>;
  compare(firstId: GrammarId, secondId: GrammarId, maxLength: number): Promise<LanguageComparison>;
}
// src/analysis/local-service.ts: createLocalAnalysisService(): AnalysisService

// src/state/app-state.ts
type TabId = 'analysis' | 'earley' | 'll1' | 'cnf-cyk' | 'pda' | 'compare';
interface AppState {
  activeTab: TabId;
  genreId: string; // 'detective' (del catálogo)
  grammarId: GrammarId;
  input: string; // secuencia separada por espacios
  selectedTree: number; // 0, 1 o 2
  collapseEpsilon: boolean; // por defecto true
}

// src/state/persistence.ts — clave 'sabueso:v1'
interface PersistedState {
  version: 1;
  genreId: string;
  grammarId: GrammarId;
  input: string;
}

// src/tree-layout/layout.ts
interface LayoutNode {
  id: string;
  label: string;
  kind: 'terminal' | 'nonterminal' | 'epsilon' | 'collapsed';
  x: number;
  y: number;
  children: LayoutNode[];
}
interface TreeLayout {
  root: LayoutNode;
  width: number;
  height: number;
  leafCount: number;
}

// Genre y TagInfo se importan de @sabueso/core (catálogo de géneros)
```

**Reglas de persistencia:**

- Se guarda solo lo indicado. Los resultados no se guardan porque se recalculan.
- Si `localStorage` lanza una excepción (modo privado o cuota llena), la app funciona igual sin guardar y sin mostrar errores al usuario.
- Si `version` no es 1, o la gramática guardada ya no existe en el catálogo, se ignora lo guardado.

---

## 5. Estructura de archivos

```text
apps/web/
  package.json            # @sabueso/web; dependencies: react, react-dom, @sabueso/core; devDependencies: tailwindcss, @tailwindcss/vite, …
  tsconfig.json           # moduleResolution bundler (Vite)
  vite.config.ts          # plugins: react, tailwindcss; base: process.env.VITE_BASE ?? '/'
  vitest.config.ts        # environment jsdom
  index.html
  src/
    main.tsx
    App.tsx
    analysis/service.ts          # la interfaz AnalysisService
    analysis/local-service.ts    # la implementación que corre el núcleo en el navegador
    analysis/context.tsx         # el contexto de React que la entrega a las vistas
    state/app-state.ts
    state/persistence.ts
    domain/examples.ts           # casos de la sección 9.1 del SPEC 02
    tree-layout/layout.ts        # posición de cada nodo: hojas en columnas, padres centrados, colapso de ε
    components/ui/               # primitivas reutilizables, sin dependencias: Tabs, TabButton, TabPanel, Button, Panel, Badge, SelectField, MutedText…
    utils/cx.ts                  # combina clases condicionales (tres líneas)
    domain/tags.ts               # separa el relato en etiquetas
    components/sequence-input/   # SequenceInput y sus piezas: TagPalette, TagButton, StoryField, TagSequence, TagChip…
    components/grammar-panel/    # GrammarPanel y sus piezas: GrammarSelect, GrammarSummary, GrammarText
    domain/grammar-options.ts    # las versiones de un género para el selector
    components/tree-view/        # TreeView (SVG), TreeNode, TreeEdge
    components/derivation-view/  # DerivationView, DerivationStepItem, SententialForm, TreeAndDerivation
    tree-layout/geometry.ts      # de unidades de grilla a píxeles
    components/ResultPanel.tsx
    components/DiagnosticPanel.tsx
    components/AppHeader.tsx
    components/PendingView.tsx   # marcador de una vista que llega en un paso posterior
    views/view-tabs.tsx          # una pestaña por vista, en el orden del análisis
    views/AnalysisView.tsx
    views/EarleyPlayerView.tsx
    views/Ll1View.tsx
    views/CnfCykView.tsx
    views/PdaView.tsx
    views/CompareView.tsx
    styles/index.css             # @import "tailwindcss" y unos pocos estilos base
  test/
    layout.test.ts
    persistence.test.ts
    local-service.test.ts
    SequenceInput.test.tsx
    DiagnosticPanel.test.tsx
    App.test.tsx               # integración
.github/workflows/deploy-pages.yml
docs/web-manual-check.md
```

El código y sus comentarios van en inglés, como en el SPEC 02; los textos de la interfaz, en español (con tuteo). Cada componente de vista empieza con un comentario que nombra el concepto que visualiza y su ficha.

---

## 6. Plan de implementación

Se aplica la regla del SPEC 02 (sección 8.1), adaptada a la UI. Cada paso termina con dos cosas:

1. **Ejecutable:** el resultado del paso se ve funcionando en `npm run dev -w @sabueso/web`. Ningún paso deja la app sin arrancar o con pantallas rotas.
2. **Testeable:** una prueba automatizada. Si el paso tiene lógica pura (posicionamiento, persistencia, operaciones), se prueba con Vitest. Si es un componente, se prueba con Testing Library.

Toda la lógica teórica que la UI muestra ya es ejecutable por consola desde el SPEC 02 (columna "Equivalente en consola" de la tabla 3.4). Si una vista muestra algo raro, se compara con su comando.

Cada paso deja `npm test` y `npm run build` en verde, y es un commit propio. Como en el SPEC 02, cada paso actualiza su guía de estudio.

El trabajo va en la rama `ui_v1` (desde `main`, con el SPEC 02 ya fusionado) y se divide en **tres fases**. Cada una deja la web funcionando y se puede cerrar con su propio pull request a `main`:

| Fase                     | Pasos | Resultado                                                                                                                                      |
| ------------------------ | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Lo esencial**       | 1–9   | la vista Análisis funciona de punta a punta: veredicto, árbol, derivación y diagnóstico. Con esto la web ya cumple lo que pide el anteproyecto |
| **B. Vistas didácticas** | 10–14 | una pestaña por concepto. Son independientes entre sí: se pueden hacer en cualquier orden                                                      |
| **C. Cierre**            | 15–17 | persistencia conectada, publicación en GitHub Pages y verificación manual                                                                      |

1. **Punto de partida (cubierto por el SPEC 01).**
   - El esqueleto de `apps/web` (Vite, React 19, TS, Vitest con jsdom y Testing Library, prueba de humo) lo crea el SPEC 01. Este paso no agrega código.
   - Verificación antes de empezar: `npm run dev -w @sabueso/web` muestra "Sabueso", y `npm test` pasa.
2. **Tailwind y estructura de la pantalla.**
   - Tailwind v4 con `@tailwindcss/vite` (dependencias de desarrollo) y `styles/index.css`. Diseño simple: tipografía del sistema, tablas legibles, tema oscuro con `dark:`.
   - Componente `Tabs` accesible, con las 6 pestañas vacías.
   - Prueba: la navegación con las flechas del teclado cambia de pestaña.
3. **El servicio de análisis.**
   - `analysis/service.ts` (la interfaz), `analysis/local-service.ts` (las gramáticas del catálogo, parseadas una vez, y las operaciones) y `analysis/context.tsx`.
   - Prueba: `analyze('detective/g0', A1)` resuelve con 4 árboles en total y 3 construidos; `analyze('detective/g1', I1)` resuelve con el error en la posición 2.
4. **Estado y persistencia.**
   - `app-state.ts` (un `useReducer`) y `persistence.ts`.
   - Pruebas: guardar y recuperar; un `localStorage` que lanza no rompe nada; una versión distinta o una gramática que no existe se ignoran.
5. **Entrada de secuencia.**
   - `SequenceInput` según la sección 3.7: paleta siempre visible (etiquetas y funciones desde el catálogo de géneros), campo de texto libre con las etiquetas desconocidas marcadas, ejemplos de `examples.ts` y botón Analizar (también Ctrl+Enter).
   - Pruebas: hacer clic en `CRI` y después en `PIS` deja "CRI PIS" en el campo; escribir `CRI XYZ REV` marca `XYZ` como desconocida y no marca las otras dos.
6. **Panel de gramática.**
   - `GrammarPanel` con selector, texto de la gramática en solo lectura y resumen del análisis.
   - Prueba: al elegir G0 el resumen dice "LL(1) ✗", y al elegir G1 dice "LL(1) ✓".
7. **Posicionamiento del árbol.**
   - `layout.ts` según la sección 3.3.
   - Pruebas:
     - un árbol de 3 hojas da x = 0, 1, 2 y la raíz en x = 1;
     - ningún par de nodos del mismo nivel comparte x;
     - con `collapseEpsilon`, G1 sobre A1 tiene 11 hojas: las 5 etiquetas y 6 nodos ε colapsados (HallazgoOpc, MarcoOpc, CuerpoLinea, Lineas, Cierre y EpiOpc), y 6 nodos menos que sin colapsar. La altura no cambia: cada ε colapsado reemplaza un nodo y su hoja ε por un solo nodo (corrección del 2026-11-21: el borrador decía que la altura bajaba);
     - cada nodo interno lleva su número de expansión en preorden, el orden de la derivación más a la izquierda: en A1 con G1, `Pasos` es la expansión 6 (el paso 7 de la derivación).
8. **TreeView y DerivationView.**
   - El árbol se dibuja en SVG. La derivación es una lista de formas sentenciales.
   - Seleccionar un paso resalta el nodo expandido.
9. **Vista Análisis completa.**
   - `ResultPanel` con el total, el paginador de los primeros 3 árboles y el colapso de ε. `DiagnosticPanel` con la secuencia y la posición marcada.
   - Prueba de integración (`App.test.tsx`): A1 con G0 muestra "4 árboles" y permite pasar a los árboles 2 y 3; I1 con G1 muestra "se esperaba: CRI, HAL".
10. **Earley paso a paso.**
    - `EarleyPlayerView`: columnas S0…Sn, resaltado del evento, controles, reproducción con `setInterval` y límite de 15 etiquetas.
11. **Vista LL(1).**
    - `Ll1View`: tablas de FIRST/FOLLOW y M[A, a] con los conflictos resaltados.
    - Prueba: con G0 hay al menos una celda con la clase de conflicto en (Linea, SOS).
12. **Vista FNC y CYK.**
    - `CnfCykView`: pasos de la FNC, tabla triangular y los dos árboles lado a lado.
13. **Vista del autómata de pila.**
    - `PdaView`: transiciones y tabla de descripciones instantáneas del camino de aceptación.
14. **Vista G0 vs G1.**
    - `CompareView`: selector k, testigos y listas, con la aclaración "no encontrar nada hasta k no demuestra nada".
15. **Persistencia conectada.**
    - Se guarda al cambiar la gramática o la entrada.
16. **Build y Pages.**
    - Se usa `base` desde `VITE_BASE`.
    - Workflow `deploy-pages.yml`: en cada push a `main` corre `npm ci`, después `npm test`, después `npm run build` con `VITE_BASE=/sabueso/`, y publica `apps/web/dist` con `actions/upload-pages-artifact` y `actions/deploy-pages`.
    - En el README, los pasos manuales: hacer público el repo (si hace falta) y elegir "GitHub Actions" como fuente de Pages.
17. **Verificación manual.**
    - `docs/web-manual-check.md` con los casos de la sección 8, marcados después de revisarlos en el navegador.

---

## 7. Criterios de aceptación

- [ ] `npm install`, `npm test`, `npm run build` y `npm run lint` terminan sin errores en la raíz con Node 24, incluyendo `apps/web`.
- [ ] `@sabueso/web` solo tiene como `dependencies` `react`, `react-dom` y `@sabueso/core`. Tailwind está solo en `devDependencies`. No hay librerías de componentes, de gráficos ni de árboles.
- [ ] Ningún archivo de `apps/web/src` implementa algoritmos de lenguajes formales. Todo resultado teórico viene del `AnalysisService`, cuya implementación local solo llama a la API pública del núcleo. Ninguna vista importa funciones de `@sabueso/core` (solo tipos). Se verifica por revisión.
- [ ] `apps/web/dist/index.html` servido con `npx vite preview` carga sin errores en la consola del navegador.
- [ ] Con G0 y la entrada A1, la vista Análisis muestra "4 árboles" y permite recorrer los primeros 3.
- [ ] Con G1 y la entrada A1, se ve un único árbol. La derivación tiene 18 pasos, y al seleccionar el paso 7 (`Pasos → Linea Lineas`) se resalta el nodo `Pasos` en el árbol.
- [ ] Con G1 y la entrada I1, el diagnóstico marca el tercer evento (`PIS`) y dice "se esperaba: CRI, HAL".
- [ ] Con G0 y la entrada L1 (200 eventos), la vista Análisis responde en menos de un segundo y muestra el total en notación aproximada con la cantidad de dígitos (115).
- [ ] El reproductor de Earley con A1 y G1 recorre todos los eventos de la traza, y el último evento ocurre en el conjunto S5.
- [ ] La vista LL(1) muestra "LL(1) ✓" para G1 y conflictos resaltados para G0.
- [ ] La vista G0 vs G1 con k = 3 lista exactamente `CRI DSC REV` y `HAL DSC REV` como "solo en G0", y con k = 4 muestra el testigo `CRI SOS ATQ REV` de G0.
- [ ] El selector ofrece solo el género policial con sus versiones G1 y G0, y la paleta muestra sus 14 etiquetas con su función narrativa. No aparece ninguna gramática interna (meta ni de prueba).
- [ ] Escribir `CRI XYZ REV` marca `XYZ` en rojo antes de analizar, y la paleta muestra siempre las 14 etiquetas con su función corta.
- [ ] El panel de gramática muestra el texto de la gramática activa sin permitir editarlo, y la UI no ofrece ninguna forma de cargar una gramática.
- [ ] Al recargar la página se conservan la gramática elegida y la entrada.
- [ ] Con `localStorage` bloqueado, la app funciona sin errores visibles.
- [ ] El workflow `deploy-pages.yml` existe y es válido. Con Pages habilitado, el sitio carga en `https://<usuario>.github.io/sabueso/`.
- [ ] Existe `docs/web-manual-check.md`, y cada caso fue marcado como verificado.

---

## 8. Verificación manual (contenido mínimo de `docs/web-manual-check.md`)

- Los casos de la tabla 9.1 del SPEC 02 con G0 y con G1: aceptación, cantidad de árboles y diagnóstico tal como se muestran en pantalla.
- Cada pestaña didáctica con un caso: Earley con A1, LL(1) con G0 y G1, FNC y CYK con `CRI PIS REV`, autómata de pila con `CRI PIS REV`, G0 vs G1 con k = 3 y k = 4.
- Tema oscuro (cambiando la preferencia del sistema operativo) y navegación con teclado por las pestañas.
- Chrome y Firefox en sus versiones actuales.

---

## 9. Decisiones tomadas y descartadas

- **Sí:** cada paso visible en `npm run dev` y con su prueba, más un comando de consola equivalente para cada vista. Es el requisito del autor (cada etapa ejecutable y testeable), adaptado a una UI. La consola sirve además de oráculo para depurar una vista.
- **Sí:** Vite + React 19 + TS. Es una SPA estática sin servidor, como pide el anteproyecto, y Vite soporta `?raw` sin configuración.
- **No:** Next.js. Su routing, SSR y servidor no se usan, y suma complejidad.
- **Sí:** llamar al núcleo en el mismo hilo (revisión 2026-11-21). El borrador pedía un Web Worker porque G0 con 200 eventos tardaba hasta 3 s; con el núcleo terminado tarda ~240 ms, y el resto de las operaciones de la UI, menos de 120 ms (sección 3.2).
- **No:** Web Worker. Agregaba un protocolo de mensajes, cancelación, dos implementaciones del cliente y un respaldo, para evitar congelamientos de un cuarto de segundo. No es materia.
- **No, por ahora:** una API web (revisión 2026-11-21). El núcleo corre en el navegador sin dependencias de Node, y ninguna operación necesita un servidor.
- **Sí:** la interfaz asíncrona `AnalysisService` (revisión 2026-11-21). Es la única puerta hacia el núcleo, y deja lista una API web o un Worker: se escribe otra implementación y las vistas no cambian. Hacerla asíncrona desde el principio cuesta poco y evita reescribir las vistas después.
- **Sí:** paleta de terminales más campo de texto editable. Es rápido para una demo en vivo y no pierde la edición libre.
- **No:** drag & drop. Sin librería es mucho trabajo de UI que no suma a la materia.
- **Sí:** SVG propio con posicionamiento por hojas. Son unas 60 líneas explicables, sin dependencias, y garantiza que no haya superposiciones.
- **No:** d3-hierarchy ni Reingold-Tilford. Suma una dependencia, o un algoritmo largo, para algo que no es teoría de la materia.
- **No:** el árbol como lista anidada. No se parece al árbol del pizarrón, que es lo que se defiende.
- **Sí:** los primeros 3 árboles, con el total siempre visible (revisión 2026-11-21). Es el valor por defecto del núcleo: alcanza para mostrar la ambigüedad, y el total se cuenta sin armar árboles. Para ver más, la consola (`trees --max n`).
- **Sí:** solo gramáticas incorporadas, en solo lectura. El propósito del programa es decidir si un relato respeta la gramática del policial, no ser un editor de gramáticas. Permitir gramáticas arbitrarias abre un frente enorme (gramáticas mal escritas, cíclicas o gigantes) sin aportar al objetivo.
- **No:** editor de gramáticas en vivo. Esos cambios se hacen editando el `.grammar` del repositorio, que es lo que prevé el anteproyecto.
- **Sí:** vista Análisis más pestañas de teoría, sin router. Sigue el boceto del anteproyecto para el flujo principal y separa las vistas didácticas sin sumar `react-router`.
- **No:** todo en una página con scroll. Sería demasiado larga para navegarla durante la exposición.
- **Sí:** Tailwind CSS v4 (revisión 2026-11-21). Lo pesado de esta UI son tablas, grillas y un SVG propio, y con Tailwind se maquetan rápido sin archivos de estilos aparte. Es solo de desarrollo: no agrega dependencias de producción. El tema oscuro sale con `dark:`.
- **No:** CSS Modules con custom properties (lo que decía el borrador). Funciona, pero es más lento de escribir para una UI hecha de tablas.
- **No:** Material UI ni otras librerías de componentes. Resuelven botones, pestañas e inputs, que es lo menos importante acá, y no ayudan con el árbol, el chart ni las tablas teóricas. Además son dependencias de producción pesadas.
- **No, en la primera versión:** shadcn/ui (2026-11-21). Copia los componentes al repo, pero dependen de paquetes de producción (Radix UI, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`), y lo que aporta (diálogos, menús, combobox) casi no se usa acá. Se toma su forma de organizar: primitivas propias en `components/ui/`, con sus variantes en un objeto y sin dependencias. Si la UI v2 lo usa, se reemplazan las primitivas sin tocar las vistas.
- **Sí:** reglas de Tailwind (2026-11-21). Las clases viven en las primitivas (`<Button variant="primary">`, no veinte clases en cada vista); las variantes son objetos de datos, no ternarios anidados en `className`; un helper `cx` de tres líneas (`src/utils/cx.ts`) combina las clases condicionales; `@apply` solo en los estilos base.
- **Sí:** diseño simple en la primera versión. Lo que se evalúa son los conceptos que cada vista muestra; el pulido visual puede venir después sin cambiar la estructura.
- **Sí:** reproductor de traza para Earley. Es la mejor forma de explicar Predictor, Scanner y Completer, y el núcleo ya expone `trace`.
- **No:** solo el chart final. Se pierde la dinámica del algoritmo, que es lo que se explica.
- **Sí:** las vistas pasan el identificador de la gramática, nunca una gramática. Las gramáticas se cargan una vez dentro del servicio, y no existe un camino para analizar una gramática arbitraria (tampoco en una futura API).
- **Sí:** `localStorage` mínimo con clave versionada. Recordar la gramática y la entrada ayuda a preparar la demo, y la versión permite cambiar el esquema más adelante.
- **No:** persistir resultados. Se recalculan en milisegundos, y guardarlos solo agrega estado inconsistente.
- **Sí:** Testing Library + jsdom solo como `devDependencies`. Son herramientas de prueba sin lógica de dominio, igual que Vitest en el SPEC 02.
- **Sí:** GitHub Pages con un workflow. La cátedra puede probar la herramienta sin instalar nada. El build sigue funcionando en local gracias a `VITE_BASE`.
- **Sí:** límites de la UI (15 etiquetas en Earley, 10 en el AP, k ≤ 6). Son visualizaciones para exponer. El núcleo no tiene esos límites, y la CLI sigue disponible para casos grandes.
- **Sí:** selector y etiquetas construidos desde el catálogo de géneros del núcleo. Las gramáticas visibles son solo las que identifican un género. Un género futuro aparece sin cambiar la UI.
- **No:** guion de exposición público (revisión 2026-11-21). El orden de la exposición vive en las notas privadas del autor; un documento público lo duplicaría.

---

## 10. Riesgos identificados

| Riesgo                                                         | Mitigación                                                                                                                                                                                                                             |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G0 con L1 congela la pantalla unos 250 ms                      | Aceptable para una demo. La vista Análisis pide el resultado sin traza y con 3 árboles, y muestra "analizando…" mientras la promesa no resuelve. Si molestara, se cambia la implementación del servicio (Worker) sin tocar las vistas. |
| El árbol de 200 hojas es muy ancho                             | Scroll horizontal y colapso de ε. El total y la derivación siguen visibles.                                                                                                                                                            |
| Las rutas de GitHub Pages rompen la carga de recursos          | `base` configurable por `VITE_BASE`. El criterio de aceptación verifica la URL publicada.                                                                                                                                              |
| Importar los `.grammar` con `?raw` desde el paquete del núcleo | Se resuelve en el paso 3 (ruta del workspace o un campo `exports` en `package.json` de `@sabueso/core`, sin cambiar su código). La prueba del paso 3 lo cubre.                                                                         |
| La UI consume tiempo del núcleo                                | Ya no aplica: el SPEC 02 está terminado.                                                                                                                                                                                               |

---

## Lo que **no** está en este spec

- Modo de español controlado (SPEC 04).
- Cambios en `@sabueso/core`.
- API web y Web Worker (la interfaz `AnalysisService` los deja listos).
- Router, i18n, backend y autenticación.
- Exportar e importar archivos.
- Drag & drop.
- Carga o edición de gramáticas.
- Diseño para móviles.
- Guion de exposición público.

Cada uno de esos puntos, si se hace, va en su propio spec.

## Mejoras posibles (v3, no planificadas)

Ideas registradas para después de terminar los SPEC 02, 03 y 04. No forman parte de este spec.

- **Panel de comparación de motores** (propuesto el 2026-11-20). En la vista de Análisis, una tabla con los tres reconocedores sobre la misma entrada: Earley, CYK y el autómata de pila, cada uno con su resultado, su tiempo y qué puede mostrar (Earley: diagnóstico y árboles del relato; CYK: árbol en FNC; autómata de pila: camino de aceptación y configuraciones exploradas), con un enlace a la pestaña de cada uno.
  - **Earley sigue siendo el motor que decide.** No es un selector de motor: los tres dan siempre la misma respuesta (lo garantizan las pruebas diferenciales del SPEC 02, paso 28), y cambiar a CYK o al autómata de pila solo haría perder el diagnóstico y los árboles del relato.
  - **Qué haría falta:** una operación más en `AnalysisService` que corra los tres y mida sus tiempos; el núcleo ya tiene todo (`runDifferential` lo hace sobre muchas cadenas).
