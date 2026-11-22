# 09 — Símbolos inútiles y vacuidad

> Archivos: `packages/core/src/analysis/useful.ts` y `packages/core/src/command-line/commands/useful.ts`.

## 1. Teoría

- A es **productivo** si deriva alguna cadena de terminales (A ⇒\* w).
- A es **alcanzable** si aparece en alguna derivación desde S (S ⇒\* αAβ).
- A es **útil** si es las dos cosas. Si no, es **inútil**, y se puede quitar sin cambiar el lenguaje.
- **Orden** (Hopcroft 7.1.1, ver sección 5): primero se quitan los no productivos, después los no alcanzables.
- **Vacuidad:** L(G) = ∅ si y solo si S no es productivo. Es un problema decidible.

Los dos conjuntos se calculan por punto fijo: los productivos desde ∅, los alcanzables desde {S}.

**Ejemplo: `test-useless`.** `S → A a | b`, `A → A a`, `C → c`.

| Fase        | Cálculo                                            | Resultado               |
| ----------- | -------------------------------------------------- | ----------------------- |
| Productivos | S (por `S → b`) y C (por `C → c`); A nunca termina | {S, C}                  |
| Se quitan   | las producciones que usan A                        | quedan `S → b`, `C → c` |
| Alcanzables | desde S no se llega a C                            | {S}                     |
| Resultado   | inútiles = {A, C}                                  | `S → b`                 |

## 2. Por qué así

- **Para qué sirve:** es un **validador** (quien escribe un `.grammar` con una regla que nunca termina se entera acá), alimenta el informe `analyze` ([guía 12](12-tabla-ll1-y-no-ambiguedad.md)) y el paso USELESS de la Forma Normal de Chomsky ([guía 24](24-fnc-useless-term-bin.md)).
- **Dos puntos fijos por rondas**, con el mismo esquema que los anulables ([guía 07](07-simbolos-anulables.md)). Productivos es igual a anulables, pero los terminales cuentan como "buenos". Alcanzables es una búsqueda en anchura sobre el grafo "A usa a B": la ronda i son los símbolos a distancia i de S.
- **Vacuidad gratis:** sale del primer punto fijo, L(G) = ∅ ⇔ S ∉ productivos.
- **Por qué importa el orden:** quitar un no productivo borra producciones, y eso puede dejar a otro símbolo sin camino desde S. En `examples/grammars/useless-order.grammar` (`S → A B | a`, `A → b`, `B → B c`), al quitar B se va `S → A B` y A queda inalcanzable. Al revés, A pasaría el filtro de alcanzables y se quedaría.

## 3. El código, función por función

### 3.1 `analyzeUsefulSymbols(grammar)`

Devuelve `productive`, `reachable` (calculados **después** de quitar los no productivos), `useless`, `isEmpty`, `usefulGrammar` (G sin inútiles, o `null` si L(G) = ∅) y las rondas de cada fase (`productiveRounds`, `reachableRounds`, para `--steps`).

```ts
const productiveRoundList = productiveRounds(grammar);
const productive = lastRound(productiveRoundList);
const isEmpty = !productive.has(grammar.start);
const productions = grammar.productions.filter((production) =>
  usesOnly({ production, nonterminals: productive, grammar }),
);
const reachableRoundList = isEmpty ? [] : reachableRounds({ start: grammar.start, productions });
const reachable = isEmpty ? new Set<SymbolName>() : lastRound(reachableRoundList);
const useless = new Set(
  [...grammar.nonterminals].filter((symbol) => !productive.has(symbol) || !reachable.has(symbol)),
);
```

- El orden es el de Hopcroft 7.1.1: productivos, se filtran las producciones, y recién entonces alcanzables.
- `isEmpty = !productive.has(grammar.start)`: la prueba de vacuidad.
- `filter(... usesOnly(...))`: se quedan solo las producciones con terminales y productivos. Una producción con un no productivo nunca termina en una cadena de Σ\*.
- `reachableRounds` recibe las producciones **filtradas**. Así, un símbolo que solo se alcanzaba por una producción descartada queda como no alcanzable.
- `isEmpty ? [] : ...`: si L(G) = ∅, no corre la fase de alcanzables. El conjunto vacío deja a todos inútiles.
- `!productive.has(symbol) || !reachable.has(symbol)`: la definición de inútil. Útil exige las dos cosas, así que basta con que falle una.

### 3.2 `productiveRounds(grammar)` y su regla

```ts
return repeatRuleUntilNoChange({
  start: [],
  newSymbolsOfRound: (productiveSymbols) => newProductiveSymbols({ grammar, productiveSymbols }),
});
```

