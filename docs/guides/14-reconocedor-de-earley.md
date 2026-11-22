# 14 — El reconocedor de Earley

> Archivos: `packages/core/src/earley/recognizer.ts` y `packages/core/src/command-line/commands/earley.ts`.

## 1. Teoría

El reconocedor decide si una cadena pertenece a L(G), **para cualquier gramática libre de contexto**, con los ítems y conjuntos de la [guía 13](13-earley-items-y-conjuntos.md). **Sk** es el conjunto de la posición k (después de leer k eventos). Hay tres operaciones:

| Operación     | Si en Sk está…                  | Agrega                                                         | En palabras                                                  |
| ------------- | ------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------ |
| **Predictor** | (A → α • B β, j), B no terminal | (B → • γ, k) en Sk, por cada producción B → γ                  | "voy a necesitar un B; puede empezar acá"                    |
| **Scanner**   | (A → α • a β, j), a terminal    | (A → α a • β, j) en S(k+1), si el token k+1 es a               | "esperaba un a y vino un a"                                  |
| **Completer** | (B → γ •, i), completo          | (A → α B • β, j) en Sk, por cada ítem de **Si** que esperaba B | "terminé un B que empezó en i: avanzan los que lo esperaban" |

- El **algoritmo:** se pone ($S → • S, 0) en S0; se recorren S0 … Sn en orden, cada uno como una cola, y a cada ítem se le aplica su operación. Se acepta si ($S → S •, 0) está en Sn.
- El Scanner es la **única** operación que lee entrada. Si un conjunto queda vacío, nadie pudo leer ese token: se rechaza.
- El Predictor no agrega un ítem que ya está: por eso la recursión a izquierda (`E → E + T`) no hace un bucle.
- Costo: O(n³) en el peor caso, O(n²) si la gramática no es ambigua.
- Earley simula todas las pilas posibles de un autómata de pila a la vez y las comparte ([guía 26](26-automata-de-pila.md)).

### Ejemplo: `id + id` con `arithmetic`

| Conjunto | Ítem                  | Origen | Cómo        | Qué pasó                                          |
| -------- | --------------------- | ------ | ----------- | ------------------------------------------------- |
| S0       | $S → • E              | 0      | initial     | arranque                                          |
| S0       | E → • E + T, E → • T  | 0      | P           | hace falta un E                                   |
| S0       | T → • T * F, T → • F  | 0      | P           | hace falta un T                                   |
| S0       | F → • ( E ), F → • id | 0      | P           | hace falta un F                                   |
| S1       | F → id •              | 0      | S from S0#7 | se leyó `id`                                      |
| S1       | T → F •               | 0      | C from S0#5 | terminó un F: vuelve a S0 y avanza `T → • F`      |
| S1       | E → T •, T → T • * F  | 0      | C           | terminó un T                                      |
| S1       | $S → E •, E → E • + T | 0      | C           | `id` solo ya es una expresión, o empieza una suma |
| S2       | E → E + • T           | 0      | S from S1#6 | se leyó `+`; `T → T • * F` no pudo leerlo y murió |
| S2       | T → • T * F, …        | 2      | P           | hace falta un T **desde la posición 2**           |
| S3       | F → id •              | 2      | S from S2#5 | se leyó el segundo `id`                           |
| S3       | …, E → E + T •        | 0      | C           | sube hasta la suma completa, de 0 a 3             |
| S3       | **$S → E •**          | 0      | C           | **acepta**                                        |

El algoritmo clásico falla con algunas producciones ε (sección 3.7); lo arregla la [guía 15](15-arreglo-de-epsilon.md).

## 2. Por qué así

| Alternativa                                            | Por qué no                                                                                                                       |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| **LL(1)** ([guía 12](12-tabla-ll1-y-no-ambiguedad.md)) | solo funciona con gramáticas LL(1). G0 tiene 13 conflictos                                                                       |
| **Backtracking** (probar reglas y volver atrás)        | puede tardar un tiempo exponencial, y con recursión a izquierda no termina                                                       |
| **CYK** ([guía 25](25-cyk.md))                         | exige pasar la gramática a Forma Normal de Chomsky, y los árboles dejan de ser los del relato                                    |
| **Earley**                                             | funciona con la gramática tal cual: ambigua, con ε o recursiva a izquierda. Cuesta O(n³) en el peor caso, O(n²) si no es ambigua |

- Los conjuntos dejan registrado **dónde** se trabó la entrada (el primer conjunto vacío, [guía 16](16-diagnostico-de-errores.md)) y **todos** los árboles (los enlaces, guías 19 y 20): las dos cosas que el proyecto necesita mostrar.
- `recognize({ grammar, tokens })` devuelve `{ acceptingItem, accepted, chart, startProduction }`, y lo usan el comando `earley`, el diagnóstico, la traza y los árboles. Los tokens tienen que estar en Σ: el comando llama antes a `checkAlphabet` ([guía 06](06-relato-como-cadena.md)).
- G0 no tiene ε, así que el algoritmo clásico le alcanza; G1 sí, y necesita el arreglo de la guía 15.

