# Guía de estudio: 26 — Autómata de pila

> **Paso 26 del SPEC 02.** Archivos: `packages/core/src/pushdown-automaton/build.ts`, `simulate.ts` y el comando `packages/core/src/command-line/commands/pushdown-automaton.ts`.
> Ficha teórica relacionada: [`docs/concepts/24-pushdown-automaton.md`](../concepts/24-pushdown-automaton.md). Página interactiva: [`docs/interactive/pushdown-automaton-g1.html`](../interactive/pushdown-automaton-g1.html).

---

## 1. El problema que resuelve

La teoría dice que las gramáticas libres de contexto y los autómatas de pila reconocen **los mismos lenguajes** (tipo 2 de Chomsky). Este paso lo muestra en código:

- **construye** el autómata de pila de cualquier gramática (Hopcroft 6.3.1);
- lo **ejecuta** sobre un relato, aunque sea no determinista;
- muestra el **camino de aceptación** como una tabla de descripciones instantáneas, y verifica que sus expansiones son exactamente la **derivación más a la izquierda**.

Además es un tercer reconocedor, independiente de Earley y de CYK: el paso 28 compara los tres.

---

## 2. Por qué así

- **Un solo estado, como en Hopcroft 6.3.1:** toda la información está en la pila, que guarda **lo que falta derivar**. Con un estado alcanza para cualquier GLC.
- **Aceptación por pila vacía:** es la que da la construcción directa. La otra (por estado final) es equivalente, pero necesita estados extra.
- **Búsqueda en anchura (BFS) en lugar de adivinar:** el autómata es no determinista (con `Planteo` en el tope puede usar dos producciones). La simulación mantiene **todas** las ramas en una cola y avanza por niveles. Así encuentra el camino de aceptación más corto.
- **Tres cosas hacen que termine:**
  - **visitados:** la misma configuración (posición, pila) no se explora dos veces. Corta los ciclos A ⇒+ A;
  - **poda por minYield (paso 8):** si la pila necesita más etiquetas que las que quedan, esa rama no puede aceptar. Corta la recursión a izquierda (`E → E + T` mete un `+` en la pila cada vez);
  - **límite de pasos** (`maxSteps`, 200 000 por defecto): una pila que crece sin necesitar etiquetas (S → S B con B ⇒ ε) no se repite ni se poda; ahí la búsqueda se detiene y responde `'undetermined'`, en lugar de colgarse.
- **El autómata es un dato** (`PushdownAutomaton`), separado de la simulación: el comando lo imprime con `--transitions`, y la web lo puede dibujar.

---

## 3. Cómo se usa en el programa

| Quién                           | Llama a                                                | Recibe                                          |
| ------------------------------- | ------------------------------------------------------ | ----------------------------------------------- |
| comando `pushdown-automaton`    | `buildPushdownAutomaton` y `simulatePushdownAutomaton` | δ, el resultado y el camino de aceptación       |
| pruebas diferenciales (paso 28) | `simulatePushdownAutomaton`                            | la aceptación, para compararla con Earley y CYK |
| web (SPEC 03)                   | la API pública                                         | el panel "traza del AP"                         |

---

## 4. Cómo funciona

**La construcción.** P = ({q}, Σ, N ∪ Σ, δ, q, S), con dos tipos de transición:

| Tipo          | Transición                         | Qué hace                                                         | En G1 |
| ------------- | ---------------------------------- | ---------------------------------------------------------------- | ----- |
| **Expandir**  | δ(q, ε, A) ∋ (q, β) por cada A → β | con A en el tope, lo reemplaza por β, sin leer entrada           | 40    |
| **Emparejar** | δ(q, a, a) = {(q, ε)} por cada a   | con el terminal a en el tope y a en la entrada, lo saca y avanza | 14    |

**La simulación.** Una descripción instantánea (ID) es (posición, pila). Se empieza en (0, S) y se acepta al llegar a (n, ε): se leyó todo y la pila está vacía.

1. Se saca la primera ID de la cola.
2. Si es (n, ε), **acepta**, y el camino se reconstruye siguiendo los enlaces al padre.
3. Si no, se generan sus sucesoras: una por cada producción del tope (si es no terminal), o una sola si el tope es el terminal que sigue en la entrada.
4. Cada sucesora entra a la cola si no fue visitada y si su pila no necesita más etiquetas que las que quedan.
5. Si la cola se vacía, **rechaza**. Si se llega a `maxSteps`, **no se sabe** (`undetermined`).

