# Guía de estudio: 24 — FNC: USELESS, TERM y BIN

> **Paso 24 del SPEC 02.** Archivos: `packages/core/src/chomsky-normal-form/remove-useless-symbols.ts`, `isolate-terminals.ts`, `binarize.ts`, `index.ts` (`toChomskyNormalForm` e `isChomskyNormalForm`), los cambios en `rewrite.ts` y el comando `packages/core/src/command-line/commands/chomsky-normal-form.ts`.
> Ficha teórica relacionada: [`docs/concepts/22-chomsky-normal-form.md`](../concepts/22-chomsky-normal-form.md).

---

## 1. El problema que resuelve

Después del paso 23, la gramática ya no tiene producciones ε (salvo la del inicial) ni unitarias, pero todavía no está en FNC:

- puede tener **símbolos inútiles**: `Descarte` en G1 quedó sin nadie que lo use;
- tiene **terminales mezclados** con no terminales: `Desenlace → REV Cierre`;
- tiene **lados derechos largos**: `Relato → Planteo Investigacion Desenlace`.

Este paso agrega los tres últimos pasos, que le dan la **forma** final: toda producción queda como A → B C o A → a. Además agrega `toChomskyNormalForm`, que encadena los seis, e `isChomskyNormalForm`, que verifica el resultado. Con eso, CYK (paso 25) ya tiene su entrada.

---

## 2. Por qué así

- **El orden (Hopcroft 7.1):** USELESS va después de DEL y UNIT porque esos dos pasos **dejan** símbolos inútiles (A en `epsilon-trap`, `Descarte` en G1). TERM va antes que BIN para que BIN solo vea no terminales.
- **USELESS reutiliza el paso 9:** `analyzeUsefulSymbols` ya calcula productivos y alcanzables en el orden correcto. El paso solo filtra las producciones.
- **El inicial nunca se borra:** si L(G) = ∅ (`test-empty`), el inicial es inútil, pero una gramática sin inicial no existe. Queda solo, sin producciones.
- **N ahora también puede achicarse:** `rewriteGrammar` suma el parámetro opcional `removedNonterminals`, que USELESS usa para sacar de N los inútiles.
- **Un T_a por terminal, no por aparición:** `T_SOS → SOS` se agrega una sola vez aunque SOS aparezca en cuatro producciones.
- **Una cadena X por producción (como Hopcroft):** BIN no reutiliza cadenas entre producciones, aunque dos lados derechos terminen igual. Es la construcción del libro, y así cada X tiene una sola producción. En G1 se ve: `X2 → Libres Lineas` y `X3 → Libres Lineas` son iguales.
- **Si un paso no cambia nada, devuelve el mismo objeto:** el comando lo detecta y escribe `Nothing to do: …`, como START en el paso 23.
- **Los pasos son datos:** `CHOMSKY_NORMAL_FORM_STEPS` es la lista de los seis (nombre y función). La usan `toChomskyNormalForm` y el comando, así que el orden está escrito en un solo lugar.

---

## 3. Cómo se usa en el programa

| Quién                                     | Llama a                                    | Recibe                                    |
| ----------------------------------------- | ------------------------------------------ | ----------------------------------------- |
| comando `chomsky-normal-form`             | `CHOMSKY_NORMAL_FORM_STEPS`, uno tras otro | la gramática después de cada paso         |
| comando, al final                         | `productionsOutsideChomskyNormalForm`      | `✓` o la lista de producciones que fallan |
| CYK y las pruebas diferenciales (25 y 28) | `toChomskyNormalForm`                      | la gramática en FNC                       |
| web (SPEC 03)                             | `toChomskyNormalForm` (API pública)        | el panel "FNC paso a paso"                |

---

## 4. Cómo funciona

### 4.1 USELESS: borrar los símbolos inútiles

**Qué es un símbolo inútil** (ficha 08): un no terminal que no aparece en ninguna derivación de una oración. Hay dos maneras de serlo:

- **no productivo:** nunca termina en terminales (A → A a);
- **no alcanzable:** ninguna derivación desde el inicial llega a él.

**Qué hace:** borra los inútiles de N y todas las producciones que los usan, a la izquierda o a la derecha.

**Ejemplo con G1 (después de UNIT):** `Descarte` solo aparecía en `CuerpoLinea → Descarte`. UNIT borró esa unitaria (CuerpoLinea copió `DSC Libres` y `DSC`), así que ya nadie llega a `Descarte`.

| Antes de USELESS         | Después                  |
| ------------------------ | ------------------------ |
| `Descarte → DSC Libres`  | (borrada)                |
| `Descarte → DSC`         | (borrada)                |
| 69 producciones, 21 en N | 67 producciones, 20 en N |

**Por qué no cambia el lenguaje:** un símbolo inútil no aparece en ninguna derivación de una oración, así que borrarlo no quita ninguna oración.

