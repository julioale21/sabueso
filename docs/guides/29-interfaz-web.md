# Guía de estudio: 29 — La interfaz web

> **SPEC 03 (pasos 1 a 18) y SPEC 06.** Archivos: `apps/web/src/` (vistas en `views/`, servicio en `analysis/`, estado en `state/`, dibujo del árbol en `tree-layout/` y `components/tree-view/`).
> Fichas teóricas relacionadas: todas las del núcleo. Cada vista muestra conceptos que ya tienen ficha (la tabla de la sección 4 dice cuáles).

---

## 1. El problema que resuelve

El núcleo responde todo por consola, pero en texto. La web muestra **lo mismo de forma visual**: el árbol dibujado, los conjuntos de Earley llenándose, la tabla CYK por largos, la pila del autómata. Sirve para explicar los conceptos en la exposición y para que la cátedra pruebe el proyecto sin instalar nada: está publicada en `https://julioale21.github.io/sabueso/`.

La regla del proyecto es que **la web no calcula nada**. Cada vista le pide el resultado al núcleo y lo dibuja. No hay ningún algoritmo de la materia en `apps/web`: el último que había (los ítems abiertos del diagnóstico) pasó al núcleo en el SPEC 05.

---

## 2. Por qué así

- **Una sola puerta al núcleo: `AnalysisService`** (`src/analysis/service.ts`). Las vistas no importan el núcleo para calcular: le piden cada cosa al servicio, pasando el **nombre** de la gramática (`'detective/g1'`), nunca una gramática. Así no hay forma de analizar algo que no sea del catálogo.
- **El servicio es asíncrono aunque el núcleo responda al instante.** Hoy lo implementa `local-service.ts`, que corre el núcleo en el navegador. Mañana podría ser una API web o un Worker sin tocar ninguna vista.
- **Sin Worker:** el análisis más pesado (G0 con L1) tarda unos 250 ms, así que alcanza con el hilo principal.
- **React y Tailwind, sin librerías de componentes:** las primitivas (`Button`, `Panel`, `Tabs`…) están en `components/ui/`. En producción la web depende solo de React y del núcleo.
- **Alternativas descartadas:** guardar el estado en `localStorage` (no suma ningún concepto y confunde en la exposición), dibujar el árbol con una librería de layout (agrega una dependencia y no muestra teoría).

---

## 3. Cómo se usa en el programa

| Pieza             | Archivo                                          | Qué hace                                                                                                   |
| ----------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| La página         | `src/App.tsx`                                    | crea el servicio una vez, guarda el estado de la página y el último análisis, y arma las pestañas          |
| El estado         | `src/state/app-state.ts`                         | un `useReducer`: la pestaña, la gramática, el relato escrito, el relato analizado y opciones del resultado |
| El servicio       | `src/analysis/local-service.ts`                  | cada método es una sola llamada a la API pública del núcleo                                                |
| La carga de datos | `src/analysis/use-service-result.ts`             | pide algo al servicio cuando cambian sus entradas y descarta respuestas viejas                             |
| Las vistas        | `src/views/`                                     | una por pestaña; cada una pide su dato y lo dibuja con componentes chicos                                  |
| El árbol          | `src/tree-layout/` y `src/components/tree-view/` | calcula dónde va cada nodo y lo dibuja en SVG                                                              |

**Dos grupos de vistas.** Las vistas "sobre el relato" (Análisis, Earley paso a paso, FNC y CYK, Autómata de pila) usan el **último relato analizado** y están bloqueadas hasta que aprietas Analizar. Las vistas "sobre la gramática" (LL(1), G0 vs G1) no dependen del relato y siempre están abiertas.

---

## 4. Qué muestra cada vista

| Vista              | Qué muestra                                                                    | Método del servicio    | Función del núcleo                                    | Fichas      |
| ------------------ | ------------------------------------------------------------------------------ | ---------------------- | ----------------------------------------------------- | ----------- |
| Análisis           | veredicto, árboles, derivación, diagnóstico y los ítems abiertos de un rechazo | `analyze`              | `parse`, `leftmostDerivation`                         | 01, 17 a 21 |
| Earley paso a paso | los conjuntos S0 … Sn llenándose evento por evento                             | `trace`                | `parse` con `trace: true`                             | 11 a 16     |
| FNC y CYK          | los 6 pasos de la FNC, la tabla por largos y los dos árboles                   | `normalFormAndCyk`     | `toChomskyNormalForm`, `recognizeCockeYoungerKasami`  | 22, 23      |
| Autómata de pila   | el autómata y el camino de aceptación con la pila animada                      | `pushdown`             | `buildPushdownAutomaton`, `simulatePushdownAutomaton` | 24          |
| LL(1)              | FIRST, FOLLOW y la tabla predictiva con sus conflictos                         | (viene con `grammars`) | `analyzeGrammar`                                      | 05, 06      |
| G0 vs G1           | el testigo de ambigüedad y los relatos que genera una sola                     | `ambiguity`, `compare` | `findAmbiguityWitness`, `compareLanguages`            | 21, 25      |

