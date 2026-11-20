# Guía de estudio: 16 — Diagnóstico de errores

> **Paso 16 del SPEC 02.** Archivos: `packages/core/src/earley/diagnostics.ts` y el mensaje de rechazo de `packages/core/src/command-line/commands/earley.ts`.
> Ficha teórica relacionada: [`docs/concepts/17-acceptance-and-errors.md`](../concepts/17-acceptance-and-errors.md).

---

## 1. El problema que resuelve

Hasta el paso 15, Earley respondía solo "sí" o "no". Para un relato rechazado, eso no ayuda: ¿qué está mal?

Este paso agrega el **diagnóstico**: dónde falla el relato, qué evento se encontró y qué eventos habrían sido válidos ahí.

```text
detective/g1: CTX PER PIS REV

REJECTED · position 2 (event 3) · found PIS · expected: CRI, HAL
```

Leído en términos del género: después del marco (CTX PER) tenía que venir el crimen (CRI) o su hallazgo (HAL), y vino una pista. **Falta el crimen.**

Es lo que va a mostrar la web (SPEC 03): el relato con el evento problemático marcado, y la lista de lo que se esperaba.

---

## 2. Cómo funciona

### 2.1 La idea: el chart ya tiene la respuesta

Cada libreta Sk tiene **todas las posibilidades que siguen vivas** en la posición k. Lo que está justo después del punto de cada ítem es lo que esa posibilidad espera. Entonces:

- los **terminales** después del punto en Sk son **exactamente los eventos que podían venir** en la posición k;
- si el evento real no es ninguno de ellos, ningún ítem lo lee, y **S(k+1) queda vacía**.

No hace falta ningún análisis extra: el diagnóstico se lee del chart que Earley ya armó.

### 2.2 Los tres tipos de error

| Tipo               | Cuándo                                                            | Posición      | `found`     | `expected`                             |
| ------------------ | ----------------------------------------------------------------- | ------------- | ----------- | -------------------------------------- |
| `unknown-symbol`   | un evento no está en Σ (paso 6, antes de Earley)                  | la del evento | el evento   | vacío                                  |
| `unexpected-token` | el primer conjunto vacío es S(k+1): nadie en Sk leyó el evento k  | k             | el evento k | los terminales después del punto en Sk |
| `unexpected-end`   | ningún conjunto vacío, pero no se aceptó: el relato terminó antes | n             | `null`      | los terminales después del punto en Sn |

Si `expected` queda vacío en un fin de entrada, el mensaje dice "incomplete input": no hay ningún evento que pudiera completar el relato.

### 2.3 Por qué el primer conjunto vacío

Si S(k+1) está vacío, todos los siguientes también: el Scanner no puede pasar nada desde un conjunto vacío. El **primero** vacío marca el evento exacto donde se murieron todas las posibilidades. Todo lo anterior era el comienzo de algún relato válido (Earley tiene la propiedad del **prefijo correcto**: detecta el error en el primer evento que ya no puede continuar ningún relato válido).

---

## 3. Por qué así

- **Sale gratis del chart.** No hace falta una segunda pasada ni otra estructura: el chart guarda lo vivo en cada posición.
- **`expected` es preciso, no una aproximación.** Son todos los eventos que habrían mantenido viva alguna posibilidad, ni uno más.
- **El error se devuelve como dato** (`ParseError`), no se lanza: rechazar un relato es un resultado normal. La consola lo escribe; la web lo va a dibujar.
- **`expected` ordenado:** así la salida es siempre la misma y las pruebas pueden compararla.
- **Alternativa descartada: mirar la tabla LL(1).** Solo sirve para gramáticas LL(1) (no para G0), y daría los esperados de una sola derivación, no de todas las posibilidades.

---

## 4. Cómo se usa en el programa

