# Guía de estudio: 08 — Longitud mínima derivable

> **Paso 8 del SPEC 02.** Archivos: `packages/core/src/analysis/min-yield.ts` y `packages/core/src/command-line/commands/min-yield.ts`.
> Ficha teórica relacionada: [`docs/concepts/10-minimum-yield.md`](../concepts/10-minimum-yield.md).

---

## 1. El problema que resuelve

Para cada no terminal A, ¿cuántos terminales tiene, como mínimo, cualquier cadena que derive A? Es minYield(A).

Sirve para **podar búsquedas**, porque es una cota inferior segura:

| Quién              | Cómo lo usa                                                                                              | Paso |
| ------------------ | -------------------------------------------------------------------------------------------------------- | ---- |
| Autómata de pila   | si minYield(pila) es mayor que la entrada que falta, esa configuración nunca puede aceptar y se descarta | 26   |
| Generación acotada | si una forma sentencial ya necesita más de k terminales, no puede dar una oración de largo ≤ k           | 27   |

Ejemplo de la poda: con la entrada `CRI PIS REV`, si en algún momento la pila es `Linea Lineas Desenlace` y falta leer solo `REV`, la pila necesita al menos 1 + 0 + 1 = 2 eventos y queda 1. Esa rama se descarta sin explorarla.

Earley no lo necesita. Por eso este paso es menos central que los anulables o FIRST/FOLLOW, pero es corto y usa la misma idea de punto fijo.

---

## 2. Por qué esta herramienta

- **Qué se eligió:** el mismo esquema de punto fijo por rondas del paso 7, con números en lugar de sí/no. Se parte de ∞ ("todavía no conozco ninguna cadena") y cada ronda calcula, para cada producción A → X₁…Xₖ, la suma de los valores de la ronda anterior. A se queda con el mínimo.
- **Por qué termina:** los valores solo bajan, y son naturales o ∞. Un natural no puede bajar para siempre. En la práctica, la ronda i encuentra el mejor valor que se logra con árboles de derivación de altura ≤ i.
- **Por qué no buscar la derivación más corta:** derivar puede no terminar (recursión a izquierda en `arithmetic`, ciclos en `test-cyclic`). El punto fijo nunca deriva: solo suma números de producciones.
- **Relación con los anulables:** minYield(A) = 0 exactamente cuando A es anulable. Una prueba lo verifica en cinco gramáticas.
- **∞ para lo que no produce:** si A no deriva ninguna cadena de terminales (no es **productivo**, paso 9), su valor nunca baja de ∞. Es una forma adelantada de ver los símbolos inútiles.

---

## 3. Cómo se usa en el programa

| Quién                        | Llama a              | Recibe                               |
| ---------------------------- | -------------------- | ------------------------------------ |
| comando `min-yield` (paso 8) | `computeMinYield`    | el valor de cada no terminal         |
| `analyzeGrammar` (paso 12)   | `computeMinYield`    | el mapa, en el informe               |
| autómata de pila (paso 26)   | `minYieldOfSequence` | lo que necesita la pila              |
| generación acotada (paso 27) | `minYieldOfSequence` | lo que necesita una forma sentencial |

---

## 4. Cómo funciona

1. Todo no terminal empieza en ∞. Un terminal vale siempre 1 (no está en el mapa).
2. Ronda: para cada producción A → X₁…Xₖ, se suma el valor de cada Xᵢ según la ronda anterior. Si da menos que el valor actual de A, A baja a esa suma. Con A → ε la suma es 0.
3. Si una ronda no cambia ningún valor, es el punto fijo.

Costo: cada ronda recorre P una vez. Las rondas están acotadas por la altura de los árboles más bajos, a lo sumo |N| + 1.

---

## 5. El código, función por función

### 5.1 `computeMinYield(grammar)`

```ts
let current = new Map<SymbolName, number>();
for (const nonterminal of grammar.nonterminals) {
  current.set(nonterminal, Infinity);
}
for (;;) {
  const next = minYieldRound(grammar.productions, current);
  if (sameValues(next, current)) {
    return next;
  }
  current = next;
}
```

- `current.set(nonterminal, Infinity)`: ∞ significa "todavía no se conoce ninguna cadena de terminales para A". Si al final A sigue en ∞, A no es productivo.
- `Infinity` es el ∞ de JavaScript: `Infinity + 1` sigue siendo `Infinity` y cualquier número es menor. Así un lado derecho con un símbolo improductivo nunca mejora nada.
- `for (;;)` es un ciclo sin condición. La única salida es el `return`, cuando `sameValues` dice que la ronda no cambió nada: el punto fijo.
- El ciclo termina porque los valores solo bajan y son naturales (o ∞): no pueden bajar para siempre.
- Devuelve un `Map` con todos los no terminales, en el orden de la gramática.

### 5.2 `minYieldRound(productions, previous)`

```ts
const next = new Map(previous);
for (const production of productions) {
  const length = minYieldOfSequence(production.rightSide, previous);
  if (length < (next.get(production.leftSide) ?? Infinity)) {
    next.set(production.leftSide, length);
  }
}
return next;
```

