# 15 — El arreglo de ε (Aycock y Horspool)

> Archivos: `packages/core/src/earley/recognizer.ts` (`predict`, `complete`, `isEmptySpan`, la opción `classicEpsilon`) y `packages/core/src/command-line/commands/earley.ts` (`--no-epsilon-fix`).

## 1. Teoría

El Earley clásico ([guía 14](14-reconocedor-de-earley.md)) **rechaza cadenas válidas** de algunas gramáticas con ε. G1 tiene 10 partes opcionales con una producción ε, así que necesita el arreglo.

- **El problema:** si un ítem (A → α • B β, j) aparece en Sk **después** de que (B → •, k) ya se completó en Sk, nunca avanza sobre B: el Completer de B ya corrió y no se repite. Solo pasa con símbolos **anulables** (B ⇒\* ε, [guía 07](07-simbolos-anulables.md)) reconocidos vacíos.
- **El arreglo (Aycock y Horspool):** en el Predictor, si B es anulable, además de predecir sus reglas se agrega (A → α B • β, j), con un enlace `nullable`. El avance lo hace el ítem que lo necesita, cuando lo necesita.
- **Regla del proyecto:** el Completer ignora los ítems completos vacíos (origen = conjunto actual), porque el Predictor ya hizo esos avances. Así cada avance tiene un solo enlace y no se cuentan árboles de más.
- Es correcto porque solo avanza sobre B si B ⇒\* ε de verdad.

### Ejemplo

`epsilon-trap`: `S → A A x`, `A → ε`, entrada `x` (válida: los dos A desaparecen). Conjunto S0:

| Ítem             | Clásico                                 | Con el arreglo                          |
| ---------------- | --------------------------------------- | --------------------------------------- |
| `$S → • S, 0`    | inicial                                 | inicial                                 |
| `S → • A A x, 0` | P                                       | P                                       |
| `A → •, 0`       | P; el Completer avanza `S → • A A x`    | P (ignorado por el Completer)           |
| `S → A • A x, 0` | C; predice A, que ya está: **se traba** | ε (avance del Predictor, A es anulable) |
| `S → A A • x, 0` | **nunca aparece**                       | ε: espera `x`                           |
| S1               | vacía: **rechaza**                      | `S → A A x •`: **acepta**               |

## 2. Por qué así

| Alternativa                                                                                         | Por qué no                                                                                   |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **Quitar las producciones ε** antes (como en la FNC, paso DEL, [guía 23](23-fnc-start-del-unit.md)) | cambia la gramática y sus árboles: los árboles dejarían de ser los del relato                |
| **Repetir el Completer** hasta que nada cambie (el arreglo original de Earley)                      | funciona, pero cuesta más y es más difícil de explicar                                       |
| **Aycock y Horspool**                                                                               | una línea en el Predictor y otra en el Completer; usa los anulables, que ya están calculados |

- Sin la regla del Completer, el mismo avance quedaría anotado **dos veces**: con enlace `nullable` (del Predictor) y con enlace `complete` (del Completer). El reconocimiento daría lo mismo, pero en la [guía 20](20-conteo-de-arboles.md) el mismo árbol se contaría dos veces.
- El modo clásico (`classicEpsilon: true`, `--no-epsilon-fix`) queda solo para enseñar el error.
- Los enlaces `nullable` los usa la [guía 18](18-arboles-epsilon.md) para reconstruir los subárboles ε.

## 3. El código, función por función

El bucle principal no cambia (guía 14). Cambian el Predictor y el Completer.

### 3.1 `RecognizerContext` y la opción `classicEpsilon`

```ts
export interface RecognizerContext {
  grammar: Grammar;
  chart: Chart;
  tokens: readonly SymbolName[];
  nullableSymbols: ReadonlySet<SymbolName>;
  classicEpsilon: boolean;
}
```

- Junta lo que las tres operaciones necesitan además del ítem. Con el arreglo hacen falta dos datos más (los anulables y el modo), y un objeto es más claro que seis parámetros sueltos.
- Los anulables se calculan una sola vez por reconocimiento, en `recognize`.

### 3.2 `recognize`: armar el contexto

```ts
const classicEpsilon = options.classicEpsilon ?? false;
const context: RecognizerContext = {
  grammar,
  chart,
  tokens,
  nullableSymbols: classicEpsilon ? new Set() : computeNullable(grammar),
  classicEpsilon,
};
```

- `options.classicEpsilon ?? false`: si no se pasa la opción, el arreglo está activo.
- **En modo clásico, `nullableSymbols` es un conjunto vacío.** Así el Predictor no avanza sobre ningún símbolo, sin un `if` aparte: el mismo código hace el algoritmo clásico.
- `computeNullable` es el de la guía 07. Fuera de esto, el bucle es el de la guía 14.

### 3.3 `predict({ context, item, symbol })`: el arreglo

```ts
for (const production of context.grammar.productionsByLeftSide.get(symbol) ?? []) {
  addItem({ set, production, dot: 0, origin: item.setIndex });
}
if (context.nullableSymbols.has(symbol)) {
  addItem({
    set,
    production: item.production,
    dot: item.dot + 1,
    origin: item.origin,
    link: {
      kind: 'nullable',
      predecessor: item,
      symbol,
    },
  });
}
```

- El `for` es el Predictor clásico: las reglas de B, con el punto al principio y origen en el conjunto actual.
- **El `if` es todo el arreglo.** Si B puede desaparecer, se agrega el **mismo** ítem que predijo (`item.production`), con el punto **un lugar adelante** (`item.dot + 1`, saltando B) y **su** origen (`item.origin`), en el **mismo** conjunto: no se leyó nada.
- El enlace `nullable` guarda el ítem de antes (`predecessor`) y qué símbolo se salteó (`symbol`). No apunta a ningún ítem hijo, porque B no se reconoció leyendo: se derivó a ε. Por eso la guía 18 genera esos subárboles desde la gramática.
- **El orden importa para el chart:** primero las reglas de B (en el orden del archivo) y **después** el avance. Es la convención que fija el SPEC 02 (sección 9.6) para que el chart sea reproducible.
- Si el ítem avanzado ya estaba, `addItem` no lo duplica: solo le suma el enlace (otro camino).

