# Guía de estudio: 13 — Earley: ítems y conjuntos

> **Paso 13 del SPEC 02.** Archivos: `packages/core/src/earley/item.ts`, `packages/core/src/earley/chart.ts` y `packages/core/src/command-line/commands/items.ts`.
> Fichas teóricas relacionadas: [`11-earley-item.md`](../concepts/11-earley-item.md) y [`12-earley-sets.md`](../concepts/12-earley-sets.md).

---

## 1. El problema que resuelve

Es la primera pieza de **Earley**, el algoritmo que decide si un relato pertenece a L(G). A diferencia de LL(1), Earley funciona con **cualquier** gramática libre de contexto: ambigua (G0), con ε (G1) o con recursión a izquierda (`arithmetic`).

Este paso arma las dos estructuras de datos del algoritmo. El algoritmo en sí (Predictor, Scanner, Completer) llega en el paso 14.

| Estructura             | Qué es                                             | Archivo           |
| ---------------------- | -------------------------------------------------- | ----------------- |
| **Ítem**               | una regla con un punto y un origen: (A → α • β, j) | `earley/item.ts`  |
| **Conjunto** (S0 … Sn) | los ítems que llegan a una posición de la entrada  | `earley/chart.ts` |

---

## 2. Explicado simple: cómo funciona Earley

### 2.1 La idea

LL(1) mira un evento y **elige** una regla. Si la gramática tiene dos reglas posibles, LL(1) no puede. Earley **no elige**: sigue **todas las posibilidades a la vez**, y descarta las que dejan de encajar con lo que va leyendo.

Para no perderse, lleva una libreta por cada posición del relato (los **conjuntos** S0, S1, …). En cada libreta anota "lo que podría estar pasando" en ese punto: los **ítems**.

### 2.2 El ítem: una regla con un punto

`(Relato → CRI • Pistas REV, 0)` se lee:

- "estoy reconociendo un **Relato**";
- "ya reconocí **CRI**" (lo que está antes del punto);
- "me falta **Pistas REV**" (lo que está después);
- "empecé en la posición **0**" (el origen).

El punto avanza a medida que se reconocen símbolos. Cuando llega al final, la regla está **completa**.

### 2.3 Las tres operaciones

Mirando el símbolo que está **justo después del punto**, siempre hay una sola cosa para hacer:

| Después del punto hay… | Operación     | Qué hace                                                                                                       |
| ---------------------- | ------------- | -------------------------------------------------------------------------------------------------------------- |
| un **no terminal** B   | **Predictor** | "voy a necesitar un B": agrega todas las reglas B → • γ, con origen en la posición actual                      |
| un **terminal** a      | **Scanner**   | si el próximo evento es a, copia el ítem al conjunto siguiente con el punto un lugar adelante                  |
| **nada** (completo)    | **Completer** | "terminé un A que empezó en j": vuelve al conjunto j, busca los ítems que esperaban un A y les avanza el punto |

El **origen** es lo que le dice al Completer a qué conjunto volver.

### 2.4 Un ejemplo completo

Gramática chica: `Relato → CRI Pistas REV`, `Pistas → PIS Pistas | PIS`. Relato: `CRI PIS REV`. Se agrega una regla de arranque `$S → Relato`.

**S0** (antes de leer nada):

| Ítem                         | Cómo llegó                                 |
| ---------------------------- | ------------------------------------------ |
| $S → • Relato, 0             | arranque                                   |
| Relato → • CRI Pistas REV, 0 | Predictor: después del punto hay un Relato |

**S1** (leí CRI):

| Ítem                         | Cómo llegó                         |
| ---------------------------- | ---------------------------------- |
| Relato → CRI • Pistas REV, 0 | Scanner: el evento era CRI         |
| Pistas → • PIS Pistas, 1     | Predictor: hace falta un Pistas    |
| Pistas → • PIS, 1            | Predictor: la otra regla de Pistas |

Acá se ve la diferencia con LL(1): **las dos reglas de Pistas quedan anotadas**. Earley no decide todavía si hay una pista o varias.

**S2** (leí PIS):

| Ítem                         | Cómo llegó                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| Pistas → PIS • Pistas, 1     | Scanner: la primera regla sigue viva                                                  |
| Pistas → PIS •, 1            | Scanner: la segunda también, y está **completa**                                      |
| Pistas → • PIS Pistas, 2     | Predictor (por el primer ítem): tal vez viene otra pista                              |
| Pistas → • PIS, 2            | Predictor                                                                             |
| Relato → CRI Pistas • REV, 0 | Completer: terminé un Pistas que empezó en 1; vuelvo a S1 y avanzo al que lo esperaba |

