# Guía de estudio: 15 — El arreglo de ε (Aycock y Horspool)

> **Paso 15 del SPEC 02.** Archivos: `packages/core/src/earley/recognizer.ts` (`predict`, `complete`, `isEmptySpan`, la opción `classicEpsilon`) y `packages/core/src/command-line/commands/earley.ts` (`--no-epsilon-fix`).
> Ficha teórica relacionada: [`docs/concepts/16-epsilon-aycock-horspool.md`](../concepts/16-epsilon-aycock-horspool.md).

---

## 1. El problema que resuelve

El Earley del paso 14 es el **algoritmo clásico** (Earley, 1970). Funciona perfecto con G0, que no tiene producciones ε, pero **falla con algunas gramáticas que tienen ε**: rechaza cadenas válidas.

Esto importa porque **G1 tiene 10 partes opcionales**, todas con una producción ε (`MarcoOpc`, `HallazgoOpc`, `Libres`, `Lineas`, `CuerpoLinea`, `EpiOpc`, `Cierre`…). Sin este paso, Earley no sería confiable con la gramática oficial del proyecto.

### 1.1 El error, paso a paso

`epsilon-trap`: `S → A A x`, `A → ε`. La entrada `x` es válida: los dos A desaparecen y queda `x`. El Earley clásico arma S0 así:

| Paso | Ítem procesado   | Operación | Qué pasa                                                                                                 |
| ---- | ---------------- | --------- | -------------------------------------------------------------------------------------------------------- |
| 1    | `$S → • S, 0`    | Predictor | agrega `S → • A A x, 0`                                                                                  |
| 2    | `S → • A A x, 0` | Predictor | hace falta un A: agrega `A → •, 0`                                                                       |
| 3    | `A → •, 0`       | Completer | terminó un A (vacío, de 0 a 0): vuelve a S0 y avanza a quien lo esperaba: agrega `S → A • A x, 0`        |
| 4    | `S → A • A x, 0` | Predictor | hace falta **otro** A: intenta agregar `A → •, 0`… **pero ya está**. No se agrega ni se procesa otra vez |
| —    | —                | —         | fin de S0. **Nadie avanza `S → A • A x`**: `S → A A • x` no aparece nunca                                |

El Scanner no tiene ningún ítem que espere `x`: S1 queda vacía y **se rechaza**.

### 1.2 La causa

El Completer de `A → •` corrió en el paso 3, cuando **solo** `S → • A A x` esperaba un A. En el paso 4 aparece **otro** ítem que espera un A, pero el A vacío ya se completó y no se vuelve a completar (un ítem que ya está no se procesa dos veces).

En general: **un ítem empieza a esperar un símbolo anulable B después de que B ya se completó vacío en el mismo conjunto, y nadie lo avanza.** Sin ε no pasa, porque un B que termina en Sk empezó en un conjunto anterior, y todo lo que lo esperaba allá ya estaba anotado.

---

## 2. Por qué este arreglo

### 2.1 La idea (Aycock y Horspool, 2002)

Si B es **anulable** (B ⇒\* ε, paso 7), cuando el Predictor ve `A → α • B β` puede **avanzar el punto en el momento**, como si B ya se hubiera reconocido vacío:

- agrega las reglas de B, como siempre;
- **y además** agrega `A → α B • β, j`, con un enlace de tipo `nullable`.

Así el avance sobre un B vacío **no depende del orden** en que llegaron los ítems: lo hace el mismo ítem que lo necesita, cuando lo necesita.

En `epsilon-trap`, el paso 4 queda: `S → A • A x` predice A, **A es anulable**, así que también agrega `S → A A • x, 0`. Ese ítem espera `x`, el Scanner lo lee, y se acepta.

### 2.2 La regla complementaria de este proyecto

Con el arreglo, el Completer **ignora** los ítems completos con origen igual al conjunto actual (un B que se reconoció vacío, de k a k). El código lo llama `isEmptySpan`.

**Por qué:** el Predictor ya hizo todos los avances sobre ese B vacío. Si el Completer también los hiciera, el mismo avance quedaría anotado **dos veces**: una con enlace `nullable` (del Predictor) y otra con enlace `complete` (del Completer). El reconocimiento daría lo mismo, pero en el paso 20 se contarían **árboles de más**: el mismo árbol aparecería dos veces.

