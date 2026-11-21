# Guía de estudio: 07 — Símbolos anulables

> **Paso 7 del SPEC 02.** Archivos: `packages/core/src/analysis/nullable.ts`, `packages/core/src/analysis/fixed-point.ts`, `packages/core/src/command-line/commands/nullable.ts` y `readGrammar` en `packages/core/src/command-line/grammar-source.ts`.
> Ficha teórica relacionada: [`docs/concepts/07-nullable-symbols.md`](../concepts/07-nullable-symbols.md).

---

## 1. El problema que resuelve

Es el primer **análisis de la gramática**: ya no se lee un texto, se estudia G. La pregunta es: ¿qué no terminales pueden desaparecer, es decir, derivar ε?

Sin esta respuesta no funcionan tres piezas que vienen:

| Quién                   | Para qué necesita los anulables                                                         | Paso |
| ----------------------- | --------------------------------------------------------------------------------------- | ---- |
| FIRST y FOLLOW          | FIRST(X Y) incluye FIRST(Y) solo si X es anulable                                       | 11   |
| Earley, arreglo de ε    | si el punto está antes de un anulable B, el ítem tiene que poder saltar B sin leer nada | 15   |
| Forma Normal de Chomsky | para eliminar las producciones ε hay que saber qué símbolos pueden borrarse             | 23   |

En G1 importa mucho: sus 10 partes opcionales (`MarcoOpc`, `Cierre`…) son anulables. Un relato como `CRI PIS REV` no tiene marco, ni hallazgo, ni epílogo: todas esas partes derivan ε.

---

## 2. Por qué esta herramienta

- **Qué se eligió:** un **punto fijo** por rondas. Se parte de ∅ y se aplica la regla "A es anulable si tiene una producción con todo el lado derecho anulable" hasta que el conjunto deja de crecer.
- **Por qué un punto fijo:** la definición es recursiva (A es anulable si sus símbolos lo son), y puede haber recursión entre símbolos. El punto fijo **mínimo** da exactamente los que derivan ε: arranca sin suponer nada y solo agrega lo que se puede justificar.
- **Por qué termina:** el conjunto solo crece, y no puede tener más de |N| elementos. Como cada ronda que sigue agrega al menos uno, hay a lo sumo |N| + 1 rondas.
- **Por qué rondas y no "agregar sobre la marcha":** agregar en el momento converge igual (a veces en menos vueltas), pero la cantidad de vueltas depende del orden de las producciones. Con rondas, la ronda i tiene un significado teórico: son los símbolos cuyo árbol de derivación a ε más bajo tiene altura i. Es la definición inductiva de Hopcroft (base e inducción), y se puede mostrar con `--steps`.
- **Alternativa descartada: probar derivaciones.** Buscar A ⇒\* ε derivando no termina si la gramática tiene recursión (`S → S S | ε`). El punto fijo nunca deriva: solo mira producciones.

---

## 3. Cómo se usa en el programa

| Quién                       | Llama a           | Recibe                         |
| --------------------------- | ----------------- | ------------------------------ |
| comando `nullable` (paso 7) | `computeNullable` | el conjunto y cada ronda       |
| FIRST/FOLLOW (paso 11)      | `computeNullable` | el conjunto                    |
| `analyzeGrammar` (paso 12)  | `computeNullable` | el conjunto, en el informe     |
| Earley (paso 15)            | el conjunto       | para el avance sobre anulables |

`computeNullable` solo necesita P: recorre las producciones, nada más. No conoce Earley ni la consola.

---

## 4. Cómo funciona

1. `nullable` = ∅.
2. Ronda: para cada producción A → X₁…Xₖ, si **todos** los Xᵢ están en el conjunto de la ronda anterior, A entra. Una producción ε (k = 0) cumple siempre: "todos los de una lista vacía" es verdadero.
3. Si la ronda no agregó nada, es el punto fijo: se devuelve el conjunto. Si no, se repite.

Un terminal nunca entra al conjunto, así que una producción con un terminal nunca dispara.

Costo: cada ronda recorre P una vez (O(|P|·k), con k el largo máximo de un lado derecho), y hay a lo sumo |N| + 1 rondas.

---

## 5. El código, función por función

### 5.1 `repeatRuleUntilNoChange({ start, newSymbolsOfRound, onIteration })` (`src/analysis/fixed-point.ts`)

