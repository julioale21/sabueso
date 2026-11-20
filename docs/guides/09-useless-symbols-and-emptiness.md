# Guía de estudio: 09 — Símbolos productivos, alcanzables, inútiles y vacuidad

> **Paso 9 del SPEC 02.** Archivos: `packages/core/src/analysis/useful.ts` y `packages/core/src/command-line/commands/useful.ts`.
> Ficha teórica relacionada: [`docs/concepts/08-useless-symbols-and-emptiness.md`](../concepts/08-useless-symbols-and-emptiness.md).

---

## 1. El problema que resuelve

Una gramática puede tener símbolos que **no sirven para nada**: no aparecen en ninguna derivación de una oración. Hay dos formas de ser inútil:

| Problema      | Qué significa                                  | Ejemplo en `test-useless`             |
| ------------- | ---------------------------------------------- | ------------------------------------- |
| No productivo | nunca termina: no deriva ninguna cadena de Σ\* | `A → A a`: cada paso vuelve a poner A |
| No alcanzable | ninguna derivación desde S lo menciona         | `C → c`: nadie usa C                  |

Y una pregunta más fuerte: **¿la gramática genera alguna oración?** Si S no es productivo, L(G) = ∅. Es la **vacuidad**, uno de los pocos problemas sobre gramáticas libres de contexto que son **decidibles** (a diferencia de la ambigüedad o la equivalencia).

Para el proyecto sirve como **validador**: alguien que escribe un `.grammar` con una regla que nunca termina se entera acá. Además, la Forma Normal de Chomsky (paso 24) tiene un paso USELESS que usa exactamente esto.

---

## 2. Por qué esta herramienta

- **Qué se eligió:** dos puntos fijos por rondas, como los anulables del paso 7, en el orden de Hopcroft 7.1.1: primero productivos, después alcanzables sobre lo que queda.
- **Productivos:** la base son los terminales (ya son cadenas de Σ\*). A es productivo si tiene una producción con todo el lado derecho productivo o terminal. Es igual al cálculo de anulables, pero los terminales cuentan como "buenos".
- **Alcanzables:** se recorre desde arriba. Se parte de {S} y cada ronda agrega los no terminales que aparecen en lados derechos de los ya alcanzados. Es una búsqueda en anchura sobre el grafo "A usa a B": la ronda i son los símbolos a distancia i de S.
- **Por qué el orden:** quitar un no productivo borra producciones, y eso puede dejar a otro símbolo sin camino desde S. Si se calculan los alcanzables primero, ese símbolo ya pasó el filtro y se queda (ver el ejemplo de la sección 6).
- **Vacuidad:** sale gratis del primer punto fijo: L(G) = ∅ ⇔ S ∉ productivos.

---

## 3. Cómo se usa en el programa

| Quién                       | Llama a                | Recibe                                          |
| --------------------------- | ---------------------- | ----------------------------------------------- |
| comando `useful` (paso 9)   | `analyzeUsefulSymbols` | los conjuntos, la vacuidad, la gramática limpia |
| `analyzeGrammar` (paso 12)  | `analyzeUsefulSymbols` | los conjuntos, en el informe                    |
| FNC, paso USELESS (paso 24) | `usefulGrammar`        | la gramática sin inútiles                       |

`analyzeUsefulSymbols` devuelve:

| Campo           | Qué es                                                            |
| --------------- | ----------------------------------------------------------------- |
| `productive`    | los no terminales que derivan alguna cadena de terminales         |
| `reachable`     | los alcanzables desde S, **después** de quitar los no productivos |
| `useless`       | los no terminales que no son productivos o no son alcanzables     |
| `isEmpty`       | L(G) = ∅                                                          |
| `usefulGrammar` | G sin los inútiles (mismo lenguaje), o `null` si L(G) = ∅         |

---

## 4. Cómo funciona

