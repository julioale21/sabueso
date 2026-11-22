# Guía de estudio: 25 — CYK

> **Paso 25 del SPEC 02.** Archivos: `packages/core/src/cocke-younger-kasami/recognizer.ts` y el comando `packages/core/src/command-line/commands/cocke-younger-kasami.ts`.
> Ficha teórica relacionada: [`docs/concepts/23-cocke-younger-kasami.md`](../concepts/23-cocke-younger-kasami.md).

---

## 1. El problema que resuelve

El proyecto ya decide w ∈ L(G) con Earley. CYK es **otro** algoritmo para la misma pregunta, y sirve para dos cosas:

- **la comparación del anteproyecto:** CYK necesita la gramática en FNC, y sus árboles salen con la forma de la FNC, no con la de la gramática del género. Con `--compare` se ven los dos árboles lado a lado. Es el argumento para elegir Earley, ahora con un ejemplo concreto;
- **la validación cruzada:** si Earley sobre G y CYK sobre FNC(G) aceptan exactamente las mismas cadenas, es muy difícil que los dos estén mal de la misma manera. Las pruebas de este paso ya lo comparan; el paso 28 lo extiende.

---

## 2. Por qué así

- **CYK recibe la gramática ya convertida.** La conversión es del paso 24 (`toChomskyNormalForm`); CYK solo reconoce. Si recibe una gramática que no está en FNC, lanza un error: es un error de programación, no del usuario, y seguir daría resultados falsos sin aviso.
- **La tabla como en el spec: T[i][l]**, con inicio i y largo l. Se lee "los no terminales que derivan las l etiquetas que empiezan en la posición i". T[i][0] queda vacío: en FNC solo el inicial deriva ε, y la entrada vacía se resuelve aparte (S → ε).
- **El árbol se reconstruye desde la tabla, sin punteros.** Para cada celda se busca la primera producción y la primera división que la explican. Cada símbolo de una celda tiene al menos una, porque una lo puso ahí. Es más simple que guardar enlaces, y alcanza porque CYK muestra **un** árbol (contar y enumerar ya lo hace Earley).
- **Mismo tipo de árbol que Earley (`ParseTree`):** así se dibujan con el mismo `renderTree` y se pueden poner lado a lado.
- **Un solo árbol, el primero:** no se cuentan árboles con CYK. La FNC cambia los árboles (agrega X y T_a, quita los unitarios), así que su cantidad no se puede comparar con la de G (SPEC 02, sección 9.4).

---

## 3. Cómo se usa en el programa

| Quién                           | Llama a                                               | Recibe                                  |
| ------------------------------- | ----------------------------------------------------- | --------------------------------------- |
| comando `cocke-younger-kasami`  | `toChomskyNormalForm` y `recognizeCockeYoungerKasami` | la tabla, el veredicto y el árbol FNC   |
| comando, con `--compare`        | además `recognize` y `parseTrees` de Earley           | el árbol de la gramática original       |
| pruebas diferenciales (paso 28) | `recognizeCockeYoungerKasami`                         | la aceptación, para comparar con Earley |
| web (SPEC 03)                   | la API pública                                        | el panel "tabla CYK"                    |

---

## 4. Cómo funciona

**La idea:** en FNC, una cadena de largo 1 sale de una producción A → a, y una de largo l ≥ 2 sale de una A → B C donde B deriva una primera parte y C el resto. Entonces se puede llenar una tabla de abajo hacia arriba: primero los pedazos de largo 1, después los de largo 2 (usando los de 1), y así hasta el largo n, que es la entrada completa.

1. **Largo 1:** T[i][1] = { A | A → wi }, para cada etiqueta wi.
2. **Largo l ≥ 2:** para cada inicio i y cada división k (1 ≤ k < l), si A → B C con B ∈ T[i][k] y C ∈ T[i+k][l−k], entonces A ∈ T[i][l].
3. **Aceptación:** w ∈ L(G) si el inicial está en T[0][n].

**Ejemplo con `parentheses` en FNC y `( ) ( )`:**

| l \ i | 0: `(`  | 1: `)`           | 2: `(`  | 3: `)` |
| ----- | ------- | ---------------- | ------- | ------ |
| l = 4 | {S, S0} |                  |         |        |
| l = 3 | ∅       | {X2, X4, X6, X8} |         |        |
| l = 2 | {S, S0} | ∅                | {S, S0} |        |
| l = 1 | {T\_(}  | {T\_)}           | {T\_(}  | {T\_)} |

- **Fila 1:** `(` solo sale de `T_( → (`, y `)` de `T_) → )`.
- **T[0][2] = {S, S0}:** `( )` se divide en `(` + `)`, y `S → T_( T_)` y `S0 → T_( T_)` lo explican.
- **T[1][3] = {X2, X4, X6, X8}:** `) ( )` se divide en `)` + `( )`, y las cuatro X tienen la producción `X → T_) S` (BIN creó una por producción).
- **T[0][4]:** `( ) ( )` se divide en `(` + `) ( )`, con `S0 → T_( X4`. S0 está: **acepta**.

