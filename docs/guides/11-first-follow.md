# Guía de estudio: 11 — FIRST y FOLLOW

> **Paso 11 del SPEC 02.** Archivos: `packages/core/src/analysis/first-follow.ts`, `repeatRuleOnSetsUntilNoChange` en `packages/core/src/analysis/fixed-point.ts` y `packages/core/src/command-line/commands/first-follow.ts`.
> Ficha teórica relacionada: [`docs/concepts/05-first-follow.md`](../concepts/05-first-follow.md).

---

## 1. El problema que resuelve

Un analizador **LL(1)** arma la derivación de izquierda a derecha **mirando un solo símbolo adelante**, sin adivinar y sin volver atrás. Para eso, en cada momento tiene que poder decidir qué regla usar. Dos preguntas lo resuelven:

| Pregunta                                                         | Conjunto   | Sirve para…                                           |
| ---------------------------------------------------------------- | ---------- | ----------------------------------------------------- |
| ¿Con qué terminal puede **empezar** lo que deriva esta regla?    | **FIRST**  | elegir entre las reglas de un no terminal             |
| ¿Qué terminal puede venir **justo después** de este no terminal? | **FOLLOW** | saber cuándo usar una regla ε (saltear algo opcional) |

Con los dos, el paso 12 arma la **tabla LL(1)**: para cada no terminal y cada terminal que viene, qué regla usar. Si ninguna casilla tiene dos reglas, la gramática es LL(1) y, por el teorema, **no ambigua**. Así se certifica en código que G1 no es ambigua.

El parser de `.grammar` (paso 4) ya usa FIRST y FOLLOW, pero calculados a mano para `meta.grammar`. Este paso los calcula **para cualquier gramática**.

---

## 2. Explicado simple, con un ejemplo

El mini policial `examples/grammars/mini-detective.grammar`:

```
Relato    → Inicio Pistas Final
Inicio    → CRI Hallazgo | HAL
Hallazgo  → HAL | ε
Pistas    → Pista MasPistas
MasPistas → Pista MasPistas | ε
Pista     → PIS | INT
Final     → REV Epilogo
Epilogo   → EPI | ε
```

**FIRST es el cartel en la entrada de cada camino.** Para elegir entre `Inicio → CRI Hallazgo` y `Inicio → HAL`, alcanza con mirar el próximo evento: CRI lleva a la primera, HAL a la segunda. FIRST se calcula mirando el comienzo de cada regla:

- `Pista → PIS | INT`: FIRST(Pista) = {PIS, INT}.
- `Pistas → Pista MasPistas`: empieza con Pista, así que FIRST(Pistas) = FIRST(Pista) = {PIS, INT}.
- `MasPistas → … | ε`: puede no haber nada, así que ε ∈ FIRST(MasPistas).

**FOLLOW es lo que viene detrás.** Si estoy en Hallazgo y viene PIS, PIS no es HAL, pero puede venir **después** de Hallazgo (después del Inicio vienen las Pistas): salteo el hallazgo con `Hallazgo → ε`. Si viniera REV, no está en ninguno de los dos conjuntos: error, y el mensaje es "se esperaba HAL, PIS o INT".

La explicación completa, con la tabla LL(1) y la corrida de `CRI PIS INT REV` paso a paso, está en la guía 12.

---

## 3. Cómo funciona

### 3.1 Las reglas de FIRST

Para cada producción A → X₁ X₂ … Xₖ, se recorren los símbolos de izquierda a derecha:

| Si el símbolo es…                                                    | Entonces…                         |
| -------------------------------------------------------------------- | --------------------------------- |
| un terminal a                                                        | a entra en FIRST(A), y se termina |
| un no terminal B                                                     | FIRST(B) sin ε entra en FIRST(A)  |
| …y B puede ser ε (ε ∈ FIRST(B))                                      | se sigue con el próximo símbolo   |
| se terminaron los símbolos (todos pueden ser ε, o la regla es A → ε) | ε entra en FIRST(A)               |