- El mismo `repeatRuleUntilNoChange` de la guía 07, desde ∅. La última ronda es el conjunto de productivos.

La regla de cada ronda, `newProductiveSymbols`:

```ts
return grammar.productions
  .filter((production) => usesOnly({ production, nonterminals: productiveSymbols, grammar }))
  .map((production) => production.leftSide);
```

- `filter` con `usesOnly`: las producciones con lado derecho de terminales o productivos ya conocidos.
- `map`: sus lados izquierdos son los productivos de esta ronda.
- La única diferencia con los anulables es que `usesOnly` acepta terminales.

### 3.3 `usesOnly({ production, nonterminals, grammar })`

```ts
return production.rightSide.every(
  (symbol) => grammar.terminals.has(symbol) || nonterminals.has(symbol),
);
```

¿Todos los símbolos son terminales o están en el conjunto dado? Con ε, `every` da `true`. Se usa dos veces: en la regla de productivos y para filtrar las producciones antes de los alcanzables.

### 3.4 `reachableRounds({ start, productions })` y `nonterminalsUsedBy`

```ts
const nonterminals = new Set(productions.map((production) => production.leftSide));
return repeatRuleUntilNoChange({
  start: [start],
  newSymbolsOfRound: (reachableSymbols) =>
    nonterminalsUsedBy({ symbols: reachableSymbols, productions, nonterminals }),
});
```

- Arranca con `start: [start]`: S es alcanzable sin aplicar ninguna regla.
- Recibe las **producciones** (no la gramática), porque trabaja sobre las que quedaron.
- `nonterminals` sale de sus lados izquierdos: sirve para separar no terminales de terminales.

La regla de cada ronda, `nonterminalsUsedBy`:

```ts
return productions
  .filter((production) => symbols.has(production.leftSide))
  .flatMap((production) => production.rightSide)
  .filter((symbol) => nonterminals.has(symbol));
```

- Primer `filter`: las producciones de los símbolos ya alcanzados.
- `flatMap`: junta todos sus lados derechos en una sola lista.
- Segundo `filter`: se queda con los no terminales. Si S ⇒\* αAβ, A es alcanzable.

### 3.5 `buildUsefulGrammar({ grammar, productiveProductions, reachable })`

```ts
const rules = productiveProductions
  .filter((production) => reachable.has(production.leftSide))
  .map(({ leftSide, rightSide }) => ({ leftSide, rightSide }));
return buildGrammar({
  name: `${grammar.name} without useless symbols`,
  rules,
  start: grammar.start,
});
```

- Se queda con las producciones productivas de lado izquierdo alcanzable.
- `.map(...)` tira el resto de los campos (como el id) y deja solo la regla.
- `buildGrammar` numera de nuevo las producciones, y Σ queda solo con los terminales que se usan.

### 3.6 El comando `useful`

- Lee `--grammar` o `--grammar-file`, y `--steps` (una tabla por fase; la de alcanzables muestra S como ronda 0).
- Muestra los no productivos, los no alcanzables y los inútiles, y la gramática sin ellos. Si L(G) = ∅, lo dice y no sigue.
- Ninguna función lanza errores: una gramática con inútiles o vacía es válida (código 0). Los errores de uso son los comunes (código 2).

## 4. Consola y pruebas

```sh
npm run sabueso -- useful --grammar test-useless --steps
```

```text
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
…
P:
   0  S → b
```

Con `--grammar test-empty` imprime `L(G) = ∅: the start symbol S is not productive…`. Con `--grammar g1 --steps`, Relato entra en la cuarta ronda de productivos y Descarte en la quinta de alcanzables: G1 no tiene inútiles.

| Prueba                                           | Qué verifica                                                                                                                                                                                                                              |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core/test/analysis/useful.test.ts`     | `test-useless` da no productivos {A}, no alcanzables {C}, gramática útil `S → b` con Σ = {b}; `test-empty` es vacía; G0, G1 y otras cinco no tienen inútiles; el ejemplo del orden; las rondas de G1 (12, 18, 20, 21 y 4, 10, 18, 20, 21) |
| `packages/core/test/command-line/useful.test.ts` | los inútiles y la gramática limpia, las dos tablas de `--steps`, L(G) = ∅, G1 sin inútiles y los errores de uso                                                                                                                           |

## 5. Referencias

- Hopcroft, Motwani y Ullman, _Introducción a la teoría de autómatas, lenguajes y computación_, secciones 7.1.1 (eliminación de símbolos inútiles), 7.1.2 (cálculo de generadores y alcanzables) y 7.4.3 (comprobación de que un LIC es vacío).
