# 27 — Decidibilidad y máquina de Turing

## 1. Definición formal

- Una **máquina de Turing** (MT) es un autómata finito con una cinta infinita que puede leer, escribir y recorrer en las dos direcciones. Es el modelo más general de cómputo de la jerarquía (tipo 0, ficha 26).
- **Tesis de Church-Turing:** todo lo que se puede calcular con un algoritmo se puede calcular con una MT. Por eso, cada función del núcleo de Sabueso es, en el fondo, una MT.
- Un problema (un lenguaje L) es:
  - **decidible** (recursivo) si hay una MT que **siempre se detiene** y responde sí o no: un **decisor**;
  - **semidecidible** (recursivamente enumerable) si hay una MT que se detiene y responde "sí" cuando la respuesta es sí, pero puede no detenerse cuando es no;
  - **indecidible** si no es decidible.
- **Sobre GLC** (Hopcroft 7.4 y 9.5), algunos problemas son decidibles y otros no:

| Problema                        | ¿Decidible? | Dónde está en Sabueso                                                                 |
| ------------------------------- | ----------- | ------------------------------------------------------------------------------------- |
| **Pertenencia:** ¿w ∈ L(G)?     | sí          | Earley (`recognize`), que siempre se detiene; también CYK sobre la FNC                |
| **Vacuidad:** ¿L(G) = ∅?        | sí          | `analyzeUsefulSymbols(grammar).isEmpty`: el inicial no es productivo                  |
| **¿G es LL(1)?**                | sí          | `buildPredictiveTable(…).isPredictive`: la tabla no tiene conflictos                  |
| **Ambigüedad:** ¿G es ambigua?  | **no**      | solo semidecidible: `findAmbiguityWitness` busca un testigo hasta un largo k          |
| **Equivalencia:** ¿L(G) = L(H)? | **no**      | solo su complemento es semidecidible: `compareLanguages` busca una diferencia hasta k |
| **Inclusión:** ¿L(G) ⊆ L(H)?    | **no**      | `compareLanguages` puede refutarla; L(G1) ⊆ L(G0) se demuestra a mano (ficha 21)      |

## 2. Ejemplo resuelto a mano: qué decide el programa y qué se demuestra a mano

**Por qué Earley siempre se detiene (es un decisor).** Con una entrada de n etiquetas, un ítem es (producción, posición del punto, origen) en uno de los n + 1 conjuntos. Hay finitas producciones, finitas posiciones y finitos orígenes, y un conjunto nunca repite un ítem. Entonces el chart es finito y el algoritmo termina, con sí o con no. Lo mismo vale para CYK (n² celdas). El autómata de pila es distinto: su simulación ingenua puede no terminar, y por eso necesita la poda por minYield y un límite de pasos (`undetermined`).

**Qué responde el programa para G0 y G1:**

| Pregunta                | Respuesta | Cómo se sabe                                                                                            |
| ----------------------- | --------- | ------------------------------------------------------------------------------------------------------- |
| ¿`CRI PIS REV` ∈ L(G1)? | sí        | lo **decide** Earley                                                                                    |
| ¿L(G1) = ∅?             | no        | lo **decide** el análisis de productivos                                                                |
| ¿G1 es ambigua?         | no        | lo **demuestra** una condición suficiente decidible: G1 es LL(1)                                        |
| ¿G0 es ambigua?         | sí        | lo **semidecide** la búsqueda: el testigo `CRI SOS ATQ REV` tiene 2 árboles                             |
| ¿L(G0) = L(G1)?         | no        | lo **refuta** la búsqueda: `CRI DSC REV` está en L(G0) y no en L(G1)                                    |
| ¿L(G1) ⊆ L(G0)?         | sí        | se **demuestra a mano**: los `Pasos` de G1 son cadenas no vacías de pasos, y en G0 `Pasos` genera todas |

**La lección:** que un problema sea indecidible no significa que no se pueda responder nunca. Significa que no hay **un** algoritmo que lo responda para **toda** gramática. Para G0 y G1 se responden todas: con un decisor, con un testigo o con una demostración.

## 3. Dónde está en el código

| Qué                       | Dónde                                                                                                      |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Pertenencia (decisor)     | `packages/core/src/earley/recognizer.ts`: `recognize` (`earley --grammar g1 "CRI PIS REV"`)                |
| Vacuidad (decisor)        | `packages/core/src/analysis/useful.ts`: `isEmpty` (`useful --grammar test-empty`)                          |
| LL(1) (decisor)           | `packages/core/src/analysis/predictive-table.ts`: `buildPredictiveTable` (`predictive-table --grammar g1`) |
| Ambigüedad (semidecisión) | `packages/core/src/bounded/ambiguity.ts`: `findAmbiguityWitness` (`ambiguity --grammar g0 --max-length 4`) |
| Diferencia de lenguajes   | `packages/core/src/bounded/compare.ts`: `compareLanguages` (`compare g0 g1 --max-length 3`)                |

## 4. Qué prueba lo verifica

| Prueba                                                 | Qué verifica                                                              |
| ------------------------------------------------------ | ------------------------------------------------------------------------- |
| `packages/core/test/earley/`                           | Earley acepta y rechaza lo esperado (y siempre termina)                   |
| `packages/core/test/analysis/useful.test.ts`           | `test-empty` tiene L(G) = ∅                                               |
| `packages/core/test/analysis/predictive-table.test.ts` | G1 sin conflictos, G0 con 13                                              |
| `packages/core/test/bounded/bounded.test.ts`           | el testigo de G0, ninguno en G1 hasta largo 7, y `CRI DSC REV` solo en G0 |

## 5. Referencia bibliográfica

- Hopcroft, Motwani y Ullman, _Introducción a la teoría de autómatas, lenguajes y computación_, secciones 8.2 (la máquina de Turing), 7.4 (problemas decidibles sobre GLC; pertenencia en 7.4.4 y vacuidad en 7.4.3), 7.4.5 (anticipo de los problemas indecidibles de los LIC), 9.2 (lenguajes recursivos y recursivamente enumerables), 9.5.2 (indecidibilidad de la ambigüedad) y 9.5.3 (equivalencia e inclusión de GLC).
- Augusto, capítulo 3 (secciones 3.4 y 3.8).
