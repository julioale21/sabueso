# 24 — FNC: USELESS, TERM y BIN

> Archivos: `packages/core/src/chomsky-normal-form/remove-useless-symbols.ts`, `packages/core/src/chomsky-normal-form/isolate-terminals.ts`, `packages/core/src/chomsky-normal-form/binarize.ts`, `packages/core/src/chomsky-normal-form/index.ts` (`toChomskyNormalForm` e `isChomskyNormalForm`), los cambios en `packages/core/src/chomsky-normal-form/rewrite.ts` y el comando `packages/core/src/command-line/commands/chomsky-normal-form.ts`.

## 1. Teoría

La definición de la FNC y la tabla de los seis pasos están en la [guía 23](23-fnc-start-del-unit.md). Después de START, DEL y UNIT, estos tres pasos le dan la forma final, A → B C o A → a:

- **USELESS:** borra los no terminales inútiles (no productivos o no alcanzables, [guía 09](09-simbolos-inutiles-y-vacuidad.md)) y las producciones que los usan. El inicial nunca se borra.
- **TERM:** en cada lado de largo ≥ 2, cambia cada terminal a por un T_a nuevo y agrega T_a → a.
- **BIN:** A → B1 B2 … Bk pasa a A → B1 X1, X1 → B2 X2, …, X(k−2) → B(k−1) Bk. Cada X tiene una sola producción, así que no agrega cadenas.

### Ejemplo resuelto a mano: G1 después de UNIT

| Paso    | Antes                                      | Después                                               | Producciones |
| ------- | ------------------------------------------ | ----------------------------------------------------- | ------------ |
| USELESS | `Descarte → DSC Libres`, `Descarte → DSC`  | borradas: nadie llega a `Descarte`                    | 69 → 67      |
| TERM    | `Desenlace → REV Cierre`                   | `Desenlace → T_REV Cierre` y `T_REV → REV`            | 67 → 75      |
| BIN     | `Relato → Planteo Investigacion Desenlace` | `Relato → Planteo X1`, `X1 → Investigacion Desenlace` | 75 → 78      |

`Evidencia → PIS` no cambia en TERM: ya tiene la forma A → a.

## 2. Por qué así

- **USELESS reutiliza la guía 09:** `analyzeUsefulSymbols` ya calcula productivos y alcanzables en el orden correcto. El paso solo filtra las producciones.
- **N ahora también puede achicarse:** `rewriteGrammar` suma el parámetro opcional `removedNonterminals`, que USELESS usa para sacar de N los inútiles.
- **Un T_a por terminal, no por aparición:** `T_SOS → SOS` se agrega una sola vez aunque SOS aparezca en cuatro producciones.
- **Una cadena X por producción (como Hopcroft):** BIN no reutiliza cadenas entre producciones, aunque dos lados derechos terminen igual. Es la construcción del libro, y así cada X tiene una sola producción. En G1 se ve: `X2 → Libres Lineas` y `X3 → Libres Lineas` son iguales.
- **Si un paso no cambia nada, devuelve el mismo objeto:** el comando lo detecta y escribe `Nothing to do: …`, como START.
- **Los pasos son datos:** `CHOMSKY_NORMAL_FORM_STEPS` es la lista de los seis (nombre y función). La usan `toChomskyNormalForm` y el comando, así que el orden está escrito en un solo lugar.

## 3. El código, función por función

### 3.1 `removeUselessSymbols(grammar)` (`remove-useless-symbols.ts`)

```ts
export function removeUselessSymbols(grammar: Grammar): Grammar {
  const { useless } = analyzeUsefulSymbols(grammar);
  const removed = new Set([...useless].filter((symbol) => symbol !== grammar.start));
  if (useless.size === 0) {
    return grammar;
  }
  return rewriteGrammar({
    grammar,
    productions: grammar.productions.filter((production) =>
      usesNoUselessSymbol({ production, useless }),
    ),
    removedNonterminals: removed,
  });
}
```