**Con `CRI PIS REV` y G1** la búsqueda explora 23 configuraciones y encuentra un camino de 17 transiciones: 14 expansiones y 3 emparejamientos (la tabla completa está en la ficha 24 y en la sección 6). Con `CRI REV` no explora nada: `Relato` necesita al menos 3 etiquetas (minYield) y quedan 2, así que todas las sucesoras se podan.

---

## 5. El código, función por función

### 5.1 `buildPushdownAutomaton(grammar)` (`build.ts`)

```ts
const expansions: PushdownTransition[] = grammar.productions.map((production) => ({
  kind: 'expand',
  top: production.leftSide,
  push: [...production.rightSide],
  production,
}));
const matches: PushdownTransition[] = [...grammar.terminals].map((terminal) => ({
  kind: 'match',
  terminal,
}));
return {
  state: 'q',
  inputAlphabet: new Set(grammar.terminals),
  stackAlphabet: new Set([...grammar.nonterminals, ...grammar.terminals]),
  startStack: grammar.start,
  transitions: [...expansions, ...matches],
};
```

- **`expansions`:** una transición por producción. `top` es el lado izquierdo, `push` el lado derecho (lo que queda en el tope, en orden), y `production` se guarda para mostrar su número y para comparar con la derivación.
- **`matches`:** una por terminal.
- **`stackAlphabet`:** Γ = N ∪ Σ. **`startStack`:** la pila empieza con S sola.

### 5.2 `simulatePushdownAutomaton({ grammar, tokens, maxSteps })` (`simulate.ts`)

```ts
const automaton = buildPushdownAutomaton(grammar);
const minYield = computeMinYield(grammar);
const start: SearchNode = {
  id: { position: 0, stack: [automaton.startStack] },
  via: null,
  parent: null,
};
const queue: SearchNode[] = [start];
const visited = new Set([configurationKey(start.id)]);
let steps = 0;
for (let next = 0; next < queue.length; next++) {
  if (steps >= maxSteps) {
    return { result: 'undetermined', steps, acceptingPath: null };
  }
  const node = queue[next];
  // …
  steps++;
  if (node.id.stack.length === 0 && node.id.position === tokens.length) {
    return { result: 'accept', steps, acceptingPath: pathTo(node) };
  }
  for (const successor of successors({ node, transitions: automaton.transitions, tokens })) {
    const key = configurationKey(successor.id);
    const remaining = tokens.length - successor.id.position;
    if (
      !visited.has(key) &&
      minYieldOfSequence({ symbols: successor.id.stack, minYield }) <= remaining
    ) {
      visited.add(key);
      queue.push(successor);
    }
  }
}
return { result: 'reject', steps, acceptingPath: null };
```

- **La cola es un array con un índice (`next`):** se agrega al final y se lee en orden, sin sacar elementos. Eso es BFS.
- **`SearchNode`:** la ID, la transición que la produjo (`via`) y un enlace a la ID anterior (`parent`), para reconstruir el camino.
- **`steps`:** cuántas configuraciones se sacaron de la cola. Es lo que la consola informa como "configurations explored".
- **Aceptación:** pila vacía **y** toda la entrada leída. Una pila vacía antes del final no acepta: esa rama no tiene sucesoras y muere sola.
- **El filtro antes de encolar:**
  - `configurationKey` es `'posición|pila'`; dos IDs con la misma clave son la misma configuración;
  - `minYieldOfSequence` suma el minYield de cada símbolo de la pila (un terminal cuenta 1). Si supera lo que falta leer, ninguna rama que salga de ahí puede aceptar. La función ya estaba lista desde el paso 8 para esto.
- **Los tres finales:** `accept` con su camino, `reject` si la cola se vació, `undetermined` si se llegó al límite.

### 5.3 `successors({ node, transitions, tokens })`

```ts
const [top, ...rest] = node.id.stack;
if (top === undefined) {
  return [];
}
return transitions
  .filter((transition) =>
    transition.kind === 'expand'
      ? transition.top === top
      : transition.terminal === top && tokens[node.id.position] === top,
  )
  .map((transition) => ({
    id:
      transition.kind === 'expand'
        ? { position: node.id.position, stack: [...transition.push, ...rest] }
        : { position: node.id.position + 1, stack: rest },
    via: transition,
    parent: node,
  }));
```

