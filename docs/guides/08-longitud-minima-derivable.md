# 08 — Longitud mínima derivable

> Archivos: `packages/core/src/analysis/min-yield.ts` y `packages/core/src/command-line/commands/min-yield.ts`.

## 1. Teoría

minYield(X) es la longitud de la cadena de terminales más corta que deriva X:

- minYield(a) = 1 para un terminal a.
- minYield(A) = el mínimo, entre las producciones A → X₁…Xₖ, de minYield(X₁) + … + minYield(Xₖ). Para A → ε es 0.
- minYield(A) = ∞ si A no deriva ninguna cadena de terminales.

Se calcula por punto fijo: todo empieza en ∞ y cada ronda baja los valores hasta que no cambian. minYield(A) = 0 justo cuando A es anulable ([guía 07](07-simbolos-anulables.md)).

**Ejemplo: G1.** De abajo hacia arriba:

| No terminal       | Mejor producción                           | minYield |
| ----------------- | ------------------------------------------ | -------- |
| partes opcionales | la producción ε                            | 0        |
| Planteo           | `Planteo → Hecho MarcoOpc` (`Hecho → HAL`) | 1 + 0    |
| Investigacion     | `Investigacion → Pasos` (un `PIS`)         | 1        |
| Desenlace         | `Desenlace → Resolucion EpiOpc` (un `REV`) | 1 + 0    |
| **Relato**        | `Relato → Planteo Investigacion Desenlace` | **3**    |

Todo policial tiene al menos 3 eventos: un hecho, un paso y la revelación (`CRI PIS REV`).

## 2. Por qué así

- **Para qué sirve: podar búsquedas.** minYield es una cota inferior segura. El autómata de pila ([guía 26](26-automata-de-pila.md)) descarta una configuración si minYield(pila) supera la entrada que falta; la generación acotada ([guía 27](27-busquedas-acotadas.md)) descarta una forma sentencial que ya necesita más de k terminales. Ejemplo: con la entrada `CRI PIS REV`, si la pila es `Linea Lineas Desenlace` y falta solo `REV`, la pila necesita al menos 1 + 0 + 1 = 2 eventos y queda 1: la rama se descarta. Earley no lo necesita.
- **El mismo esquema que los anulables**, con números en lugar de sí/no: se parte de ∞ ("todavía no conozco ninguna cadena") y A se queda con la menor suma de sus producciones.
- **Descartado: buscar la derivación más corta.** Derivar puede no terminar (recursión a izquierda en `arithmetic`, ciclos en `test-cyclic`). El punto fijo nunca deriva: solo suma números de producciones.
- **∞ para lo que no produce:** si A no es productivo, su valor nunca baja de ∞. Es una forma adelantada de ver los símbolos inútiles.
- **Costo:** cada ronda recorre P una vez; hay a lo sumo |N| + 1 rondas.

## 3. El código, función por función

### 3.1 `computeMinYield(grammar)`

```ts
let current = new Map<SymbolName, number>();
for (const nonterminal of grammar.nonterminals) {
  current.set(nonterminal, Infinity);
}
for (;;) {
  const next = minYieldRound({ productions: grammar.productions, previous: current });
  if (sameValues({ first: next, second: current })) {
    return next;
  }
  current = next;
}
```

- `current.set(nonterminal, Infinity)`: ∞ significa "todavía no se conoce ninguna cadena de terminales para A". Si al final A sigue en ∞, A no es productivo.
- `Infinity` es el ∞ de JavaScript: `Infinity + 1` sigue siendo `Infinity` y cualquier número es menor. Así un lado derecho con un símbolo improductivo nunca mejora nada.
- `for (;;)` es un ciclo sin condición. La única salida es el `return`, cuando `sameValues` dice que la ronda no cambió nada: el punto fijo.
- Devuelve un `Map` con todos los no terminales, en el orden de la gramática.

### 3.2 `minYieldRound({ productions, previous })`

```ts
const next = new Map(previous);
for (const production of productions) {
  const length = minYieldOfSequence({ symbols: production.rightSide, minYield: previous });
  if (length < (next.get(production.leftSide) ?? Infinity)) {
    next.set(production.leftSide, length);
  }
}
return next;
```

- Lee solo la ronda anterior (`previous`) y escribe en una copia (`next`). Así la ronda i depende solo de la ronda i − 1, y no del orden de las producciones.
- `new Map(previous)`: cada A empieza la ronda con su valor anterior. Un valor solo cambia si baja.
- `length < (next.get(production.leftSide) ?? Infinity)` compara con `next`, no con `previous`: si A tiene varias producciones, se queda con la menor de esta ronda.
- `?? Infinity` es para TypeScript (`get` puede devolver `undefined`). ∞ es el valor neutro: cualquier largo lo mejora.

### 3.3 `minYieldOfSequence({ symbols, minYield })`

```ts
return symbols.reduce((total, symbol) => total + (minYield.get(symbol) ?? 1), 0);
```

- Suma los valores. Un terminal no está en el mapa: vale 1 (`?? 1`).
- La lista vacía suma 0: así A → ε da 0 sin un caso especial.
- Es exportada porque el autómata de pila y la generación acotada la usan sobre su pila o su forma sentencial.

### 3.4 `sameValues({ first, second })`

```ts
return [...first].every(([symbol, value]) => second.get(symbol) === value);
```

- Compara dos mapas valor por valor: es la condición de punto fijo.
- Alcanza con recorrer `first`: los dos mapas tienen las mismas claves, porque `minYieldRound` parte de una copia.
- `===` también sirve con ∞: `Infinity === Infinity` es `true`.

### 3.5 El comando `min-yield`

- Lee `--grammar` o `--grammar-file` y muestra una tabla con un no terminal por fila. Un valor ∞ se muestra como `∞ (derives no string)`.
- Termina con minYield(S). Si es 0, agrega "ε ∈ L(G)"; si es ∞, dice que L(G) = ∅.
- `computeMinYield` no lanza errores. El comando tiene los errores de uso comunes (código 2).

## 4. Consola y pruebas

```sh
npm run sabueso -- min-yield --grammar g1
```

```text
detective/g1: minimum yield (length of the shortest string each nonterminal derives)

Nonterminal    minYield
-------------  --------
Relato         3
Planteo        1
MarcoOpc       0
…
CapOpc         0

The shortest sentence of L(G) has length 3: minYield(Relato) = 3
```

Con `--grammar test-useless`, A sale como `∞ (derives no string)`. Con `--grammar test-empty`, el comando informa L(G) = ∅.

| Prueba                                              | Qué verifica                                                                                                                                                                                                                                                                                                                                                         |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core/test/analysis/min-yield.test.ts`     | minYield(Relato) = 3 en G0 y G1; minYield(S) = 0 en `parentheses`; Planteo, Investigacion y Desenlace valen 1 y las opcionales 0; 0 ⇔ anulable en cinco gramáticas; la alternativa más corta aunque no sea la primera; la cadena `S → x A`, `A → y B`, `B → z` da 3; ∞ en `test-useless` y `test-empty`; `test-cyclic` y `arithmetic` terminan; `minYieldOfSequence` |
| `packages/core/test/command-line/min-yield.test.ts` | la tabla de G1, "ε ∈ L(G)" en `parentheses`, ∞ en `test-useless`, L(G) = ∅ en `test-empty` y los errores de uso                                                                                                                                                                                                                                                      |

## 5. Referencias

- SPEC 02, sección 3.10. Es un cálculo de punto fijo como los de Hopcroft, Motwani y Ullman, sección 7.1 (anulables, productivos), con números en lugar de valores de verdad.
