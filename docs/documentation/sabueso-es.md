---
title: 'Sabueso'
subtitle: 'Documentación del núcleo: arquitectura, piezas y cómo se conectan'
date: 'Fundamentos Teóricos de Informática · UNPSJB · 2026'
lang: es
---

# 1. Introducción

Sabueso decide si un relato respeta la estructura de un género narrativo. El género de referencia es el **policial de enigma**: un crimen, una investigación con pistas y sospechas, y la revelación del culpable.

Cada evento del relato se resume con una **etiqueta** (`CRI` es el crimen, `PIS` una pista, `REV` la revelación), y el relato es la secuencia de sus etiquetas, por ejemplo `CRI PIS REV`. Las etiquetas forman el alfabeto Σ, y una gramática libre de contexto G describe los relatos bien formados. Así, "¿este relato es un policial de enigma?" se convierte en una pregunta de la materia: **¿w ∈ L(G)?**

Para responderla, Sabueso implementa desde cero el algoritmo de **Earley** (Earley, 1970), por tres razones:

- **sirve para cualquier GLC**, incluso ambigua o recursiva a izquierda: la gramática es un dato que escribe el autor;
- **da los árboles de derivación**, que muestran la estructura del relato;
- **ubica el error** cuando el relato no pertenece al lenguaje.

El proyecto trae dos gramáticas del policial. **G0**, la del anteproyecto, es natural pero **ambigua**. **G1**, la oficial, es **LL(1)** y por lo tanto no ambigua. Compararlas con las mismas herramientas es uno de los ejes del proyecto.

Este documento describe el núcleo hasta el paso 25 del SPEC 02. Cada sección explica qué hace una pieza, sus funciones clave y cómo se conecta con las demás. El detalle de cada pieza (el código línea por línea y la teoría) está en las guías de estudio (`docs/guides/`) y en las fichas teóricas (`docs/concepts/`); cada sección termina con la referencia.

# 2. Arquitectura

## 2.1 Paquetes y principio de diseño

| Carpeta         | Paquete         | Qué contiene                                                                            |
| --------------- | --------------- | --------------------------------------------------------------------------------------- |
| `packages/core` | `@sabueso/core` | el motor: gramáticas, lector de `.grammar`, análisis, Earley, árboles, FNC y la consola |
| `apps/web`      | `@sabueso/web`  | la interfaz web (Vite y React), que usa la API pública del núcleo                       |
| `specs/`        | —               | los specs del proyecto, uno por etapa                                                   |

**El motor es una librería pura.** Sus funciones reciben datos y devuelven datos: no leen archivos, no escriben en la terminal y no reciben funciones para avisar lo que hacen. Las trazas, las rondas de un punto fijo y los eventos de un autómata vuelven como parte del resultado. La consola y la web solo **muestran** esos resultados.

## 2.2 El recorrido completo

Cada etapa transforma la salida de la anterior, y cada una corresponde a un concepto de la materia:

| Etapa                  | Entrada                | Salida                               | Concepto                          | Módulo                                 | Sección |
| ---------------------- | ---------------------- | ------------------------------------ | --------------------------------- | -------------------------------------- | ------- |
| Lexer                  | texto de un `.grammar` | tokens                               | AFD, lenguaje regular             | `automata/`, `grammar-format/lexer.ts` | 4       |
| Parser                 | tokens                 | reglas y directivas                  | análisis descendente LL(1)        | `grammar-format/parser.ts`             | 4       |
| Construcción           | reglas                 | G = (N, Σ, P, S)                     | gramática libre de contexto       | `grammar/`                             | 3       |
| Análisis               | G                      | anulables, inútiles, FIRST, FOLLOW…  | menor punto fijo, LL(1)           | `analysis/`                            | 6       |
| Tokenizador de relatos | texto del relato       | etiquetas, o "símbolo fuera de Σ"    | alfabeto y cadena                 | `input/`                               | 5       |
| Earley                 | G y las etiquetas      | chart, veredicto, error ubicado      | pertenencia a una GLC             | `earley/`                              | 7       |
| Árboles                | el chart               | árboles, su cantidad, la derivación  | árboles de derivación, ambigüedad | `trees/`                               | 8       |
| API pública            | G y el relato          | un resultado completo                | (encadena las etapas)             | `parse.ts`, `index.ts`                 | 9       |
| FNC                    | G                      | una gramática equivalente, por pasos | formas normales                   | `chomsky-normal-form/`                 | 10      |
| CYK                    | FNC(G) y el relato     | sí o no, la tabla y un árbol FNC     | programación dinámica             | `cocke-younger-kasami/`                | 10      |

