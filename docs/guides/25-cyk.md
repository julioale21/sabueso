# 25 — CYK

> Archivos: `packages/core/src/cocke-younger-kasami/recognizer.ts` y el comando `packages/core/src/command-line/commands/cocke-younger-kasami.ts`.

## 1. Teoría

CYK (Cocke–Younger–Kasami) es otro algoritmo para decidir si w ∈ L(G). Necesita la gramática en FNC ([guía 23](23-fnc-start-del-unit.md)).

- **Tabla:** T[i][l] son los no terminales que derivan las l etiquetas que empiezan en la posición i.
- **Largo 1:** A ∈ T[i][1] si A → wi.
- **Largo l ≥ 2:** A ∈ T[i][l] si hay A → B C y un corte k con B ∈ T[i][k] y C ∈ T[i+k][l−k].
- **Acepta** si el inicial está en T[0][n].
- **Costo:** O(n³·|G|), siempre.

La idea: en FNC un pedazo de largo ≥ 2 sale de una A → B C, así que se parte en dos pedazos más cortos que ya están en la tabla. Por eso se llena de abajo hacia arriba.

### Ejemplo resuelto a mano

`parentheses` en FNC y w = `( ) ( )`:

| l \ i | 0: `(`  | 1: `)`           | 2: `(`  | 3: `)` |
| ----- | ------- | ---------------- | ------- | ------ |
| l = 4 | {S, S0} |                  |         |        |
| l = 3 | ∅       | {X2, X4, X6, X8} |         |        |
| l = 2 | {S, S0} | ∅                | {S, S0} |        |
| l = 1 | {T\_(}  | {T\_)}           | {T\_(}  | {T\_)} |