### 3.4 `complete({ context, item })`: ignorar lo vacío

```ts
if (!context.classicEpsilon && isEmptySpan(item)) {
  return;
}
```

- Lo único que cambia en el Completer: si el ítem completo es un B **vacío** (empezó y terminó en el mismo conjunto), no hace nada. El Predictor ya avanzó a todos los que lo esperaban.
- En modo clásico no se ignora nada: es el comportamiento de la guía 14, con su error.
- El resto de la función (volver al origen y avanzar a los que esperaban B) no cambia.

### 3.5 `isEmptySpan(item)`

```ts
return item.origin === item.setIndex;
```

- Un ítem completo con `origin === setIndex` reconoció un B entre la posición k y la misma posición k: no consumió ningún token, o sea, derivó ε.
- Se exporta porque el comando lo usa para marcar los ítems ignorados.

### 3.6 El comando `earley`: `--no-epsilon-fix` y la columna "How"

- `--no-epsilon-fix` pasa `classicEpsilon: true` e imprime una línea que lo avisa. Con esa opción el comando puede rechazar entradas válidas: es a propósito. Ninguna función nueva lanza errores.
- En `--chart`, `describeOrigin` agrega dos marcas:
  - **`ε`**: el ítem llegó por el avance sobre un anulable (enlace `nullable`);
  - **`P (ignored)`**: un ítem predicho que ya está completo y es vacío (`A → •` con origen k). El Completer lo ignora.

## 4. Consola y pruebas

```sh
npm run sabueso -- earley --grammar epsilon-trap "x"                           # ACCEPTED
npm run sabueso -- earley --grammar epsilon-trap --chart --no-epsilon-fix "x"  # REJECTED: falta S → A A • x
npm run sabueso -- earley --grammar g1 --chart "CRI PIS REV"                   # el chart de la sección 9.6 del SPEC 02
```

Con `--no-epsilon-fix`, S0 termina en `S → A • A x` (con `C from S0#2`) y S1 queda vacía. El chart de G1 con `CRI PIS REV` tiene 8, 19, 16 y 11 ítems, calculados a mano en el SPEC 02 y reproducidos exactamente. Su comienzo de S1 muestra el arreglo en G1:

| #   | Ítem                       | Origen | Cómo        | Qué pasó                                                     |
| --- | -------------------------- | ------ | ----------- | ------------------------------------------------------------ |
| 1   | Hecho → CRI • HallazgoOpc  | 0      | S from S0#5 | se leyó CRI                                                  |
| 2   | HallazgoOpc → • HAL        | 1      | P           | hace falta un HallazgoOpc: su primera regla                  |
| 3   | HallazgoOpc → •            | 1      | P (ignored) | `HallazgoOpc → ε`: ya está completa, el Completer la ignora  |
| 4   | Hecho → CRI HallazgoOpc •  | 0      | **ε**       | **el arreglo:** HallazgoOpc es anulable: "no hubo hallazgo"  |
| 5   | Planteo → Hecho • MarcoOpc | 0      | C from S0#3 | el Hecho terminó (ítem 4): sube y avanza el Planteo          |
| 6   | MarcoOpc → • Marco         | 1      | P           | hace falta un MarcoOpc                                       |
| 7   | MarcoOpc → •               | 1      | P (ignored) | `MarcoOpc → ε`, ignorada por el Completer                    |
| 8   | Planteo → Hecho MarcoOpc • | 0      | **ε**       | **el arreglo otra vez:** "no hubo marco"; el Planteo terminó |

Sin el arreglo, el ítem 4 habría llegado por el Completer del ítem 3 con un enlace `complete`. Con el arreglo llega por el Predictor, con un enlace `ε`, y el ítem 3 se ignora: **un solo camino, un solo enlace**.

**`packages/core/test/earley/recognizer.test.ts`:**

| Prueba                         | Qué verifica                                                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `epsilon-trap`                 | acepta `x`; con `classicEpsilon` lo rechaza                                                                                     |
| el ítem que faltaba            | `S → A A • x` aparece con un enlace `nullable` del símbolo A, y en modo clásico no                                              |
| `parentheses`                  | acepta la entrada vacía y `( ( ) ) ( )`                                                                                         |
| G1, tabla 9.1                  | V1, V2, V3, A1 y M1 aceptadas; I1 a I5 e I7 rechazadas (I5 e I7 sí las acepta G0: L(G1) ⊊ L(G0)); L1 aceptado                   |
| **el chart de la sección 9.6** | 8, 19, 16 y 11 ítems, y los 54 ítems con su regla, origen y forma de llegar, en orden (`test/fixtures/g1-chart-cri-pis-rev.ts`) |
| enlaces no repetidos           | en seis corridas de G0, G1, `parentheses` y `epsilon-trap`, ningún ítem tiene dos veces el mismo par (predecesor, causa)        |

**`packages/core/test/command-line/earley.test.ts`:** las filas de `--chart` con G1 coinciden con las 54 del spec; `epsilon-trap` acepta; con `--no-epsilon-fix` rechaza y falta `S → A A • x`.

## 5. Referencias

- Aycock, J. y Horspool, R. N., "Practical Earley Parsing", _The Computer Journal_ 45(6), 2002.
- Earley, J., "An efficient context-free parsing algorithm", _Communications of the ACM_ 13(2), 1970.
