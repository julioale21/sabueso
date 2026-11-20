# Guía de estudio: 17 — La traza de Earley

> **Paso 17 del SPEC 02.** Archivos: `packages/core/src/earley/trace.ts`, la opción `trace` y `addAndTrace` en `packages/core/src/earley/recognizer.ts`, y el comando `packages/core/src/command-line/commands/trace.ts`.
> Fichas relacionadas: [`12-earley-sets.md`](../concepts/12-earley-sets.md) (los conjuntos) y las de Predictor, Scanner y Completer (13 a 15).

---

## 1. El problema que resuelve

El chart (`--chart`) muestra **cómo quedó** cada conjunto al final. Pero no muestra **en qué orden** pasaron las cosas: qué operación agregó cada ítem, y en qué momento.

La **traza** es la película del algoritmo: una lista de eventos, uno por cada ítem que se agrega, en el orden en que ocurren, con la operación que lo agregó y por qué.

```text
#8   S1  SCANNER    Hecho → CRI • HallazgoOpc, 0     ← token 0 CRI
#11  S1  NULLABLE   Hecho → CRI HallazgoOpc •, 0     ← HallazgoOpc ⇒* ε
#12  S1  COMPLETER  Planteo → Hecho • MarcoOpc, 0    ← Hecho → CRI HallazgoOpc •, 0
```

**Para qué sirve:**

| Quién                | Para qué                                                                      |
| -------------------- | ----------------------------------------------------------------------------- |
| **la web (SPEC 03)** | el reproductor "Earley paso a paso": cada evento es un cuadro de la animación |
| la exposición        | explicar Predictor, Scanner y Completer con un relato real, evento por evento |
| depurar              | ver exactamente qué hizo el algoritmo, en orden                               |

Es lo mismo que la página `docs/interactive/earley-g0.html`, pero generado por el motor para cualquier gramática y relato.

---

## 2. Cómo funciona

### 2.1 Un evento por cada cosa que cambia el chart

Cada vez que una operación llama a `addItem`, pueden pasar tres cosas:

| Qué pasó                                                      | ¿Es un evento?                                      |
| ------------------------------------------------------------- | --------------------------------------------------- |
| el ítem es **nuevo**                                          | **sí** (`isNew: true`)                              |
| el ítem ya estaba, pero llega con un **enlace** (otro camino) | **sí** (`isNew: false`): es la ambigüedad en acción |
| el ítem ya estaba y no trae enlace (una predicción repetida)  | **no**: no cambió nada                              |

El ítem de arranque (`$S → • S, 0`) no es un evento: está en S0 antes de empezar.

### 2.2 Qué guarda cada evento

| Campo   | Qué es                                          | Ejemplo                          |
| ------- | ----------------------------------------------- | -------------------------------- |
| `set`   | el conjunto donde se agregó el ítem             | `1`                              |
| `op`    | la operación                                    | `'scan'`                         |
| `item`  | el ítem agregado                                | `'Hecho → CRI • HallazgoOpc, 0'` |
| `cause` | por qué                                         | depende de la operación (abajo)  |
| `isNew` | si es nuevo o un camino más a uno que ya estaba | `true`                           |

| Operación  | La causa es…                       | Ejemplo                         |
| ---------- | ---------------------------------- | ------------------------------- |
| `predict`  | el ítem que predijo                | `Planteo → • Hecho MarcoOpc, 0` |
| `scan`     | el token leído                     | `token 0 CRI`                   |
| `complete` | el ítem que se completó            | `Hecho → CRI HallazgoOpc •, 0`  |
| `nullable` | el símbolo que se salteó por vacío | `HallazgoOpc ⇒* ε`              |

### 2.3 Sin costo cuando no se pide

La traza se activa con `recognize(grammar, tokens, { trace: true })`. Sin la opción, el reconocedor no crea el registro ni arma ningún texto: el costo es el de una comparación por ítem.

---

## 3. Por qué así