**S3** (leí REV):

| Ítem                         | Cómo llegó                                   |
| ---------------------------- | -------------------------------------------- |
| Relato → CRI Pistas REV •, 0 | Scanner: el evento era REV                   |
| $S → Relato •, 0             | Completer: terminé un Relato que empezó en 0 |

**Resultado:** el último conjunto tiene `$S → Relato •, 0`: se reconoció un Relato completo desde el principio. **El relato es válido.** Los ítems que esperaban otra pista (`Pistas → • PIS …, 2`) simplemente no avanzaron: eran caminos que no se dieron.

Si en algún momento un conjunto queda **vacío**, ningún camino sigue vivo: el relato es inválido, y el error está en ese evento.

### 2.5 Por qué siempre termina

Un ítem es una regla con punto (hay finitas) más un origen (entre 0 y n). En cada conjunto, un mismo ítem se anota **una sola vez**. Entonces cada conjunto es finito, y hay n + 1 conjuntos: el algoritmo termina siempre, aunque la gramática tenga recursión a izquierda o sea ambigua. Es lo que muestra el comando `items`.

### 2.6 Y la ambigüedad

Si un ítem se puede alcanzar de **dos formas** (dos agrupaciones distintas de los mismos eventos), no se anota dos veces: se le agrega un **enlace** más, que recuerda de dónde vino. Un ítem con varios enlaces es exactamente una ambigüedad. Con esos enlaces, los pasos 19 y 20 reconstruyen y cuentan los árboles.

---

## 3. Por qué estas estructuras

- **El ítem guarda el origen** porque el Completer necesita saber a qué conjunto volver. Sin origen, un Pistas terminado no sabría a quién avanzar.
- **La clave `productionId:dot:origin`** identifica un ítem dentro de un conjunto. Es lo que permite anotar cada ítem una sola vez, y eso garantiza que el algoritmo termina.
- **Cada conjunto es una lista que solo crece, más un índice por clave.** La lista conserva el orden en que llegaron los ítems y, recorrida con un índice que avanza mientras la lista crece, hace de **cola de trabajo**: los ítems que se agregan mientras se procesa el conjunto también se procesan. El índice (`byKey`) responde en O(1) si un ítem ya está.
- **Los enlaces se agregan sin buscar repetidos.** El algoritmo nunca construye dos veces el mismo enlace (sección 3.18 del spec), y buscar repetidos haría el algoritmo mucho más lento en G0.
- **Alternativa descartada: un árbol compartido (SPPF).** Es la representación más compacta de todos los árboles, pero mucho más compleja de construir y explicar. Los enlaces alcanzan para reconstruir y contar los árboles.

---

## 4. Cómo se usa en el programa

| Quién                                    | Usa                                                  | Para qué                                 |
| ---------------------------------------- | ---------------------------------------------------- | ---------------------------------------- |
| comando `items` (paso 13)                | `dottedRulesOf`, `dottedRule`                        | mostrar el universo de reglas punteadas  |
| reconocedor (paso 14)                    | `createChart`, `addItem`, `nextSymbol`, `isComplete` | el algoritmo                             |
| traza y chart en consola (pasos 14 y 17) | `label`                                              | escribir los ítems como `E → E + • T, 0` |
| árboles y conteo (pasos 18 a 21)         | los `links` de cada ítem                             | reconstruir y contar los árboles         |

---

## 5. El código, función por función

### 5.1 El tipo `EarleyItem`

| Campo        | Qué es                                                                      |
| ------------ | --------------------------------------------------------------------------- |
| `production` | la producción A → αβ                                                        |
| `dot`        | cuántos símbolos del lado derecho ya se reconocieron: la posición del punto |
| `origin`     | j: la posición de la entrada donde empezó a reconocerse esta producción     |
| `setIndex`   | el conjunto al que pertenece: hasta qué posición de la entrada llegó        |
| `key`        | `'productionId:dot:origin'`                                                 |
| `links`      | cómo llegó el punto hasta acá; vacío en un ítem recién predicho             |

El tipo `Link` tiene tres variantes, una por cada forma de avanzar el punto: `scan` (se leyó un token), `complete` (se terminó un hijo) y `nullable` (se salteó un símbolo anulable, en el paso 15). Todas guardan el `predecessor`: el mismo ítem con el punto un lugar antes.

### 5.2 `createItem(production, dot, origin, setIndex)` e `itemKey(production, dot, origin)`

```ts
export function itemKey(production: Production, dot: number, origin: number): string {
  return `${production.id}:${dot}:${origin}`;
}
```