Los módulos están en `packages/core/src/`. Además están `genres/` (el catálogo de géneros) y `command-line/` (la consola, sección 11).

# 3. Gramáticas

**Qué hace:** representa una gramática como la cuádrupla de la teoría y la construye validada, ya sea desde código o desde un archivo `.grammar`.

**Se conecta con:** recibe las reglas del parser (sección 4) y entrega G a todas las piezas siguientes.

## 3.1 El modelo y su construcción

Una gramática es un objeto `Grammar` con `nonterminals` (N), `terminals` (Σ), `productions` (P, cada una `{ id, leftSide, rightSide }`) y `start` (S), más `productionsByLeftSide`, las producciones agrupadas por lado izquierdo para expandir un no terminal sin recorrer P. Una producción ε es una con `rightSide` vacío.

`buildGrammar({ name, rules, start?, declaredTerminals? })` arma la cuádrupla en un orden fijo: N son los lados izquierdos; con N conocido, cada símbolo de un lado derecho es no terminal o terminal; Σ son los terminales de P más los declarados; S es el de `%start` o el primer lado izquierdo. Si algo está mal (S sin producciones, una producción repetida, un símbolo no declarado, N ∩ Σ ≠ ∅, un símbolo con `$`), lanza un `GrammarBuildError` que nombra al culpable.

Earley trabaja sobre la gramática **aumentada**, con `$S → S` (`AUGMENTED_START`). Como `$` está reservado, ninguna gramática del autor puede usar ese símbolo.

## 3.2 El formato `.grammar`

Las gramáticas son **datos**: archivos de texto con una regla por línea y alternativas separadas por `|`.

```text
E -> E '+' T | T
T -> T '*' F | F
F -> '(' E ')' | 'id'
```

Un identificador que no es lado izquierdo de ninguna regla es terminal; un literal entre comillas es siempre terminal; `ε` es la cadena vacía; `#` empieza un comentario. `%start` fija el inicial y `%terminals` declara Σ, de modo que un símbolo mal escrito sea un error. El formato tiene su propia gramática, escrita en el mismo formato: `packages/core/grammars/meta.grammar`.

## 3.3 Las gramáticas incluidas y el catálogo

Las gramáticas están en `packages/core/grammars/`:

- **de los géneros:** `g1` (oficial) y `g0` (del anteproyecto), del policial de enigma;
- **de desarrollo:** `meta`, `arithmetic`, `arithmetic-ambiguous`, `parentheses`, y casos de prueba de cada análisis: `epsilon-trap` (ε), `test-useless`, `test-empty` y `test-cyclic`.

G0 y G1 comparten el alfabeto de 14 etiquetas y el esqueleto `Relato → Planteo Investigacion Desenlace`. Se diferencian en la investigación:

| Aspecto           | G0 (10 no terminales, 28 producciones)               | G1 (21 no terminales, 40 producciones)                  |
| ----------------- | ---------------------------------------------------- | ------------------------------------------------------- |
| Pasos             | `Pasos → Paso \| Pasos Pasos`                        | listas por recursión a derecha                          |
| Sospechas         | `Linea → SOS \| SOS Pasos`: no se sabe dónde termina | una línea va de un `SOS` al siguiente o a la resolución |
| Partes opcionales | alternativas repetidas                               | no terminales anulables (`MarcoOpc → Marco \| ε`)       |
| Resultado         | ambigua                                              | LL(1), luego no ambigua                                 |

El catálogo (`genres`) es un dato con cada género, sus gramáticas y el significado de cada etiqueta (`TagInfo`). El motor no depende de él: agregar un género es agregar sus gramáticas y una entrada en el catálogo.

**Detalle:** guías 02 y 05 · fichas 02 y 21.

# 4. Lectura del formato `.grammar`

**Qué hace:** convierte el texto de un archivo `.grammar` en una `Grammar`.

**Se conecta con:** `parseGrammarText({ text, name })` encadena `tokenizeGrammar(text)` → `parseGrammarFile(tokens)` → `buildGrammar`.