1. **Productivos**, por rondas: un A entra si tiene una producción cuyos símbolos son todos terminales o productivos de la ronda anterior. Hasta que una ronda no agrega nada.
2. **Vacuidad:** si S no es productivo, L(G) = ∅ y se termina: no hay nada útil.
3. **Se filtran las producciones:** quedan solo las que usan terminales y productivos.
4. **Alcanzables**, por rondas, sobre esas producciones: se parte de {S}; cada ronda agrega los no terminales de los lados derechos de los ya alcanzados.
5. **Inútiles** = N menos (productivos ∩ alcanzables).
6. **Gramática útil:** las producciones del paso 3 cuyo lado izquierdo es alcanzable, construidas de nuevo con `buildGrammar`. Σ se achica sola: solo quedan los terminales que se usan.

---

## 5. El código, función por función

### 5.1 `computeProductive(grammar, onIteration?)`

```ts
return leastFixedPoint(
  [],
  (productive) =>
    leftSidesWhere(grammar.productions, (production) => usesOnly(production, productive, grammar)),
  onIteration,
);
```

Usa el mismo `leastFixedPoint` que los anulables (guía 07, sección 5.1): parte de ∅ y en cada ronda entran los lados izquierdos de las producciones que solo usan terminales y productivos ya conocidos. La única diferencia con los anulables es la regla: `usesOnly` acepta terminales.

### 5.2 `usesOnly(production, nonterminals, grammar)`

```ts
return production.rightSide.every(
  (symbol) => grammar.terminals.has(symbol) || nonterminals.has(symbol),
);
```

¿Todos los símbolos son terminales o están en el conjunto dado? Se usa dos veces: para decidir si una producción hace productivo a su lado izquierdo, y para filtrar las producciones antes de los alcanzables.

### 5.3 `computeReachable(start, productions, onIteration?)`

```ts
const nonterminals = new Set(productions.map((production) => production.leftSide));
return leastFixedPoint(
  [start],
  (reachable) => nonterminalsUsedBy(reachable, productions, nonterminals),
  onIteration,
);
```

- Otra vez `leastFixedPoint`, pero arranca con `[start]` en lugar de ∅. Cada ronda agrega los no terminales que aparecen en los lados derechos de los ya alcanzados (`nonterminalsUsedBy`).
- Recibe las **producciones** (no la gramática) porque trabaja sobre las que quedaron después de quitar los no productivos.

### 5.4 `analyzeUsefulSymbols(grammar, onIteration?)`

Une todo en el orden de la sección 4. Su `onIteration` recibe además la fase (`'productive'` o `'reachable'`), para que `--steps` muestre las dos tablas. Si L(G) = ∅, no corre la fase de alcanzables.

### 5.5 `buildUsefulGrammar(grammar, productions, reachable)`

Toma las producciones productivas con lado izquierdo alcanzable y llama a `buildGrammar`. Las producciones se numeran de nuevo, y Σ queda solo con los terminales que se usan.

### 5.6 El comando `useful`

- Lee `--grammar` o `--grammar-file`, y `--steps`.
- Con `--steps`, una tabla por fase. La de alcanzables muestra S como ronda 0, porque no parte de ∅.
- Muestra los no productivos, los no alcanzables y los inútiles. Si hay inútiles, imprime la gramática sin ellos. Si L(G) = ∅, lo dice y no sigue.

---

## 6. Ejemplo recorrido a mano: por qué importa el orden

`examples/grammars/useless-order.grammar`: `S → A B | a`, `A → b`, `B → B c`.

| Paso                             | Estado                                                    |
| -------------------------------- | --------------------------------------------------------- |
| productivos, ronda 1             | S (por `S → a`) y A (por `A → b`). B solo tiene `B → B c` |
| productivos, ronda 2             | nada nuevo: {S, A}                                        |
| se quitan las producciones con B | `S → A B` y `B → B c`. Quedan `S → a` y `A → b`           |
| alcanzables, ronda 0             | {S}                                                       |
| alcanzables, ronda 1             | `S → a` no menciona no terminales: nada nuevo             |
| inútiles                         | B (no productivo) y A (no alcanzable)                     |
| gramática útil                   | `S → a`                                                   |

**Al revés** (alcanzables primero): S llega a A y a B por `S → A B`, así que los tres pasan. Después se quita B y, con él, `S → A B`. Pero A ya pasó el filtro y queda `A → b`, un símbolo al que nadie llega. Una prueba lo verifica.