Esto es `firstOfSequence`: el FIRST de una secuencia. FIRST(A) es la unión de `firstOfSequence` de todas sus reglas.

### 3.2 Las reglas de FOLLOW

- `$` (el fin de la entrada) está en FOLLOW(S), porque S es todo el texto.
- Para cada producción A → α B β, con B no terminal:
  - lo que puede empezar β (FIRST(β) sin ε) entra en FOLLOW(B);
  - si β puede ser ε, B puede quedar al final de A: todo FOLLOW(A) entra en FOLLOW(B).

### 3.3 Por qué un punto fijo

FIRST de un símbolo depende de FIRST de otros, y FOLLOW de un símbolo depende de FOLLOW de otros, con recursión (`MasPistas → Pista MasPistas`). No siempre hay un orden obvio para calcularlos. Se hace lo mismo que con los anulables, pero con **un conjunto por símbolo**:

1. Todos los conjuntos empiezan vacíos (salvo `$` en FOLLOW(S)).
2. Cada ronda aplica las reglas a todas las producciones, leyendo los conjuntos de la ronda anterior.
3. Si ningún conjunto ganó un elemento, es el punto fijo.

Termina porque los conjuntos solo crecen y están acotados (terminales, más ε o `$`).

---

## 4. Cómo se usa en el programa

| Quién                            | Llama a                                  | Recibe                                         |
| -------------------------------- | ---------------------------------------- | ---------------------------------------------- |
| comando `first-follow` (paso 11) | `computeFirstFollow`                     | FIRST y FOLLOW, y cada ronda                   |
| tabla LL(1) (paso 12)            | `computeFirstFollow` y `firstOfSequence` | los conjuntos, y FIRST(α) de cada lado derecho |
| `analyzeGrammar` (paso 12)       | `computeFirstFollow`                     | los conjuntos, en el informe                   |

Los conjuntos son `Map<SymbolName, Set<SymbolName>>`. ε y `$` se guardan como los textos `'ε'` y `'$'` (constantes `EMPTY_STRING` y `END_OF_INPUT`). No chocan con ningún símbolo: `$` está reservado (paso 2) y ε no puede ser un identificador.

---

## 5. El código, función por función

### 5.1 `repeatRuleOnSetsUntilNoChange({ start, newMembersOfRound, onRound })` (`fixed-point.ts`)

La versión de `repeatRuleUntilNoChange` (guía 07) para un conjunto por símbolo: repite la regla hasta que ningún conjunto cambia. Recibe un objeto con tres campos: `start` (el conjunto de cada símbolo antes de la primera ronda), `newMembersOfRound` (la regla) y `onRound` (opcional).

```ts
let knownBefore = copySets(start);
for (let round = 1; ; round++) {
  const knownAfter = copySets(knownBefore);
  for (const [symbol, member] of newMembersOfRound(knownBefore)) {
    knownAfter.get(symbol)?.add(member);
  }
  onRound?.({ round, setsSoFar: knownAfter });
  if (totalSize(knownAfter) === totalSize(knownBefore)) {
    return knownAfter;
  }
  knownBefore = knownAfter;
}
```

- La regla devuelve pares `[symbol, member]`: "este elemento entra en el conjunto de este símbolo".
- `newMembersOfRound(knownBefore)`: la regla lee solo los conjuntos de la ronda anterior. Lo nuevo va a `knownAfter`, así que un elemento hallado en esta ronda recién cuenta en la siguiente. Es la misma disciplina de rondas que en `repeatRuleUntilNoChange`.
- `knownAfter.get(symbol)?.add(member)`: el `?.` ignora un par cuyo símbolo no tiene conjunto. Como `Set`, un elemento repetido no cuenta dos veces.
- `totalSize(knownAfter) === totalSize(knownBefore)`: si ninguna ronda agregó nada, es el punto fijo.
- Siempre termina: los conjuntos solo crecen y sus elementos salen de un conjunto finito (terminales, ε y $).