Leer el formato es un problema en dos niveles, y cada uno usa la herramienta justa: las "palabras" (nombres, flechas, literales) forman un lenguaje **regular**, que reconoce un AFD; la estructura (reglas, alternativas, directivas) es **libre de contexto**, y la reconoce un parser LL(1). Los errores de los dos niveles son `GrammarSyntaxError`, con línea y columna.

## 4.1 El lexer: un AFD

`runDeterministicAutomaton({ automaton, text })` ejecuta cualquier AFD M = (Q, Σ, δ, q0, F) descrito como dato (`DeterministicAutomatonDefinition`). No sabe nada del formato: el SPEC 04 lo reutiliza.

- **El alfabeto son clases de caracteres** (`classifyCharacter`): letra, dígito, comilla, `%`… Así δ tiene 13 columnas en lugar de una por carácter, y la tabla completa se puede dibujar.
- **Un token por recorrido:** como un AFD solo acepta o rechaza, el ejecutor lo corre desde q0 una vez por token, y avanza mientras δ tenga transición (la regla del **match más largo**, Aho et al. 3.3). Si se detiene en un estado de F, emite el token de ese estado; si no, lanza `AutomatonStoppedError`.
- **Devuelve `{ tokens, events }`:** los tokens y cada transición recorrida. Los eventos son lo que muestra `lex --states`.

El lexer del formato (`grammarLexerAutomaton`) reconoce la forma de una directiva (`%` seguido de letras), y después una tabla de palabras reservadas decide si es `START` o `TERMINALS`: es la técnica habitual de los compiladores para las palabras clave. `tokenizeGrammar(text)` agrega al final un `END_OF_FILE`, que cumple el papel de `$` para el parser.

## 4.2 El parser LL(1)

`parseGrammarFile(tokens)` es un parser **descendente recursivo predictivo** (Aho et al. 4.4) para `meta.grammar`:

- tiene **un método por no terminal** (`parseFile`, `parseRule`, `parseSymbols`…);
- cada método mira **un solo token** y elige la única alternativa que puede empezar con él. Para elegir ε, mira FOLLOW: `Symbols → ε` se elige solo si el próximo token es `BAR` o `NEWLINE`;
- funciona sin retroceso porque `meta.grammar` es LL(1). El propio Sabueso lo verifica: `predictive-table --grammar meta` no tiene conflictos (sección 6.7).

Devuelve las reglas, las directivas y `trace`, la lista de las decisiones del parser con su profundidad (`ParserTraceStep`), que muestra `grammar --parser-trace`. El parser no clasifica símbolos: eso lo hace `buildGrammar`.

**Detalle:** guías 03 y 04 · fichas 03 y 04.

# 5. El relato

**Qué hace:** convierte el texto del relato en una lista de etiquetas y verifica que todas estén en Σ.

**Se conecta con:** su salida es la entrada de Earley (sección 7), junto con la gramática.

- `tokenizeSequence(text)` corta el texto por espacios: `'CRI  PIS\nREV'` da `['CRI', 'PIS', 'REV']`. No necesita un autómata, porque su único separador es el espacio.
- `checkAlphabet({ tokens, grammar })` verifica Σ **antes** de correr Earley. Devuelve `null`, o un `ParseError` de tipo `'unknown-symbol'` con la posición del primer símbolo desconocido.

Separar "¿w ∈ Σ\*?" de "¿w ∈ L(G)?" da mejores mensajes: una etiqueta que no existe y una secuencia mal armada son errores distintos.

**Detalle:** guía 06 · ficha 01.

# 6. Análisis de la gramática

**Qué hace:** estudia la gramática por sí sola, sin ningún relato: qué símbolos pueden desaparecer, si sobra alguno, si el lenguaje es vacío, si hay ciclos, si alcanza un token para decidir.

**Se conecta con:** Earley usa los anulables para el arreglo de ε (7.4); los árboles y la FNC también. Además, el análisis **valida** las gramáticas del proyecto: demuestra con un cálculo que G1 es LL(1). `analyzeGrammar(grammar)` reúne todos los resultados en un `GrammarAnalysis`.

## 6.1 El esquema común: menor punto fijo por rondas

Casi todos los análisis parten de un conjunto inicial y aplican una regla que agrega símbolos según lo que ya se sabe, hasta que una ronda no agrega nada: el **menor punto fijo** de la regla (Hopcroft 7.1). El bucle está escrito una sola vez:

