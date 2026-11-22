# 17 — La traza de Earley

> Archivos: `packages/core/src/earley/trace.ts`, la opción `trace` y `addAndTrace` en `packages/core/src/earley/recognizer.ts`, y el comando `packages/core/src/command-line/commands/trace.ts`.

## 1. Teoría

El chart ([guía 13](13-earley-items-y-conjuntos.md)) muestra **cómo quedó** cada conjunto al final. La **traza** muestra **en qué orden** pasaron las cosas: un evento por cada ítem que se agrega, con la operación que lo agregó ([guía 14](14-reconocedor-de-earley.md)) y por qué. Es la película del algoritmo.

Un llamado a `addItem` es un evento si cambia el chart:

| Qué pasó                                                      | ¿Es un evento?                                      |
| ------------------------------------------------------------- | --------------------------------------------------- |
| el ítem es **nuevo**                                          | **sí** (`isNew: true`)                              |
| el ítem ya estaba, pero llega con un **enlace** (otro camino) | **sí** (`isNew: false`): es la ambigüedad en acción |
| el ítem ya estaba y no trae enlace (una predicción repetida)  | **no**: no cambió nada                              |

El ítem de arranque (`$S → • S, 0`) no es un evento: está en S0 antes de empezar.

### Ejemplo

G1, `CRI PIS REV`, los primeros eventos de S1 (los de S0 son 7 predicciones):

| Evento | Conjunto | Operación | Ítem agregado                 | Causa                        | En palabras                                     |
| ------ | -------- | --------- | ----------------------------- | ---------------------------- | ----------------------------------------------- |
| #8     | S1       | SCANNER   | Hecho → CRI • HallazgoOpc, 0  | token 0 CRI                  | se leyó CRI                                     |
| #9     | S1       | PREDICTOR | HallazgoOpc → • HAL, 1        | Hecho → CRI • HallazgoOpc, 0 | ¿viene el hallazgo?                             |
| #10    | S1       | PREDICTOR | HallazgoOpc → •, 1            | Hecho → CRI • HallazgoOpc, 0 | …o no hay hallazgo                              |
| #11    | S1       | NULLABLE  | Hecho → CRI HallazgoOpc •, 0  | HallazgoOpc ⇒\* ε            | el arreglo de ε: el Hecho puede estar terminado |
| #12    | S1       | COMPLETER | Planteo → Hecho • MarcoOpc, 0 | Hecho → CRI HallazgoOpc •, 0 | el Hecho terminó: avanza el Planteo             |

En total son 53 eventos, y el último es `#53 S3 COMPLETER $S → Relato •, 0`: el relato es válido.

## 2. Por qué así

- **Para qué sirve:** es la base del reproductor "Earley paso a paso" de la web (cada evento es un cuadro de la animación) y permite explicar el algoritmo con un relato real. Es lo mismo que [`docs/interactive/earley-g0.html`](../interactive/earley-g0.html), pero generado por el motor para cualquier gramática y relato.
- **Un evento por ítem agregado, no por ítem procesado:** lo que se ve cambiar en el chart es que aparecen ítems. Así la animación no tiene cuadros vacíos.
- **Los caminos repetidos sí son eventos:** en G0 muestran la ambigüedad mientras ocurre.
- **La causa se guarda como texto en el evento:** la traza es para mostrar, no para calcular. Los enlaces de cada ítem siguen siendo la estructura para reconstruir árboles.
- **Un registro aparte (`TraceRecorder`):** el reconocedor no cambia su lógica; solo avisa al registro, si existe.
- **Sin costo cuando no se pide:** sin la opción `trace`, no se crea el registro ni se arma ningún texto; el costo es una comparación por ítem.

## 3. El código, función por función

### 3.1 `TraceEvent` y `TraceRecorder` (`earley/trace.ts`)

| Campo   | Qué es                                          | Ejemplo                          |
| ------- | ----------------------------------------------- | -------------------------------- |
| `set`   | el conjunto donde se agregó el ítem             | `1`                              |
| `op`    | la operación                                    | `'scan'`                         |
| `item`  | el ítem agregado                                | `'Hecho → CRI • HallazgoOpc, 0'` |
| `cause` | por qué (texto)                                 | `'token 0 CRI'`                  |
| `isNew` | si es nuevo o un camino más a uno que ya estaba | `true`                           |

```ts
export class TraceRecorder {
  readonly events: TraceEvent[] = [];

  record(event: TraceEvent): void {
    this.events.push(event);
  }
}
```