### 2.3 Por qué es correcto (no se pierde ni se inventa nada)

- **No inventa:** solo avanza sobre B si B es anulable, es decir, si B ⇒\* ε de verdad. El avance corresponde a una derivación real.
- **No pierde:** todo avance sobre un B vacío lo hace el Predictor, en el momento en que un ítem empieza a esperar B, sin importar el orden. Los avances sobre un B **no vacío** (que empezó en un conjunto anterior) los sigue haciendo el Completer, como antes.
- **No repite:** el Completer ignora los B vacíos, así que cada avance tiene un solo enlace.

### 2.4 Alternativas descartadas

| Alternativa                                                                    | Por qué no                                                                                   |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| **Quitar las producciones ε** de la gramática antes (como en la FNC, paso DEL) | cambia la gramática y sus árboles: los árboles dejarían de ser los del relato                |
| **Repetir el Completer** hasta que nada cambie (el arreglo original de Earley) | funciona, pero cuesta más y es más difícil de explicar                                       |
| **Aycock y Horspool**                                                          | una línea en el Predictor y otra en el Completer; usa los anulables, que ya están calculados |

---

## 3. Cómo se usa en el programa

| Quién                      | Usa                                         | Para qué                               |
| -------------------------- | ------------------------------------------- | -------------------------------------- |
| `recognize`                | `computeNullable` (paso 7)                  | saber qué símbolos pueden desaparecer  |
| `predict`                  | el conjunto de anulables                    | avanzar sobre B si es anulable         |
| `complete`                 | `isEmptySpan`                               | ignorar los B vacíos                   |
| comando `earley`           | `--no-epsilon-fix` → `classicEpsilon: true` | mostrar el error del algoritmo clásico |
| árboles y conteo (18 a 20) | los enlaces `nullable`                      | reconstruir los subárboles ε (paso 18) |

`recognize(grammar, tokens, { classicEpsilon })`: la opción vale `false` por defecto. Con `true`, el conjunto de anulables queda vacío (no se avanza sobre nada) y el Completer no ignora nada: es exactamente el algoritmo clásico.

---

## 4. Cómo funciona

El bucle principal no cambia (guía 14). Cambian dos operaciones:

| Operación     | Paso 14 (clásico)                               | Paso 15 (con el arreglo)                                                        |
| ------------- | ----------------------------------------------- | ------------------------------------------------------------------------------- |
| **Predictor** | agrega `B → • γ, k` por cada regla de B         | lo mismo **y**, si B es anulable, agrega `A → α B • β, j` con enlace `nullable` |
| **Scanner**   | sin cambios                                     | sin cambios                                                                     |
| **Completer** | avanza a todos los que esperaban B en el origen | lo mismo, **salvo** si B es vacío (origen = conjunto actual): lo ignora         |

---

## 5. El código, función por función

### 5.1 `RecognizerContext` y la opción `classicEpsilon`

```ts
export interface RecognizerContext {
  grammar: Grammar;
  chart: Chart;
  tokens: readonly SymbolName[];
  nullableSymbols: ReadonlySet<SymbolName>;
  classicEpsilon: boolean;
}
```

- Junta lo que las tres operaciones necesitan además del ítem. Antes, cada función recibía sus propios parámetros sueltos; con el arreglo hacen falta dos datos más (los anulables y el modo), y un objeto es más claro que seis parámetros.
- `nullable` se calcula una sola vez por reconocimiento, en `recognize`.

### 5.2 `recognize`: armar el contexto

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
- **En modo clásico, `nullable` es un conjunto vacío.** Así el Predictor no avanza sobre ningún símbolo, sin necesitar un `if` aparte: el mismo código hace el algoritmo clásico.
- Fuera de eso, el bucle es el del paso 14.

