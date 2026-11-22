# 31 — Decidibilidad y máquina de Turing

> Guía de teoría: no tiene código propio. Ubica cada problema sobre gramáticas en lo que el programa decide o solo busca.

## 1. Teoría

- Una **máquina de Turing** (MT) es un autómata finito con una cinta infinita que puede leer, escribir y recorrer en las dos direcciones. Es el modelo más general de cómputo (tipo 0, [guía 30](30-jerarquia-de-chomsky-y-limites.md)).
- **Tesis de Church-Turing:** todo lo que se puede calcular con un algoritmo se puede calcular con una MT.
- Un problema es:
  - **decidible** si hay una MT que **siempre se detiene** y responde sí o no (un **decisor**);
  - **semidecidible** si hay una MT que responde "sí" cuando la respuesta es sí, pero puede no detenerse cuando es no;
  - **indecidible** si no es decidible.

Sobre GLC, algunos problemas son decidibles y otros no:

| Problema                        | ¿Decidible? | En Sabueso                                                         |
| ------------------------------- | ----------- | ------------------------------------------------------------------ |
| **Pertenencia:** ¿w ∈ L(G)?     | sí          | Earley (`recognize`), que siempre se detiene                       |
| **Vacuidad:** ¿L(G) = ∅?        | sí          | `analyzeUsefulSymbols(grammar).isEmpty`                            |
| **¿G es LL(1)?**                | sí          | `buildPredictiveTable(…).isPredictive`                             |
| **Ambigüedad:** ¿G es ambigua?  | **no**      | solo se busca un testigo hasta un largo k (`findAmbiguityWitness`) |
| **Equivalencia:** ¿L(G) = L(H)? | **no**      | solo se busca una diferencia hasta k (`compareLanguages`)          |

**Ejemplo: por qué Earley siempre se detiene.** Con n etiquetas, un ítem es (producción, posición del punto, origen) en uno de los n + 1 conjuntos. Todo eso es finito, y un conjunto nunca repite un ítem. Entonces el chart es finito y el algoritmo termina, con sí o con no: es un decisor.

**La lección:** indecidible no significa que no se pueda responder nunca. Significa que no hay **un** algoritmo que lo responda para **toda** gramática. Para G0 y G1 se responden todas: G1 no es ambigua porque es LL(1), y G0 sí lo es porque la búsqueda encuentra el testigo `CRI SOS ATQ REV`, con 2 árboles.

## 2. Cómo se ve en el proyecto

| Qué                       | Dónde                                                                                         | Comando                                                    |
| ------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Pertenencia (decisor)     | `packages/core/src/earley/recognizer.ts` ([guía 14](14-reconocedor-de-earley.md))             | `npm run sabueso -- earley --grammar g1 "CRI PIS REV"`     |
| Vacuidad (decisor)        | `packages/core/src/analysis/useful.ts` ([guía 09](09-simbolos-inutiles-y-vacuidad.md))        | `npm run sabueso -- useful --grammar test-empty`           |
| LL(1) (decisor)           | `packages/core/src/analysis/predictive-table.ts` ([guía 12](12-tabla-ll1-y-no-ambiguedad.md)) | `npm run sabueso -- predictive-table --grammar g1`         |
| Ambigüedad (semidecisión) | `packages/core/src/bounded/ambiguity.ts` ([guía 27](27-busquedas-acotadas.md))                | `npm run sabueso -- ambiguity --grammar g0 --max-length 4` |
| Diferencia de lenguajes   | `packages/core/src/bounded/compare.ts` ([guía 27](27-busquedas-acotadas.md))                  | `npm run sabueso -- compare g0 g1 --max-length 3`          |

## 3. Referencias

- Hopcroft, Motwani y Ullman, _Introducción a la teoría de autómatas, lenguajes y computación_, secciones 8.2 (la máquina de Turing), 7.4 (problemas decidibles sobre GLC; pertenencia en 7.4.4 y vacuidad en 7.4.3), 7.4.5 (anticipo de los problemas indecidibles de los LIC), 9.2 (lenguajes recursivos y recursivamente enumerables), 9.5.2 (indecidibilidad de la ambigüedad) y 9.5.3 (equivalencia e inclusión de GLC).
- Augusto, capítulo 3 (secciones 3.4 y 3.8).