| Quién                      | Llama a                      | Recibe                                    |
| -------------------------- | ---------------------------- | ----------------------------------------- |
| comando `earley` (paso 16) | `checkAlphabet` y `diagnose` | el error, para escribir el mensaje        |
| `parse` (paso 22)          | `diagnose`                   | el error, dentro del resultado de `parse` |
| web (SPEC 03)              | `parse`                      | el error, para marcar el evento           |

`diagnose(grammar, chart, tokens, accepted)` devuelve un `ParseError` o `null` si la entrada se aceptó.

---

## 5. El código, función por función

### 5.1 El tipo `ParseError`

```ts
export interface ParseError {
  kind: 'unexpected-token' | 'unexpected-end' | 'unknown-symbol';
  position: number;
  found: SymbolName | null;
  expected: SymbolName[];
}
```

Ya existía desde el paso 6, que lo usaba para `unknown-symbol`. Este paso agrega las funciones que arman los otros dos tipos.

### 5.2 `diagnose(grammar, chart, tokens, accepted)`

```ts
if (accepted) {
  return null;
}
const firstEmpty = chart.findIndex((set, index) => index > 0 && set.items.length === 0);
if (firstEmpty !== -1) {
  const position = firstEmpty - 1;
  return {
    kind: 'unexpected-token',
    position,
    found: tokens[position] ?? null,
    expected: expectedTerminals(grammar, chart[position]),
  };
}
return {
  kind: 'unexpected-end',
  position: tokens.length,
  found: null,
  expected: expectedTerminals(grammar, chart[tokens.length]),
};
```

- Si se aceptó, no hay error: `null`.
- `chart.findIndex(... index > 0 && ...)`: busca el **primer** conjunto vacío. Se saltea S0 (`index > 0`): S0 nunca está vacío, porque siempre tiene el ítem de arranque.
- **El índice del conjunto vacío no es la posición del error.** Si el primero vacío es S(k+1), el evento que nadie pudo leer es el número k: por eso `position = firstEmpty - 1`. Los conjuntos están **entre** eventos, y S(k+1) es el que viene después del evento k.
- `found` es ese evento (`tokens[position]`), y `expected` sale del conjunto **anterior** al vacío, `chart[position]` (Sk): ahí estaban las posibilidades que no pudieron seguir.
- Si no hay ningún conjunto vacío pero no se aceptó, el relato se cortó: la posición es el final (`tokens.length`), no hay evento encontrado (`null`), y `expected` sale del último conjunto.

### 5.3 `expectedTerminals(grammar, set)`

```ts
const terminals = new Set<SymbolName>();
for (const item of set?.items ?? []) {
  const next = nextSymbol(item);
  if (next !== undefined && grammar.terminals.has(next)) {
    terminals.add(next);
  }
}
return [...terminals].sort();
```

- Recorre los ítems del conjunto y mira el símbolo después del punto (`nextSymbol`, paso 13).
- Se queda solo con los **terminales** (`grammar.terminals.has`): un no terminal no es un evento, y sus primeros eventos ya aparecen en los ítems que el Predictor agregó al mismo conjunto. Un ítem completo (`next === undefined`) no espera nada.
- Un `Set` evita repetidos (varios ítems pueden esperar el mismo evento) y `sort()` ordena alfabéticamente.
- `set?.items ?? []`: si el conjunto no existe, no hay esperados.

### 5.4 `formatRejection(error)` (en el comando)

- `unknown-symbol`: `REJECTED · position 1 (event 2) · XYZ is not in Σ`.
- `unexpected-token`: `REJECTED · position 2 (event 3) · found PIS · expected: CRI, HAL`.
- `unexpected-end`: `REJECTED · position 2 (end of input) · expected: …`, o `incomplete input` si no hay esperados.
- La posición cuenta desde 0, como el spec; el evento, desde 1, como lo cuenta una persona.

---

## 6. Ejemplo recorrido a mano

G1, `CRI SOS DSC DSC REV` (caso I7: dos descartes de la misma sospecha):