Una lista donde se agregan los eventos en el orden en que el reconocedor los reporta. Toda la lógica de qué es un evento está en el reconocedor.

### 3.2 La opción en `recognize`

```ts
recorder: options.trace === true ? new TraceRecorder() : undefined,
```

- El registro se crea solo si se pidió la traza. Si no, queda `undefined` en el contexto.
- Al final, `trace: context.recorder?.events ?? []`: los eventos, o una lista vacía. `parse` ([guía 22](22-api-publica.md)) pasa esta opción y devuelve la traza a la web.

### 3.3 `addAndTrace({ context, set, production, dot, origin, link, op, cause })`

```ts
const { item, isNew } = addItem({ set, production, dot, origin, link });
if (context.recorder !== undefined && (isNew || link !== undefined)) {
  context.recorder.record({
    set: set.index,
    op,
    item: label(item),
    cause: describeCause(cause),
    isNew,
  });
}
```

- Las tres operaciones ya no llaman a `addItem` directamente: llaman a `addAndTrace`, que agrega igual y además avisa al registro.
- **`context.recorder !== undefined`:** sin traza, termina acá. No se arma ningún texto.
- **`isNew || link !== undefined`:** se registra si el ítem es nuevo o si llegó con un enlace (otro camino). Una predicción repetida no cambia nada y no se registra.
- **`cause` es un dato** (`TraceCause`), no un texto: `describeCause(cause)` lo convierte en texto solo si hay que registrar. Sin traza, nunca se construye el texto de la causa.
- `label(item)` escribe el ítem como `Hecho → CRI • HallazgoOpc, 0`.

### 3.4 `TraceCause` y `describeCause` (`trace.ts`)

```ts
type TraceCause =
  | { kind: 'item'; item: EarleyItem } // predict and complete
  | { kind: 'token'; tokenIndex: number; terminal: SymbolName } // scan
  | { kind: 'nullable'; symbol: SymbolName }; // the ε advance
```

| Operación | Causa que pasa a `addAndTrace`                 | Texto en la traza (`describeCause`) |
| --------- | ---------------------------------------------- | ----------------------------------- |
| Predictor | `{ kind: 'item', item }` (el ítem que predijo) | `Relato → • Planteo …, 0`           |
| avance ε  | `{ kind: 'nullable', symbol }`                 | `MarcoOpc ⇒* ε`                     |
| Scanner   | `{ kind: 'token', tokenIndex, terminal }`      | `token 0 CRI`                       |
| Completer | `{ kind: 'item', item }` (el ítem completado)  | `Hecho → CRI •, 0`                  |

`describeCause` es un `switch` sobre `kind`. TypeScript sabe qué campos hay en cada caso, porque `kind` distingue las tres formas (una unión discriminada, como `ParseResult` en la guía 22).

### 3.5 El comando `trace`

- Lee la gramática y el relato, verifica Σ y corre `recognize` con `{ trace: true }`.
- Imprime cuántos eventos hubo y una tabla: número, conjunto, operación (`PREDICTOR`, `SCANNER`, `COMPLETER`, `NULLABLE`), ítem y causa. Un evento con `isNew: false` se marca `(again: one more link)`.
- Termina con `ACCEPTED` (código 0) o `REJECTED` (código 1). Un símbolo fuera de Σ se rechaza antes de correr; para ver dónde y por qué falla un relato, se usa `earley` ([guía 16](16-diagnostico-de-errores.md)).

## 4. Consola y pruebas

```sh
npm run sabueso -- trace --grammar g1 "CRI PIS REV"
npm run sabueso -- trace --grammar g0 "CRI SOS PIS INT REV"    # con eventos "again": la ambigüedad
```

```text
#8   S1  SCANNER    Hecho → CRI • HallazgoOpc, 0     ← token 0 CRI
#11  S1  NULLABLE   Hecho → CRI HallazgoOpc •, 0     ← HallazgoOpc ⇒* ε
#12  S1  COMPLETER  Planteo → Hecho • MarcoOpc, 0    ← Hecho → CRI HallazgoOpc •, 0
```

**`packages/core/test/earley/trace.test.ts`:**

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

**`packages/core/test/command-line/trace.test.ts`:** los eventos numerados de G1 (#1, #8 y #11 exactos), los "again" de G0, un rechazo con código 1, un símbolo fuera de Σ y los errores de uso.

## 5. Referencias

- Earley, J., "An efficient context-free parsing algorithm", _Communications of the ACM_ 13(2), 1970.
- SPEC 02 (paso 17) y SPEC 03 (el reproductor de la web).