- **`[top, ...rest]`:** el tope es el índice 0; `rest` es lo que queda debajo.
- **Pila vacía:** no hay sucesoras.
- **`filter`:** las transiciones que se pueden usar ahora: una expansión cuyo `top` coincide, o el emparejamiento del terminal del tope si la entrada sigue con él.
- **`map`:**
  - **expandir:** la posición no cambia y el tope se reemplaza por `push` (`[...transition.push, ...rest]`). Una producción ε deja solo `rest`: saca el tope;
  - **emparejar:** avanza una posición y saca el tope.

### 5.4 `pathTo(node)`

Sigue los enlaces `parent` desde la ID final hasta la inicial y los pone en orden (`unshift`). El resultado es la lista de `PathStep`: cada ID con la transición que llevó a ella (`null` en la primera).

### 5.5 El comando `pushdown-automaton`

- Rechaza primero una etiqueta fuera de Σ, como los demás comandos.
- **`formatAutomaton`:** P = ({q}, Σ, Γ, δ, q, S) y los tamaños: en G1, |Σ| = 14, |Γ| = 35 y |δ| = 54 (40 expandir, 14 emparejar).
- **`--transitions` (`formatTransitions`):** δ, una línea por transición: `δ(q, ε, Relato) ∋ (q, Planteo Investigacion Desenlace)   (0)` o `δ(q, CRI, CRI) = {(q, ε)}`.
- **`formatResult`:** `ACCEPTED`, `REJECTED` o `UNDETERMINED`, con las configuraciones exploradas.
- **`formatPath`:** el camino como tabla: paso, entrada que falta, pila (tope a la izquierda) y transición (`expand (11) Hecho → CRI HallazgoOpc`, `match CRI`).
- Código de salida: 0 si acepta; 1 si rechaza, no se sabe o hay una etiqueta fuera de Σ; 2 si el uso es incorrecto.

---

## 6. Ejemplo recorrido a mano: el teorema en la tabla

```sh
npm run sabueso -- pushdown-automaton --grammar g1 "CRI PIS REV"
```

| Paso | Entrada que falta | Pila                                             | Transición                                            |
| ---- | ----------------- | ------------------------------------------------ | ----------------------------------------------------- |
| 0    | CRI PIS REV       | Relato                                           | inicio                                                |
| 1    | CRI PIS REV       | Planteo Investigacion Desenlace                  | expandir (0) Relato → Planteo Investigacion Desenlace |
| 2    | CRI PIS REV       | Hecho MarcoOpc Investigacion Desenlace           | expandir (1) Planteo → Hecho MarcoOpc                 |
| 3    | CRI PIS REV       | CRI HallazgoOpc MarcoOpc Investigacion Desenlace | expandir (11) Hecho → CRI HallazgoOpc                 |
| 4    | PIS REV           | HallazgoOpc MarcoOpc Investigacion Desenlace     | emparejar CRI                                         |
| …    | …                 | …                                                | …                                                     |
| 17   | ε                 | ε                                                | expandir (33) EpiOpc → ε: **pila vacía, acepta**      |

Es la misma tabla que la ficha 24 calculó a mano antes de que existiera el código; la prueba del paso la verifica fila por fila.

**Lo que muestra:**

- **Las expansiones, en orden, son la derivación más a la izquierda.** El tope de la pila es siempre el no terminal de más a la izquierda que falta derivar, así que expandirlo es un paso de derivación más a la izquierda. La prueba AP1 lo verifica con A1: las 18 expansiones coinciden, en orden, con las 18 producciones de la derivación de Earley.
- **Lo leído seguido de la pila es una forma sentencial** de esa derivación. En el paso 4: `CRI` + `HallazgoOpc MarcoOpc Investigacion Desenlace`. La prueba también lo verifica en cada fila.
- **Dónde está el no determinismo:** en el paso 1, `Planteo` tiene dos producciones. La rama `Marco Hecho` muere porque `Marco` no puede empezar con `CRI`. Como G1 es LL(1), el camino de aceptación es único; con G0 (ambigua) hay varios, y BFS devuelve el más corto.

