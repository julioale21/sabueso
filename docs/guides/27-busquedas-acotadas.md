# Guía de estudio: 27 — Búsquedas acotadas

> **Paso 27 del SPEC 02.** Archivos: `packages/core/src/bounded/generate.ts`, `ambiguity.ts`, `compare.ts` y los comandos `generate`, `ambiguity` y `compare` (`packages/core/src/command-line/commands/`), con la opción común en `command-line/max-length.ts`.
> Fichas teóricas relacionadas: [`docs/concepts/25-bounded-searches.md`](../concepts/25-bounded-searches.md) y [`docs/concepts/21-ambiguity-g0-vs-g1.md`](../concepts/21-ambiguity-g0-vs-g1.md).

---

## 1. El problema que resuelve

Hay dos preguntas sobre gramáticas que ningún algoritmo puede responder siempre (son **indecidibles**):

- **¿G es ambigua?**
- **¿L(G) = L(H)?**

Pero las dos tienen un lado que sí se puede mostrar: si G es ambigua, existe una oración con dos árboles; si L(G) ≠ L(H), existe una oración que está en un lenguaje y no en el otro. Este paso las **busca**, probando todas las oraciones hasta un largo k. Si encuentra una, la respuesta está demostrada. Si no, no se sabe nada: puede estar en k + 1. Eso es una **semidecisión**.

En el proyecto responde dos preguntas del anteproyecto con datos:

- **¿cuál es el relato más corto que G0 lee de dos maneras?** `CRI SOS ATQ REV`;
- **¿qué relatos acepta G0 y G1 no?** `CRI DSC REV` y `HAL DSC REV`, hasta largo 3.

---

## 2. Por qué así

- **Todo sale de generar.** El testigo y la comparación recorren la lista de oraciones de largo ≤ k. Generar desde la gramática es mucho más rápido que probar todas las cadenas sobre Σ: con 14 etiquetas y largo 7 serían 14⁷ ≈ 105 millones de cadenas; G1 tiene 19 986 oraciones de ese largo o menos.
- **Formas sentenciales más a la izquierda, en anchura:** se expande siempre el no terminal de más a la izquierda. Así cada oración aparece por un camino ordenado, y la búsqueda es la misma idea que la simulación del autómata de pila (paso 26), pero sin entrada.
- **La poda por minYield la hace terminar:** una forma cuyo minYield ya supera k nunca va a dar una oración de largo ≤ k. Sin esta poda, la recursión (`Pasos → Pasos Pasos`) generaría formas para siempre.
- **Un límite de formas, con error:** solo una recursión que no agrega etiquetas (S → S B con B ⇒ ε) escapa a la poda. Para ese caso hay un límite (`maxForms`, 500 000) que lanza un error claro. Con las gramáticas del proyecto no pasa.
- **Orden fijo:** las oraciones salen de la más corta a la más larga y, a igual largo, en orden alfabético por etiqueta. Así el testigo es siempre el mismo (el spec pide `CRI SOS ATQ REV`) y las listas se pueden comparar en las pruebas.
- **El conteo de árboles ya existía:** el testigo usa Earley y `countTrees` (pasos 14 y 20) sobre cada oración. No hay que construir árboles para saber si hay más de uno.
- **Los mensajes dicen lo que no se demuestra:** sin testigo, la consola aclara que eso no prueba nada y sugiere `predictive-table`, que sí demuestra la no ambigüedad.

---

## 3. Cómo se usa en el programa

| Quién                  | Llama a                                        | Recibe                                   |
| ---------------------- | ---------------------------------------------- | ---------------------------------------- |
| comando `generate`     | `generateSentences`                            | las oraciones de largo ≤ k               |
| `findAmbiguityWitness` | `generateSentences`, `recognize`, `countTrees` | la primera oración con dos o más árboles |
| comando `ambiguity`    | `findAmbiguityWitness` y `parseTrees`          | el testigo y sus dos primeros árboles    |
| `compareLanguages`     | `generateSentences`, dos veces                 | las dos listas de oraciones              |
| comando `compare`      | `compareLanguages`                             | lo que solo tiene cada gramática         |
| web (SPEC 03)          | la API pública                                 | la pestaña "G0 vs G1"                    |

---

## 4. Cómo funciona

**Generar** (con G1 y k = 3):

1. Se empieza con la forma `Relato`.
2. Se saca una forma de la cola. Si no tiene no terminales, es una oración.
3. Si tiene, se expande su no terminal de más a la izquierda con cada una de sus producciones.
4. Cada forma nueva entra a la cola si no se vio antes y si su minYield es ≤ k.
5. Al vaciarse la cola, se ordenan las oraciones.

| Forma                                    | minYield | ¿Sigue?       |
| ---------------------------------------- | -------- | ------------- |
| `Relato`                                 | 3        | sí            |
| `Planteo Investigacion Desenlace`        | 3        | sí            |
| `Marco Hecho Investigacion Desenlace`    | 4        | **no**: 4 > 3 |
| `Hecho MarcoOpc Investigacion Desenlace` | 3        | sí            |
| `CRI HallazgoOpc MarcoOpc …`             | 3        | sí            |

