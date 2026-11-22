# 13 — Earley: ítems y conjuntos

> Archivos: `packages/core/src/earley/item.ts`, `packages/core/src/earley/chart.ts` y `packages/core/src/command-line/commands/items.ts`.

## 1. Teoría

Earley decide si una cadena pertenece a L(G) para **cualquier** gramática libre de contexto: ambigua (G0), con ε (G1) o con recursión a izquierda. LL(1) mira un evento y **elige** una regla; Earley **no elige**: sigue todas las posibilidades a la vez y descarta las que dejan de encajar. Este paso arma sus dos estructuras; el algoritmo llega en la [guía 14](14-reconocedor-de-earley.md).

- **Ítem:** una regla con un punto y un **origen**, (A → α • β, j). Se lee: "estoy reconociendo A, ya reconocí α desde la posición j, y me falta β". Está **completo** cuando el punto llega al final (A → α •).
- **Qué hacer con un ítem** lo decide el símbolo después del punto: un no terminal → **Predictor**; un terminal → **Scanner**; nada → **Completer**.
- **Conjuntos:** para una entrada de n tokens hay n + 1 conjuntos S0 … Sn, uno por cada posición **entre** tokens. Sk guarda los ítems que llegaron hasta la posición k.
- Se arranca con S0 = { ($S → • S, 0) } y la entrada se **acepta** si ($S → S •, 0) está en Sn. `$S` es un símbolo inicial nuevo (`$` está reservado).
- Un mismo ítem se anota **una sola vez** por conjunto; si llega por otro camino, se le suma un **enlace** (así queda la ambigüedad). Como hay finitos ítems posibles, Earley **siempre termina**.

### Ejemplo

`Relato → CRI Pistas REV`, `Pistas → PIS Pistas | PIS`, entrada `CRI PIS REV`:

| Conjunto     | Ítem                         | Cómo llegó                                                                            |
| ------------ | ---------------------------- | ------------------------------------------------------------------------------------- |
| S0           | $S → • Relato, 0             | arranque                                                                              |
| S0           | Relato → • CRI Pistas REV, 0 | Predictor: después del punto hay un Relato                                            |
| S1 (leí CRI) | Relato → CRI • Pistas REV, 0 | Scanner: el evento era CRI                                                            |
| S1           | Pistas → • PIS Pistas, 1     | Predictor: hace falta un Pistas                                                       |
| S1           | Pistas → • PIS, 1            | Predictor: la otra regla de Pistas                                                    |
| S2 (leí PIS) | Pistas → PIS • Pistas, 1     | Scanner: la primera regla sigue viva                                                  |
| S2           | Pistas → PIS •, 1            | Scanner: la segunda también, y está **completa**                                      |
| S2           | Pistas → • PIS Pistas, 2     | Predictor: tal vez viene otra pista                                                   |
| S2           | Pistas → • PIS, 2            | Predictor                                                                             |
| S2           | Relato → CRI Pistas • REV, 0 | Completer: terminé un Pistas que empezó en 1; vuelvo a S1 y avanzo al que lo esperaba |
| S3 (leí REV) | Relato → CRI Pistas REV •, 0 | Scanner: el evento era REV                                                            |
| S3           | **$S → Relato •, 0**         | Completer: terminé un Relato que empezó en 0 (**acepta**)                             |

En S1 se ve la diferencia con LL(1): **las dos reglas de Pistas quedan anotadas**. Si un conjunto queda vacío, ningún camino sigue vivo y el relato es inválido. Versión gráfica, con G0: [`docs/interactive/earley-g0.html`](../interactive/earley-g0.html) (sus pasos en texto: [`docs/interactive/earley-g0-cri-pis-rev.md`](../interactive/earley-g0-cri-pis-rev.md)).

## 2. Por qué así