**Costo:** hay O(n²) celdas, cada una prueba O(n) divisiones y, por cada división, las |P| producciones: O(n³·|G|), siempre, aunque la gramática no sea ambigua. Earley, en cambio, es O(n²) en gramáticas no ambiguas y O(n) en muchas como G1.

---

## 5. El código, función por función

### 5.1 `recognizeCockeYoungerKasami({ grammar, tokens })`

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

- **`productionsOutsideChomskyNormalForm`** (paso 24): si alguna producción no tiene forma FNC, lanza un error que dice cómo convertirla.
- **`fillTable`:** llena T (sección 5.2).
- **Entrada vacía:** no hay celdas. Se acepta solo si existe S → ε (`emptyStartProduction`), y el árbol es S con una hoja ε.
- **`accepted`:** el inicial está en T[0][n]. Los `?.` y `?? false` son para TypeScript: con n ≥ 1 la celda siempre existe.
- **`tree`:** si acepta, se reconstruye desde el inicial sobre toda la entrada (sección 5.4).

Devuelve `{ accepted, table, tree }`, el tipo `CockeYoungerKasamiResult` del spec.

### 5.2 `fillTable({ grammar, tokens })`

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

- **La forma de la tabla:** una fila por inicio; la fila `start` tiene los largos 0 … n − start (un pedazo que empieza en `start` no puede pasar del final). Cada celda es un `Set` vacío.
- **Largo 1 (`forEach`):** para cada etiqueta, cada producción A → a con a igual a la etiqueta pone A en su celda.
- **Largo ≥ 2:** tres bucles, en este orden:
  - `length` de 2 a n: los largos crecen, así las dos partes de cada división (más cortas) ya están calculadas;
  - `start`: cada inicio donde entra un pedazo de ese largo;
  - `split` (k): dónde se corta; la primera parte tiene k etiquetas.
- **`splitMatches`** devuelve las A que explican esa división, y se agregan a la celda.

### 5.3 `splitMatches` y `explainsSplit`

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

- **`explainsSplit`:** A → B C explica la división si B deriva las primeras k etiquetas (B ∈ T[start][k]) y C las otras l − k (C ∈ T[start+k][l−k]). Las producciones A → a no pasan: su lado derecho tiene largo 1.
- **`splitMatches`:** filtra las producciones que explican la división y se queda con sus lados izquierdos.

La misma `explainsSplit` la usa `buildTree`: llenar la tabla y leer el árbol usan exactamente la misma regla.

### 5.4 `buildTree({ grammar, tokens, table, symbol, start, length })`

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
- **Por qué no falla:** un símbolo está en una celda solo porque alguna producción (y alguna división) lo puso ahí, y `explainsSplit` es la misma regla que se usó para ponerlo. Los dos `throw` marcan un error del programa, no del usuario.

Con `( ) ( )`: en T[0][4] la división k = 1 da `S0 → T_( X4`; T[1][3] con X4, k = 1 da `X4 → T_) S`; T[2][2] con S da `S → T_( T_)`.

### 5.5 El comando `cocke-younger-kasami`

- Lee la gramática, separa el relato en etiquetas y, si alguna no está en Σ, rechaza como los demás comandos.
- Convierte con `toChomskyNormalForm` y corre CYK sobre la gramática convertida.
- **`formatCykTable`:** dibuja la tabla triangular con los largos de arriba (l = n) hacia abajo (l = 1), y una columna por posición con su etiqueta (`0: (`). Una celda vacía se escribe ∅.
- **`formatVerdict`:** `ACCEPTED: S0 ∈ T[0][4]` o `REJECTED: Relato ∉ T[0][2]`; con la entrada vacía, habla de S → ε.
- **Sin `--compare`:** dibuja el árbol FNC.
- **Con `--compare` (`formatComparison`):** pone a la derecha el primer árbol de Earley sobre la gramática **original** (`sideBySide`) y, abajo, qué no terminales aparecen en uno solo de los dos (`nonterminalsOf`).
- Código de salida: 0 si acepta, 1 si rechaza, 2 si el uso es incorrecto.

---

## 6. Ejemplo recorrido a mano: la comparación con G1

```sh
npm run sabueso -- cocke-younger-kasami --grammar g1 --compare "CRI PIS REV"
```

| l \ i | 0: CRI                  | 1: PIS                                                 | 2: REV                         |
| ----- | ----------------------- | ------------------------------------------------------ | ------------------------------ |
| l = 3 | {Relato}                |                                                        |                                |
| l = 2 | ∅                       | {X1}                                                   |                                |
| l = 1 | {Hecho, Planteo, T_CRI} | {CuerpoLinea, Evidencia, Investigacion, Libres, Pasos} | {Desenlace, Resolucion, T_REV} |