---

## 5. El código que importa

### 5.1 `analyze` en el servicio (`src/analysis/local-service.ts`)

```ts
analyze: (id, input) =>
  later(() => {
    const result = parse({ grammar: grammarOf(id), input, options: { maxTrees: TREES_TO_SHOW } });
    return {
      ...result,
      derivations: result.accepted ? result.trees.map(leftmostDerivation) : [],
    };
  }),
```

- `parse()` es la misma función que usa el comando `parse` de la consola. Adentro pasa todo: tokenizar, Earley, diagnóstico, árboles, conteo y derivación.
- `maxTrees: 3`: se arman los primeros 3 árboles; el total se cuenta sin armarlos.
- `derivations` agrega la derivación de cada árbol armado, para poder recorrerlos.
- `later()` corre el trabajo después de la tarea actual y lo devuelve como promesa: responde como respondería un servicio remoto.

### 5.2 `useServiceResult` (`src/analysis/use-service-result.ts`)

```ts
export function useServiceResult<T>(load: () => Promise<T> | null, deps: DependencyList): T | null {
  const [result, setResult] = useState<T | null>(null);
  useEffect(() => {
    const request = load();
    if (request === null) {
      return undefined;
    }
    let current = true;
    void request.then((answer) => {
      if (current) {
        setResult(answer);
      }
    });
    return () => {
      current = false;
    };
  }, deps);
  return result;
}
```

- Cada vista lo usa en una línea: `useServiceResult(() => service.trace(grammarId, input), [service, grammarId, input])`.
- **Mientras espera devuelve `null`**, y la vista muestra "Preparando…".
- **Si cambian las entradas antes de que llegue la respuesta,** la limpieza del efecto anterior pone `current` en `false`, y esa respuesta vieja se descarta. Así nunca aparece tarde el resultado de un relato anterior.
- Si `load` devuelve `null`, no pide nada (por ejemplo, un relato demasiado largo para el reproductor).

### 5.3 El análisis vive en la página (`src/App.tsx` y `src/views/AnalysisView.tsx`)

- `App` llama a `useAnalyze` una sola vez y le pasa el resultado a las vistas. Así, si vas a otra pestaña y vuelves, el resultado sigue ahí, sin volver a analizar.
- Lo que dispara un análisis es un efecto que depende de la gramática, del relato analizado y de un contador, `analysisRequest`, que sube cada vez que aprietas Analizar. Por eso analizar dos veces el mismo relato vuelve a analizar, y cambiar la gramática también.
- `AnalysisView` recuerda el `runCount` que vio al montarse. Solo un resultado **nuevo** (con un `runCount` mayor) se anima, baja la página y arma el árbol solo. Al volver a la pestaña, el resultado se muestra quieto.

### 5.4 Dónde va cada nodo del árbol (`src/tree-layout/layout.ts`)

`layoutTree({ tree, collapseEpsilon })` recorre el árbol una vez, en **postorden** (primero los hijos), y arma una grilla de columnas y filas:

- **cada hoja** (una etiqueta o ε) ocupa **su propia columna**, de izquierda a derecha;
- **cada nodo interno** va **centrado** sobre su primer y su último hijo: su columna es el promedio de las de ellos. Por eso se recorre en postorden: cuando se ubica el padre, sus hijos ya tienen columna;
- **la fila es la profundidad**: la raíz en la 0, sus hijos en la 1.

Así ningún nodo choca con otro: cada hoja tiene una columna propia, y un padre siempre cae entre sus hijos. En el mismo recorrido, cada nodo interno guarda su **número de expansión en preorden**, que es el orden de la derivación más a la izquierda (ficha 20): por eso elegir el paso k de la derivación resalta el nodo de la expansión k − 1.

Con "Colapsar ε", un subárbol que solo deriva ε se dibuja como un solo nodo punteado que ocupa una columna, y guarda el rango de expansiones que esconde.

