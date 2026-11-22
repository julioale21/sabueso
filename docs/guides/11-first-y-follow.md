# 11 — FIRST y FOLLOW

> Archivos: `packages/core/src/analysis/first-follow.ts`, `repeatRuleOnSetsUntilNoChange` en `packages/core/src/analysis/fixed-point.ts` y `packages/core/src/command-line/commands/first-follow.ts`.

## 1. Teoría

Un analizador **LL(1)** elige cada regla mirando un solo símbolo adelante. FIRST y FOLLOW le dan esa información.

- **FIRST(α):** los terminales con que puede empezar lo que deriva α, más ε si α ⇒\* ε. Para A → X₁…Xₖ se toma FIRST(X₁) sin ε; si X₁ puede ser ε, también FIRST(X₂); y así.
- **FOLLOW(A):** los terminales que pueden venir justo después de A, más `$` (fin de la entrada) si A puede quedar al final.
  - `$` ∈ FOLLOW(S).
  - Para B → α A β: FIRST(β) sin ε va a FOLLOW(A); si β ⇒\* ε, también FOLLOW(B).
- Los dos se calculan por punto fijo. Primero FIRST, porque FOLLOW lo usa.
- Con ellos se arma la tabla LL(1) ([guía 12](12-tabla-ll1-y-no-ambiguedad.md)).

**Ejemplo: un mini policial** (`examples/grammars/mini-detective.grammar`):

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

| No terminal | FIRST         | FOLLOW          | Por qué el FOLLOW                       |
| ----------- | ------------- | --------------- | --------------------------------------- |
| Relato      | {CRI, HAL}    | {$}             | es el símbolo inicial                   |
| Inicio      | {CRI, HAL}    | {INT, PIS}      | detrás vienen las Pistas                |
| Hallazgo    | {HAL, ε}      | {INT, PIS}      | está al final de Inicio                 |
| Pistas      | {INT, PIS}    | {REV}           | detrás viene el Final                   |
| MasPistas   | {INT, PIS, ε} | {REV}           | está al final de Pistas                 |
| Pista       | {INT, PIS}    | {INT, PIS, REV} | detrás viene MasPistas, que puede ser ε |
| Final       | {REV}         | {$}             | está al final del Relato                |
| Epilogo     | {EPI, ε}      | {$}             | está al final del Final                 |

## 2. Por qué así

- **Para cualquier gramática:** el parser de `.grammar` ([guía 04](04-parser-ll1.md)) ya usa FIRST y FOLLOW, pero calculados a mano para `meta.grammar`. Este paso los calcula para cualquiera, y con ellos la guía 12 certifica que G1 no es ambigua.
- **Un punto fijo con un conjunto por símbolo:** FIRST de un símbolo depende de FIRST de otros (y FOLLOW de FOLLOW), con recursión (`MasPistas → Pista MasPistas`). No siempre hay un orden obvio. Termina porque los conjuntos solo crecen y están acotados (terminales, más ε o `$`).
- **Rondas, como en la guía 07:** cada ronda lee los conjuntos de la anterior, así `--steps` puede mostrarlas.
- **Representación:** los conjuntos son `Map<SymbolName, Set<SymbolName>>`. ε y `$` se guardan como los textos `'ε'` y `'$'` (constantes `EMPTY_STRING` y `END_OF_INPUT`). No chocan con ningún símbolo: `$` está reservado y ε no puede ser un identificador.

## 3. El código, función por función

### 3.1 `repeatRuleOnSetsUntilNoChange({ start, newMembersOfRound })` (`fixed-point.ts`)

La versión de `repeatRuleUntilNoChange` (guía 07) para un conjunto por símbolo. `start` es el conjunto de cada símbolo antes de la primera ronda; `newMembersOfRound`, la regla. **Devuelve todas las rondas**; la última es el resultado (`lastRound`).

```ts
const rounds: SetsBySymbol[] = [];
let knownBefore = copySets(start);
for (;;) {
  const knownAfter = copySets(knownBefore);
  for (const [symbol, member] of newMembersOfRound(knownBefore)) {
    knownAfter.get(symbol)?.add(member);
  }
  rounds.push(knownAfter);
  if (totalSize(knownAfter) === totalSize(knownBefore)) {
    return rounds;
  }
  knownBefore = knownAfter;
}
```

- La regla devuelve pares `[symbol, member]`: "este elemento entra en el conjunto de este símbolo".
- `newMembersOfRound(knownBefore)`: la regla lee solo la ronda anterior. Lo nuevo va a `knownAfter`, así que un elemento hallado ahora recién cuenta en la siguiente.
- `knownAfter.get(symbol)?.add(member)`: el `?.` ignora un par cuyo símbolo no tiene conjunto. Como `Set`, un repetido no cuenta dos veces.
- `totalSize(...) === totalSize(...)`: si nada creció, es el punto fijo.

`copySets` hace una copia **profunda**:

```ts
return new Map([...sets].map(([symbol, members]) => [symbol, new Set(members)]));
```

- `new Map(...)` solo copiaría el mapa: los dos compartirían los mismos `Set`, y agregar a `knownAfter` cambiaría también `knownBefore`.
- `new Set(members)` crea un conjunto nuevo por símbolo. Así la ronda actual nunca cambia la anterior, y cada ronda guardada en `rounds` queda como estaba.

`totalSize` suma los tamaños de todos los conjuntos:

```ts
return [...sets.values()].reduce((total, members) => total + members.size, 0);
```