- **`analyzeUsefulSymbols(grammar)`:** el análisis de la guía 09. `useless` son los no terminales no productivos o no alcanzables. En G1 después de UNIT, `{Descarte}`.
- **`removed`:** los inútiles menos el inicial, que siempre se queda en N (caso L(G) = ∅).
- **`if (useless.size === 0) return grammar`:** todo es útil: el mismo objeto, y el comando escribe `Nothing to do: every nonterminal is productive and reachable`.
- **`filter(usesNoUselessSymbol)`:** se queda con las producciones sin ningún inútil.
- **`removedNonterminals: removed`:** saca esos símbolos de N.

**`usesNoUselessSymbol({ production, useless })`:**

```ts
return [production.leftSide, ...production.rightSide].every((symbol) => !useless.has(symbol));
```

Junta los dos lados en una lista y pregunta si **ninguno** es inútil. Equivale a las dos podas de Hopcroft: si A es útil y todos los símbolos de α son productivos, también son alcanzables (por A → α).

### 3.2 `isolateTerminals(grammar)` (`isolate-terminals.ts`)

```ts
export function isolateTerminals(grammar: Grammar): Grammar {
  const nonterminalOf = nonterminalsForTerminals(grammar);
  if (nonterminalOf.size === 0) {
    return grammar;
  }
  const productions = grammar.productions.map((production) => ({
    leftSide: production.leftSide,
    rightSide:
      production.rightSide.length < 2
        ? production.rightSide
        : production.rightSide.map((symbol) => nonterminalOf.get(symbol) ?? symbol),
  }));
  const terminalProductions = [...nonterminalOf].map(([terminal, nonterminal]) => ({
    leftSide: nonterminal,
    rightSide: [terminal],
  }));
  return rewriteGrammar({
    grammar,
    productions: [...productions, ...terminalProductions],
    newNonterminals: [...nonterminalOf.values()],
  });
}
```

- **`nonterminalsForTerminals(grammar)`:** un `Map` de terminal a su T_a, solo para los terminales de lados de largo ≥ 2. En G1: `CRI ↦ T_CRI`, `CTX ↦ T_CTX`, … (8).
- **`if (nonterminalOf.size === 0) return grammar`:** nada para envolver: el mismo objeto.
- **`map` sobre las producciones:** un lado corto (`< 2`) queda igual. Si no, cada símbolo se cambia por su T_a, o queda igual si no es terminal (`?? symbol`).
- **`terminalProductions`:** una `T_a → a` por cada entrada del `Map`, al final.
- **`newNonterminals`:** los T_a se agregan a N.

**`nonterminalsForTerminals(grammar)`:**

```ts
const nonterminalOf = new Map<SymbolName, SymbolName>();
const longRightSides = grammar.productions
  .map((production) => production.rightSide)
  .filter((rightSide) => rightSide.length >= 2);
for (const symbol of longRightSides.flat()) {
  if (grammar.terminals.has(symbol) && !nonterminalOf.has(symbol)) {
    const taken = new Set(nonterminalOf.values());
    nonterminalOf.set(symbol, freshSymbol({ grammar, name: `${TERMINAL_PREFIX}${symbol}`, taken }));
  }
}
return nonterminalOf;
```

- **`longRightSides`:** los lados derechos de largo ≥ 2.
- **`.flat()`:** todos sus símbolos en una sola lista, en orden.
- **`if (terminal y todavía sin nombre)`:** cada terminal recibe su nombre la primera vez que aparece, así quedan en orden de aparición.
- **`freshSymbol({ …, taken })`:** quiere llamarlo `T_CRI`; si ese nombre ya está en N, en Σ o entre los elegidos en este paso (`taken`), le agrega primas (`T_CRI'`). `taken` es un parámetro nuevo de `freshSymbol`: TERM y BIN crean varios nombres en el mismo paso.

### 3.3 `binarize(grammar)` (`binarize.ts`)