## 3. El código, función por función

### 3.1 `recognize({ grammar, tokens })`

```ts
const chart = createChart(tokens.length);
const startProduction = augmentedStartProduction(grammar);
const firstSet = chart[0];
if (firstSet !== undefined) {
  addItem({ set: firstSet, production: startProduction, dot: 0, origin: 0 });
}
for (const set of chart) {
  for (let position = 0; position < set.items.length; position++) {
    const item = set.items[position];
    if (item !== undefined) {
      processItem(grammar, chart, tokens, item);
    }
  }
}
// Acceptance: S was recognized from position 0 to the end, that is, ($S → S •, 0) is in Sn.
const acceptingItem =
  chart[tokens.length]?.byKey.get(itemKey({ production: startProduction, dot: 1, origin: 0 })) ??
  null;
return { acceptingItem, accepted: acceptingItem !== null, chart, startProduction };
```

- `addItem(firstSet, startProduction, 0, 0)`: siembra S0 con ($S → • S, 0), sin enlace.
- **El corazón del algoritmo son los dos `for`.** El de afuera recorre los conjuntos en orden. El de adentro usa `position < set.items.length`, que se vuelve a evaluar en cada vuelta: si `processItem` agrega ítems a este mismo conjunto (Predictor, Completer), la lista crece y el ciclo también los procesa. Así la lista hace de cola de trabajo sin una estructura extra.
- Un `for...of` sobre `set.items` haría lo mismo en JavaScript, pero el índice explícito deja a la vista que la lista crece mientras se recorre.
- Cuando se llega a un conjunto, ya tiene lo que le agregó el Scanner desde el anterior; lo demás lo agregan sus propios ítems.
- `itemKey(startProduction, 1, 0)` es la clave de ($S → S •, 0): S reconocido desde el principio hasta el final. Si está en el último conjunto, se acepta. `recognize` devuelve ese ítem en `acceptingItem` (o `null`), porque los árboles y su conteo parten de él (guías 19 y 20); `accepted` es solo si existe.

### 3.2 `augmentedStartProduction(grammar)`

```ts
return { id: -1, leftSide: AUGMENTED_START, rightSide: [grammar.start] };
```

- La producción de arranque $S → S no es de la gramática: se arma acá. Su `id` es -1 para que su clave no choque con ninguna producción real.
- Sirve para tener **un solo** ítem que diga "terminé": aunque S tenga varias producciones, todas terminan avanzando a ($S → S •, 0).
- `$` está reservado ([guía 02](02-gramatica-libre-de-contexto.md)): ninguna gramática puede tener un símbolo $S.

### 3.3 `processItem(grammar, chart, tokens, item)`

```ts
const next = nextSymbol(item);
if (next === undefined) {
  complete({ context: chart, item });
} else if (grammar.nonterminals.has(next)) {
  predict(grammar, chart, item, next);
} else {
  scan(chart, tokens, item, next);
}
```

- `nextSymbol` (guía 13) da el símbolo después del punto. Los tres casos son excluyentes: siempre corresponde exactamente una operación.

### 3.4 `predict(grammar, chart, item, symbol)`

```ts
for (const production of grammar.productionsByLeftSide.get(symbol) ?? []) {
  addItem({ set, production, dot: 0, origin: item.setIndex });
}
```

- `productionsByLeftSide` (guía 02) da todas las producciones de B sin recorrer P entera.
- Cada una entra con el punto al principio (`0`) y con **origen en el conjunto actual** (`item.setIndex`): si se construye un B, empieza acá.
- No lleva enlace: un ítem predicho todavía no reconoció nada.
- Si el ítem ya está (por ejemplo, `E → E + T` predice otra vez E), `addItem` no lo duplica. **Por eso la recursión a izquierda no hace un bucle**: la segunda predicción de E no agrega nada.

### 3.5 `scan(chart, tokens, item, terminal)`

```ts
const tokenIndex = item.setIndex;
const nextSet = chart[tokenIndex + 1];
if (tokens[tokenIndex] !== terminal || nextSet === undefined) {
  return;
}
addItem({
  set: nextSet,
  production: item.production,
  dot: item.dot + 1,
  origin: item.origin,
  link: {
    kind: 'scan',
    predecessor: item,
    tokenIndex,
  },
});
```