```ts
export function repeatRuleUntilNoChange({ start, newSymbolsOfRound }): Set<SymbolName>[] {
  const rounds: Set<SymbolName>[] = [];
  let knownBefore = new Set(start);
  for (;;) {
    const knownAfter = new Set([...knownBefore, ...newSymbolsOfRound(knownBefore)]);
    rounds.push(knownAfter);
    if (knownAfter.size === knownBefore.size) {
      return rounds; // nothing new: fixed point
    }
    knownBefore = knownAfter;
  }
}
```

- `start` es la base de la inducción: ∅ para los anulables, {S} para los alcanzables.
- `newSymbolsOfRound` es la regla de una ronda: siempre una llamada a una función con nombre (`newNullableSymbols`, `newProductiveSymbols`…), que se lee como la definición inductiva del libro.
- `knownBefore` y `knownAfter` son conjuntos distintos: lo descubierto en una ronda se usa en la siguiente. Así, la ronda i tiene los símbolos que necesitan i aplicaciones de la regla.
- Devuelve **todas las rondas**: la consola las muestra con `--steps`, y `lastRound(rounds)` toma el resultado.
- **Termina** porque el conjunto solo crece dentro de un conjunto finito: a lo sumo |N| + 1 rondas.

FIRST y FOLLOW usan la variante `repeatRuleOnSetsUntilNoChange`, con un conjunto por no terminal.

## 6.2 Los análisis

| Análisis            | Función clave                       | Qué calcula                                                                                                   | En G1                           |
| ------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Anulables           | `computeNullable(grammar)`          | los A con A ⇒\* ε: A → X1…Xk con todos los Xi anulables                                                       | 10 de 21                        |
| Rendimiento mínimo  | `computeMinYield(grammar)`          | el largo de la cadena más corta que deriva cada A; minYield(S) es la oración más corta de L(G)                | 3 (`CRI PIS REV`)               |
| Inútiles y vacuidad | `analyzeUsefulSymbols(grammar)`     | productivos, después alcanzables (en ese orden, Hopcroft 7.1.1); L(G) = ∅ si y solo si S no es productivo     | ninguno inútil; L(G) ≠ ∅        |
| Ciclos              | `findCycles(grammar)`               | los A ⇒+ A, con un grafo unitario (aristas A → B con lo que rodea a B anulable) y una búsqueda en profundidad | ninguno                         |
| FIRST y FOLLOW      | `computeFirstFollow(grammar)`       | con qué terminales empieza cada A y cuáles pueden venir después (Aho et al. 4.4.2)                            | FOLLOW(`Investigacion`) = {REV} |
| Tabla LL(1)         | `buildPredictiveTable({ grammar })` | M[A, a] y sus conflictos: celdas con más de una producción                                                    | 0 conflictos                    |

Tres resultados importan para el resto del proyecto:

- **Los anulables** alimentan el arreglo de ε de Earley, los árboles ε, la búsqueda de ciclos y el paso DEL de la FNC.
- **G1 tiene 0 conflictos, así que es LL(1), y toda gramática LL(1) es no ambigua:** en cada paso de una derivación más a la izquierda, el próximo token determina la producción. La no ambigüedad de G1 queda demostrada por un cálculo, no solo comprobada con ejemplos. G0 tiene 13 conflictos; como la implicación va en un solo sentido, su ambigüedad se muestra aparte, contando árboles (sección 8).
- **Ambigua no es lo mismo que cíclica:** G0 es ambigua pero sin ciclos, así que cada relato tiene una cantidad finita de árboles. Una gramática cíclica (`test-cyclic`) tiene infinitos.

**Detalle:** guías 07 a 12 · fichas 05 a 10.

# 7. El reconocedor de Earley

**Qué hace:** decide si las etiquetas del relato forman una cadena de L(G), y deja en el chart todo lo necesario para explicar la respuesta.

**Se conecta con:** recibe G, sus anulables (sección 6) y las etiquetas verificadas (sección 5). Entrega una `Recognition` (veredicto, chart con enlaces y traza) que usan el diagnóstico, los árboles y la API, sin volver a correr Earley.

## 7.1 Ítems y chart

Un ítem es una tupla **(A → α • β, j)**: "estoy reconociendo una A; ya reconocí α desde la posición j y me falta β". En el código es un `EarleyItem` con la producción, la posición del punto, el origen j y sus enlaces. `label(item)` lo escribe como `E → E + • T, 0`.

