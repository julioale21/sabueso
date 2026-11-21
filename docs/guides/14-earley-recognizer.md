# Guía de estudio: 14 — El reconocedor de Earley

> **Paso 14 del SPEC 02.** Archivos: `packages/core/src/earley/recognizer.ts` y `packages/core/src/command-line/commands/earley.ts`.
> Fichas teóricas relacionadas: [`13-predictor.md`](../concepts/13-predictor.md), [`14-scanner.md`](../concepts/14-scanner.md) y [`15-completer.md`](../concepts/15-completer.md).

---

## 1. El problema que resuelve

Es el corazón del proyecto: decidir si una cadena pertenece a L(G), **para cualquier gramática libre de contexto**. Con este paso el programa ya responde "¿este relato es un policial?" con G0.

La idea del algoritmo está explicada en forma simple en la guía 13, sección 2: seguir todas las posibilidades a la vez, con un conjunto de ítems por cada posición de la entrada, y tres operaciones (Predictor, Scanner, Completer). Este paso las escribe en código.

**Lo que se completa después:** el algoritmo clásico de este paso tiene un problema con las producciones ε (sección 7). G0 no tiene ε, así que funciona perfecto; G1 sí, y el arreglo está en el paso 15 ([guía 15](15-epsilon-fix.md)). Los mensajes de error detallados ("se esperaba…") llegan en el paso 16.

---

## 2. Por qué Earley

| Alternativa                                     | Por qué no                                                                                                                       |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **LL(1)** (paso 12)                             | solo funciona con gramáticas LL(1). G0 tiene 13 conflictos                                                                       |
| **Backtracking** (probar reglas y volver atrás) | puede tardar un tiempo exponencial, y con recursión a izquierda no termina                                                       |
| **CYK** (paso 25)                               | exige pasar la gramática a Forma Normal de Chomsky, y los árboles dejan de ser los del relato                                    |
| **Earley**                                      | funciona con la gramática tal cual: ambigua, con ε o recursiva a izquierda. Cuesta O(n³) en el peor caso, O(n²) si no es ambigua |

Además, los conjuntos de Earley dejan registrado **dónde** se trabó la entrada (el primer conjunto vacío) y **todos** los árboles (los enlaces), que son las dos cosas que el proyecto necesita mostrar.

---

## 3. Cómo se usa en el programa

| Quién                      | Llama a     | Recibe                               |
| -------------------------- | ----------- | ------------------------------------ |
| comando `earley` (paso 14) | `recognize` | si acepta, y el chart para `--chart` |
| diagnóstico (paso 16)      | `recognize` | el chart, para encontrar el error    |
| traza (paso 17)            | `recognize` | cada operación, en orden             |
| árboles y conteo (18 a 21) | `recognize` | los enlaces de los ítems             |

`recognize({ grammar, tokens })` devuelve `{ accepted, chart, startProduction }`. Los tokens tienen que estar en Σ: el comando llama antes a `checkAlphabet` (paso 6).

---

## 4. Cómo funciona

1. Se crean n + 1 conjuntos vacíos y se pone en S0 el ítem de arranque ($S → • S, 0).
2. Se recorren los conjuntos en orden, S0, S1, …, Sn. Cada uno se recorre **como una cola**: con un índice que avanza mientras la lista crece, así también se procesan los ítems que se agregan durante el recorrido.
3. A cada ítem se le aplica la única operación que corresponde según el símbolo después del punto:
   - no terminal → **Predictor**: agrega sus producciones al mismo conjunto;
   - terminal → **Scanner**: si coincide con el token, agrega el ítem avanzado al conjunto siguiente;
   - nada → **Completer**: vuelve al conjunto de origen y avanza a los que esperaban este no terminal.
4. Al final, la entrada se acepta si ($S → S •, 0) está en Sn.

### 4.1 Qué es Sk

**Sk es el conjunto número k**: la libreta de la **posición k** del relato, el punto **después de haber leído k eventos**. Con `CRI PIS REV` hay 4 posiciones y 4 conjuntos:

