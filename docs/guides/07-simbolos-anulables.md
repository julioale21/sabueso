# 07 — Símbolos anulables

> Archivos: `packages/core/src/analysis/nullable.ts`, `packages/core/src/analysis/fixed-point.ts`, `packages/core/src/command-line/commands/nullable.ts` y `readGrammar` en `packages/core/src/command-line/grammar-source.ts`.

## 1. Teoría

Un no terminal A es **anulable** si A ⇒\* ε: puede derivar la cadena vacía. Un terminal nunca es anulable.

Se calcula por rondas, como **menor punto fijo** (Hopcroft 7.1.3, ver sección 5):

- **Base:** si A → ε ∈ P, A es anulable.
- **Inducción:** si A → X₁…Xₖ ∈ P y todos los Xᵢ son anulables, A es anulable.
- Se repite hasta que una ronda no agrega nada. Como el conjunto solo crece y está acotado por N, termina.

**Ejemplo.** `S → A B x | B B`, `B → A A | b`, `A → a | ε` (`examples/grammars/nullable-chain.grammar`):

| Ronda | Qué regla dispara     | Anulables |
| ----- | --------------------- | --------- |
| 1     | `A → ε`               | {A}       |
| 2     | `B → A A` (A ya está) | {A, B}    |
| 3     | `S → B B` (B ya está) | {A, B, S} |
| 4     | ninguna nueva         | {A, B, S} |

`S → A B x` nunca dispara: x es terminal. En G1, las 10 partes opcionales (`MarcoOpc`, `Cierre`…) son anulables; G0 no tiene ninguno.

## 2. Por qué así

- **Quién lo necesita:** FIRST y FOLLOW ([guía 11](11-first-y-follow.md): FIRST(X Y) incluye FIRST(Y) solo si X es anulable), el arreglo de ε de Earley ([guía 15](15-arreglo-de-epsilon.md)) y la Forma Normal de Chomsky ([guía 23](23-fnc-start-del-unit.md)). `computeNullable` solo necesita P: no conoce Earley ni la consola.
- **Un punto fijo, porque la definición es recursiva** y puede haber recursión entre símbolos. El punto fijo **mínimo** da exactamente los que derivan ε: arranca de ∅ y solo agrega lo que se puede justificar. En `test-cyclic` (S → A, A → S), {S, A} también "cumple" la regla, pero el mínimo es ∅.
- **Rondas y no "agregar sobre la marcha":** agregar en el momento converge igual, pero la cantidad de vueltas depende del orden de las producciones. Con rondas, cada ronda tiene un significado fijo (la ronda i encuentra los símbolos cuyo árbol a ε más bajo tiene altura i) y se puede mostrar con `--steps`.
- **Descartado: probar derivaciones.** Buscar A ⇒\* ε derivando no termina si hay recursión (`S → S S | ε`). El punto fijo nunca deriva: solo mira producciones.
- **Costo:** cada ronda recorre P una vez (O(|P|·k), con k el largo máximo de un lado derecho), y hay a lo sumo |N| + 1 rondas.

## 3. El código, función por función

### 3.1 `repeatRuleUntilNoChange({ start, newSymbolsOfRound })` y `lastRound` (`fixed-point.ts`)

El esquema de punto fijo se escribe **una sola vez**: repite la regla hasta que no cambia nada. Lo usan los anulables y, en la [guía 09](09-simbolos-inutiles-y-vacuidad.md), los productivos y los alcanzables. Cada análisis solo aporta su regla.

```ts
export function repeatRuleUntilNoChange({
  start,
  newSymbolsOfRound,
}: {
  start: Iterable<SymbolName>;
  newSymbolsOfRound: (knownBefore: ReadonlySet<SymbolName>) => Iterable<SymbolName>;
}): Set<SymbolName>[] {
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

| Parámetro           | Qué es                                                                       |
| ------------------- | ---------------------------------------------------------------------------- |
| `start`             | el conjunto inicial: ∅ para anulables y productivos, {S} para alcanzables    |
| `newSymbolsOfRound` | **la regla**: dado lo que se sabía antes de la ronda, qué símbolos encuentra |

- **Devuelve todas las rondas, en orden:** `rounds[0]` es lo que se sabe después de la ronda 1, y así. `--steps` las imprime tal cual. La **última** no agregó nada: es el menor punto fijo.
- **`lastRound(rounds)`** devuelve esa última ronda, para los análisis que solo quieren el resultado.
- **Dos conjuntos por ronda:** la regla lee `knownBefore` y lo nuevo va a `knownAfter`. Así, un símbolo descubierto en esta ronda recién cuenta en la siguiente.
- **`new Set([...knownBefore, ...nuevos])`** arma un conjunto con los elementos de los dos (no un conjunto de conjuntos). Los repetidos se descartan solos.
- **Comparar tamaños alcanza:** `knownAfter` contiene a `knownBefore`. Si el tamaño no cambió, la ronda no agregó nada.
- **Por qué termina:** el conjunto solo crece y no puede tener más símbolos que N.

### 3.2 `computeNullable(grammar)` y `nullableRounds(grammar)`

```ts
export function computeNullable(grammar: Grammar): Set<SymbolName> {
  return lastRound(nullableRounds(grammar));
}

