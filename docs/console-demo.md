# Guion de la demo por consola

Los comandos de la demo de la exposición, en el orden en que se muestran. Cada paso del spec agrega los suyos, y el paso 29 del SPEC 02 completa el recorrido.

La prueba `packages/core/test/command-line/demo-doc.test.ts` ejecuta todas las líneas `npm run sabueso -- …` de los bloques de código de este archivo, y falla si alguna termina con código 2 (uso incorrecto). Así el guion siempre corresponde a comandos que existen.

## Ayuda

Lista los comandos y, al final, las gramáticas incorporadas por grupo.

```sh
npm run sabueso -- help
```

## Lexer AFD

Paso 3. Los tokens de `arithmetic.grammar`. Con `--states`, el recorrido de δ.

```sh
npm run sabueso -- lex arithmetic
npm run sabueso -- lex arithmetic --states
```

## Parser LL(1)

Paso 4. Lee el archivo y muestra G. Con `--parser-trace`, cada decisión del parser y su lookahead.

```sh
npm run sabueso -- grammar arithmetic
npm run sabueso -- grammar arithmetic --parser-trace
```

## Las gramáticas del proyecto

Paso 5. El catálogo de géneros, los tamaños de las 10 gramáticas, y G0 (28 producciones) contra G1 (40).

```sh
npm run sabueso -- genres
npm run sabueso -- grammars
npm run sabueso -- grammar g0
npm run sabueso -- grammar g1
```

## Un relato como cadena sobre Σ

Paso 6. Separa el relato en tokens y verifica que cada uno esté en Σ. `XYZ` no es una etiqueta: termina con código 1.

```sh
npm run sabueso -- tokens --grammar g1 "CRI PIS REV"
npm run sabueso -- tokens --grammar g1 "CRI XYZ REV"
```

## Símbolos anulables

Paso 7. El punto fijo de los anulables (A ⇒\* ε), ronda por ronda. En G1 son las 10 partes opcionales; en G0, ∅. El archivo de ejemplo agrega un anulable por ronda.

```sh
npm run sabueso -- nullable --grammar g1 --steps
npm run sabueso -- nullable --grammar g0
npm run sabueso -- nullable --grammar-file examples/grammars/nullable-chain.grammar --steps
```

## Longitud mínima derivable

Paso 8. Cuántos eventos tiene, como mínimo, lo que deriva cada no terminal. minYield(Relato) = 3: el relato más corto es `CRI PIS REV`.

```sh
npm run sabueso -- min-yield --grammar g1
npm run sabueso -- min-yield --grammar test-useless
```

## Símbolos inútiles y vacuidad

Paso 9. Los dos puntos fijos de Hopcroft 7.1: productivos y, después, alcanzables. Muestra los inútiles y la gramática sin ellos; con `test-empty`, que L(G) = ∅. El archivo de ejemplo muestra por qué importa el orden.

```sh
npm run sabueso -- useful --grammar test-useless --steps
npm run sabueso -- useful --grammar test-empty
npm run sabueso -- useful --grammar-file examples/grammars/useless-order.grammar --steps
```

## Ciclos

Paso 10. Los ciclos A ⇒+ A, que dan infinitos árboles. Con `--graph`, el grafo unitario donde se buscan. G1 no tiene ciclos; el archivo de ejemplo tiene uno escondido detrás de símbolos anulables.

```sh
npm run sabueso -- cycles --grammar test-cyclic --graph
npm run sabueso -- cycles --grammar g1
npm run sabueso -- cycles --grammar-file examples/grammars/hidden-cycle.grammar --graph
```

## FIRST y FOLLOW

Paso 11. Con qué terminal puede empezar cada no terminal (FIRST) y qué puede venir detrás (FOLLOW). Con `--steps`, las rondas de los dos puntos fijos. El mini policial es el ejemplo explicado a mano en la guía 11.

```sh
npm run sabueso -- first-follow --grammar-file examples/grammars/mini-detective.grammar --steps
npm run sabueso -- first-follow --grammar g1
```

## Tabla LL(1) y análisis completo

Paso 12. La tabla M[A, a]: G0 tiene 13 conflictos (marcados con ✗) y G1 ninguno, así que G1 es LL(1) y, por el teorema, no ambigua. `analyze` junta todos los análisis de los pasos 7 a 12.

```sh
npm run sabueso -- predictive-table --grammar g0
npm run sabueso -- predictive-table --grammar g1
npm run sabueso -- analyze --grammar g1
```

## Earley: ítems

Paso 13. Todas las reglas punteadas de la gramática y qué hace Earley con cada una (Predictor, Scanner o Completer). Son finitas: por eso Earley siempre termina.

```sh
npm run sabueso -- items --grammar parentheses
```

## Earley: el reconocedor

Paso 14. Earley decide si la entrada pertenece a L(G): `ACCEPTED` con código 0 o `REJECTED` con código 1. Con `--chart`, los conjuntos S0 … Sn con cada ítem y cómo llegó (P, S o C).

```sh
npm run sabueso -- earley --grammar arithmetic "id + id * id"
npm run sabueso -- earley --grammar arithmetic --chart "id + id"
npm run sabueso -- earley --grammar g0 "CRI SOS PIS INT REV"
npm run sabueso -- earley --grammar g0 "CRI REV"
```

## El arreglo de ε

Paso 15. Con el arreglo de Aycock y Horspool, Earley funciona con G1 y su chart de `CRI PIS REV` es exactamente el calculado a mano en el spec (8, 19, 16 y 11 ítems). Con `--no-epsilon-fix` se ve el error del algoritmo clásico: `epsilon-trap` rechaza `x` y falta `S → A A • x`.

```sh
npm run sabueso -- earley --grammar epsilon-trap "x"
npm run sabueso -- earley --grammar epsilon-trap --chart --no-epsilon-fix "x"
npm run sabueso -- earley --grammar g1 --chart "CRI PIS REV"
npm run sabueso -- earley --grammar g1 "CRI DSC REV"
```

## Diagnóstico de errores

Paso 16. Cuando un relato se rechaza, dónde falla, qué se encontró y qué se esperaba. Sale del primer conjunto vacío del chart.

```sh
npm run sabueso -- earley --grammar g1 "CTX PER PIS REV"
npm run sabueso -- earley --grammar g1 "CRI PIS"
npm run sabueso -- earley --grammar g1 "CRI SOS DSC DSC REV"
```

## La traza de Earley

Paso 17. Cada ítem que agrega Earley, numerado y en orden, con la operación y la causa. Es lo que va a animar el reproductor de la web. Con G0 aparecen eventos "again": la ambigüedad mientras ocurre.

```sh
npm run sabueso -- trace --grammar g1 "CRI PIS REV"
npm run sabueso -- trace --grammar g0 "CRI SOS PIS INT REV"
```

## Árboles ε

Paso 18. Los subárboles de un símbolo que deriva ε, generados desde la gramática y contados. En G1, cada anulable tiene exactamente uno; el archivo de ejemplo tiene un símbolo con 4.

```sh
npm run sabueso -- epsilon-trees --grammar g1 CuerpoLinea
npm run sabueso -- epsilon-trees --grammar g1
npm run sabueso -- epsilon-trees --grammar-file examples/grammars/epsilon-choices.grammar S
```