`copySets` hace una copia **profunda**:

```ts
return new Map([...sets].map(([symbol, members]) => [symbol, new Set(members)]));
```

- `new Map(...)` solo copiaría el mapa: los dos mapas compartirían los mismos `Set`. Agregar a `knownAfter` cambiaría también `knownBefore`.
- `new Set(members)` crea un conjunto nuevo por símbolo. Así la ronda actual nunca cambia la anterior, y la comparación de tamaños tiene sentido. Además, lo que recibió `onRound` en una ronda no cambia después.

`totalSize` suma los tamaños de todos los conjuntos:

```ts
return [...sets.values()].reduce((total, members) => total + members.size, 0);
```

- ¿Por qué alcanza con el total? Porque los conjuntos solo crecen: `knownAfter` parte de una copia de `knownBefore` y solo se le agrega.
- Entonces cada conjunto de `knownAfter` tiene al menos lo mismo que en `knownBefore`. Si la suma no cambió, ninguno creció: no hubo cambios.

### 5.2 `firstOfSequence(symbols, first)`

```ts
const result = new Set<SymbolName>();
for (const symbol of symbols) {
  const firstOfSymbol = first.get(symbol) ?? new Set([symbol]);
  for (const member of firstOfSymbol) {
    if (member !== EMPTY_STRING) {
      result.add(member);
    }
  }
  if (!firstOfSymbol.has(EMPTY_STRING)) {
    return result;
  }
}
result.add(EMPTY_STRING);
return result;
```

- Un terminal no está en el mapa `first`: su FIRST es él mismo (`new Set([symbol])`).
- Se sigue al próximo símbolo solo mientras el actual pueda ser ε.
- Si el ciclo termina sin `return`, todos pudieron ser ε (o la secuencia estaba vacía): se agrega ε.
- Es exportada porque el paso 12 la usa para FIRST(α) de cada lado derecho.

### 5.3 `computeFirst(grammar, onRound?)`

```ts
return repeatRuleOnSetsUntilNoChange({
  start: emptySetFor(grammar.nonterminals),
  newMembersOfRound: (first) =>
    grammar.productions.flatMap((production) =>
      [...firstOfSequence(production.rightSide, first)].map((member): [SymbolName, SymbolName] => [
        production.leftSide,
        member,
      ]),
    ),
  onRound,
});
```

- `start: emptySetFor(grammar.nonterminals)`: empieza con un FIRST vacío por no terminal. Los terminales no están en el mapa: `firstOfSequence` los trata como su propio FIRST.
- `firstOfSequence(production.rightSide, first)`: para A → α, calcula FIRST(α) con los conjuntos de la ronda anterior (regla de la sección 3.1).
- `.map((member) => [production.leftSide, member])`: convierte cada elemento en un par "este elemento entra en FIRST(A)".
- `flatMap` junta los pares de todas las producciones en una sola lista. Es el formato que espera `repeatRuleOnSetsUntilNoChange`.
- ε entra en FIRST(A) solo si `firstOfSequence` lo devuelve, es decir, si todo α puede desaparecer.

### 5.4 `computeFollow(grammar, first, onRound?)`

```ts
const start = emptySetFor(grammar.nonterminals);
start.get(grammar.start)?.add(END_OF_INPUT);
return repeatRuleOnSetsUntilNoChange({
  start,
  newMembersOfRound: (follow) =>
    grammar.productions.flatMap((production) => followPairs(production, first, follow)),
  onRound,
});
```

- `start.get(grammar.start)?.add(END_OF_INPUT)`: `$` va en FOLLOW(S) desde el principio. Es la primera regla de FOLLOW: después de una oración completa viene el fin de la entrada.
- Por eso el punto fijo no parte de conjuntos todos vacíos. Ese `$` se propaga a otros no terminales por la regla de `followPairs`.
- `first` es fijo: ya se calculó entero antes. Lo que cambia entre rondas es `follow`.
- `flatMap` junta los pares de todas las producciones, igual que en `computeFirst`.