### 4.2 TERM: los terminales, solos

**Qué hace:** en cada lado derecho de largo 2 o más, cambia cada terminal a por un no terminal nuevo `T_a`, y agrega `T_a → a`. Los lados derechos de largo 1 (`Evidencia → PIS`) no se tocan: ya tienen la forma A → a.

**Ejemplo con G1:**

| Antes de TERM             | Después de TERM                            |
| ------------------------- | ------------------------------------------ |
| `Desenlace → REV Cierre`  | `Desenlace → T_REV Cierre`                 |
| `Linea → SOS CuerpoLinea` | `Linea → T_SOS CuerpoLinea`                |
| `Evidencia → PIS`         | `Evidencia → PIS` (igual: largo 1)         |
| —                         | `T_REV → REV`, `T_SOS → SOS`, … (8 nuevas) |

En G1 aparecen 8 terminales en lados largos (CRI, CTX, PER, ENC, SOS, DSC, REV, CNF): se quitan 15 producciones, se agregan 15 con T_a más las 8 `T_a → a`. Quedan 75.

**Por qué no cambia el lenguaje:** `T_a` solo deriva a. Cada derivación de G tiene su copia en G', con un paso más por cada terminal envuelto.

### 4.3 BIN: lados derechos de largo 2

**Qué hace:** parte cada lado derecho de largo k ≥ 3 en una cadena de k − 1 producciones de largo 2, con no terminales nuevos X1, X2, …

`A → B1 B2 … Bk` pasa a ser `A → B1 X1`, `X1 → B2 X2`, …, `X(k−2) → B(k−1) Bk`.

**Ejemplo con G1:**

| Antes de BIN                               | Después de BIN                                        |
| ------------------------------------------ | ----------------------------------------------------- |
| `Relato → Planteo Investigacion Desenlace` | `Relato → Planteo X1`, `X1 → Investigacion Desenlace` |
| `Investigacion → Evidencia Libres Lineas`  | `Investigacion → Evidencia X2`, `X2 → Libres Lineas`  |
| `Pasos → Evidencia Libres Lineas`          | `Pasos → Evidencia X3`, `X3 → Libres Lineas`          |

Quedan 78 producciones. X1 se lee como "lo que falta después de Planteo".

**Por qué no cambia el lenguaje:** cada X tiene una sola producción, así que `Relato ⇒ Planteo X1 ⇒ Planteo Investigacion Desenlace` es la misma derivación de antes con un paso más. No agrega cadenas ni ambigüedad.

---

## 5. El código, función por función

### 5.1 `removeUselessSymbols(grammar)` (`remove-useless-symbols.ts`)

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

- **`analyzeUsefulSymbols(grammar)`:** el análisis del paso 9. Devuelve, entre otras cosas, `useless`: los no terminales no productivos o no alcanzables. En G1 después de UNIT, `{Descarte}`.
- **`removed`:** los inútiles menos el inicial, que siempre se queda en N (caso L(G) = ∅).
- **`if (useless.size === 0) return grammar`:** si todo es útil, devuelve el mismo objeto, y el comando escribe `Nothing to do: every nonterminal is productive and reachable`.
- **`filter(usesNoUselessSymbol)`:** se queda con las producciones que no tienen ningún inútil, ni a la izquierda ni a la derecha.
- **`removedNonterminals: removed`:** el parámetro nuevo de `rewriteGrammar`; saca esos símbolos de N.

**`usesNoUselessSymbol({ production, useless })`:**

```ts
return [production.leftSide, ...production.rightSide].every((symbol) => !useless.has(symbol));
```

Junta el lado izquierdo y el derecho en una lista y pregunta si **ninguno** es inútil. Es lo mismo que las dos podas de Hopcroft: si A es útil y todos los símbolos de α son productivos, entonces los de α también son alcanzables (por A → α).

### 5.2 `isolateTerminals(grammar)` (`isolate-terminals.ts`)

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

- **`nonterminalsForTerminals(grammar)`:** un `Map` de terminal a su no terminal nuevo, solo para los terminales que aparecen en lados de largo ≥ 2. En G1: `CRI ↦ T_CRI`, `CTX ↦ T_CTX`, … (8).
- **`if (nonterminalOf.size === 0) return grammar`:** ningún terminal para envolver: el mismo objeto.
- **`map` sobre las producciones:** si el lado derecho es corto (`< 2`), queda igual. Si no, cada símbolo se cambia por su `T_a` (`nonterminalOf.get(symbol)`), o queda igual si no es terminal (`?? symbol`).
- **`terminalProductions`:** una `T_a → a` por cada entrada del `Map`. Van al final.
- **`newNonterminals`:** los `T_a` se agregan a N.

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
- **`freshSymbol({ …, taken })`:** quiere llamarlo `T_CRI`; si ese nombre ya está en N, en Σ o entre los elegidos en este paso (`taken`), le agrega primas (`T_CRI'`). `taken` es el parámetro nuevo de `freshSymbol`: TERM y BIN crean varios nombres en el mismo paso.