- **Un evento por ítem agregado, no por ítem procesado:** lo que se ve cambiar en el chart es que aparecen ítems. Así cada evento es un cambio visible, y la animación de la web no tiene cuadros vacíos.
- **Los caminos repetidos sí son eventos:** en G0 muestran la ambigüedad mientras ocurre (un ítem que se alcanza por segunda vez).
- **La causa es texto:** la traza es para mostrar, no para calcular. Los enlaces de cada ítem (paso 13) siguen siendo la estructura para reconstruir árboles.
- **Un registro aparte (`TraceRecorder`):** el reconocedor no cambia su lógica; solo avisa al registro, si existe, cada vez que agrega algo.

---

## 4. Cómo se usa en el programa

| Quién                     | Usa                                 | Para qué                       |
| ------------------------- | ----------------------------------- | ------------------------------ |
| comando `trace` (paso 17) | `recognize(…, { trace: true })`     | imprimir los eventos numerados |
| `parse` (paso 22)         | la opción `trace` de `ParseOptions` | devolver la traza a la web     |
| web (SPEC 03)             | `parse(…, { trace: true })`         | el reproductor paso a paso     |

`recognize` devuelve `trace: TraceEvent[]`: los eventos, o una lista vacía si no se pidió.

---

## 5. El código, función por función

### 5.1 `TraceEvent` y `TraceRecorder` (`earley/trace.ts`)

```ts
export class TraceRecorder {
  readonly events: TraceEvent[] = [];

  record(event: TraceEvent): void {
    this.events.push(event);
  }
}
```

Una lista donde se van agregando los eventos en el orden en que el reconocedor los reporta. Nada más: toda la lógica de qué es un evento está en el reconocedor.

### 5.2 La opción en `recognize`

```ts
recorder: options.trace === true ? new TraceRecorder() : undefined,
```

- El registro se crea solo si se pidió la traza. Si no, queda `undefined` en el contexto.
- Al final, `trace: context.recorder?.events ?? []`: los eventos, o una lista vacía.

### 5.3 `addAndTrace(context, set, production, dot, origin, link, op, cause)`

```ts
const { item, isNew } = addItem(set, production, dot, origin, link);
if (context.recorder !== undefined && (isNew || link !== undefined)) {
  context.recorder.record({ set: set.index, op, item: label(item), cause: cause(), isNew });
}
```

- Las tres operaciones ya no llaman a `addItem` directamente: llaman a `addAndTrace`, que agrega igual y además avisa al registro.
- **`context.recorder !== undefined`:** sin traza, termina acá. No se arma ningún texto.
- **`isNew || link !== undefined`:** se registra si el ítem es nuevo o si llegó con un enlace (otro camino). Una predicción repetida (ítem que ya estaba, sin enlace) no cambia nada y no se registra.
- **`cause` es una función** (`() => string`), no un texto: solo se llama si hay que registrar. Así, sin traza, nunca se construye el texto de la causa (por ejemplo, `label(item)`, que arma una cadena).
- `label(item)` escribe el ítem como `Hecho → CRI • HallazgoOpc, 0`.

### 5.4 Las operaciones, con su causa

| Operación | Llamada                                                                                            |
| --------- | -------------------------------------------------------------------------------------------------- |
| Predictor | `addAndTrace(context, set, production, 0, item.setIndex, undefined, 'predict', () => label(item))` |
| avance ε  | `addAndTrace(…, link, 'nullable', () => \`${symbol} ⇒* ε\`)`                                       |
| Scanner   | `addAndTrace(…, link, 'scan', () => \`token ${tokenIndex} ${terminal}\`)`                          |
| Completer | `addAndTrace(…, link, 'complete', () => label(item))` (el ítem completado)                         |

### 5.5 El comando `trace`

- Lee la gramática y el relato, verifica Σ y corre `recognize` con `{ trace: true }`.
- Imprime cuántos eventos hubo y una tabla: número, conjunto, operación (`PREDICTOR`, `SCANNER`, `COMPLETER`, `NULLABLE`), ítem y causa. Un evento con `isNew: false` se marca `(again: one more link)`.
- Termina con `ACCEPTED` (código 0) o `REJECTED` (código 1).