### 5.3 `predict({ context, item, symbol })`: el arreglo

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
- El enlace `nullable` guarda el ítem de antes (`predecessor`) y qué símbolo se salteó (`symbol`). No apunta a ningún ítem hijo, porque B no se reconoció leyendo: se derivó a ε. Por eso el paso 18 genera esos subárboles desde la gramática.
- **El orden importa para el chart:** primero las reglas de B (en el orden del archivo) y **después** el avance. Es la convención que fija el spec (sección 9.6) para que el chart sea reproducible.
- Si el ítem avanzado ya estaba, `addItem` no lo duplica: solo le suma el enlace (otro camino).

### 5.4 `complete({ context, item })`: ignorar lo vacío

```ts
if (!context.classicEpsilon && isEmptySpan(item)) {
  return;
}
```

- Lo único que cambia en el Completer: si el ítem completo es un B **vacío** (empezó y terminó en el mismo conjunto), no hace nada. El Predictor ya avanzó a todos los que lo esperaban.
- En modo clásico no se ignora nada: es el comportamiento del paso 14, con su error.
- El resto de la función (volver al origen y avanzar a los que esperaban B) no cambia.

### 5.5 `isEmptySpan(item)`

```ts
return item.origin === item.setIndex;
```

- Un ítem completo con `origin === setIndex` reconoció un B entre la posición k y la misma posición k: no consumió ningún token, o sea, derivó ε.
- Se exporta porque el comando lo usa para marcar los ítems ignorados.

### 5.6 El comando `earley`: `--no-epsilon-fix` y la columna "How"

- `--no-epsilon-fix` pasa `classicEpsilon: true` e imprime una línea que lo avisa.
- En `--chart`, `describeOrigin` agrega dos marcas nuevas:
  - **`ε`**: el ítem llegó por el avance sobre un anulable (enlace `nullable`);
  - **`P (ignored)`**: un ítem predicho que ya está completo y es vacío (`A → •` con origen k). El Completer lo ignora.

---

## 6. Ejemplo recorrido a mano: el comienzo de S1 en G1 con `CRI PIS REV`

Es el chart calculado a mano en el spec (sección 9.6). El programa lo reproduce **exactamente**, y una prueba lo compara ítem por ítem.

| #   | Ítem                       | Origen | Cómo        | Qué pasó                                                                                    |
| --- | -------------------------- | ------ | ----------- | ------------------------------------------------------------------------------------------- |
| 1   | Hecho → CRI • HallazgoOpc  | 0      | S from S0#5 | se leyó CRI                                                                                 |
| 2   | HallazgoOpc → • HAL        | 1      | P           | hace falta un HallazgoOpc: su primera regla                                                 |
| 3   | HallazgoOpc → •            | 1      | P (ignored) | su segunda regla, `HallazgoOpc → ε`: ya está completa, pero el Completer la va a ignorar    |
| 4   | Hecho → CRI HallazgoOpc •  | 0      | **ε**       | **el arreglo:** HallazgoOpc es anulable, así que el Predictor avanza ya: "no hubo hallazgo" |
| 5   | Planteo → Hecho • MarcoOpc | 0      | C from S0#3 | el Hecho terminó (ítem 4): sube y avanza el Planteo                                         |
| 6   | MarcoOpc → • Marco         | 1      | P           | hace falta un MarcoOpc                                                                      |
| 7   | MarcoOpc → •               | 1      | P (ignored) | `MarcoOpc → ε`, ignorada por el Completer                                                   |
| 8   | Planteo → Hecho MarcoOpc • | 0      | **ε**       | **el arreglo otra vez:** "no hubo marco"; el Planteo terminó                                |

Sin el arreglo, el ítem 4 habría llegado por el Completer de `HallazgoOpc → •` (ítem 3) con un enlace `complete`. Con el arreglo llega por el Predictor, con un enlace `ε`, y el ítem 3 se ignora: **un solo camino, un solo enlace**.

El chart completo tiene 8, 19, 16 y 11 ítems:

```sh
npm run sabueso -- earley --grammar g1 --chart "CRI PIS REV"
```

---

## 7. Errores

Ninguna función nueva lanza errores. Con `--no-epsilon-fix`, el comando puede rechazar entradas válidas: es a propósito, para mostrar el error del algoritmo clásico.

---

## 8. Consola y pruebas