```ts
export function binarize(grammar: Grammar): Grammar {
  if (grammar.productions.every((production) => production.rightSide.length <= 2)) {
    return grammar;
  }
  const newNonterminals: SymbolName[] = [];
  const productions = grammar.productions.flatMap((production) => {
    if (production.rightSide.length <= 2) {
      return [production];
    }
    const chain = chainNames({ grammar, count: production.rightSide.length - 2, newNonterminals });
    newNonterminals.push(...chain);
    return splitIntoChain({ production, chain });
  });
  return rewriteGrammar({ grammar, productions, newNonterminals });
}
```

- **`every(… <= 2)`:** ningún lado largo: el mismo objeto.
- **`flatMap`:** cada producción da ella misma si es corta, o su cadena si es larga.
- **`chainNames({ …, count: k − 2 })`:** un lado de largo k necesita k − 2 X nuevos. Prueba X1, X2, X3, … y se queda con los primeros `count` que no estén en N, en Σ ni en otra cadena.
- **`newNonterminals.push(...chain)`:** se acumulan, así la siguiente producción larga sigue la numeración y no repite nombres.
- **`splitIntoChain`:** arma las k − 1 producciones.

**`splitIntoChain({ production, chain })`:**

```ts
const leftSides = [production.leftSide, ...chain];
return leftSides.map((leftSide, index) => ({
  leftSide,
  rightSide:
    index < chain.length
      ? [production.rightSide[index] ?? '', chain[index] ?? '']
      : production.rightSide.slice(index),
}));
```

- **`leftSides`:** A y después cada X: cada producción de la cadena tiene como lado izquierdo el X anterior.
- **`index < chain.length`:** todas menos la última llevan un símbolo original y el X siguiente.
- **`slice(index)`:** la última lleva los dos símbolos que quedan.

Con `A → B1 B2 B3 B4` y chain `[X1, X2]`:

| index | leftSide | rightSide                                     |
| ----- | -------- | --------------------------------------------- |
| 0     | A        | `B1 X1` (el símbolo 0 y el X 0)               |
| 1     | X1       | `B2 X2` (el símbolo 1 y el X 1)               |
| 2     | X2       | `B3 B4` (la última: `slice(2)`, lo que queda) |

### 3.4 `toChomskyNormalForm(grammar)` (`index.ts`)

```ts
export const CHOMSKY_NORMAL_FORM_STEPS: readonly ChomskyNormalFormStep[] = [
  { name: 'START', apply: addNewStart },
  { name: 'DEL', apply: removeEpsilonProductions },
  { name: 'UNIT', apply: removeUnitProductions },
  { name: 'USELESS', apply: removeUselessSymbols },
  { name: 'TERM', apply: isolateTerminals },
  { name: 'BIN', apply: binarize },
];

export function toChomskyNormalForm(grammar: Grammar): ChomskyNormalFormResult {
  const steps: ChomskyNormalFormResult['steps'] = [];
  let current = grammar;
  for (const step of CHOMSKY_NORMAL_FORM_STEPS) {
    current = step.apply(current);
    steps.push({ name: step.name, grammar: current });
  }
  return {
    grammar: current,
    acceptsEmpty: current.productions.some((production) =>
      isEmptyStartProduction({ production, grammar: current }),
    ),
    steps,
  };
}
```

- **`CHOMSKY_NORMAL_FORM_STEPS`:** los seis pasos en orden, con su nombre y su función.
- **El bucle:** la salida de un paso es la entrada del siguiente; cada resultado intermedio se guarda en `steps` (lo que muestran la consola y la web).
- **`grammar`:** la gramática final, en FNC.
- **`acceptsEmpty`:** si quedó S → ε para el inicial, es decir, si ε ∈ L(G). `parentheses` da `true`; G1, `false`.

### 3.5 `isChomskyNormalForm(grammar)` y `productionsOutsideChomskyNormalForm(grammar)`

