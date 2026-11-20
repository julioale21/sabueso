# Guion de la demo por consola

Los comandos de la demo de la exposición, en el orden en que se muestran. Cada paso del spec agrega los suyos, y el paso 29 del SPEC 02 completa el recorrido.

La prueba `packages/core/test/command-line/demo-doc.test.ts` ejecuta todas las líneas `npm run sabueso -- …` de los bloques de código de este archivo, y falla si alguna termina con código 2 (uso incorrecto). Así el guion siempre corresponde a comandos que existen.

## Ayuda

Lista los comandos y, al final, las gramáticas incorporadas por grupo.

```sh
npm run sabueso -- help
```

## Gramática libre de contexto

Paso 2. Arma una gramática en código y muestra la 4-upla G = (N, Σ, P, S).

```sh
npm run sabueso -- demo-grammar
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