- Igual que en los anulables, lee solo la ronda anterior (`previous`) y escribe en una copia (`next`). Así la ronda i depende solo de la ronda i − 1 (árboles de altura ≤ i), y no del orden de las producciones.
- `new Map(previous)`: cada A empieza la ronda con su valor anterior. Un valor solo cambia si baja.
- `length < (next.get(production.leftSide) ?? Infinity)` compara con `next`, no con `previous`: si A tiene varias producciones, se queda con la menor de esta ronda.
- `?? Infinity` es para TypeScript, porque `get` puede devolver `undefined`. Todo lado izquierdo ya está en el mapa; si no estuviera, ∞ es el valor neutro: cualquier largo lo mejora.

### 5.3 `minYieldOfSequence(symbols, minYield)`

```ts
return symbols.reduce((total, symbol) => total + (minYield.get(symbol) ?? 1), 0);
```

- Suma los valores. Un terminal no está en el mapa: vale 1 (`?? 1`).
- La lista vacía suma 0: así A → ε da 0 sin un caso especial.
- Es exportada porque el autómata de pila la va a usar sobre su pila.

### 5.4 `sameValues(first, second)`

```ts
return [...first].every(([symbol, value]) => second.get(symbol) === value);
```

- Compara dos mapas valor por valor. Es la condición de punto fijo.
- `[...first]` convierte el mapa en pares `[symbol, value]`. Alcanza con recorrer `first`: los dos mapas tienen las mismas claves, porque `minYieldRound` parte de una copia.
- `===` también sirve con ∞: `Infinity === Infinity` es `true`.

### 5.5 El comando `min-yield`

- Lee `--grammar` o `--grammar-file` (sin argumentos sueltos), calcula y muestra una tabla con un no terminal por fila, en el orden de la gramática.
- Termina con el largo de la oración más corta, minYield(S). Si es 0, agrega "ε ∈ L(G)". Si es ∞, dice que L(G) = ∅.
- Un valor ∞ se muestra como `∞ (derives no string)`.

---

## 6. Ejemplo recorrido a mano

Gramática `S → x A`, `A → y B`, `B → z` (una cadena, como en la prueba):

| Ronda | S         | A         | B   | Por qué                      |
| ----- | --------- | --------- | --- | ---------------------------- |
| 0     | ∞         | ∞         | ∞   | punto de partida             |
| 1     | 1 + ∞ = ∞ | 1 + ∞ = ∞ | 1   | `B → z` ya se puede calcular |
| 2     | ∞         | 1 + 1 = 2 | 1   | A usa el B de la ronda 1     |
| 3     | 1 + 2 = 3 | 2         | 1   | S usa el A de la ronda 2     |
| 4     | 3         | 2         | 1   | nada cambia: punto fijo      |

El cálculo para G1, que da minYield(Relato) = 3, está en la ficha 10.

---

## 7. Errores

`computeMinYield` no lanza errores: toda gramática construida tiene un valor para cada no terminal (quizás ∞). El comando tiene los mismos errores de uso que `nullable` (código 2).

---

## 8. Consola y pruebas

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

**`test/analysis/min-yield.test.ts`:**

| Prueba                         | Qué verifica                                                     |
| ------------------------------ | ---------------------------------------------------------------- |
| G0 y G1                        | minYield(Relato) = 3, el valor del spec                          |
| `parentheses`                  | minYield(S) = 0, el valor del spec                               |
| partes de G1                   | Planteo, Investigacion y Desenlace valen 1; las opcionales 0     |
| 0 ⇔ anulable                   | en cinco gramáticas, los de valor 0 son los anulables del paso 7 |
| la alternativa más corta       | aunque no sea la primera                                         |
| la cadena                      | `S → x A`, `A → y B`, `B → z` da 3                               |
| ∞                              | A en `test-useless` y S en `test-empty`                          |
| ciclos y recursión a izquierda | `test-cyclic` y `arithmetic` terminan, con 1                     |
| `minYieldOfSequence`           | suma, la secuencia vacía da 0, los anulables no suman            |

**`test/command-line/min-yield.test.ts`:** la tabla de G1, "ε ∈ L(G)" en `parentheses`, ∞ en `test-useless`, L(G) = ∅ en `test-empty` y los errores de uso.

---

## 9. Preguntas probables en la defensa

**¿Qué es minYield?**
La longitud de la cadena de terminales más corta que deriva un símbolo. minYield(Relato) = 3 en G1: todo policial tiene al menos 3 eventos (`CRI PIS REV`).

**¿Para qué sirve si Earley no lo usa?**
Para podar búsquedas que sí podrían no terminar o explotar: el autómata de pila (paso 26) y la generación de oraciones hasta largo k (paso 27). Es una cota inferior: si lo que falta derivar necesita más terminales de los que quedan, esa rama es imposible.

**¿Por qué la poda es correcta?**
Porque ninguna derivación desde la pila puede producir menos de minYield(pila) terminales. Descartar esa rama nunca pierde una aceptación.

**¿Cómo se relaciona con los anulables?**
minYield(A) = 0 exactamente cuando A es anulable. Los anulables son el caso sí/no de este mismo cálculo.

**¿Qué significa ∞?**
Que el símbolo no deriva ninguna cadena de terminales: no es productivo. Si le pasa al símbolo inicial, L(G) = ∅. Es lo que el paso 9 detecta como inútiles y vacuidad.

**¿Por qué termina con recursión a izquierda o con ciclos?**
Porque nunca deriva: solo suma números y se queda con el mínimo. Los valores solo bajan, y un natural no puede bajar para siempre.