```ts
export function productionsOutsideChomskyNormalForm(grammar: Grammar): Production[] {
  const startOnSomeRightSide = appearsOnSomeRightSide({ grammar, symbol: grammar.start });
  return grammar.productions.filter(
    (production) =>
      !hasChomskyNormalFormShape({ production, grammar }) ||
      (startOnSomeRightSide && isEmptyStartProduction({ production, grammar })),
  );
}
```

Devuelve las producciones que **rompen** la FNC; `isChomskyNormalForm` es "esa lista está vacía". Una producción falla si:

- **no tiene una de las tres formas** (`hasChomskyNormalFormShape`): largo 2 con dos no terminales (A → B C), largo 1 con un terminal (A → a), o largo 0 del inicial (S → ε);
- **o es S → ε y S aparece en algún lado derecho:** esa ε se podría usar adentro de otra producción. Reutiliza `appearsOnSomeRightSide` de START.

Con `parentheses` original falla en `S → ( S ) S` (largo 4) y en `S → ε` (S está en `( S ) S`).

### 3.6 El comando `chomsky-normal-form`

- Usa `CHOMSKY_NORMAL_FORM_STEPS`. Lo que es solo de la consola (la descripción de cada paso y el motivo de `Nothing to do`) está en `STEP_DESCRIPTIONS`.
- `--until` acepta los seis nombres, en mayúsculas o minúsculas. Sin `--until`, corre los seis y termina con el veredicto: `Chomsky normal form ✓ (78 productions)`, o `✗` y la lista de las que fallan.
- Las funciones no lanzan errores. El comando termina con código 2 sin `--grammar`, con argumentos de más o con un `--until` que no es uno de los seis.

## 4. Consola y pruebas

```sh
npm run sabueso -- chomsky-normal-form --grammar g1
```

| Paso    | Agrega | Quita | Producciones |
| ------- | ------ | ----- | ------------ |
| START   | 0      | 0     | 40           |
| DEL     | 16     | 10    | 46           |
| UNIT    | 33     | 10    | 69           |
| USELESS | 0      | 2     | 67           |
| TERM    | 23     | 15    | 75           |
| BIN     | 6      | 3     | 78           |

Termina con `Chomsky normal form ✓ (78 productions)`.

**`packages/core/test/chomsky-normal-form/useless-term-bin.test.ts`:**

| Prueba                  | Qué verifica                                                                                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| USELESS                 | `test-useless` (se van A, no productivo, y C, no alcanzable) y `epsilon-trap` (queda `S → x`) a mano; G1 pierde `Descarte`; `test-empty` queda con S0 solo; sin cambios devuelve el mismo objeto |
| TERM                    | `parentheses` a mano; A → a y S → ε no cambian; `T_a'` si ya existe `T_a`                                                                                                                        |
| BIN                     | A → B C D E a mano; la numeración sigue entre producciones y saltea un X1 que ya existe                                                                                                          |
| toChomskyNormalForm     | las 10 gramáticas terminan en FNC; `parentheses` con `acceptsEmpty`; G1: 40 → 46 → 69 → 67 → 75 → 78                                                                                             |
| isChomskyNormalForm     | `parentheses` original no está en FNC; S → ε con S a la derecha falla                                                                                                                            |
| el lenguaje se preserva | lo mismo que en la guía 23, ahora después de USELESS, TERM y BIN                                                                                                                                 |

**`packages/core/test/command-line/chomsky-normal-form.test.ts`:** los seis pasos de G1 con el veredicto, `Nothing to do` en `epsilon-trap`, `--until TERM` sin veredicto y `--until CYK` como error de uso.

Los ayudantes `stringsUpTo` y `accepts` están en `packages/core/test/helpers/language.ts`, porque los usan las dos pruebas de la FNC.

## 5. Referencias

- Hopcroft, Motwani y Ullman, _Introducción a la teoría de autómatas, lenguajes y computación_, secciones 7.1.1 y 7.1.2 (símbolos inútiles) y 7.1.5 (Forma Normal de Chomsky).
- Augusto, sección 2.4.3.