---

## 6. Ejemplo recorrido a mano

G1, `CRI PIS REV`, los primeros eventos de S1 (los de S0 son 7 predicciones):

| Evento | Conjunto | Operación | Ítem agregado                 | Causa                        | En palabras                                     |
| ------ | -------- | --------- | ----------------------------- | ---------------------------- | ----------------------------------------------- |
| #8     | S1       | SCANNER   | Hecho → CRI • HallazgoOpc, 0  | token 0 CRI                  | se leyó CRI                                     |
| #9     | S1       | PREDICTOR | HallazgoOpc → • HAL, 1        | Hecho → CRI • HallazgoOpc, 0 | ¿viene el hallazgo?                             |
| #10    | S1       | PREDICTOR | HallazgoOpc → •, 1            | Hecho → CRI • HallazgoOpc, 0 | …o no hay hallazgo                              |
| #11    | S1       | NULLABLE  | Hecho → CRI HallazgoOpc •, 0  | HallazgoOpc ⇒\* ε            | el arreglo de ε: el Hecho puede estar terminado |
| #12    | S1       | COMPLETER | Planteo → Hecho • MarcoOpc, 0 | Hecho → CRI HallazgoOpc •, 0 | el Hecho terminó: avanza el Planteo             |

En total son 53 eventos, y el último es `#53 S3 COMPLETER $S → Relato •, 0`: el relato es válido.

---

## 7. Errores

No hay errores nuevos. El comando rechaza un símbolo fuera de Σ antes de correr, y termina con código 1 si el relato se rechaza (para ver dónde y por qué, `earley`).

---

## 8. Consola y pruebas

```sh
npm run sabueso -- trace --grammar g1 "CRI PIS REV"
npm run sabueso -- trace --grammar g0 "CRI SOS PIS INT REV"    # con eventos "again": la ambigüedad
```

**`test/earley/trace.test.ts`:**

| Prueba                  | Qué verifica                                                                 |
| ----------------------- | ---------------------------------------------------------------------------- |
| el primer evento        | es un `predict` en S0 (lo pide el spec)                                      |
| el último               | `$S → Relato •, 0` está en S3 y es el último evento (lo pide el spec)        |
| un evento por ítem      | los eventos nuevos son todos los ítems del chart menos el inicial            |
| las causas              | un `scan`, un `nullable` y un `complete` exactos                             |
| coherencia con el chart | cada evento nombra un ítem de su conjunto; los conjuntos nunca vuelven atrás |
| A1 con G1               | el último evento ocurre en S5 (el criterio del reproductor de la web)        |
| G0                      | hay eventos repetidos (`isNew: false`), todos de `complete` o `nullable`     |
| sin la opción           | la traza está vacía                                                          |

**`test/command-line/trace.test.ts`:** los eventos numerados de G1 (#1, #8 y #11 exactos), los "again" de G0, un rechazo con código 1, un símbolo fuera de Σ y los errores de uso.

---

## 9. Preguntas probables en la defensa

**¿Qué es la traza y para qué sirve?**
La lista de todo lo que hizo Earley, en orden: cada ítem agregado, con la operación que lo agregó y la causa. Es la base del reproductor paso a paso de la web, y sirve para explicar el algoritmo con un relato real.

**¿Qué diferencia hay con el chart?**
El chart es el resultado final: qué ítems hay en cada conjunto. La traza es cómo se llegó: en qué orden apareció cada uno y por qué.

**¿Qué es un evento "again"?**
Un ítem que ya estaba y se alcanzó por otro camino: se le agregó un enlace más. En G0 aparecen con relatos ambiguos como A1: es la ambigüedad mientras ocurre.

**¿Cuesta algo cuando no se pide?**
Prácticamente no: sin la opción no se crea el registro, y la causa se pasa como función, así que su texto nunca se construye.

**¿Por qué no hay un evento para el ítem inicial?**
Porque no lo agrega ninguna operación: está en S0 antes de empezar. Todos los eventos son obra del Predictor, el Scanner o el Completer (o del avance ε).