- La clave usa el `id` de la producción, no su texto: es corta y única.
- **No incluye el conjunto:** todos los ítems de un conjunto tienen el mismo `setIndex`, así que no sirve para distinguirlos. El mismo ítem puede aparecer en dos conjuntos distintos, y ahí son ítems diferentes.

### 5.3 `nextSymbol(item)` e `isComplete(item)`

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

### 5.4 `dottedRule(production, dot)` y `label(item)`

```ts
const symbols = [...production.rightSide];
symbols.splice(dot, 0, '•');
return `${production.leftSide} → ${symbols.join(' ')}`;
```

- Copia el lado derecho (`[...]`) para no modificar la producción, e inserta `•` en la posición `dot` con `splice(dot, 0, '•')` (borrar 0 elementos, insertar uno).
- Para A → ε da `A → •`.
- `label` le agrega el origen: `E → E + • T, 0`, el formato del chart y de la traza.

### 5.5 `dottedRulesOf(grammar)`

```ts
return grammar.productions.flatMap((production) =>
  Array.from({ length: production.rightSide.length + 1 }, (_, dot) => ({ production, dot })),
);
```

- Una producción con k símbolos tiene k + 1 posiciones para el punto (antes de cada símbolo y al final): `Array.from({ length: k + 1 })` genera los puntos 0 … k.
- `flatMap` junta las de todas las producciones en una sola lista.
- Es el universo finito de reglas punteadas. Un ítem solo le agrega un origen.

### 5.6 `createChart(tokenCount)`

Crea n + 1 conjuntos vacíos, S0 … Sn: uno por cada posición **entre** tokens (antes del primero, entre cada par, y después del último). Con la entrada vacía hay uno solo, S0.

### 5.7 `addItem(set, production, dot, origin, link?)`

```ts
const existing = set.byKey.get(itemKey(production, dot, origin));
const item = existing ?? createItem(production, dot, origin, set.index);
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
- `isNew` le dice al algoritmo (paso 14) si hay que procesarlo: un ítem que ya estaba no se procesa otra vez. Es lo que garantiza que el algoritmo termina.

### 5.8 El comando `items`

Para cada regla punteada, muestra su producción, la regla con el punto y **qué operación dispara**: `Predictor: expect S`, `Scanner: read the token (` o `Completer: S is recognized` (`operationFor`). Termina con la cuenta del universo de ítems.

---

## 6. Ejemplo recorrido a mano

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

Para `( )` (n = 2) hay 3 conjuntos con a lo sumo 6 × 3 = 18 ítems cada uno: el algoritmo no puede seguir agregando para siempre.

---

## 7. Errores

Ninguna función lanza errores. El comando tiene los errores de uso de los análisis (código 2).

---

## 8. Consola y pruebas

**`test/earley/item.test.ts`:** la clave (y que no incluye el conjunto), `nextSymbol` e `isComplete` (también para ε), `dottedRule` y `label` (`E → E + • T, 0`), y las 6 reglas punteadas de `parentheses`.

**`test/earley/chart.test.ts`:** n + 1 conjuntos; un ítem nuevo va al final y al índice; el mismo ítem no se agrega dos veces; otro origen es otro ítem; un segundo camino agrega un enlace; los enlaces no se deduplican.

**`test/command-line/items.test.ts`:** las 6 reglas de `parentheses` con su operación, y los errores de uso.

---

## 9. Preguntas probables en la defensa

**¿Qué es un ítem de Earley?**
Una regla punteada con origen, (A → α • β, j): estoy reconociendo A, ya reconocí α desde la posición j, y me falta β.

**¿Para qué sirve el origen?**
Para el Completer: cuando A se completa, hay que volver al conjunto j, donde alguien esperaba un A, y avanzarle el punto.

**¿Por qué Earley siempre termina?**
Porque hay finitas reglas punteadas, el origen va de 0 a n, y cada ítem se anota una sola vez por conjunto. Cada conjunto es finito, y hay n + 1.

**¿Cuál es la diferencia con LL(1)?**
LL(1) elige una regla mirando un símbolo; con dos reglas posibles, no puede. Earley anota todas las posibilidades y descarta las que no encajan. Por eso sirve para cualquier gramática libre de contexto, incluida G0.

**¿Dónde queda la ambigüedad?**
En los enlaces. Si un ítem se alcanza de dos formas, no se duplica: se le agrega otro enlace. Un ítem con varios enlaces marca una parte de la entrada con varios árboles.

**¿Por qué cada conjunto es una lista y no un `Set`?**
Porque el orden importa: la lista es la cola de trabajo. Se recorre con un índice que avanza mientras la lista crece, y así se procesan también los ítems que se agregan durante el recorrido. El índice por clave responde en O(1) si un ítem ya está.