```sh
npm run sabueso -- useful --grammar-file examples/grammars/useless-order.grammar --steps
```

---

## 7. Errores

Ninguna función lanza errores: toda gramática construida tiene sus conjuntos. Una gramática con inútiles o con L(G) = ∅ es válida; el comando la informa y termina con código 0. Los errores de uso son los de los demás análisis (código 2).

---

## 8. Consola y pruebas

```sh
npm run sabueso -- useful --grammar test-useless --steps
```

```text
test-useless: useful symbols

Productive (A ⇒* w, w ∈ Σ*), round by round:

Round  Symbols so far  Added in this round
-----  --------------  -------------------
1      2               C, S
2      2               (none: fixed point)

Reachable from the start symbol, round by round:

Round  Symbols so far  Added in this round
-----  --------------  -------------------
0      1               S (start)
1      1               (none: fixed point)

Not productive: {A}
Not reachable (once those are removed): {C}
Useless: {A, C}
L(G) ≠ ∅

Without useless symbols:

test-useless without useless symbols: G = (N, Σ, P, S)
N = {S}
Σ = {b}
S = S
P:
   0  S → b
```

Con `--grammar test-empty` imprime `L(G) = ∅: the start symbol S is not productive…`. Con `--grammar g1 --steps` se ven 4 rondas de productivos (Relato entra en la cuarta) y 5 de alcanzables (Descarte, el más profundo, en la quinta). G1 no tiene inútiles.

**`test/analysis/useful.test.ts`:**

| Prueba               | Qué verifica                                                                       |
| -------------------- | ---------------------------------------------------------------------------------- |
| `test-useless`       | no productivos {A}, no alcanzables {C}, inútiles {A, C}, gramática útil `S → b`    |
| `test-empty`         | L(G) = ∅, sin gramática útil                                                       |
| G0, G1 y otras cinco | sin inútiles, L(G) ≠ ∅, la gramática útil conserva todas las producciones          |
| el orden             | el ejemplo de la sección 6 da `S → a`; al revés, A parecería alcanzable            |
| Σ se achica          | la gramática útil de `test-useless` tiene Σ = {b}                                  |
| rondas               | G1: 12, 18, 20, 21 productivos y 4, 10, 18, 20, 21 alcanzables; las fases en orden |

**`test/command-line/useful.test.ts`:** los inútiles y la gramática limpia de `test-useless`, las dos tablas de `--steps`, L(G) = ∅, G1 sin inútiles y los errores de uso.

---

## 9. Preguntas probables en la defensa

**¿Qué es un símbolo inútil?**
Uno que no aparece en ninguna derivación de una oración: o no es productivo (nunca termina en terminales) o no es alcanzable desde S.

**¿Por qué primero los no productivos y después los no alcanzables?**
Porque quitar un no productivo borra producciones, y eso puede dejar a otro símbolo sin camino desde S. En `S → A B | a`, `A → b`, `B → B c`: al quitar B se va `S → A B`, y A queda inalcanzable. Al revés, A pasaría el filtro de alcanzables y se quedaría.

**¿Cómo se decide si L(G) = ∅?**
L(G) = ∅ ⇔ S no es productivo. El cálculo de productivos siempre termina (a lo sumo |N| + 1 rondas), así que es un problema decidible. En cambio, otros problemas sobre GLC, como la ambigüedad o la equivalencia, son indecidibles.

**¿Quitar los inútiles cambia el lenguaje?**
No. Un símbolo inútil no participa en ninguna derivación de una oración, así que sacarlo no quita ninguna. La gramática útil genera exactamente L(G).

**¿Qué relación tiene con minYield?**
minYield(A) = ∞ exactamente cuando A no es productivo. Son el mismo hecho visto como número o como sí/no.

**¿G0 o G1 tienen símbolos inútiles?**
No: todos sus no terminales son productivos y alcanzables. Una prueba lo verifica. En G1, el productivo más "alto" es Relato (ronda 4) y el alcanzable más lejano es Descarte (distancia 5 desde Relato).
