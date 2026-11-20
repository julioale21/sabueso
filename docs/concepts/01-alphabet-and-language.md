# 01 — Alfabeto, cadena y lenguaje

## 1. Definición formal

- Un **alfabeto** Σ es un conjunto finito y no vacío de símbolos.
- Una **cadena** sobre Σ es una secuencia finita de símbolos de Σ. Su **longitud** |w| es la cantidad de símbolos. La cadena vacía se escribe ε, y |ε| = 0. Σ\* es el conjunto de todas las cadenas sobre Σ, incluida ε. (|Σ| es la cantidad de símbolos del alfabeto.)
- Un **lenguaje** sobre Σ es cualquier subconjunto L ⊆ Σ\*.
- El lenguaje generado por una gramática G es L(G) = { w ∈ Σ\* | S ⇒\* w }: las cadenas de terminales que se derivan desde el símbolo inicial.

## 2. Ejemplo resuelto a mano

En Sabueso, cada evento narrativo es un símbolo, y un relato es una cadena:

- Σ = {CTX, PER, CRI, HAL, ENC, PIS, INT, SOS, DSC, ATQ, REV, CNF, CAP, EPI}, con |Σ| = 14.
- El relato "el asesino envenenó a Lord Ashby; Miller encontró un pañuelo; Miller acusó a la cocinera" es la cadena w = `CRI PIS REV`, de longitud |w| = 3.
- `CRI PIS REV` ∈ Σ\*, porque sus tres símbolos están en Σ.
- `CRI XYZ REV` ∉ Σ\*, porque `XYZ` ∉ Σ: ni siquiera es una cadena sobre el alfabeto, así que no puede pertenecer a ningún L(G).
- L(G1) ⊆ Σ\* son los relatos bien formados según la gramática oficial. Por ejemplo, `CRI PIS REV` ∈ L(G1), pero `REV CRI` ∉ L(G1): sus símbolos están en Σ, pero la revelación no puede preceder al crimen.
- ε ∈ Σ\*, pero ε ∉ L(G1): un relato vacío no tiene crimen. Es el caso I2 del spec.

## 3. Dónde está en el código

| Qué                                                      | Dónde                                                                                                                                                                                                                                          |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Σ de una gramática                                       | `Grammar.terminals` en `packages/core/src/grammar/types.ts`, calculado por `buildGrammar` en `grammar/build.ts`                                                                                                                                |
| Separar un relato en símbolos y verificar que estén en Σ | `tokenizeSequence` y `checkAlphabet` en `packages/core/src/input/sequence.ts` (paso 6)                                                                                                                                                         |
| Comando de consola                                       | `npm run sabueso -- grammar g1` muestra Σ = {ATQ, CAP, CNF, CRI, CTX, DSC, ENC, EPI, HAL, INT, PER, PIS, REV, SOS}, las 14 etiquetas. `npm run sabueso -- tokens --grammar g1 "CRI XYZ REV"` informa que `XYZ`, en la posición 1, no está en Σ |

## 4. Qué prueba lo verifica

| Prueba                                                 | Qué verifica                                                                                       |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `packages/core/test/grammar-build.test.ts`             | Σ contiene exactamente los símbolos que no son lado izquierdo, más los declarados con `%terminals` |
| `packages/core/test/command-line/demo-grammar.test.ts` | El comando imprime Σ = {+, id}                                                                     |
| `packages/core/test/built-in-grammars.test.ts`         | G0 y G1 tienen \|Σ\| = 14 (los tamaños de cada gramática incorporada)                              |
| `packages/core/test/input/sequence.test.ts`            | El caso I6: `XYZ` en la posición 1 es un símbolo desconocido; ε y L1 están sobre Σ                 |
| `packages/core/test/command-line/tokens.test.ts`       | El comando lista los tokens, informa `XYZ` y termina con código 1                                  |

## 5. Referencia bibliográfica

- Augusto, sección 1.2.
- Hopcroft, Motwani y Ullman, _Introducción a la teoría de autómatas, lenguajes y computación_, sección 1.5.