| Conjunto | Qué pasa                                                                                                                                                 |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | se leyó CRI                                                                                                                                              |
| S2       | se leyó SOS: empieza una línea de sospecha; su cuerpo puede tener evidencias, un descarte o nada                                                         |
| S3       | se leyó DSC: el descarte cierra la línea. Después de un descarte solo pueden venir evidencias (PIS, INT, ATQ), otra sospecha (SOS) o la revelación (REV) |
| S4       | viene el segundo DSC: nadie en S3 lo esperaba. **S4 queda vacío**                                                                                        |

Resultado: `position 3 (event 4) · found DSC · expected: ATQ, INT, PIS, REV, SOS`. Una sospecha se descarta una sola vez. (G0 sí acepta este relato: es uno de los que L(G1) excluye a propósito.)

```sh
npm run sabueso -- earley --grammar g1 "CRI SOS DSC DSC REV"
```

---

## 7. Errores

`diagnose` no lanza errores: devuelve el error del relato como dato. Los mensajes posibles del comando están en la sección 5.4.

---

## 8. Consola y pruebas

```sh
npm run sabueso -- earley --grammar g1 "CTX PER PIS REV"    # position 2 (event 3) · found PIS · expected: CRI, HAL
npm run sabueso -- earley --grammar g1 "CRI PIS"            # position 2 (end of input) · expected: ATQ, INT, PIS, REV, SOS
npm run sabueso -- earley --grammar g1 "CRI DSC REV"        # position 1 (event 2) · found DSC
```

**`test/earley/diagnostics.test.ts`:**

| Prueba                   | Qué verifica                                                            |
| ------------------------ | ----------------------------------------------------------------------- |
| I1 a I7 (tabla 9.1)      | con G0 y con G1: tipo, posición, `found` y `expected` exactos           |
| P2                       | `parentheses` con `( ( )`: fin de entrada en 3, se esperaba `(` o `)`   |
| aceptado                 | sin error                                                               |
| entrada incompleta       | `test-empty` con la entrada vacía: `expected` vacío                     |
| el primer conjunto vacío | aunque el relato siga, el error está en el primer evento que nadie leyó |
| `expectedTerminals`      | los terminales de S0 en G1 son CRI, CTX, HAL y PER                      |

**`test/command-line/earley.test.ts`:** el mensaje de I1 con su código 1, el fin de entrada, la entrada incompleta, I3 con G0 y el símbolo fuera de Σ.

---

## 9. Preguntas probables en la defensa

**¿Cómo sabe Earley dónde está el error?**
Es el primer conjunto vacío. Si S(k+1) está vacío, ninguna posibilidad viva en la posición k pudo leer el evento k: el error está ahí.

**¿De dónde salen los "esperados"?**
Son los terminales que están justo después del punto en los ítems de Sk: lo que cada posibilidad viva esperaba. Si el evento real no es ninguno, S(k+1) queda vacío.

**¿Por qué la posición es la del conjunto vacío menos uno?**
Porque los conjuntos están entre los eventos. S(k+1) es el que viene después del evento k; si está vacío, el evento k es el que nadie leyó.

**¿Qué diferencia hay entre "token inesperado" y "fin de entrada"?**
En el primero el relato tiene un evento que no encaja (un conjunto queda vacío). En el segundo, todo lo leído encaja, pero el relato terminó antes de completarse: el último conjunto no tiene el ítem de arranque completo.

**¿Por qué G0 y G1 dan distintos esperados para `CRI REV`?**
Porque en G0 un paso puede ser un descarte (DSC) en cualquier lugar, y en G1 un descarte solo puede cerrar una sospecha abierta. Después de CRI, G1 no espera DSC.

**¿Se podría usar la tabla LL(1) para el diagnóstico?**
Solo con gramáticas LL(1), y daría lo esperado por una sola derivación. Earley da lo esperado por todas las posibilidades vivas, para cualquier gramática.