Para n etiquetas, el chart tiene n + 1 conjuntos S0 … Sn: Sk guarda las posibilidades vivas después de leer k etiquetas. Cada `EarleySet` tiene una lista de ítems, que también funciona como cola de trabajo, y un mapa por clave para no repetirlos. `addItem` es la única forma de agregar un ítem: si ya está, solo le suma el enlace nuevo. Como los ítems posibles son finitos, el algoritmo siempre termina.

## 7.2 Las tres operaciones y el bucle principal

Según el símbolo que sigue al punto, se aplica exactamente una operación:

| Operación | Cuándo                 | Qué hace                                                           |
| --------- | ---------------------- | ------------------------------------------------------------------ |
| Predictor | sigue un no terminal B | agrega (B → • γ, k) a Sk, para cada B → γ                          |
| Scanner   | sigue un terminal a    | si la etiqueta k es a, agrega el ítem con el punto avanzado a Sk+1 |
| Completer | el punto está al final | (B → γ •, i) en Sk avanza a cada ítem de Si que esperaba una B     |

```ts
addItem({ set: chart[0], production: startProduction, dot: 0, origin: 0 });
for (const set of chart) {
  for (let position = 0; position < set.items.length; position++) {
    processItem({ context, item: set.items[position] });
  }
}
const accepted = chart[tokens.length].byKey.has(
  itemKey({ production: startProduction, dot: 1, origin: 0 }),
);
```

(Fragmento simplificado de `recognize`.)

- S0 empieza con ($S → • S, 0): "quiero reconocer una S desde la posición 0".
- El `for` externo recorre los conjuntos en orden. El Scanner solo agrega al conjunto siguiente, así que un conjunto terminado ya no cambia.
- El `for` interno compara con `set.items.length` en cada vuelta: los ítems que se agregan mientras se recorre también se procesan.
- `processItem` llama a `predict`, `scan` o `complete` según el símbolo después del punto.
- **Aceptación:** w ∈ L(G) si y solo si ($S → S •, 0) ∈ Sn.

En teoría, Earley cuesta O(n³) en el peor caso y O(n²) con gramáticas no ambiguas (Earley, 1970). Con G1, un relato de 200 etiquetas se reconoce y se cuenta en unos 16 ms.

## 7.3 Los enlaces

Cada vez que el punto avanza, el ítem nuevo guarda un enlace (`Link`) con su predecesor y la causa: la etiqueta leída (`scan`), el ítem completo (`complete`) o el anulable saltado (`nullable`). Un ítem con **varios** enlaces se alcanzó de varias formas: ahí queda registrada la ambigüedad. La sección 8 recorre estos enlaces hacia atrás.

## 7.4 El arreglo de ε (Aycock y Horspool)

El algoritmo clásico rechaza `x` con `epsilon-trap` (`S → A A x`, `A → ε`): después de completar la primera A, el Predictor no vuelve a agregar (A → •, 0) porque ya está en S0, y nadie avanza la segunda A. El arreglo de Aycock y Horspool (2002) resuelve esto en el Predictor: si el símbolo predicho es **anulable**, además avanza el punto sobre él en el momento, con un enlace `nullable`. A cambio, el Completer saltea los ítems que reconocieron ε, para no repetir avances. La opción `classicEpsilon` apaga el arreglo, para comparar (`earley --no-epsilon-fix`).

## 7.5 Diagnóstico y traza

- `diagnose({ grammar, chart, tokens, accepted })` lee el chart y devuelve un `ParseError`: `unexpected-token` si algún conjunto quedó vacío (nada pudo leer esa etiqueta), o `unexpected-end` si el relato terminó antes de tiempo. `expected` son los terminales que siguen al punto en el último conjunto vivo. Por ejemplo, G0 rechaza `CRI REV` en el evento 2 y espera, entre otras, `PIS` o `SOS`.
- Con la opción `trace`, el reconocedor registra cada ítem agregado, en orden, con su operación y su causa (`TraceEvent`). La causa se pasa como dato (`TraceCause`) y se convierte en texto con `describeCause` solo cuando hay traza: sin la opción, no cuesta nada.

**Detalle:** guías 13 a 17 · fichas 11 a 17.

# 8. Árboles y ambigüedad

**Qué hace:** arma, cuenta y escribe como derivaciones los árboles de un relato aceptado.

**Se conecta con:** trabaja sobre la `Recognition` de Earley (los enlaces del chart) y sobre los anulables, sin volver a correr Earley. Su resultado es parte de la API (sección 9).