- **El ítem guarda el origen** porque el Completer necesita saber a qué conjunto volver. Sin origen, un Pistas terminado no sabría a quién avanzar.
- **La clave `productionId:dot:origin`** identifica un ítem dentro de un conjunto. Permite anotar cada ítem una sola vez, y eso garantiza que el algoritmo termina.
- **Cada conjunto es una lista que solo crece, más un índice por clave.** La lista conserva el orden de llegada y, recorrida con un índice que avanza mientras crece, hace de **cola de trabajo**: los ítems que se agregan durante el recorrido también se procesan. El índice (`byKey`) responde en O(1) si un ítem ya está.
- **Los enlaces se agregan sin buscar repetidos.** El algoritmo nunca construye dos veces el mismo enlace (sección 3.18 del SPEC 02), y buscar repetidos lo haría mucho más lento en G0.
- **Alternativa descartada: un árbol compartido (SPPF).** Es la representación más compacta de todos los árboles, pero mucho más compleja de construir y explicar. Los enlaces alcanzan para reconstruir y contar los árboles (guías 19 y 20).

## 3. El código, función por función

### 3.1 El tipo `EarleyItem`

| Campo        | Qué es                                                                      |
| ------------ | --------------------------------------------------------------------------- |
| `production` | la producción A → αβ                                                        |
| `dot`        | cuántos símbolos del lado derecho ya se reconocieron: la posición del punto |
| `origin`     | j: la posición de la entrada donde empezó a reconocerse esta producción     |
| `setIndex`   | el conjunto al que pertenece: hasta qué posición de la entrada llegó        |
| `key`        | `'productionId:dot:origin'`                                                 |
| `links`      | cómo llegó el punto hasta acá; vacío en un ítem recién predicho             |

El tipo `Link` tiene tres variantes, una por cada forma de avanzar el punto: `scan` (se leyó un token), `complete` (se terminó un hijo) y `nullable` (se salteó un símbolo anulable, en la [guía 15](15-arreglo-de-epsilon.md)). Todas guardan el `predecessor`: el mismo ítem con el punto un lugar antes.

### 3.2 `createItem({ production, dot, origin, setIndex })` e `itemKey({ production, dot, origin })`

```ts
export function itemKey(production: Production, dot: number, origin: number): string {
  return `${production.id}:${dot}:${origin}`;
}
```

- La clave usa el `id` de la producción, no su texto: es corta y única.
- **No incluye el conjunto:** todos los ítems de un conjunto tienen el mismo `setIndex`, así que no sirve para distinguirlos. El mismo ítem puede aparecer en dos conjuntos distintos, y ahí son ítems diferentes.

### 3.3 `nextSymbol(item)` e `isComplete(item)`

```ts
export function nextSymbol(item: EarleyItem): SymbolName | undefined {
  return item.production.rightSide[item.dot];
}

export function isComplete(item: EarleyItem): boolean {
  return item.dot === item.production.rightSide.length;
}
```

- El punto está **antes** del símbolo número `dot` del lado derecho, así que ese es el próximo.
- Cuando el punto está al final, `rightSide[dot]` no existe: `nextSymbol` da `undefined` e `isComplete` da `true`. Son las dos caras de la misma condición.
- Una producción ε (`rightSide` vacío) está completa apenas se predice: `0 === 0`.
- Estas dos funciones deciden qué operación aplicar: no terminal → Predictor, terminal → Scanner, completo → Completer.

### 3.4 `dottedRule({ production, dot })` y `label(item)`

```ts
const symbols = [...production.rightSide];
symbols.splice(dot, 0, '•');
return `${production.leftSide} → ${symbols.join(' ')}`;
```

- Copia el lado derecho (`[...]`) para no modificar la producción, e inserta `•` en la posición `dot` con `splice(dot, 0, '•')` (borrar 0 elementos, insertar uno).
- Para A → ε da `A → •`.
- `label` le agrega el origen: `E → E + • T, 0`, el formato del chart y de la traza.

### 3.5 `dottedRulesOf(grammar)`

```ts
return grammar.productions.flatMap((production) =>
  Array.from({ length: production.rightSide.length + 1 }, (_, dot) => ({ production, dot })),
);
```