```sh
npm run sabueso -- earley --grammar epsilon-trap "x"                                 # ACCEPTED
npm run sabueso -- earley --grammar epsilon-trap --chart --no-epsilon-fix "x"        # REJECTED: falta S → A A • x
npm run sabueso -- earley --grammar g1 --chart "CRI PIS REV"                          # el chart de la sección 9.6
```

Con `--no-epsilon-fix`, S0 termina en `S → A • A x` (con `C from S0#2`) y S1 queda vacía.

**`test/earley/recognizer.test.ts`:**

| Prueba                         | Qué verifica                                                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `epsilon-trap`                 | acepta `x`; con `classicEpsilon` lo rechaza                                                                                     |
| el ítem que faltaba            | `S → A A • x` aparece con un enlace `nullable` del símbolo A, y en modo clásico no                                              |
| `parentheses`                  | acepta la entrada vacía y `( ( ) ) ( )`                                                                                         |
| G1, tabla 9.1                  | V1, V2, V3, A1 y M1 aceptadas; I1 a I5 e I7 rechazadas (I5 e I7 sí las acepta G0: L(G1) ⊊ L(G0)); L1 aceptado                   |
| **el chart de la sección 9.6** | 8, 19, 16 y 11 ítems, y los 54 ítems con su regla, origen y forma de llegar, en orden (`test/fixtures/g1-chart-cri-pis-rev.ts`) |
| enlaces no repetidos           | en seis corridas de G0, G1, `parentheses` y `epsilon-trap`, ningún ítem tiene dos veces el mismo par (predecesor, causa)        |

**`test/command-line/earley.test.ts`:** las filas de `--chart` con G1 coinciden con las 54 del spec; `epsilon-trap` acepta; con `--no-epsilon-fix` rechaza y falta `S → A A • x`.

---

## 9. Preguntas probables en la defensa

**¿Qué problema tiene el Earley clásico con ε?**
Si un ítem empieza a esperar un símbolo anulable B después de que B ya se completó vacío en el mismo conjunto, nadie lo avanza: B no se vuelve a completar. Con `S → A A x`, `A → ε`, la entrada `x` se rechaza: el segundo A queda esperando.

**¿Por qué sin ε no pasa?**
Porque un B que termina en Sk sin ser vacío empezó en un conjunto anterior Si, y todo lo que lo esperaba ya estaba en Si cuando el Completer lo busca. El problema solo aparece cuando B empieza y termina en el mismo conjunto.

**¿Cuál es el arreglo?**
El de Aycock y Horspool: en el Predictor, si B es anulable, además de predecir sus reglas se avanza el punto en el momento (`A → α B • β`), con un enlace `nullable`. Así el avance sobre un B vacío lo hace el ítem que lo necesita, cuando lo necesita, sin depender del orden.

**¿Por qué el Completer ignora los ítems vacíos?**
Porque el Predictor ya hizo esos avances. Si el Completer también los hiciera, el mismo avance tendría dos enlaces, y al contar árboles (paso 20) el mismo árbol se contaría dos veces.

**¿Cómo sabes que el arreglo no acepta cosas de más?**
Solo avanza sobre B si B es anulable, o sea, si B ⇒\* ε de verdad: cada avance corresponde a una derivación real. Además, toda la batería de G1 da lo esperado (los inválidos siguen rechazados) y el chart de `CRI PIS REV` coincide ítem por ítem con el calculado a mano.

**¿Para qué sirve la opción `classicEpsilon`?**
Solo para enseñar: reproduce el error del algoritmo clásico. `npm run sabueso -- earley --grammar epsilon-trap --chart --no-epsilon-fix "x"` muestra el chart donde falta `S → A A • x` y el rechazo.

**¿Por qué no quitar las producciones ε de la gramática, como en la FNC?**
Porque cambia la gramática y sus árboles: los árboles dejarían de corresponder a las partes del relato. Con el arreglo, Earley trabaja con G1 tal cual la escribió el autor.

**¿Qué usa de los pasos anteriores?**
Los anulables del paso 7 (`computeNullable`). Es una de las razones por las que el análisis de la gramática va antes que Earley.