Un árbol es un `ParseTree` con hojas terminales, hojas ε y nodos no terminales con la producción usada.

## 8.1 Armar y contar

- **Armar:** desde ($S → S •, 0) en Sn, se siguen los enlaces hacia atrás. Cada ítem completo es un nodo, y sus enlaces dan los hijos. Un ítem con varios enlaces da varios árboles. `parseTrees({ grammar, recognition, limit })` los produce de a uno (con un generador) y se detiene en el límite (50 por defecto).
- **Árboles ε:** un enlace `nullable` no apunta a ningún ítem, así que los subárboles vacíos se arman desde la gramática (`epsilonTrees`).
- **Contar:** `countTrees({ grammar, recognition })` recorre los mismos enlaces sumando y multiplicando, sin armar ningún árbol:

```ts
function countItem({ context, item }) {
  const remembered = context.known.get(item);
  if (remembered !== undefined) return remembered;
  if (item.dot === 0) return 1n;
  if (context.inProgress.has(item)) return 'infinite';
  context.inProgress.add(item);
  let total: TreeCount = 0n;
  for (const link of item.links) {
    const ways = multiplyCounts({
      first: countItem({ context, item: link.predecessor }),
      second: countCause({ context, link }),
    });
    total = addCounts({ first: total, second: ways });
  }
  context.inProgress.delete(item);
  context.known.set(item, total);
  return total;
}
```

- `context.known` guarda la cuenta de cada ítem: cada uno se cuenta **una vez**. Es programación dinámica, y el trabajo depende de la cantidad de ítems, no de la de árboles.
- Los enlaces son formas **alternativas** de llegar al ítem: se suman.
- Dentro de un enlace, el predecesor y la causa son elecciones **independientes**: se multiplican.
- Volver a un ítem que se está contando (`inProgress`) significa un ciclo: infinitos árboles.
- `TreeCount` es `bigint | 'infinite'`, porque `number` solo es exacto hasta 2⁵³.

## 8.2 La derivación más a la izquierda

`leftmostDerivation(tree)` recorre el árbol en **preorden** y aplica las producciones en ese orden. Funciona porque el preorden expande cada nodo y todo lo que tiene debajo antes que sus hermanos de la derecha, igual que una derivación más a la izquierda (Hopcroft 5.2). `renderDerivation` la escribe paso a paso.

## 8.3 G0 frente a G1

| Relato                       | Árboles en G0                     | Árboles en G1 |
| ---------------------------- | --------------------------------- | ------------- |
| A1: `CRI SOS PIS INT REV`    | 4                                 | 1             |
| L1: 200 etiquetas (`l1.txt`) | un número de 115 dígitos (238 ms) | 1 (16 ms)     |

G0 es ambigua porque `Pasos → Pasos Pasos` agrupa los pasos de todas las formas posibles, y la cantidad crece exponencialmente. Una gramática es ambigua si y solo si alguna cadena tiene dos derivaciones más a la izquierda distintas: `derive --grammar g0 --tree 2` muestra la segunda del mismo relato. En G1 el conteo siempre da 1, como predice la tabla LL(1).

**Detalle:** guías 18 a 21 · fichas 18 a 21.

# 9. La API pública

**Qué hace:** define en `packages/core/src/index.ts` lo que se puede usar desde afuera del núcleo. Es el contrato con la interfaz web (SPEC 03) y con el español controlado (SPEC 04): lo que no se exporta es interno.

**Se conecta con:** encadena todas las piezas anteriores, sin agregar ningún algoritmo.

`parse({ grammar, input, options })` hace el análisis completo de un relato:

| Paso | Función                                          | Si falla                                    |
| ---- | ------------------------------------------------ | ------------------------------------------- |
| 1    | `tokenizeSequence` (si `input` es texto)         | —                                           |
| 2    | `checkAlphabet`                                  | devuelve `unknown-symbol` sin correr Earley |
| 3    | `recognize` (Earley)                             | —                                           |
| 4    | `diagnose`                                       | devuelve el error junto con el chart        |
| 5    | `parseTrees`, `countTrees`, `leftmostDerivation` | —                                           |

`ParseResult` es una unión discriminada por `accepted`: si es `true`, trae `trees`, `treeCount` y `derivation`; si es `false`, trae `error`. Los dos traen `tokens`, `chart` y `trace`. TypeScript obliga a mirar `accepted` antes de leer el resto. Las opciones (`ParseOptions`) son `maxTrees`, `trace`, `countTrees` y `classicEpsilon`.