### 5.5 De la grilla a píxeles (`src/tree-layout/geometry.ts`)

| Constante          | Valor  | Para qué                               |
| ------------------ | ------ | -------------------------------------- |
| `COLUMN_WIDTH`     | 116 px | la distancia entre dos columnas        |
| `ROW_HEIGHT`       | 64 px  | la distancia entre dos niveles         |
| `MARGIN`           | 24 px  | el borde alrededor del dibujo          |
| `NODE_HALF_HEIGHT` | 11 px  | media altura de la pastilla de un nodo |

- `toPixels({ x, y })` da el centro de un nodo: `24 + x·116 + 58` a lo ancho (58 es media columna) y `24 + y·64` a lo alto.
- `pillWidth(label)` estima el ancho de la pastilla: unos 7 px por letra más 18, con un mínimo de 36.
- `TreeEdge` traza una línea recta del borde inferior del padre al borde superior del hijo; `TreeNode` dibuja la pastilla con su texto.

### 5.6 El árbol que se arma con la derivación (`visibleAtStep`)

En el paso k se dibujan la raíz y los hijos de cada nodo cuya expansión es menor que k. Como las expansiones están en preorden, el árbol crece en el mismo orden en que la derivación más a la izquierda lo expande. El reproductor (`player/use-player.ts`) es el mismo de Earley paso a paso, la tabla CYK y la pila del autómata.

---

## 6. Ejemplo recorrido a mano

`CRI PIS REV` con G1, en la vista Análisis:

| Momento                          | Qué pasa                                                                          | Dónde                          |
| -------------------------------- | --------------------------------------------------------------------------------- | ------------------------------ |
| Aprietas Analizar                | la acción `'analyze'` guarda el relato analizado y sube `analysisRequest`         | `app-state.ts`                 |
| El efecto de la página reacciona | llama a `analyze('detective/g1', 'CRI PIS REV')`                                  | `App.tsx`, `use-analyze.ts`    |
| 400 ms de "Analizando…"          | espera la respuesta del núcleo y una pausa mínima, para que se note que pasó algo | `use-analyze.ts`               |
| Llega el resultado               | aceptado, 1 árbol, una derivación de 14 pasos                                     | `local-service.ts` → `parse()` |
| Se dibuja el árbol               | 9 hojas, 9 columnas y 5 filas; se arma solo, paso a paso                          | `layout.ts`, `TreeView`        |

---

## 7. Consola y pruebas

- **En local:** `npm run dev -w @sabueso/web`. **En línea:** `https://julioale21.github.io/sabueso/`, que se publica sola en cada push a `main` (workflow `.github/workflows/deploy-pages.yml`).
- **Pruebas** (`apps/web/test/`, con Vitest y Testing Library): `App.test.tsx` recorre la vista Análisis de punta a punta con el núcleo real (A1 con G0 y G1, I1 con sus ítems abiertos, el relato vacío, Limpiar, Reiniciar, volver a la pestaña); hay una prueba por vista (`EarleyPlayerView`, `CnfCykView`, `PdaView`, `Ll1View`, `CompareView`), y pruebas del estado, del servicio, del layout del árbol, del hook `useServiceResult` y de los textos de `domain/`.
- **Verificación a mano:** `docs/web-manual-check.md`, una lista de casos para recorrer en el sitio publicado.

---

## 8. Preguntas probables en la defensa

**¿La web vuelve a implementar los algoritmos?**
No. Cada vista le pide el resultado al núcleo a través de `AnalysisService` y lo dibuja. Los mismos números que da la consola son los que muestra la web.

**¿Por qué el servicio es asíncrono si el núcleo responde al instante?**
Para poder cambiar dónde corre el núcleo (una API web, un Worker) sin tocar las vistas: ya esperan una promesa.

**¿Cómo decide dónde dibujar cada nodo del árbol?**
Cada hoja ocupa su propia columna, de izquierda a derecha; cada padre va centrado sobre su primer y su último hijo; la fila es la profundidad. Después se multiplica por un ancho de columna (116 px) y un alto de fila (64 px).

**¿Por qué el árbol se arma en ese orden?**
Porque cada nodo guarda su número de expansión en preorden, que es el orden de la derivación más a la izquierda. En el paso k aparecen los hijos de las expansiones anteriores a k.

**¿Por qué las vistas del relato están bloqueadas al principio?**
Porque muestran el último relato analizado. Hasta que no aprietas Analizar, no hay ninguno. Las de la gramática (LL(1), G0 vs G1) no dependen del relato y siempre están abiertas.