| Conjunto | Posición                   |
| -------- | -------------------------- |
| S0       | antes de leer nada         |
| S1       | después de CRI (1 evento)  |
| S2       | después de PIS (2 eventos) |
| S3       | después de REV: el final   |

El Predictor y el Completer trabajan **en la misma libreta** Sk: no leen nada. El único que pasa de Sk a S(k+1) es el Scanner, al leer un evento.

**Ojo: S0 no es CRI.** Las libretas están **entre** los eventos: S0 es la posición **antes** de CRI, y CRI se lee al pasar de S0 a S1. Y lo primero que se anota en S0, `$S → • Relato`, no es algo leído sino el **objetivo**: lo que se quiere armar. Earley empieza por la meta y baja con el Predictor (Relato → Planteo → Hecho → `Hecho → • CRI`) hasta llegar a los eventos que pueden venir primero. Recién entonces el Scanner mira el evento real.

### 4.2 La secuencia completa, en alto nivel: `CRI PIS REV` con G0

En cada libreta pasan tres cosas: **llega** lo que leyó el Scanner, **sube** lo que se completó (Completer) y **baja** lo que se va a necesitar (Predictor).

| Libreta | Llega (Scanner)                                         | Sube (Completer)                                                                        | Baja (Predictor)                                                 | El próximo evento puede ser…                |
| ------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------- |
| **S0**  | — (arranque: "quiero un Relato")                        | —                                                                                       | Relato → Planteo → Hecho o Marco                                 | CRI, HAL, CTX, PER                          |
| **S1**  | CRI: `Hecho → CRI •` y `Hecho → CRI • HAL`              | terminó un Hecho → el Planteo → el Relato avanza: "falta Investigación y Desenlace"     | Investigación → Pasos → Paso; también un Marco que siga al Hecho | HAL, CTX, PER, ENC, PIS, INT, DSC, ATQ, SOS |
| **S2**  | PIS: `Paso → PIS •`                                     | terminó un Paso → los Pasos → la Investigación → el Relato avanza: "falta el Desenlace" | Desenlace → Resolución; también más Pasos                        | REV, o un paso más                          |
| **S3**  | REV: `Resolucion → REV •` (y las que esperan CNF o CAP) | terminó la Resolución → el Desenlace → **el Relato desde 0** → `$S → Relato •, 0`       | —                                                                | (fin)                                       |

**Resultado:** el ítem de arranque está completo en la última libreta: **ACCEPTED**.

En una frase: en cada posición, Earley **baja** para anotar qué eventos pueden venir, **lee** el evento real y se queda con lo que encaja, y **sube** para cerrar lo que ese evento terminó. Si al final se cerró el Relato entero, es válido; si una libreta queda vacía (como con `CRI REV`, donde nadie en S1 esperaba REV), no.

Para verlo de forma gráfica, ítem por ítem, abrir [`docs/interactive/earley-g0.html`](../interactive/earley-g0.html) en el navegador. Los 60 pasos explicados uno por uno, en texto, están en [`docs/interactive/earley-g0-cri-pis-rev.md`](../interactive/earley-g0-cri-pis-rev.md).

---

## 5. El código, función por función

### 5.1 `recognize({ grammar, tokens })`

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
const lastSet = chart[tokens.length];
const accepted =
  lastSet?.byKey.has(itemKey({ production: startProduction, dot: 1, origin: 0 })) ?? false;