- **T[0][2]:** `( )` = `(` + `)`, con S → T\_( T\_).
- **T[1][3]:** `) ( )` = `)` + `( )`, con las X → T\_) S que creó BIN.
- **T[0][4]:** `( ) ( )` = `(` + `) ( )`, con S0 → T\_( X4. **S0 está: acepta.**

## 2. Por qué así

- **Para qué CYK, si ya está Earley:** para dos cosas.
  - **La comparación:** CYK necesita la FNC, y sus árboles salen con la forma de la FNC, no con la de la gramática del género. Con `CRI PIS REV` y G1, el árbol de CYK tiene 5 nodos internos (`Relato`, `Planteo`, `X1`, `Investigacion`, `Desenlace`) y el de Earley 14. CYK agrega `X1`, que no es del género, y pierde `Hecho`, `HallazgoOpc`, `MarcoOpc`, `Pasos`, `Evidencia`, `Libres`, `Lineas`, `Resolucion`, `Cierre` y `EpiOpc`: las categorías del relato. El lenguaje es el mismo; los árboles no. Por eso el proyecto usa Earley para mostrar la estructura del relato.
  - **La validación cruzada:** si Earley sobre G y CYK sobre FNC(G) aceptan exactamente las mismas cadenas, es muy difícil que los dos estén mal de la misma manera. Las pruebas de esta guía ya lo comparan; la [guía 28](28-pruebas-diferenciales-y-rendimiento.md) lo extiende.
- **CYK recibe la gramática ya convertida.** La conversión es de la guía 24 (`toChomskyNormalForm`); CYK solo reconoce. Si recibe una gramática que no está en FNC, lanza un error: es un error de programación, y seguir daría resultados falsos sin aviso.
- **La tabla T[i][l]**, con inicio i y largo l. T[i][0] queda vacío: en FNC solo el inicial deriva ε, y la entrada vacía se resuelve aparte (S → ε).
- **El árbol se reconstruye desde la tabla, sin punteros.** Para cada celda se busca la primera producción y la primera división que la explican. Es más simple que guardar enlaces, y alcanza porque CYK muestra **un** árbol (contar y enumerar ya lo hace Earley).
- **Mismo tipo de árbol que Earley (`ParseTree`):** se dibujan con el mismo `renderTree` y se pueden poner lado a lado.
- **No se cuentan árboles con CYK:** la FNC cambia los árboles (agrega X y T_a, quita los unitarios), así que su cantidad no se puede comparar con la de G.

## 3. El código, función por función

### 3.1 `recognizeCockeYoungerKasami({ grammar, tokens })`

```ts
if (productionsOutsideChomskyNormalForm(grammar).length > 0) {
  throw new Error(
    `CYK needs a grammar in Chomsky normal form; convert "${grammar.name}" with toChomskyNormalForm`,
  );
}
const table = fillTable({ grammar, tokens });
if (tokens.length === 0) {
  const production = emptyStartProduction(grammar);
  const tree: ParseTree | null =
    production === undefined
      ? null
      : { kind: 'nonterminal', symbol: grammar.start, production, children: [{ kind: 'epsilon' }] };
  return { accepted: tree !== null, table, tree };
}
const accepted = table[0]?.[tokens.length]?.has(grammar.start) ?? false;
return {
  accepted,
  table,
  tree: accepted
    ? buildTree({ grammar, tokens, table, symbol: grammar.start, start: 0, length: tokens.length })
    : null,
};
```

- **`productionsOutsideChomskyNormalForm`** (guía 24): si alguna producción no tiene forma FNC, lanza un error que dice cómo convertirla. Es el único error propio; el comando nunca lo provoca, porque convierte antes.
- **`fillTable`:** llena T (sección 3.2).
- **Entrada vacía:** no hay celdas. Se acepta solo si existe S → ε (`emptyStartProduction`), y el árbol es S con una hoja ε.
- **`accepted`:** el inicial está en T[0][n]. Los `?.` y `?? false` son para TypeScript: con n ≥ 1 la celda siempre existe.
- **`tree`:** si acepta, se reconstruye desde el inicial sobre toda la entrada (sección 3.4).

Devuelve `{ accepted, table, tree }`, el tipo `CockeYoungerKasamiResult`.

### 3.2 `fillTable({ grammar, tokens })`

```ts
const n = tokens.length;
const table = Array.from({ length: n }, (_, start) =>
  Array.from({ length: n - start + 1 }, () => new Set<SymbolName>()),
);
tokens.forEach((token, start) => {
  for (const production of grammar.productions) {
    if (production.rightSide.length === 1 && production.rightSide[0] === token) {
      table[start]?.[1]?.add(production.leftSide);
    }
  }
});
for (let length = 2; length <= n; length++) {
  for (let start = 0; start + length <= n; start++) {
    for (let split = 1; split < length; split++) {
      for (const leftSide of splitMatches({ grammar, table, start, length, split })) {
        table[start]?.[length]?.add(leftSide);
      }
    }
  }
}
return table;
```

- **La forma de la tabla:** una fila por inicio; la fila `start` tiene los largos 0 … n − start (un pedazo no puede pasar del final). Cada celda es un `Set` vacío.
- **Largo 1 (`forEach`):** la base. Cada producción A → a con a igual a la etiqueta pone A en su celda.
- **Largo ≥ 2:** la inducción, con tres bucles en este orden:
  - `length` de 2 a n: los largos crecen, así las dos partes de cada división (más cortas) ya están calculadas;
  - `start`: cada inicio donde entra un pedazo de ese largo;
  - `split` (k): dónde se corta; la primera parte tiene k etiquetas.
- **`splitMatches`** devuelve las A que explican esa división, y se agregan a la celda.

### 3.3 `splitMatches` y `explainsSplit`

```ts
return grammar.productions
  .filter((production) => explainsSplit({ production, table, start, length, split }))
  .map((production) => production.leftSide);
```

```ts
const [first, second] = production.rightSide;
return (
  production.rightSide.length === 2 &&
  first !== undefined &&
  second !== undefined &&
  (table[start]?.[split]?.has(first) ?? false) &&
  (table[start + split]?.[length - split]?.has(second) ?? false)
);
```

- **`explainsSplit`:** es la regla de inducción. A → B C explica la división si B ∈ T[start][k] y C ∈ T[start+k][l−k]. Las producciones A → a no pasan: su lado derecho tiene largo 1.
- **`splitMatches`:** filtra las producciones que explican la división y se queda con sus lados izquierdos.

La misma `explainsSplit` la usa `buildTree`: llenar la tabla y leer el árbol usan exactamente la misma regla.

### 3.4 `buildTree({ grammar, tokens, table, symbol, start, length })`

```ts
const productions = grammar.productionsByLeftSide.get(symbol) ?? [];
if (length === 1) {
  const token = tokens[start] ?? '';
  const production = productions.find(
    (each) => each.rightSide.length === 1 && each.rightSide[0] === token,
  );
  // … (un error si no la encuentra: no puede pasar)
  return {
    kind: 'nonterminal',
    symbol,
    production,
    children: [{ kind: 'terminal', symbol: token, tokenIndex: start }],
  };
}
for (let split = 1; split < length; split++) {
  const production = productions.find((each) =>
    explainsSplit({ production: each, table, start, length, split }),
  );
  if (production !== undefined) {
    const [first = '', second = ''] = production.rightSide;
    return {
      kind: 'nonterminal',
      symbol,
      production,
      children: [
        buildTree({ grammar, tokens, table, symbol: first, start, length: split }),
        buildTree({
          grammar,
          tokens,
          table,
          symbol: second,
          start: start + split,
          length: length - split,
        }),
      ],
    };
  }
}
// … (un error si nada la explica: no puede pasar)
```

- **Largo 1:** busca la producción `symbol → etiqueta` y arma el nodo con una hoja.
- **Largo ≥ 2:** prueba las divisiones en orden y, en cada una, las producciones de `symbol`. La primera que explica la celda da el nodo, y sus dos hijos se arman igual, recursivamente, sobre las dos partes.
- **Siempre termina:** cada llamada cubre menos etiquetas que la anterior.
- **Por qué no falla:** un símbolo está en una celda solo porque alguna producción y alguna división lo pusieron ahí, y `explainsSplit` es la misma regla. Los dos `throw` marcan un error del programa, no del usuario.

Con `( ) ( )`: en T[0][4] la división k = 1 da `S0 → T_( X4`; en T[1][3], X4 con k = 1 da `X4 → T_) S`; en T[2][2], S da `S → T_( T_)`.

### 3.5 El comando `cocke-younger-kasami`

- Lee la gramática y separa el relato en etiquetas; si alguna no está en Σ, rechaza con el mensaje de siempre, sin correr CYK (código 1).
- Convierte con `toChomskyNormalForm` y corre CYK sobre la gramática convertida.
- **`formatCykTable`:** la tabla triangular, de l = n arriba a l = 1 abajo, con una columna por posición (`0: (`). Una celda vacía se escribe ∅.
- **`formatVerdict`:** `ACCEPTED: S0 ∈ T[0][4]` o `REJECTED: Relato ∉ T[0][2]`; con la entrada vacía, habla de S → ε.
- **Sin `--compare`:** dibuja el árbol FNC.
- **Con `--compare` (`formatComparison`):** pone a la derecha el primer árbol de Earley sobre la gramática **original** (`sideBySide`) y, abajo, qué no terminales aparecen en uno solo de los dos (`nonterminalsOf`).
- Código de salida: 0 si acepta, 1 si rechaza, 2 si el uso es incorrecto.

## 4. Consola y pruebas

```sh
npm run sabueso -- cocke-younger-kasami --grammar g1 --compare "CRI PIS REV"
```

| l \ i | 0: CRI                  | 1: PIS                                                 | 2: REV                         |
| ----- | ----------------------- | ------------------------------------------------------ | ------------------------------ |
| l = 3 | {Relato}                |                                                        |                                |
| l = 2 | ∅                       | {X1}                                                   |                                |
| l = 1 | {Hecho, Planteo, T_CRI} | {CuerpoLinea, Evidencia, Investigacion, Libres, Pasos} | {Desenlace, Resolucion, T_REV} |

La consola termina con `Only in the CYK tree: X1` y `Only in the Earley tree: Hecho, HallazgoOpc, MarcoOpc, Pasos, Evidencia, Libres, Lineas, Resolucion, Cierre, EpiOpc`. La fila 1 tiene tres símbolos para CRI porque UNIT le copió `→ CRI` a Planteo y a Hecho, y TERM agregó `T_CRI → CRI`.

**`packages/core/test/cocke-younger-kasami/recognizer.test.ts`:**

| Prueba                        | Qué verifica                                                                                 |
| ----------------------------- | -------------------------------------------------------------------------------------------- |
| la tabla                      | `( ) ( )` celda por celda; `( ( )` rechazada; las celdas de G1; la entrada vacía             |
| no FNC                        | `parentheses` sin convertir lanza un error                                                   |
| el árbol                      | `( ) ( )` a mano; `CRI PIS REV` con G0 tiene `X1` y pierde `Hecho`; las hojas son la entrada |
| CYK y Earley aceptan lo mismo | `parentheses` hasta largo 6, `arithmetic` hasta 4, las de prueba, y G0 y G1 hasta largo 3    |

**`packages/core/test/command-line/cocke-younger-kasami.test.ts`:** la tabla de `( ) ( )`, `--compare` con G1, el rechazo de `CRI REV` con G0, la entrada vacía, una etiqueta fuera de Σ y los errores de uso.

## 5. Referencias

- Hopcroft, Motwani y Ullman, _Introducción a la teoría de autómatas, lenguajes y computación_, sección 7.4.4 (el algoritmo CYK).
- Augusto, sección 2.4.3.