La poda corta enseguida las ramas que no entran: un `Marco` antes del hecho ya obliga a una cuarta etiqueta. Resultado: 8 oraciones, `CRI ATQ REV` … `HAL SOS REV`.

**El testigo:** se recorren las oraciones en orden y, para cada una, se cuentan sus árboles con Earley. La primera con más de uno es el testigo. En G0 con k = 4, las 10 de largo 3 tienen un árbol; la primera de largo 4 con dos es `CRI SOS ATQ REV`.

**La comparación:** se generan las dos listas y se resta cada una de la otra, comparando las oraciones como texto.

---

## 5. El código, función por función

### 5.1 `generateSentences({ grammar, maxLength, maxForms })` (`generate.ts`)

```ts
const minYield = computeMinYield(grammar);
const start = [grammar.start];
const queue: SymbolName[][] = [start];
const visited = new Set([start.join(' ')]);
const sentences = new Map<string, SymbolName[]>();
for (let next = 0; next < queue.length; next++) {
  if (next >= maxForms) {
    throw new Error(`generateSentences explored ${maxForms} forms without finishing: …`);
  }
  const form = queue[next] ?? [];
  const position = form.findIndex((symbol) => grammar.nonterminals.has(symbol));
  if (position === -1) {
    sentences.set(form.join(' '), form);
    continue;
  }
  for (const production of grammar.productionsByLeftSide.get(form[position] ?? '') ?? []) {
    const expanded = [
      ...form.slice(0, position),
      ...production.rightSide,
      ...form.slice(position + 1),
    ];
    const key = expanded.join(' ');
    if (!visited.has(key) && minYieldOfSequence({ symbols: expanded, minYield }) <= maxLength) {
      visited.add(key);
      queue.push(expanded);
    }
  }
}
return [...sentences.values()].sort(compareSentences);
```

- **La cola es un array con un índice**, como en el autómata de pila: BFS sin sacar elementos.
- **`position`:** el primer no terminal de la forma. Si no hay (`-1`), la forma es una oración y se guarda (el `Map` evita repetidas; una oración puede salir de dos árboles).
- **`expanded`:** la forma con ese no terminal reemplazado por el lado derecho de la producción: lo de antes, el lado derecho y lo de después.
- **El filtro:** no vista y con minYield ≤ k (`minYieldOfSequence`, del paso 8; un terminal cuenta 1, así que las etiquetas ya producidas también cuentan).
- **`maxForms`:** el seguro contra las recursiones que no agregan etiquetas.
- **`sort(compareSentences)`:** por largo y después alfabético.

### 5.2 `compareSentences(first, second)`

```ts
if (first.length !== second.length) {
  return first.length - second.length;
}
const index = first.findIndex((token, position) => token !== second[position]);
if (index === -1) {
  return 0;
}
return (first[index] ?? '') < (second[index] ?? '') ? -1 : 1;
```

Primero el largo; a igual largo, decide la primera etiqueta distinta, comparada como texto (`ATQ` < `INT` < `PIS` < `SOS`). Por eso el testigo de G0 es `CRI SOS ATQ REV` y no `CRI SOS PIS REV`.

### 5.3 `findAmbiguityWitness({ grammar, maxLength })` (`ambiguity.ts`)

```ts
for (const sentence of generateSentences({ grammar, maxLength })) {
  const treeCount = countTrees({ grammar, recognition: recognize({ grammar, tokens: sentence }) });
  if (treeCount === 'infinite' || treeCount > 1n) {
    return { sentence, treeCount };
  }
}
return null;
```

- Recorre las oraciones en orden y cuenta los árboles de cada una, sin construirlos.
- **Infinitos** también es ambigüedad (un ciclo, como en `test-cyclic`).
- Devuelve el `AmbiguityWitness` del spec, `{ sentence, treeCount }`, o `null`.

### 5.4 `compareLanguages({ first, second, maxLength })` (`compare.ts`)

```ts
const firstSentences = generateSentences({ grammar: first, maxLength });
const secondSentences = generateSentences({ grammar: second, maxLength });
return {
  onlyInFirst: missingFrom({ sentences: firstSentences, others: secondSentences }),
  onlyInSecond: missingFrom({ sentences: secondSentences, others: firstSentences }),
  maxLength,
};
```

`missingFrom` arma un conjunto con las oraciones de la otra lista (como texto, `'CRI DSC REV'`) y se queda con las que no están. Devuelve el `LanguageComparison` del spec.

### 5.5 Los comandos

- **`--max-length k`** (`command-line/max-length.ts`): obligatoria, un entero de 0 a 12. El tope existe porque la cantidad de oraciones crece exponencialmente con k (G0 ya tiene 34 420 de largo ≤ 7).
- **`generate`:** la cantidad y una oración por línea.
- **`ambiguity`:** `WITNESS: CRI SOS ATQ REV has 2 trees, so the grammar is ambiguous` y los dos primeros árboles. Sin testigo: "No witness up to length k", la aclaración de que no demuestra nada y la sugerencia de `predictive-table`.
- **`compare g0 g1`:** las dos listas ("Only in …") y la conclusión: `So L(g0) ≠ L(g1)` si hay diferencia, o que no demuestra nada si no la hay. Recibe dos nombres de gramáticas incluidas (`builtInGrammarSource`, nueva en `grammar-source.ts`).