El esquema de punto fijo se escribe **una sola vez**, con nombre propio: repite la regla hasta que no cambia nada. En la teoría se llama **menor punto fijo** (_least fixed point_). Lo usan los anulables y, en el paso 9, los productivos y los alcanzables. Cada análisis solo aporta su regla.

```ts
export function repeatRuleUntilNoChange({
  start,
  newSymbolsOfRound,
  onIteration,
}: {
  start: Iterable<SymbolName>;
  newSymbolsOfRound: (knownBefore: ReadonlySet<SymbolName>) => Iterable<SymbolName>;
  onIteration?: FixedPointObserver | undefined;
}): Set<SymbolName> {
  let knownBefore = new Set(start);
  for (let round = 1; ; round++) {
    const knownAfter = new Set([...knownBefore, ...newSymbolsOfRound(knownBefore)]);
    onIteration?.(round, knownAfter);
    if (knownAfter.size === knownBefore.size) {
      return knownAfter; // nothing new: fixed point
    }
    knownBefore = knownAfter;
  }
}
```

| Parámetro           | Qué es                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `start`             | el conjunto inicial: ∅ para anulables y productivos, {S} para alcanzables                                           |
| `newSymbolsOfRound` | **la regla**: dado lo que se sabía antes de la ronda, qué símbolos encuentra                                        |
| `onIteration`       | opcional: recibe el número de ronda (desde 1) y el conjunto. Lo usa `--steps`; si no se pasa, no cuesta nada (`?.`) |

- **Dos conjuntos por ronda:** la regla lee `knownBefore` (lo que se sabía al terminar la ronda anterior) y lo nuevo va a `knownAfter`. Así, un símbolo descubierto en esta ronda recién cuenta en la siguiente, y la ronda i tiene significado: los símbolos que necesitan i aplicaciones de la regla.
- **`new Set([...knownBefore, ...nuevos])`** arma un conjunto con los elementos de los dos: no es un conjunto de conjuntos. Los repetidos se descartan solos.
- **Comparar tamaños alcanza:** `knownAfter` contiene a `knownBefore` y nunca pierde elementos. Si el tamaño no cambió, la ronda no agregó nada: es el punto fijo.
- **Por qué termina:** el conjunto solo crece y no puede tener más símbolos que N. Hay a lo sumo |N| + 1 rondas.

### 5.2 `computeNullable(grammar, onIteration?)`

```ts
export function computeNullable(
  grammar: Grammar,
  onIteration?: FixedPointObserver,
): Set<SymbolName> {
  return repeatRuleUntilNoChange({
    start: [],
    newSymbolsOfRound: (nullable) =>
      nonterminalsWithProductionThat(grammar.productions, (production) =>
        derivesEmptyString(production, nullable),
      ),
    onIteration,
  });
}
```

- Se lee como la definición: "parto de ∅; en cada ronda entran los lados izquierdos de las producciones que derivan ε con los anulables conocidos".
- `nonterminalsWithProductionThat(productions, condition)` (también en `fixed-point.ts`) devuelve los lados izquierdos de las producciones que cumplen la condición: la forma habitual de la regla de una ronda.

### 5.3 `derivesEmptyString(production, nullable)`

```ts
return production.rightSide.every((symbol) => nullable.has(symbol));
```

- `every` sobre una lista vacía da `true`: así A → ε entra en la ronda 1 sin un caso especial.
- Un terminal nunca está en `nullable`, así que con un terminal da `false`.

### 5.4 El comando `nullable`

1. Lee `--grammar <nombre>` o `--grammar-file <ruta>`, y `--steps`. No acepta argumentos sueltos.
2. Lee la gramática con `readGrammar` (lexer → parser → `buildGrammar`). `readGrammar` es nueva en este paso: la comparten `tokens`, `nullable` y los análisis que vienen.
3. Llama a `computeNullable` guardando cada ronda.
4. Con `--steps` imprime una fila por ronda: cuántos anulables hay y cuáles se agregaron. La última dice `(none: fixed point)`.
5. Imprime el resultado. Un conjunto vacío se escribe ∅, como en la teoría.

---

## 6. Ejemplo recorrido a mano

`examples/grammars/nullable-chain.grammar`: `S → A B x | B B`, `B → A A | b`, `A → a | ε`.