**Earley como autómata de pila compartido:** un ítem A → α • β, j representa un pedazo de pila: "estoy derivando A, ya reconocí α desde la posición j, falta β". El AP explora sus pilas una por una (23 configuraciones para `CRI PIS REV`); Earley las comparte en el chart, y por eso es polinomial aunque la gramática sea ambigua.

---

## 7. Errores

- **Etiqueta fuera de Σ:** el comando rechaza sin correr el autómata (código 1).
- **`undetermined`:** no es un error, es una respuesta: la búsqueda se detuvo en el límite. Con las gramáticas del proyecto no pasa (las pruebas lo verifican); solo aparece con gramáticas como S → S B, B → ε.
- **Uso incorrecto:** código 2.

---

## 8. Consola y pruebas

```sh
npm run sabueso -- pushdown-automaton --grammar g1 "CRI PIS REV"
npm run sabueso -- pushdown-automaton --grammar g1 "CRI SOS PIS INT REV"
npm run sabueso -- pushdown-automaton --grammar parentheses --transitions "( ( ) ) ( )"
```

**`test/pushdown-automaton/pushdown-automaton.test.ts`:**

| Prueba                  | Qué verifica                                                                                         |
| ----------------------- | ---------------------------------------------------------------------------------------------------- |
| la construcción         | G1: 40 expandir y 14 emparejar, Γ = N ∪ Σ; `parentheses` transición por transición                   |
| P1                      | `( ( ) ) ( )` y la cadena vacía se aceptan con `parentheses` (lo pide el spec)                       |
| la tabla de la ficha 24 | `CRI PIS REV` con G1, ID por ID                                                                      |
| AP1                     | las 18 expansiones de A1 con G1 son su derivación más a la izquierda (lo pide el spec)               |
| formas sentenciales     | lo leído más la pila es una forma de la derivación, en cada ID                                       |
| rechazo y poda          | `CRI REV` se rechaza explorando 1 configuración; el lenguaje vacío rechaza                           |
| ciclos y límite         | `test-cyclic` termina; S → S B, B → ε da `undetermined` con `maxSteps`                               |
| AP y Earley             | aceptan las mismas cadenas cortas, sin `undetermined` (G0 y G1 hasta largo 3, `parentheses` hasta 6) |

**`test/command-line/pushdown-automaton.test.ts`:** el autómata, `ACCEPTED` y la tabla de `CRI PIS REV`; `--transitions`; el rechazo de `CRI REV`; una etiqueta fuera de Σ y los errores de uso.

---

## 9. Preguntas probables en la defensa

**¿Cómo se construye el autómata de pila de una gramática?**
Con un solo estado q y la pila empezando en S. Por cada producción A → β, una transición que con A en el tope lo reemplaza por β sin leer entrada (expandir). Por cada terminal a, una que con a en el tope y en la entrada lo saca (emparejar). Acepta por pila vacía.

**¿Por qué alcanza con un estado?**
Porque la pila guarda todo lo que falta derivar. El estado no tiene que recordar nada más.

**¿Cómo simulas un autómata no determinista?**
Con una búsqueda en anchura: en lugar de adivinar qué producción usar, guardo todas las ramas en una cola y las exploro por niveles. Si alguna llega a pila vacía con toda la entrada leída, acepta.

**¿Cómo sabes que la búsqueda termina?**
Por tres cosas: no repito configuraciones (corta los ciclos), descarto las pilas que necesitan más etiquetas de las que quedan (minYield; corta la recursión a izquierda) y pongo un límite de pasos. Si llega al límite respondo `undetermined`, no "rechaza". Con las gramáticas del proyecto nunca pasa.

**¿Qué relación hay entre el camino de aceptación y la derivación?**
Las expansiones del camino, en orden, son exactamente la derivación más a la izquierda, porque el tope de la pila es siempre el no terminal de más a la izquierda que falta derivar. La prueba lo verifica con A1 y G1: 18 expansiones contra 18 producciones.

**¿Qué tiene que ver con Earley?**
Earley es un autómata de pila que comparte las pilas: un ítem A → α • β, j es un pedazo de pila. El AP explora sus pilas por separado y puede crecer exponencialmente con una gramática ambigua; Earley las junta en el chart y es polinomial.