- **Fila 1:** UNIT le copió `→ CRI` a Planteo y a Hecho, y TERM agregó `T_CRI → CRI`; por eso hay tres símbolos para una sola etiqueta.
- **T[1][2] = {X1}:** `PIS REV` es Investigacion + Desenlace, con `X1 → Investigacion Desenlace` (de BIN).
- **T[0][3] = {Relato}:** `Relato → Planteo X1`. Acepta.

Los dos árboles:

| CYK (FNC)                             | Earley (G1 tal como está escrita)                                               |
| ------------------------------------- | ------------------------------------------------------------------------------- |
| 5 nodos internos                      | 14 nodos internos                                                               |
| aparece `X1`, que no existe en G1     | cada nodo es un no terminal de G1                                               |
| `Planteo` cuelga directo de CRI       | `Planteo → Hecho MarcoOpc`, con `Hecho → CRI HallazgoOpc` y los opcionales en ε |
| `Investigacion` cuelga directo de PIS | `Investigacion → Pasos → Evidencia Libres Lineas`                               |

La consola lo resume: `Only in the CYK tree: X1` y `Only in the Earley tree: Hecho, HallazgoOpc, MarcoOpc, Pasos, Evidencia, Libres, Lineas, Resolucion, Cierre, EpiOpc`. Esos diez nodos son las categorías del género (el hecho, el marco, la evidencia, el cierre): el árbol de CYK no las muestra. Por eso el proyecto usa Earley.

---

## 7. Errores

- **Gramática que no está en FNC:** `recognizeCockeYoungerKasami` lanza un `Error`. El comando nunca lo provoca, porque convierte antes.
- **Etiqueta fuera de Σ:** el comando rechaza con el mensaje de siempre, sin correr CYK (código 1).
- **Uso incorrecto** (sin `--grammar`, una opción desconocida): código 2.

---

## 8. Consola y pruebas

```sh
npm run sabueso -- cocke-younger-kasami --grammar parentheses "( ) ( )"
npm run sabueso -- cocke-younger-kasami --grammar g1 --compare "CRI PIS REV"
npm run sabueso -- cocke-younger-kasami --grammar g0 "CRI REV"
```

**`test/cocke-younger-kasami/recognizer.test.ts`:**

| Prueba                        | Qué verifica                                                                                                   |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------- |
| la tabla                      | `( ) ( )` celda por celda (lo pide el spec); `( ( )` rechazada; las celdas de G1; la entrada vacía             |
| no FNC                        | `parentheses` sin convertir lanza un error                                                                     |
| el árbol                      | `( ) ( )` a mano; `CRI PIS REV` con G0 tiene `X1` y pierde `Hecho` (lo pide el spec); las hojas son la entrada |
| CYK y Earley aceptan lo mismo | `parentheses` hasta largo 6, `arithmetic` hasta 4, las de prueba, y G0 y G1 hasta largo 3                      |

**`test/command-line/cocke-younger-kasami.test.ts`:** la tabla de `( ) ( )`, `--compare` con G1, el rechazo de `CRI REV` con G0, la entrada vacía, una etiqueta fuera de Σ y los errores de uso.

---

## 9. Preguntas probables en la defensa

**¿Por qué CYK necesita la FNC?**
Porque llena la tabla suponiendo que cada pedazo de largo ≥ 2 se parte en exactamente dos partes (A → B C) y que cada etiqueta sale de una A → a. Con producciones más largas o con ε habría que probar más divisiones o celdas vacías.

**¿Cuánto cuesta CYK?**
O(n³·|G|) siempre: n² celdas, n divisiones por celda y |P| producciones por división. No aprovecha que la gramática sea no ambigua. Earley es O(n³) en el peor caso, O(n²) en gramáticas no ambiguas y lineal en muchas como G1.

**¿Por qué el árbol de CYK es distinto del de Earley si la entrada es la misma?**
Porque CYK trabaja sobre FNC(G), no sobre G. La FNC agrega no terminales que no son del género (X1, T_CRI) y quita los unitarios y los ε (Hecho, MarcoOpc, Pasos). El lenguaje es el mismo; los árboles no.

**¿Cómo reconstruyes el árbol si no guardas punteros?**
Para cada celda busco la primera producción y la primera división que la explican, con la misma regla que se usó para llenar la tabla, y repito en las dos partes. Siempre existe, porque así llegó el símbolo a la celda.

**¿Qué pasa con la entrada vacía?**
La tabla no tiene celdas. En FNC solo el inicial puede derivar ε, y solo con S → ε; si existe, acepta. `parentheses` la acepta; G1 no.

**¿Para qué sirve tener dos reconocedores?**
Para validarlos entre sí: Earley sobre G y CYK sobre FNC(G) tienen que aceptar exactamente las mismas cadenas. Las pruebas lo verifican con todas las cadenas cortas de varias gramáticas, y el paso 28 lo amplía.