export function nullableRounds(grammar: Grammar): Set<SymbolName>[] {
  return repeatRuleUntilNoChange({
    start: [],
    newSymbolsOfRound: (nullableSymbols) => newNullableSymbols({ grammar, nullableSymbols }),
  });
}
```

- **Dos funciones, una para cada uso:** `nullableRounds` devuelve todas las rondas (para `--steps`); `computeNullable`, solo el resultado (para Earley, los árboles, los ciclos y la FNC).
- Se lee como la definición: "parto de ∅ y, en cada ronda, aplico la regla `newNullableSymbols`".

**La regla de una ronda, `newNullableSymbols({ grammar, nullableSymbols })`:**

```ts
return grammar.productions
  .filter((production) => derivesEmptyString({ production, nullableSymbols }))
  .map((production) => production.leftSide);
```

- `filter`: se queda con las producciones A → X₁…Xₖ con todos sus Xᵢ anulables.
- `map`: de cada una toma el lado izquierdo A. Esos son los anulables de esta ronda.
- Puede repetir un símbolo (A con dos producciones anulables): no importa, `repeatRuleUntilNoChange` los junta en un `Set`.

### 3.3 `derivesEmptyString({ production, nullableSymbols })`

```ts
return production.rightSide.every((symbol) => nullableSymbols.has(symbol));
```

- `every` sobre una lista vacía da `true`: así A → ε entra en la ronda 1 sin un caso especial.
- Un terminal nunca está en `nullableSymbols`, así que con un terminal da `false`.

### 3.4 El comando `nullable`

- Lee `--grammar <nombre>` o `--grammar-file <ruta>`, y `--steps`. Lee la gramática con `readGrammar` (lexer → parser → `buildGrammar`), que comparten todos los análisis.
- Llama a `nullableRounds` y toma el resultado con `lastRound`. Con `--steps` imprime una fila por ronda; la última dice `(none: fixed point)`. Un conjunto vacío se escribe ∅.
- `computeNullable` no lanza errores. El comando tiene los errores de uso comunes (código 2): falta la gramática, vienen las dos opciones, un nombre desconocido, una opción que no existe o un argumento suelto.

## 4. Consola y pruebas

```sh
npm run sabueso -- nullable --grammar-file examples/grammars/nullable-chain.grammar --steps
```

```text
Round  Nullable so far  Added in this round
-----  ---------------  -------------------
1      1                A
2      2                B
3      3                S
4      3                (none: fixed point)

Nullable = {A, B, S} (3 of 3 nonterminals)
```

Con `--grammar g1 --steps` todo entra en la ronda 1 (los 10 de 21 no terminales). Con `--grammar g0` imprime `Nullable = ∅ (0 of 10 nonterminals)`.

| Prueba                                             | Qué verifica                                                                                                                                                                                   |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core/test/analysis/fixed-point.test.ts`  | el esquema general termina, un símbolo cuenta recién en la ronda siguiente, cada ronda es un conjunto propio y `lastRound` devuelve la última                                                  |
| `packages/core/test/analysis/nullable.test.ts`     | G0 da ∅, `parentheses` {S}, `epsilon-trap` {A}, G1 los 10; la cadena ronda por ronda; `S → A x` no es anulable; `test-cyclic` da ∅; las rondas de `nullableRounds` (la última es el resultado) |
| `packages/core/test/command-line/nullable.test.ts` | el resultado de G1, las rondas con `--steps`, ∅ para G0, la cadena con `--grammar-file` y los errores de uso                                                                                   |

## 5. Referencias

- Hopcroft, Motwani y Ullman, _Introducción a la teoría de autómatas, lenguajes y computación_, sección 7.1.3 (eliminación de producciones ε).
- Augusto, sección 2.3.