Las demás exportaciones, por área:

| Área               | Exporta                                                                                              |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| Gramáticas         | `buildGrammar`, `parseGrammarText`, `tokenizeGrammar`, `formatProduction` y los tipos del modelo     |
| Autómata finito    | `runDeterministicAutomaton` y sus tipos (para el lexer del SPEC 04)                                  |
| Análisis           | `analyzeGrammar` y `GrammarAnalysis`                                                                 |
| Mostrar resultados | `label`, `dottedRule`, `renderTree`, `renderDerivation`                                              |
| FNC                | `toChomskyNormalForm`, `isChomskyNormalForm` y cada paso por separado (`addNewStart`, …, `binarize`) |
| CYK                | `recognizeCockeYoungerKasami` y `CockeYoungerKasamiResult`                                           |
| Catálogo           | `genres`                                                                                             |
| Consola            | `createCommandLineProgram`, `formatTable`, `formatSet` (para sumar los comandos del SPEC 04)         |

**Detalle:** guía 22.

# 10. Forma Normal de Chomsky y CYK

**Qué hace:** convierte una gramática a FNC (cada producción es A → BC o A → a, y S → ε solo si ε ∈ L(G) y S no aparece a la derecha; Hopcroft 7.1), sin cambiar su lenguaje.

**Se conecta con:** usa los anulables y el punto fijo de la sección 6. Su destino es el algoritmo CYK, que solo funciona con gramáticas en FNC, para comparar sus árboles con los de Earley y para validar Earley contra CYK.

La conversión tiene seis transformaciones. Cada una es una función que recibe una gramática y devuelve otra con el mismo lenguaje, sin modificar la original, así que se pueden encadenar y mostrar paso a paso. Las tres primeras **limpian** la gramática y las tres últimas le dan la **forma** final:

| Paso    | Función                             | Qué hace                                                                                                                  | G1                 |
| ------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| START   | `addNewStart(grammar)`              | agrega `S0 → S` solo si el inicial aparece en algún lado derecho                                                          | 40 (no hace falta) |
| DEL     | `removeEpsilonProductions(grammar)` | reemplaza cada producción por sus versiones con y sin sus anulables, y borra las ε (salvo la del inicial si ε ∈ L(G))     | 46                 |
| UNIT    | `removeUnitProductions(grammar)`    | con los pares unitarios (`computeUnitPairs`, el mismo punto fijo), copia a cada A las producciones no unitarias de cada B | 69                 |
| USELESS | `removeUselessSymbols(grammar)`     | con el análisis de la sección 6, borra los no terminales no productivos o no alcanzables (en G1, `Descarte`)              | 67                 |
| TERM    | `isolateTerminals(grammar)`         | en los lados derechos de largo ≥ 2, cambia cada terminal a por `T_a`, con `T_a → a`                                       | 75                 |
| BIN     | `binarize(grammar)`                 | parte cada lado derecho de largo k ≥ 3 en una cadena de k − 1 producciones con `X1`, `X2`, …                              | 78                 |

- **`toChomskyNormalForm(grammar)`** encadena los seis pasos de `CHOMSKY_NORMAL_FORM_STEPS` y devuelve la gramática final, si conserva ε (`acceptsEmpty`) y la gramática después de cada paso. **`isChomskyNormalForm(grammar)`** verifica el resultado producción por producción.
- **El orden importa:** DEL crea unitarias nuevas (`Planteo → Hecho MarcoOpc` da `Planteo → Hecho`), así que UNIT va después. DEL y UNIT dejan símbolos inútiles, así que USELESS va después de los dos. TERM va antes que BIN para que BIN solo vea no terminales.
- **Cada paso arma la gramática nueva con `rewriteGrammar`, no con `buildGrammar`,** porque conserva N: un no terminal que se queda sin producciones (A en `epsilon-trap`) no debe pasar a ser terminal.
- Las pruebas verifican que el lenguaje se preserva después de cada paso y que las 10 gramáticas terminan en FNC.

## 10.1 CYK

**Qué hace:** `recognizeCockeYoungerKasami({ grammar, tokens })` decide w ∈ L(G) sobre una gramática **ya** en FNC (Hopcroft 7.4.4). Llena la tabla T[i][l], los no terminales que derivan las l etiquetas desde la posición i: las celdas de largo 1 salen de A → a, y las de largo l ≥ 2 de A → B C, probando cada división en dos partes más cortas. Acepta si el inicial está en T[0][n]. Cuesta O(n³·|G|) siempre.

