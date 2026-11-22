# 16 — Diagnóstico de errores

> Archivos: `packages/core/src/earley/diagnostics.ts` y el mensaje de rechazo de `packages/core/src/command-line/commands/earley.ts`.

## 1. Teoría

Para un relato rechazado, el **diagnóstico** dice dónde falla, qué evento se encontró y qué eventos habrían sido válidos ahí. Todo sale del chart que Earley ya armó.

- **La idea:** Sk tiene todas las posibilidades vivas en la posición k. Los terminales justo después del punto en sus ítems son los eventos que podían venir. Si el evento real no es ninguno, S(k+1) queda vacío.
- **Token inesperado:** el **primer** conjunto vacío es S(k+1). El error está en la posición k (desde 0), `found` = el evento k y `expected` = los terminales después del punto en Sk, ordenados.
- **Fin de entrada:** ningún conjunto vacío, pero no se aceptó: el relato terminó antes. Posición n, `found` = null, `expected` = los terminales después del punto en Sn (si no hay ninguno: "entrada incompleta").
- **Símbolo desconocido:** un evento fuera de Σ se informa antes de correr Earley ([guía 06](06-relato-como-cadena.md)).

### Ejemplo

G1, `CTX PER PIS REV` (caso I1: falta el crimen):

| Conjunto | Qué pasa                                                                             |
| -------- | ------------------------------------------------------------------------------------ |
| S1       | se leyó CTX: el Marco empezó                                                         |
| S2       | se leyó PER: el Marco terminó, y el Planteo `Marco Hecho` espera un Hecho: CRI o HAL |
| S3       | viene PIS: nadie en S2 lo esperaba. **S3 queda vacío**                               |

Resultado: error en la posición 2 (evento 3), se encontró PIS, se esperaba CRI o HAL. **Falta el crimen.** En S2 quedó a medias `Planteo → Marco • Hecho, 0` (los "ítems abiertos", sección 3.4).

## 2. Por qué así

- **Sale gratis del chart.** No hace falta una segunda pasada ni otra estructura: el chart guarda lo vivo en cada posición.
- **`expected` es preciso, no una aproximación.** Son todos los eventos que habrían mantenido viva alguna posibilidad, ni uno más.
- **El error se devuelve como dato** (`ParseError`), no se lanza: rechazar un relato es un resultado normal. Lo usan el comando `earley`, `parse` ([guía 22](22-api-publica.md)) y la web, que marca el evento problemático.
- **`expected` ordenado:** la salida es siempre la misma y las pruebas pueden compararla.
- **Alternativa descartada: mirar la tabla LL(1).** Solo sirve para gramáticas LL(1) (no para G0), y daría los esperados de una sola derivación, no de todas las posibilidades.

## 3. El código, función por función

### 3.1 El tipo `ParseError`

```ts
export interface ParseError {
  kind: 'unexpected-token' | 'unexpected-end' | 'unknown-symbol';
  position: number;
  found: SymbolName | null;
  expected: SymbolName[];
}
```

Ya existía desde la guía 06, que lo usaba para `unknown-symbol`. Este paso agrega las funciones que arman los otros dos tipos.