return { accepted, chart, startProduction };
```

- `addItem(firstSet, startProduction, 0, 0)`: siembra S0 con ($S → • S, 0), sin enlace.
- **El corazón del algoritmo son los dos `for`.** El de afuera recorre los conjuntos en orden. El de adentro usa `position < set.items.length`, que se vuelve a evaluar en cada vuelta: si `processItem` agrega ítems a este mismo conjunto (Predictor, Completer), la lista crece y el ciclo también los procesa. Así la lista hace de cola de trabajo sin una estructura extra.
- Un `for...of` sobre `set.items` haría lo mismo en JavaScript, pero el índice explícito deja a la vista que la lista crece mientras se recorre.
- Cuando se llega a un conjunto, ya está completo de lo que le agregó el Scanner desde el anterior; lo demás lo agregan sus propios ítems.
- `itemKey(startProduction, 1, 0)` es la clave de ($S → S •, 0): S reconocido desde el principio hasta el final. Si está en el último conjunto, se acepta.

### 5.2 `augmentedStartProduction(grammar)`

```ts
return { id: -1, leftSide: AUGMENTED_START, rightSide: [grammar.start] };
```

- La producción de arranque $S → S no es de la gramática: se arma acá. Su `id` es -1 para que su clave no choque con ninguna producción real.
- Sirve para tener **un solo** ítem que diga "terminé": aunque S tenga varias producciones, todas terminan avanzando a ($S → S •, 0).
- `$` está reservado (paso 2): ninguna gramática puede tener un símbolo $S.

### 5.3 `processItem(grammar, chart, tokens, item)`

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

- `nextSymbol` (paso 13) da el símbolo después del punto. Los tres casos son excluyentes: siempre corresponde exactamente una operación.

### 5.4 `predict(grammar, chart, item, symbol)`

```ts
for (const production of grammar.productionsByLeftSide.get(symbol) ?? []) {
  addItem({ set, production, dot: 0, origin: item.setIndex });
}
```

- `productionsByLeftSide` (paso 2) da todas las producciones de B sin recorrer P entera.
- Cada una entra con el punto al principio (`0`) y con **origen en el conjunto actual** (`item.setIndex`): si se construye un B, empieza acá.
- No lleva enlace: un ítem predicho todavía no reconoció nada.
- Si el ítem ya está (por ejemplo, `E → E + T` predice otra vez E), `addItem` no lo duplica. **Por eso la recursión a izquierda no hace un bucle**: la segunda predicción de E no agrega nada.

### 5.5 `scan(chart, tokens, item, terminal)`

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

### 5.6 `complete(chart, item)`

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
- **`[...originSet.items]` copia la lista:** se recorren los ítems que esperaban **en el momento** de completar B. Cuando origen y conjunto actual son el mismo (B → ε, de i a i), los ítems agregados después no se ven. Es el comportamiento del algoritmo clásico, y es justamente su problema con ε (sección 7).

---

## 6. Ejemplo recorrido a mano: `id + id` con `arithmetic`

```sh
npm run sabueso -- earley --grammar arithmetic --chart "id + id"
```

| Conjunto | Ítem                  | Origen | Cómo        | Qué pasó                                          |
| -------- | --------------------- | ------ | ----------- | ------------------------------------------------- |
| S0       | $S → • E              | 0      | initial     | arranque                                          |
| S0       | E → • E + T           | 0      | P           | hace falta un E                                   |
| S0       | E → • T               | 0      | P           |                                                   |
| S0       | T → • T * F, T → • F  | 0      | P           | hace falta un T                                   |
| S0       | F → • ( E ), F → • id | 0      | P           | hace falta un F                                   |
| S1       | F → id •              | 0      | S from S0#7 | se leyó `id`                                      |
| S1       | T → F •               | 0      | C from S0#5 | terminó un F: avanza `T → • F`                    |
| S1       | E → T •               | 0      | C from S0#3 | terminó un T: avanza `E → • T`                    |
| S1       | T → T • * F           | 0      | C from S0#4 | y también `T → • T * F`                           |
| S1       | $S → E •              | 0      | C from S0#1 | `id` solo ya es una expresión                     |
| S1       | E → E • + T           | 0      | C from S0#2 | o el comienzo de una suma                         |
| S2       | E → E + • T           | 0      | S from S1#6 | se leyó `+`; `T → T • * F` no pudo leerlo y murió |
| S2       | T → • T * F, …        | 2      | P           | hace falta un T **desde la posición 2**           |
| S3       | F → id •              | 2      | S from S2#5 | se leyó el segundo `id`                           |
| S3       | …                     |        | C           | sube: T, y `E → E + T •, 0` (avanza el de S2)     |
| S3       | **$S → E •**          | 0      | C           | **acepta**                                        |

Los ítems de S3 con origen 2 son el segundo `id` (de la posición 2 a la 3). `E → E + T •` tiene origen 0: la suma completa, de 0 a 3.

---

## 7. La limitación con ε (se arregla en el paso 15)

Con `epsilon-trap` (`S → A A x`, `A → ε`) y la entrada `x`, el algoritmo **rechaza**, aunque `x` ∈ L(G):

1. En S0, el Predictor agrega `A → •, 0`, que ya está completo.
2. El Completer de `A → •` mira S0 y avanza `S → • A A x` a `S → A • A x, 0`.
3. Ese ítem nuevo espera **otro** A. El Predictor intenta agregar `A → •, 0`, pero **ya está**: no se agrega ni se procesa otra vez.
4. Nadie completa el segundo A: `S → A A • x` no aparece nunca, y `x` no se puede leer.

El problema: un ítem que espera un símbolo anulable aparece **después** de que ese símbolo ya se completó en el mismo conjunto. G0 no tiene ε, así que no le afecta. G1 sí, y por eso el paso 15 agrega el arreglo de Aycock y Horspool. Desde el paso 15, el arreglo está activo y `epsilon-trap` acepta `x`; el algoritmo clásico se puede ver con `--no-epsilon-fix` (guía 15).

---

## 8. Consola y pruebas

```sh
npm run sabueso -- earley --grammar arithmetic "id + id * id"   # ACCEPTED, código 0
npm run sabueso -- earley --grammar g0 "CRI SOS PIS INT REV"    # ACCEPTED: A1
npm run sabueso -- earley --grammar g0 "CRI REV"                # REJECTED, código 1: I3
```

Un símbolo fuera de Σ se rechaza antes de correr Earley: `REJECTED: XYZ at position 1 is not in Σ`.

**`test/earley/recognizer.test.ts`:**

| Prueba                | Qué verifica                                                                 |
| --------------------- | ---------------------------------------------------------------------------- |
| G0, tabla 9.1         | V1, V2, V3, A1, M1, I5 e I7 aceptadas; I1 a I4 rechazadas                    |
| L1                    | 200 eventos aceptados                                                        |
| gramáticas de libro   | `arithmetic`, `arithmetic-ambiguous` y `parentheses`, aceptadas y rechazadas |
| recursión a izquierda | `E → E + T` se predice una sola vez por conjunto                             |
| el chart de `id + id` | S0, S1 y S2 ítem por ítem                                                    |
| enlaces               | `scan` guarda el token; `complete` guarda el hijo                            |
| rechazo               | queda un conjunto vacío                                                      |
| ε                     | (paso 15) `epsilon-trap` acepta `x`; en modo clásico la rechaza (guía 15)    |

**`test/command-line/earley.test.ts`:** acepta y rechaza con sus códigos, el chart con `--chart`, el símbolo fuera de Σ, la entrada vacía y los errores de uso.

---

## 9. Preguntas probables en la defensa

**¿Cómo decide Earley si acepta?**
Si el ítem ($S → S •, 0) está en el último conjunto: S se reconoció desde la posición 0 hasta el final.

**¿Por qué la recursión a izquierda no lo hace entrar en un bucle?**
Porque el Predictor no agrega un ítem que ya está. `E → E + T` predice E, cuyas producciones ya se agregaron: no pasa nada nuevo.

**¿Por qué el Completer vuelve al conjunto de origen?**
Porque un B que terminó en k empezó en i (su origen), y quien lo esperaba lo predijo en i. Solo en Si puede estar el ítem que tenía el punto antes de B.

**¿Cuál es el costo?**
O(n³) en el peor caso (gramáticas ambiguas como G0) y O(n²) si la gramática no es ambigua. L1, con 200 eventos, tarda alrededor de 0,1 segundos con G0.

**¿Qué relación tiene con el autómata de pila?**
Earley simula todas las pilas posibles del autómata a la vez. Un ítem es un pedazo de pila, y su origen apunta a lo que estaba debajo. En lugar de copiar pilas, las comparte.

**¿Qué problema tiene el algoritmo clásico?**
Con producciones ε: si un ítem empieza a esperar un símbolo anulable después de que ese símbolo ya se completó en el mismo conjunto, nunca avanza. Lo muestra `epsilon-trap`; lo arregla el paso 15.