**Se conecta con:** recibe la salida de `toChomskyNormalForm` y devuelve un `ParseTree`, el mismo tipo que Earley, reconstruido desde la tabla. Así el comando `cocke-younger-kasami --compare` dibuja los dos árboles lado a lado: con `CRI PIS REV` y G1, el de CYK tiene `X1` y pierde diez categorías del género (`Hecho`, `MarcoOpc`, `Pasos`…). Es la comparación que justifica usar Earley. Las pruebas verifican que CYK sobre FNC(G) y Earley sobre G aceptan exactamente las mismas cadenas cortas.

**Pendiente:** el autómata de pila y las búsquedas acotadas (pasos 26 y 27 del SPEC 02).

**Detalle:** guías 23, 24 y 25 · fichas 22 y 23.

# 11. La consola

La consola `sabueso` muestra cada pieza del motor por separado: cada comando llama al motor y formatea el resultado, sin lógica propia. Se ejecuta con `npm run sabueso -- <comando>`, y la gramática se elige con `--grammar <nombre>` o `--grammar-file <ruta>`.

| Comando                                                                                    | Qué muestra                                                                | Sección |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ------- |
| `genres`, `grammars`                                                                       | el catálogo y las gramáticas incluidas                                     | 3       |
| `lex`, `grammar`                                                                           | los tokens y las transiciones del AFD; la gramática y la traza del parser  | 4       |
| `tokens`                                                                                   | un relato separado en etiquetas y verificado contra Σ                      | 5       |
| `nullable`, `min-yield`, `useful`, `cycles`, `first-follow`, `predictive-table`, `analyze` | cada análisis; con `--steps`, las rondas del punto fijo                    | 6       |
| `items`, `earley`, `trace`                                                                 | las reglas punteadas, el chart y cada paso de Earley                       | 7       |
| `epsilon-trees`, `trees`, `count`, `derive`                                                | los árboles, su cantidad y la derivación                                   | 8       |
| `parse`                                                                                    | el análisis completo de un relato                                          | 9       |
| `chomsky-normal-form`                                                                      | la gramática después de cada paso de la FNC                                | 10      |
| `cocke-younger-kasami`                                                                     | la tabla CYK, el veredicto y el árbol FNC; con `--compare`, junto a Earley | 10.1    |

El recorrido completo, con la salida de cada comando, está en `docs/console-demo.md`. Una prueba verifica que cada comando de ese documento siga siendo válido.

# 12. Pruebas y calidad

- **831 pruebas** (Vitest), organizadas como el código, más una prueba de integración de la API pública.
- **Contra cálculos hechos a mano:** el chart de `CRI PIS REV` con G1 coincide ítem por ítem con el del spec, y la derivación de A1 tiene sus mismos 18 pasos.
- **Propiedades del lenguaje:** después de cada paso de la FNC, las oraciones cortas de G1 se siguen aceptando, y G0 y G1 aceptan y rechazan lo mismo hasta largo 3. CYK sobre FNC(G) y Earley sobre G aceptan las mismas cadenas.
- **Casos borde:** gramáticas con ε, con símbolos inútiles, con lenguaje vacío y con ciclos.
- **Calidad del código:** TypeScript estricto, ESLint y Prettier. Los hooks de git verifican formato y lint antes de cada commit y corren las pruebas antes de cada push. La integración continua repite todo en cada push.

# 13. Referencias

- Aho, A., Lam, M., Sethi, R. y Ullman, J., _Compiladores: principios, técnicas y herramientas_ (2.ª ed.). Capítulos 3 y 4.
- Augusto, material de la cátedra de Fundamentos Teóricos de Informática, UNPSJB. Capítulos 1 a 3.
- Aycock, J. y Horspool, R. N., "Practical Earley Parsing", _The Computer Journal_ 45(6), 2002.
- Earley, J., "An efficient context-free parsing algorithm", _Communications of the ACM_ 13(2), 1970.
- Hopcroft, J., Motwani, R. y Ullman, J., _Introducción a la teoría de autómatas, lenguajes y computación_. Capítulos 2, 5, 6 y 7.
- Sipser, M., _Introducción a la teoría de la computación_. Capítulo 2.