### 5.3 `binarize(grammar)` (`binarize.ts`)

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

- **`every(… <= 2)`:** si ningún lado derecho es largo, el mismo objeto.
- **`flatMap`:** cada producción da una lista: ella misma si es corta, o su cadena si es larga.
- **`chainNames({ …, count: k − 2 })`:** un lado de largo k necesita k − 2 X nuevos. `Relato → Planteo Investigacion Desenlace` (k = 3) necesita uno: X1.
- **`newNonterminals.push(...chain)`:** se acumulan, así la siguiente producción larga empieza en X2 y no repite nombres.
- **`splitIntoChain`:** arma las k − 1 producciones de la cadena.

**`chainNames`:** prueba X1, X2, X3, … y se queda con los primeros `count` que no estén en N, en Σ ni ya usados por otra cadena.

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

Con `A → B1 B2 B3 B4` y chain `[X1, X2]`:

| index | leftSide | rightSide                                     |
| ----- | -------- | --------------------------------------------- |
| 0     | A        | `B1 X1` (el símbolo 0 y el X 0)               |
| 1     | X1       | `B2 X2` (el símbolo 1 y el X 1)               |
| 2     | X2       | `B3 B4` (la última: `slice(2)`, lo que queda) |

- **`leftSides`:** A y después cada X: cada producción de la cadena tiene como lado izquierdo el X anterior.
- **`index < chain.length`:** todas menos la última llevan un símbolo original y el X siguiente.
- **`slice(index)`:** la última lleva los dos símbolos que quedan.

### 5.4 `toChomskyNormalForm(grammar)` (`index.ts`)

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

- **`CHOMSKY_NORMAL_FORM_STEPS`:** los seis pasos en orden, cada uno con su nombre y su función. Es el único lugar donde está escrito el orden.
- **El bucle:** la salida de un paso es la entrada del siguiente, y cada resultado intermedio se guarda en `steps` (lo que muestra la consola o la web).
- **`grammar`:** la gramática final, en FNC.
- **`acceptsEmpty`:** si quedó S → ε para el inicial, es decir, si ε ∈ L(G). `parentheses` da `true`; G1, `false`.

### 5.5 `isChomskyNormalForm(grammar)` y `productionsOutsideChomskyNormalForm(grammar)`

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

- **no tiene una de las tres formas** (`hasChomskyNormalFormShape`):
  - largo 2: los dos símbolos son no terminales (A → B C);
  - largo 1: el símbolo es terminal (A → a);
  - largo 0: es del inicial (S → ε);
- **o es S → ε y S aparece en algún lado derecho:** esa ε se podría usar adentro de otra producción. Reutiliza `appearsOnSomeRightSide` de START.

Con `parentheses` original falla en `S → ( S ) S` (largo 4) y en `S → ε` (S está en `( S ) S`).

### 5.6 El comando `chomsky-normal-form`

- Usa `CHOMSKY_NORMAL_FORM_STEPS` del núcleo. Lo que es solo de la consola (la descripción de cada paso y el motivo de `Nothing to do`) está en `STEP_DESCRIPTIONS`, un objeto con una entrada por nombre.
- `--until` acepta los seis nombres, en mayúsculas o minúsculas. Sin `--until`, corre los seis.
- Si corrió los seis, termina con el veredicto: `Chomsky normal form ✓ (78 productions)`. Si alguna producción fallara (sería un error en algún paso), escribe `✗` y la lista.
- Cuenta en singular cuando hay una sola: `(1 production)`.

---

## 6. Ejemplo recorrido a mano

### 6.1 `parentheses`, desde donde quedó en el paso 23

| Paso    | Qué pasa                                                                     | Producciones |
| ------- | ---------------------------------------------------------------------------- | ------------ |
| USELESS | nada: S0 y S son productivos y alcanzables                                   | 9            |
| TERM    | `(` y `)` pasan a `T_(` y `T_)`; + `T_( → (`, `T_) → )`                      | 11           |
| BIN     | `S → T_( S T_) S` da `S → T_( X5`, `X5 → S X6`, `X6 → T_) S`; lo mismo en S0 | 19           |

Resultado: 19 producciones, `S0 → ε` incluida (`acceptsEmpty`).

### 6.2 G1

```sh
npm run sabueso -- chomsky-normal-form --grammar g1
```