- En el conjunto Sk, el próximo token es `tokens[k]` (los conjuntos están **entre** tokens: Sk está después de k tokens).
- Si no coincide, o si ya no quedan tokens (`nextSet === undefined` en el último conjunto), no hace nada: esa posibilidad muere.
- Si coincide, agrega el **mismo** ítem con el punto un lugar adelante (`dot + 1`) y el **mismo origen**, en el conjunto siguiente.
- El enlace `scan` guarda de qué ítem viene (`predecessor`) y qué token se leyó (`tokenIndex`): con eso se reconstruye después la hoja del árbol.

### 3.6 `complete(chart, item)`

```ts
const originSet = chart[item.origin];
const set = chart[item.setIndex];
for (const waiting of [...originSet.items]) {
  if (nextSymbol(waiting) === item.production.leftSide) {
    addItem({
      set,
      production: waiting.production,
      dot: waiting.dot + 1,
      origin: waiting.origin,
      link: {
        kind: 'complete',
        predecessor: waiting,
        child: item,
      },
    });
  }
}
```

- **El origen dice dónde buscar.** Un B que se completa en Sk empezó en Si (`item.origin`), así que solo en Si puede estar quien lo esperaba.
- `nextSymbol(waiting) === B`: los que tienen el punto justo antes de B, o sea, los que lo esperaban.
- Cada uno avanza: mismo ítem, `dot + 1`, **su** origen (no el de B), en el conjunto **actual** Sk, porque ahora llegó hasta acá.
- El enlace `complete` guarda el ítem que esperaba (`predecessor`) y el B terminado (`child`): es una rama del árbol.
- **`[...originSet.items]` copia la lista:** se recorren los ítems que esperaban **en el momento** de completar B. Cuando origen y conjunto actual son el mismo (B → ε, de i a i), los ítems agregados después no se ven. Es el comportamiento del algoritmo clásico, y es justamente su problema con ε (sección 3.7).

### 3.7 La limitación con ε

Con `epsilon-trap` (`S → A A x`, `A → ε`) y la entrada `x`, el algoritmo clásico **rechaza**, aunque `x` ∈ L(G):

1. En S0, el Predictor agrega `A → •, 0`, que ya está completo.
2. El Completer de `A → •` mira S0 y avanza `S → • A A x` a `S → A • A x, 0`.
3. Ese ítem nuevo espera **otro** A. El Predictor intenta agregar `A → •, 0`, pero **ya está**: no se agrega ni se procesa otra vez.
4. Nadie completa el segundo A: `S → A A • x` no aparece nunca, y `x` no se puede leer.

Desde la [guía 15](15-arreglo-de-epsilon.md) el arreglo está activo y `epsilon-trap` acepta `x`; el algoritmo clásico se ve con `--no-epsilon-fix`.

## 4. Consola y pruebas

```sh
npm run sabueso -- earley --grammar arithmetic --chart "id + id"  # el chart del ejemplo de la sección 1
npm run sabueso -- earley --grammar g0 "CRI SOS PIS INT REV"      # ACCEPTED, código 0: A1
npm run sabueso -- earley --grammar g0 "CRI REV"                  # REJECTED, código 1: I3
```

En `--chart`, los ítems marcados `P` vienen del Predictor, `S from Sk#i` del Scanner y `C from Sk#i` del Completer. Un símbolo fuera de Σ se rechaza antes de correr Earley: `REJECTED: XYZ at position 1 is not in Σ`.

**`packages/core/test/earley/recognizer.test.ts`:**

| Prueba                | Qué verifica                                                                 |
| --------------------- | ---------------------------------------------------------------------------- |
| G0, tabla 9.1         | V1, V2, V3, A1, M1, I5 e I7 aceptadas; I1 a I4 rechazadas                    |
| L1                    | 200 eventos aceptados                                                        |
| gramáticas de libro   | `arithmetic`, `arithmetic-ambiguous` y `parentheses`, aceptadas y rechazadas |
| recursión a izquierda | `E → E + T` se predice una sola vez por conjunto                             |
| el chart de `id + id` | S0, S1 y S2 ítem por ítem (S1 empieza con `F → id •`)                        |
| enlaces               | `scan` guarda el token; `complete` guarda el hijo                            |
| rechazo               | queda un conjunto vacío                                                      |
| ε                     | `epsilon-trap` acepta `x`; en modo clásico la rechaza (guía 15)              |

**`packages/core/test/command-line/earley.test.ts`:** acepta y rechaza con sus códigos, el chart con `--chart`, el símbolo fuera de Σ, la entrada vacía y los errores de uso.

## 5. Referencias

- Earley, J., "An efficient context-free parsing algorithm", _Communications of the ACM_ 13(2), 1970.
- SPEC 02, secciones 3.13 (Predictor), 3.14 (Scanner) y 3.15 (Completer).