### 3.2 `diagnose({ grammar, chart, tokens, accepted })`

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
    expected: expectedTerminals({ grammar, set: chart[position] }),
  };
}
return {
  kind: 'unexpected-end',
  position: tokens.length,
  found: null,
  expected: expectedTerminals({ grammar, set: chart[tokens.length] }),
};
```

- Si se aceptó, no hay error: `null`.
- `chart.findIndex(... index > 0 && ...)`: busca el **primer** conjunto vacío. Se saltea S0 (`index > 0`): S0 nunca está vacío, porque siempre tiene el ítem de arranque.
- **El índice del conjunto vacío no es la posición del error.** Si el primero vacío es S(k+1), el evento que nadie pudo leer es el número k: por eso `position = firstEmpty - 1`. Los conjuntos están **entre** eventos, y S(k+1) es el que viene después del evento k.
- `found` es ese evento (`tokens[position]`), y `expected` sale del conjunto **anterior** al vacío, `chart[position]` (Sk): ahí estaban las posibilidades que no pudieron seguir.
- Si no hay ningún conjunto vacío pero no se aceptó, el relato se cortó: la posición es el final (`tokens.length`), no hay evento encontrado (`null`), y `expected` sale del último conjunto.

### 3.3 `expectedTerminals({ grammar, set })`

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

- Recorre los ítems del conjunto y mira el símbolo después del punto (`nextSymbol`, [guía 13](13-earley-items-y-conjuntos.md)).
- Se queda solo con los **terminales** (`grammar.terminals.has`): un no terminal no es un evento, y sus primeros eventos ya aparecen en los ítems que el Predictor agregó al mismo conjunto. Un ítem completo (`next === undefined`) no espera nada.
- Un `Set` evita repetidos (varios ítems pueden esperar el mismo evento) y `sort()` ordena alfabéticamente.
- `set?.items ?? []`: si el conjunto no existe, no hay esperados.

### 3.4 `openItemsAt({ chart, error })` (agregado en el SPEC 05)

```ts
const set = chart[error.position];
if (set === undefined) {
  return null;
}
const expected = new Set(error.expected);
const open = set.items.filter((item) => !isComplete(item));
return {
  set: error.position,
  started: open.filter((item) => item.dot > 0),
  waiting: open.filter((item) => item.dot === 0 && expected.has(nextSymbol(item) ?? '')),
};
```

- `chart[error.position]` es Sk, el conjunto donde falló el relato: tiene todos los ítems que llegaron hasta ahí.
- Si es `undefined`, Earley no corrió (una etiqueta fuera de Σ lo corta antes) y no hay ítems: `null`.
- `open` son los ítems **incompletos**: los que todavía esperaban algo.
- `started` son los que tienen algo antes del punto: una parte del relato que **había empezado** y no pudo seguir. Con I1: `Planteo → Marco • Hecho, 0`.
- `waiting` son los predichos (punto al principio) cuyo próximo símbolo es una etiqueta esperada: de ellos sale "se esperaba: CRI, HAL". Con I1: `Hecho → • CRI HallazgoOpc, 2` y `Hecho → • HAL, 2`.
- El resultado tiene el tipo `OpenItems { set, started, waiting }`. `parse()` lo agrega a todo resultado rechazado como `openItems`; el comando `parse` y la web lo muestran con `label()`.

### 3.5 `formatRejection(error)` (en el comando)

- `unknown-symbol`: `REJECTED · position 1 (event 2) · XYZ is not in Σ`.
- `unexpected-token`: `REJECTED · position 2 (event 3) · found PIS · expected: CRI, HAL`.
- `unexpected-end`: `REJECTED · position 2 (end of input) · expected: …`, o `incomplete input` si no hay esperados.
- La posición cuenta desde 0, como el spec; el evento, desde 1, como lo cuenta una persona.
- `diagnose` no lanza errores: devuelve el error del relato como dato.

## 4. Consola y pruebas

```sh
npm run sabueso -- earley --grammar g1 "CTX PER PIS REV"      # position 2 (event 3) · found PIS · expected: CRI, HAL
npm run sabueso -- earley --grammar g1 "CRI PIS"              # position 2 (end of input) · expected: ATQ, INT, PIS, REV, SOS
npm run sabueso -- earley --grammar g1 "CRI SOS DSC DSC REV"  # I7: position 3 (event 4) · found DSC · expected: ATQ, INT, PIS, REV, SOS
```

```text
detective/g1: CTX PER PIS REV

REJECTED · position 2 (event 3) · found PIS · expected: CRI, HAL
```

El comando `parse` muestra además los ítems abiertos.

**`packages/core/test/earley/diagnostics.test.ts`:**

| Prueba                   | Qué verifica                                                            |
| ------------------------ | ----------------------------------------------------------------------- |
| I1 a I7 (tabla 9.1)      | con G0 y con G1: tipo, posición, `found` y `expected` exactos           |
| P2                       | `parentheses` con `( ( )`: fin de entrada en 3, se esperaba `(` o `)`   |
| aceptado                 | sin error                                                               |
| entrada incompleta       | `test-empty` con la entrada vacía: `expected` vacío                     |
| el primer conjunto vacío | aunque el relato siga, el error está en el primer evento que nadie leyó |
| `expectedTerminals`      | los terminales de S0 en G1 son CRI, CTX, HAL y PER                      |

**`packages/core/test/earley/open-items.test.ts`:** los ítems abiertos de I1, del relato vacío y de un símbolo fuera de Σ.

**`packages/core/test/command-line/earley.test.ts`:** el mensaje de I1 con su código 1, el fin de entrada, la entrada incompleta, I3 con G0 y el símbolo fuera de Σ.

## 5. Referencias

- SPEC 02, sección 3.17.
- Earley, J., "An efficient context-free parsing algorithm", _Communications of the ACM_ 13(2), 1970: la propiedad de prefijo correcto (el algoritmo detecta el error en el primer token que no puede extender ningún prefijo válido).