- Una producción con k símbolos tiene k + 1 posiciones para el punto (antes de cada símbolo y al final): `Array.from({ length: k + 1 })` genera los puntos 0 … k.
- `flatMap` junta las de todas las producciones en una sola lista.
- Es el universo finito de reglas punteadas. Un ítem solo le agrega un origen.

### 3.6 `createChart(tokenCount)`

Crea n + 1 conjuntos vacíos, S0 … Sn: uno por cada posición **entre** tokens (antes del primero, entre cada par y después del último). Con la entrada vacía hay uno solo, S0.

### 3.7 `addItem({ set, production, dot, origin, link })`

```ts
const existing = set.byKey.get(itemKey({ production, dot, origin }));
const item = existing ?? createItem({ production, dot, origin, setIndex: set.index });
if (link !== undefined) {
  item.links.push(link);
}
if (existing === undefined) {
  set.items.push(item);
  set.byKey.set(item.key, item);
}
return { item, isNew: existing === undefined };
```

- Primero busca el ítem por su clave en el índice: O(1).
- `existing ?? createItem(...)`: si ya está, trabaja con ese; si no, crea uno nuevo.
- **El enlace se agrega en los dos casos.** Si el ítem ya estaba, este es un **segundo camino** para llegar a él: queda como un enlace más. Así se registra la ambigüedad sin duplicar ítems.
- Solo si es nuevo se agrega a la lista (al final, como en una cola) y al índice.
- `isNew` le dice al algoritmo ([guía 14](14-reconocedor-de-earley.md)) si hay que procesarlo: un ítem que ya estaba no se procesa otra vez. Es lo que garantiza que el algoritmo termina.

### 3.8 El comando `items`

Para cada regla punteada, muestra su producción, la regla con el punto y **qué operación dispara** (`operationFor`): `Predictor: expect S`, `Scanner: read the token (` o `Completer: S is recognized`. Termina con la cuenta del universo de ítems. Ninguna función del paso lanza errores; el comando tiene los errores de uso de los análisis (código 2).

## 4. Consola y pruebas

```sh
npm run sabueso -- items --grammar parentheses
```

```text
Production  Dotted rule    What Earley does with it
----------  -------------  --------------------------
0           S → • ( S ) S  Scanner: read the token (
0           S → ( • S ) S  Predictor: expect S
0           S → ( S • ) S  Scanner: read the token )
0           S → ( S ) • S  Predictor: expect S
0           S → ( S ) S •  Completer: S is recognized
1           S → •          Completer: S is recognized

6 dotted rules. An item is a dotted rule plus its origin j (0 … n), so for an input of n tokens each set holds at most 6 × (n + 1) items: a finite number, which is why Earley always ends.
```

Para `( )` (n = 2) hay 3 conjuntos con a lo sumo 6 × 3 = 18 ítems cada uno: el algoritmo no puede seguir agregando para siempre. Desde la guía 14, `npm run sabueso -- earley --grammar … --chart` imprime los conjuntos.

| Prueba                                          | Qué verifica                                                                                                                                                            |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core/test/earley/item.test.ts`        | la clave (y que no incluye el conjunto), `nextSymbol` e `isComplete` (también para ε), `dottedRule` y `label` (`E → E + • T, 0`), y las 6 reglas de `parentheses`       |
| `packages/core/test/earley/chart.test.ts`       | n + 1 conjuntos; un ítem nuevo va al final y al índice; sin ítems repetidos; otro origen es otro ítem; un segundo camino agrega un enlace; los enlaces no se deduplican |
| `packages/core/test/command-line/items.test.ts` | las 6 reglas de `parentheses` con su operación, y los errores de uso                                                                                                    |

## 5. Referencias

- Earley, J., "An efficient context-free parsing algorithm", _Communications of the ACM_ 13(2), 1970.
- Aho, Lam, Sethi y Ullman, _Compiladores_ (2.ª ed.), sección 4.6 (ítems LR, la misma idea de regla punteada).
- SPEC 02, secciones 3.12 y 3.18.