| Ronda | Producción que mira | ¿Todo el lado derecho en la ronda anterior? | Resultado  |
| ----- | ------------------- | ------------------------------------------- | ---------- |
| 1     | `A → ε`             | sí (lista vacía)                            | A entra    |
| 1     | `B → A A`           | no: A todavía no estaba                     | —          |
| 2     | `B → A A`           | sí                                          | B entra    |
| 3     | `S → B B`           | sí                                          | S entra    |
| 4     | todas               | no agrega nada                              | punto fijo |

`S → A B x` no dispara nunca: `x` es terminal.

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

---

## 7. Errores

`computeNullable` no lanza errores: toda gramática construida tiene un conjunto de anulables (quizás ∅). El comando comparte los errores de uso de `tokens` (código 2): falta la gramática, vienen las dos opciones, un nombre desconocido, una opción que no existe, o un argumento suelto.

---

## 8. Consola y pruebas

```sh
npm run sabueso -- nullable --grammar g1 --steps
```

```text
detective/g1: nullable symbols (A ⇒* ε)

Round  Nullable so far  Added in this round
-----  ---------------  ------------------------------------------------------------------------------------------
1      10               CapOpc, Cierre, CtxOpc, CuerpoLinea, EpiOpc, HallazgoOpc, Libres, Lineas, MarcoOpc, PerOpc
2      10               (none: fixed point)

Nullable = {CapOpc, Cierre, CtxOpc, CuerpoLinea, EpiOpc, HallazgoOpc, Libres, Lineas, MarcoOpc, PerOpc} (10 of 21 nonterminals)
```

En G1 todo entra en la ronda 1, porque cada parte opcional tiene su propia producción ε y ningún anulable depende de otro. Con `--grammar g0` imprime `Nullable = ∅ (0 of 10 nonterminals)`.

**`test/analysis/fixed-point.test.ts`:** el esquema general: termina, un símbolo descubierto cuenta recién en la ronda siguiente, numera las rondas desde 1 y los conjuntos recibidos no cambian después.

**`test/analysis/nullable.test.ts`:**

| Prueba                                | Qué verifica                                                                                        |
| ------------------------------------- | --------------------------------------------------------------------------------------------------- |
| G0, `parentheses`, `epsilon-trap`, G1 | los valores del spec: ∅, {S}, {A} y los 10 de G1                                                    |
| la cadena                             | un símbolo entra una ronda después que los suyos                                                    |
| terminales                            | `S → A x` con A anulable: S no es anulable                                                          |
| ciclo sin salida                      | `test-cyclic` (S ⇒ A ⇒ S, sin ε) da ∅                                                               |
| `onIteration`                         | las rondas de la cadena, las dos de G1 y la única de G0; los conjuntos recibidos no cambian después |

**`test/command-line/nullable.test.ts`:** el resultado de G1, las rondas con `--steps`, ∅ para G0, la cadena con `--grammar-file` y los errores de uso.

---

## 9. Preguntas probables en la defensa

**¿Qué es un símbolo anulable?**
Un no terminal A con A ⇒\* ε: puede derivar la cadena vacía. En G1, `MarcoOpc` lo es: un relato puede no tener marco.

**¿Por qué un punto fijo y no probar derivaciones?**
Porque derivar puede no terminar (`S → S S | ε`). El punto fijo solo mira producciones, el conjunto solo crece y está acotado por |N|: termina en a lo sumo |N| + 1 rondas.

**¿Por qué "mínimo"?**
Porque se arranca de ∅ y solo se agrega lo que tiene justificación. En `test-cyclic` (S → A, A → S) el conjunto {S, A} también "cumple" la regla, pero no es real: ninguno deriva ε. El mínimo es ∅.

**¿Qué significa la ronda i?**
Los símbolos cuyo árbol de derivación a ε más bajo tiene altura i. En la cadena de ejemplo, A tiene un árbol de altura 1 (A → ε), B de altura 2 y S de altura 3.

**¿Para qué sirve en el proyecto?**
Para FIRST y FOLLOW (paso 11), para el arreglo de ε de Earley (paso 15) y para la Forma Normal de Chomsky (paso 23). En Earley, el Earley clásico puede perder derivaciones cuando un símbolo anulable se completa antes de que otro ítem lo espere (el caso `epsilon-trap`). Conociendo los anulables, el Predictor salta esos símbolos de entrada.

**¿Por qué un terminal no puede ser anulable?**
Porque siempre aporta exactamente un símbolo a la cadena: nunca deriva ε.