### 5.5 `followPairs(production, first, follow)`

```ts
production.rightSide.forEach((symbol, position) => {
  if (!first.has(symbol)) {
    return;
  }
  const rest = firstOfSequence(production.rightSide.slice(position + 1), first);
  for (const member of rest) {
    if (member !== EMPTY_STRING) {
      pairs.push([symbol, member]);
    }
  }
  if (rest.has(EMPTY_STRING)) {
    for (const member of follow.get(production.leftSide) ?? []) {
      pairs.push([symbol, member]);
    }
  }
});
```

- `forEach((symbol, position) => ...)`: recorre cada Xᵢ de A → X₁…Xₖ con su posición. La posición importa si un símbolo se repite.
- `if (!first.has(symbol)) return`: saltea los terminales. `first` solo tiene no terminales, así que sirve para distinguirlos. Un terminal no tiene FOLLOW.
- `production.rightSide.slice(position + 1)`: lo que viene detrás de Xᵢ, es decir, β en A → α Xᵢ β.
- `firstOfSequence(...)`: FIRST(β). Lo que β puede empezar es lo que puede venir justo después de Xᵢ.
- `member !== EMPTY_STRING`: ε nunca entra en un FOLLOW. ε no es un token: significa "β puede desaparecer".
- `rest.has(EMPTY_STRING)`: si β puede desaparecer (o está vacío), Xᵢ puede ser lo último de A. Entonces lo que sigue a A sigue también a Xᵢ: todo FOLLOW(A) entra en FOLLOW(Xᵢ).
- `follow.get(production.leftSide) ?? []`: lee FOLLOW(A) de la ronda anterior. Por eso hace falta un punto fijo: FOLLOW(A) puede seguir creciendo.

### 5.6 `computeFirstFollow(grammar, onRound?)`

Corre los dos en orden (FOLLOW necesita FIRST) y le pasa a `onRound` la fase (`'first'` o `'follow'`), para que `--steps` muestre las dos tablas.

### 5.7 El comando `first-follow`

- Lee `--grammar` o `--grammar-file`, y `--steps`.
- Con `--steps`, una tabla por fase: en cada ronda, qué se agregó a cada conjunto (`Pista += {INT, PIS}`).
- Al final, una fila por no terminal con su FIRST y su FOLLOW.

---

## 6. Ejemplo recorrido a mano

```sh
npm run sabueso -- first-follow --grammar-file examples/grammars/mini-detective.grammar --steps
```

```text
FIRST, round by round:

Round  Added in this round
-----  ----------------------------------------------------------------------------------------------------------------------
1      Inicio += {CRI, HAL}; Hallazgo += {HAL, ε}; MasPistas += {ε}; Pista += {INT, PIS}; Final += {REV}; Epilogo += {EPI, ε}
2      Relato += {CRI, HAL}; Pistas += {INT, PIS}; MasPistas += {INT, PIS}
3      (none: fixed point)

FOLLOW, round by round (it starts with $ in FOLLOW of the start symbol):

Round  Added in this round
-----  --------------------------------------------------------------------------
1      Inicio += {INT, PIS}; Pistas += {REV}; Pista += {INT, PIS}; Final += {$}
2      Hallazgo += {INT, PIS}; MasPistas += {REV}; Pista += {REV}; Epilogo += {$}
3      (none: fixed point)
```

- **FIRST, ronda 1:** los que tienen una regla que empieza con un terminal (o ε).
- **FIRST, ronda 2:** los que empiezan con un no terminal ya conocido: Relato copia a Inicio, Pistas copia a Pista, MasPistas suma a Pista.
- **FOLLOW, ronda 1:** lo que se ve directamente en las reglas: detrás de Inicio vienen las Pistas, detrás de Pistas el Final; y `$` pasa de Relato a Final, que está al final.
- **FOLLOW, ronda 2:** lo que se hereda: Hallazgo está al final de Inicio y recibe FOLLOW(Inicio); MasPistas recibe FOLLOW(Pistas); Pista, como MasPistas puede ser ε, también recibe REV.