- Alcanza con el total porque los conjuntos solo crecen: `knownAfter` parte de una copia de `knownBefore`. Si la suma no cambió, ninguno creció.

### 3.2 `firstOfSequence({ symbols, first })`

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
- Agrega FIRST del símbolo sin ε, y sigue al próximo solo mientras el actual pueda ser ε.
- Si el ciclo termina sin `return`, todos pudieron ser ε (o la secuencia estaba vacía): se agrega ε.
- Es la regla de FIRST de la sección 1. Es exportada porque la guía 12 la usa para FIRST(α) de cada lado derecho.

### 3.3 `firstRounds(grammar)` y su regla

```ts
return repeatRuleOnSetsUntilNoChange({
  start: emptySetFor(grammar.nonterminals),
  newMembersOfRound: (first) => newFirstMembers({ grammar, first }),
});
```

- Empieza con un FIRST vacío por no terminal. Los terminales no están en el mapa.
- La última ronda es FIRST; `computeFirstFollow` la toma con `lastRound`.

La regla de cada ronda, `newFirstMembers`:

```ts
const pairs: [SymbolName, SymbolName][] = [];
for (const production of grammar.productions) {
  for (const member of firstOfSequence({ symbols: production.rightSide, first })) {
    pairs.push([production.leftSide, member]);
  }
}
return pairs;
```

- Para cada A → α, `firstOfSequence` calcula FIRST(α) con la ronda anterior.
- Cada elemento sale como par `[A, elemento]`. ε entra en FIRST(A) solo si todo α puede desaparecer.

### 3.4 `followRounds({ grammar, first })`

```ts
const start = emptySetFor(grammar.nonterminals);
start.get(grammar.start)?.add(END_OF_INPUT);
return repeatRuleOnSetsUntilNoChange({
  start,
  newMembersOfRound: (follow) => newFollowMembers({ grammar, first, follow }),
});
```

- `$` va en FOLLOW(S) desde el principio: es la primera regla de FOLLOW. Por eso este punto fijo no parte de todo vacío; ese `$` se propaga por `followPairs`.
- `first` es fijo: ya se calculó entero. Lo que cambia entre rondas es `follow`.
- `newFollowMembers` junta con `flatMap` los pares de `followPairs` de todas las producciones.

### 3.5 `followPairs({ production, first, follow })`

```ts
production.rightSide.forEach((symbol, position) => {
  if (!first.has(symbol)) {
    return;
  }
  const rest = firstOfSequence({ symbols: production.rightSide.slice(position + 1), first });
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

- `forEach((symbol, position) => ...)`: recorre cada Xᵢ de A → X₁…Xₖ con su posición (importa si un símbolo se repite).
- `if (!first.has(symbol)) return`: saltea los terminales (`first` solo tiene no terminales). Un terminal no tiene FOLLOW.
- `slice(position + 1)`: lo que viene detrás de Xᵢ, es decir, β en A → α Xᵢ β.
- `firstOfSequence(...)`: FIRST(β), lo que puede venir justo después de Xᵢ.
- `member !== EMPTY_STRING`: ε nunca entra en un FOLLOW. No es un token: significa "β puede desaparecer".
- `rest.has(EMPTY_STRING)`: si β puede desaparecer (o está vacío), Xᵢ puede ser lo último de A. Todo FOLLOW(A) entra en FOLLOW(Xᵢ).
- `follow.get(production.leftSide) ?? []`: lee FOLLOW(A) de la ronda anterior. Por eso hace falta un punto fijo: FOLLOW(A) puede seguir creciendo.

### 3.6 `computeFirstFollow(grammar)` y el comando `first-follow`

- `computeFirstFollow` corre los dos en orden (FOLLOW necesita FIRST) y devuelve `first` y `follow`, con sus rondas en `firstRounds` y `followRounds` (tipo `FirstFollowWithRounds`).
- El comando lee `--grammar` o `--grammar-file`, y `--steps`. Con `--steps`, una tabla por fase (`Pista += {INT, PIS}`); al final, una fila por no terminal con su FIRST y su FOLLOW.
- Ninguna función lanza errores. Los errores de uso son los comunes (código 2).

## 4. Consola y pruebas

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

Con `--grammar g1` imprime los 21 no terminales de G1, por ejemplo `Pasos  {ATQ, INT, PIS, SOS}  {REV}`.

| Prueba                                                 | Qué verifica                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core/test/analysis/first-follow.test.ts`     | los 8 FIRST y 8 FOLLOW del mini policial (sección 1); los conjuntos de la sección 4.4 del spec para G1 (FOLLOW(Pasos) = {REV}, FOLLOW(Linea) = {SOS, REV}, FOLLOW(Cierre) = {EPI, $}…); FOLLOW(Pasos) en G0; ε ∈ FIRST ⇔ anulable en cinco gramáticas; `firstOfSequence`; las rondas, con recursión a izquierda |
| `packages/core/test/command-line/first-follow.test.ts` | la tabla de G1, las rondas del mini policial con `--steps` y los errores de uso                                                                                                                                                                                                                                 |
| `packages/core/test/analysis/fixed-point.test.ts`      | también `repeatRuleOnSetsUntilNoChange`                                                                                                                                                                                                                                                                         |

## 5. Referencias

- Aho, Lam, Sethi y Ullman, _Compiladores: principios, técnicas y herramientas_ (2.ª ed.), sección 4.4.2 (FIRST y FOLLOW).