---

## 6. Ejemplo recorrido a mano: los dos árboles del testigo

```sh
npm run sabueso -- ambiguity --grammar g0 --max-length 4
```

| Árbol | Cómo lee la sospecha                            | Reglas de G0 que usa                 |
| ----- | ----------------------------------------------- | ------------------------------------ |
| 1     | la sospecha no abarca nada; el ataque va aparte | `Pasos → Pasos Pasos`, `Linea → SOS` |
| 2     | la sospecha abarca el ataque                    | `Linea → SOS Pasos`                  |

Son las dos reglas ambiguas del anteproyecto: `Pasos → Pasos Pasos` (cómo se agrupan los pasos) y `Linea → SOS Pasos` (hasta dónde llega una sospecha). Con G1, `ambiguity --grammar g1 --max-length 7` no encuentra nada en 19 986 oraciones, y la tabla LL(1) demuestra que no hay nada que encontrar.

```sh
npm run sabueso -- compare g0 g1 --max-length 3
```

Solo G0 tiene `CRI DSC REV` y `HAL DSC REV`: un descarte sin sospecha previa. G1 lo rechaza a propósito: no se puede descartar una sospecha que nunca existió. Con k = 4 la lista de G0 llega a 35, y la de G1 sigue vacía.

---

## 7. Errores

- **Recursión sin etiquetas:** `generateSentences` lanza un error al pasar `maxForms`. Con las gramáticas del proyecto no ocurre.
- **Comandos:** sin `--max-length`, con un valor que no es un entero de 0 a 12, con un nombre de gramática desconocido o con argumentos de más, terminan con código 2.

---

## 8. Consola y pruebas

```sh
npm run sabueso -- generate --grammar g1 --max-length 3
npm run sabueso -- ambiguity --grammar g0 --max-length 4
npm run sabueso -- ambiguity --grammar g1 --max-length 7
npm run sabueso -- compare g0 g1 --max-length 3
```

**`test/bounded/bounded.test.ts`:**

| Prueba                | Qué verifica                                                                                         |
| --------------------- | ---------------------------------------------------------------------------------------------------- |
| generar a mano        | G1 hasta 3 (8 oraciones); `parentheses` hasta 4 (ε, `( )`, `( ( ) )`, `( ) ( )`)                     |
| generar contra Earley | lo generado es exactamente lo que Earley acepta: las de libro, G0 y G1, probando todas las cadenas   |
| el límite             | S → S B, B → ε lanza el error                                                                        |
| B1, B2 y B3           | sin testigo en G0 hasta 3; `CRI SOS ATQ REV` con 2 árboles hasta 4; sin testigo en G1 hasta 7        |
| otros testigos        | `id * id * id` en `arithmetic-ambiguous`; infinitos árboles en `test-cyclic`                         |
| B4 y más              | G0 contra G1 hasta 3; hasta 4, G1 sigue sin oraciones propias; las dos aritméticas coinciden hasta 5 |

**`test/command-line/bounded.test.ts`:** los tres comandos, los mensajes "no demuestra nada" y los errores de uso.

---

## 9. Preguntas probables en la defensa

**¿Qué es una semidecisión?**
Un algoritmo que responde "sí" con certeza cuando la respuesta es sí, pero que puede no terminar cuando es no. La búsqueda acotada encuentra el testigo si G es ambigua (para algún k); si no lo es, buscar más lejos nunca termina de demostrarlo.

**Si la ambigüedad es indecidible, ¿cómo sabes que G1 no es ambigua?**
Por otro camino: G1 es LL(1) (su tabla no tiene conflictos), y toda gramática LL(1) es no ambigua. La búsqueda acotada solo lo confirma hasta largo 7, sin demostrarlo.

**¿Por qué generas desde la gramática y no pruebas todas las cadenas?**
Porque con 14 etiquetas y largo 7 serían 105 millones de cadenas; G1 tiene menos de 20 000 oraciones hasta ese largo. Generar solo produce lo que la gramática puede derivar.

**¿Por qué termina la generación?**
Por la poda por minYield: si una forma ya necesita más de k etiquetas, se descarta. Como solo se expande hacia oraciones de largo ≤ k, hay finitas formas útiles. La única excepción es una recursión que no agrega etiquetas, y para eso hay un límite.

**¿Qué demuestra `compare g0 g1`?**
Que L(G0) ≠ L(G1): `CRI DSC REV` está en uno y no en el otro. Que G1 no tenga oraciones propias hasta largo 4 no demuestra L(G1) ⊆ L(G0); eso sale de cómo se diseñó G1.

**¿Cuál es el testigo de G0 y por qué ese?**
`CRI SOS ATQ REV`, el primero de largo 4 en orden alfabético. Tiene dos árboles: la sospecha abarca el ataque o no. Son las reglas `Linea → SOS Pasos` y `Pasos → Pasos Pasos` del anteproyecto.