| Paso    | Agrega | Quita | Producciones | Ejemplos                                                            |
| ------- | ------ | ----- | ------------ | ------------------------------------------------------------------- |
| START   | 0      | 0     | 40           | nada: `Relato` no aparece a la derecha                              |
| DEL     | 16     | 10    | 46           | − MarcoOpc → ε; + Planteo → Hecho                                   |
| UNIT    | 33     | 10    | 69           | − Investigacion → Pasos; + Investigacion → PIS                      |
| USELESS | 0      | 2     | 67           | − Descarte → DSC Libres; − Descarte → DSC                           |
| TERM    | 23     | 15    | 75           | − Desenlace → REV Cierre; + Desenlace → T_REV Cierre; + T_REV → REV |
| BIN     | 6      | 3     | 78           | − Relato → Planteo Investigacion Desenlace; + Relato → Planteo X1   |

Termina con `Chomsky normal form ✓ (78 productions)`. N pasó de 21 a 31 símbolos: se fue `Descarte` y llegaron 8 `T_a` y 3 `X`.

### 6.3 Las de prueba

| Gramática      | Qué pasa en USELESS                          | Resultado              |
| -------------- | -------------------------------------------- | ---------------------- |
| `epsilon-trap` | se va A (DEL la dejó sin producciones)       | `S → x` (1 producción) |
| `test-useless` | se van A (no productivo) y C (no alcanzable) | `S → b`                |
| `test-empty`   | todo es inútil: queda S0 solo                | 0 producciones, L = ∅  |
| `test-cyclic`  | se van S y A (UNIT dejó S0 → a)              | `S0 → a`               |

---

## 7. Errores

Las funciones no lanzan errores. El comando: sin `--grammar`, con argumentos de más o con un `--until` que no es uno de los seis, termina con código 2.

---

## 8. Consola y pruebas

```sh
npm run sabueso -- chomsky-normal-form --grammar g1
npm run sabueso -- chomsky-normal-form --grammar parentheses --until TERM
npm run sabueso -- chomsky-normal-form --grammar test-useless
```

**`test/chomsky-normal-form/useless-term-bin.test.ts`:**

| Prueba                  | Qué verifica                                                                                                                       |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| USELESS                 | `test-useless` y `epsilon-trap` a mano; G1 pierde `Descarte`; `test-empty` queda con S0 solo; sin cambios devuelve el mismo objeto |
| TERM                    | `parentheses` a mano; A → a y S → ε no cambian; `T_a'` si ya existe `T_a`                                                          |
| BIN                     | A → B C D E a mano; la numeración sigue entre producciones y saltea un X1 que ya existe                                            |
| toChomskyNormalForm     | las 10 gramáticas terminan en FNC; `parentheses` con `acceptsEmpty`; G1: 40 → 46 → 69 → 67 → 75 → 78                               |
| isChomskyNormalForm     | `parentheses` original no está en FNC; S → ε con S a la derecha falla                                                              |
| el lenguaje se preserva | lo mismo que en el paso 23, ahora después de USELESS, TERM y BIN                                                                   |

**`test/command-line/chomsky-normal-form.test.ts`:** los seis pasos de G1 con el veredicto, `Nothing to do` en `epsilon-trap`, `--until TERM` sin veredicto y `--until CYK` como error de uso.

Los ayudantes `stringsUpTo` y `accepts` pasaron a `test/helpers/language.ts`, porque los usan las dos pruebas de la FNC.

---

## 9. Preguntas probables en la defensa

**¿Por qué USELESS va después de DEL y UNIT, y no al principio?**
Porque esos pasos crean símbolos inútiles: DEL deja a A sin producciones en `epsilon-trap`, y UNIT deja a `Descarte` sin nadie que lo alcance en G1. Si USELESS fuera primero, quedarían.

**¿Por qué TERM antes que BIN?**
Para que BIN solo vea no terminales. Además, los dos pasos no crean nada que el otro tenga que limpiar.

**¿Puede TERM o BIN crear símbolos inútiles?**
No. Cada T_a y cada X tiene una producción (es productivo) y se agrega porque una producción alcanzable lo usa.

**¿Por qué `X2` y `X3` son iguales en G1?**
Porque BIN crea una cadena nueva por producción, como en Hopcroft. Compartirlas ahorraría una producción, pero la construcción del libro es más simple de explicar y de probar.

**¿Cuánto crece la gramática?**
En G1, de 40 a 78 producciones. El crecimiento fuerte viene de UNIT (copia producciones) y de DEL (hasta 2^m versiones). TERM agrega una por terminal y BIN k − 2 por producción larga.

**¿Qué pasa con una gramática de lenguaje vacío?**
El inicial no es productivo, así que USELESS borra todo y queda el inicial solo, sin producciones. Sigue estando en FNC y no acepta nada.

**¿Cómo sabes que el resultado está en FNC?**
`isChomskyNormalForm` lo verifica producción por producción, y la prueba lo corre sobre las 10 gramáticas. El comando lo vuelve a verificar al final y lo imprime.