---

## 7. Errores

Ninguna función lanza errores: toda gramática construida tiene sus FIRST y FOLLOW. Los errores de uso del comando son los de los demás análisis (código 2).

---

## 8. Consola y pruebas

```sh
npm run sabueso -- first-follow --grammar g1
```

Imprime los 21 no terminales de G1 con sus conjuntos. Por ejemplo:

```text
Relato         {CRI, CTX, HAL, PER}  {$}
Pasos          {ATQ, INT, PIS, SOS}  {REV}
Libres         {ATQ, INT, PIS, ε}    {REV, SOS}
```

**`test/analysis/first-follow.test.ts`:**

| Prueba               | Qué verifica                                                                                                                                                   |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| mini policial        | los 8 FIRST y los 8 FOLLOW de las tablas de la sección 2 de la ficha 05                                                                                        |
| G1                   | los conjuntos de la sección 4.4 del spec: FOLLOW(Pasos) = {REV}, FOLLOW(Linea) = {SOS, REV}, FOLLOW(MarcoOpc), FOLLOW(HallazgoOpc), FOLLOW(Cierre) = {EPI, $}… |
| G0                   | FOLLOW(Pasos) = {ATQ, DSC, INT, PIS, REV, SOS}, por `Pasos → Pasos Pasos`                                                                                      |
| ε ∈ FIRST ⇔ anulable | en cinco gramáticas, coincide con el paso 7                                                                                                                    |
| `firstOfSequence`    | un terminal, saltear un anulable, ε solo si todo puede ser ε                                                                                                   |
| rondas               | FIRST del mini policial en 2 rondas más la verificación; recursión a izquierda                                                                                 |

**`test/command-line/first-follow.test.ts`:** la tabla de G1, las rondas del mini policial con `--steps` y los errores de uso. `test/analysis/fixed-point.test.ts` prueba también `repeatRuleOnSetsUntilNoChange`.

---

## 9. Preguntas probables en la defensa

**¿Qué es FIRST(α)?**
Los terminales con que puede empezar una cadena derivada de α, más ε si α puede desaparecer. En G1, FIRST(Relato) = {CRI, CTX, HAL, PER}: un relato empieza con el crimen, el hallazgo o el marco.

**¿Qué es FOLLOW(A)?**
Los terminales que pueden venir justo después de A en alguna forma sentencial, más `$` si A puede quedar al final. En G1, FOLLOW(Pasos) = {REV}: después de la investigación viene la revelación.

**¿Para qué sirven?**
Para la tabla LL(1): A → α va en la casilla [A, a] si a ∈ FIRST(α), o si α puede ser ε y a ∈ FOLLOW(A). Sin casillas con dos reglas, la gramática es LL(1) y no ambigua.

**¿Por qué FOLLOW necesita FIRST?**
Porque lo que viene después de B en A → α B β es lo que puede empezar β: FIRST(β).

**¿Por qué FOLLOW(Pasos) es distinto en G0 y en G1?**
En G0 está `Pasos → Pasos Pasos`: detrás de un Pasos puede venir otro Pasos, así que FOLLOW(Pasos) incluye FIRST(Pasos) = {PIS, INT, DSC, ATQ, SOS}, además de REV. En G1 las listas son recursivas a derecha y detrás de Pasos solo viene el desenlace: {REV}. Esa superposición entre FIRST y FOLLOW es justamente la que produce conflictos LL(1) en G0.

**¿Qué relación tiene con los anulables?**
ε ∈ FIRST(A) exactamente cuando A es anulable. Una prueba lo verifica en cinco gramáticas.
