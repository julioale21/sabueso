# 20 — Derivación más a la izquierda

## 1. Definición formal

- Una **derivación** de w es una sucesión de formas sentenciales S ⇒ α₁ ⇒ α₂ ⇒ … ⇒ w, donde cada paso reemplaza un no terminal por el lado derecho de una de sus producciones.
- Es **más a la izquierda** si en cada paso se reemplaza el no terminal **de más a la izquierda** de la forma.
- **Árboles y derivaciones más a la izquierda se corresponden uno a uno** (Hopcroft 5.2.5): el orden en que se aplican las producciones es el **preorden** del árbol (un nodo antes que sus hijos, los hijos de izquierda a derecha).
- Por eso, G es **ambigua** si y solo si alguna w tiene **dos derivaciones más a la izquierda distintas**.

## 2. Ejemplo resuelto a mano

A1 = `CRI SOS PIS INT REV` con G1 (el no terminal que se reemplaza en cada paso es el primero de la forma anterior):

| Paso | Forma sentencial                                 | Producción                               |
| ---- | ------------------------------------------------ | ---------------------------------------- |
| 0    | Relato                                           |                                          |
| 1    | Planteo Investigacion Desenlace                  | Relato → Planteo Investigacion Desenlace |
| 2    | Hecho MarcoOpc Investigacion Desenlace           | Planteo → Hecho MarcoOpc                 |
| 3    | CRI HallazgoOpc MarcoOpc Investigacion Desenlace | Hecho → CRI HallazgoOpc                  |
| 4    | CRI MarcoOpc Investigacion Desenlace             | HallazgoOpc → ε                          |
| …    | …                                                | …                                        |
| 18   | CRI SOS PIS INT REV                              | EpiOpc → ε                               |

Son 18 pasos (19 formas, de 0 a 18): los de la sección 9.2 del spec. En G0, los 4 árboles de A1 dan 4 derivaciones más a la izquierda distintas.

## 3. Dónde está en el código

| Qué                | Dónde                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------- |
| Archivo            | `packages/core/src/trees/derivation.ts`                                                     |
| Función            | `leftmostDerivation(tree)` → `DerivationStep[]` (forma y producción de cada paso)           |
| Comando de consola | `npm run sabueso -- derive --grammar g1 "CRI SOS PIS INT REV"` (`--tree k` para otro árbol) |

## 4. Qué prueba lo verifica

| Prueba                                           | Qué verifica                                                                                                                                                             |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/core/test/trees/derivation.test.ts`    | A1 con G1 coincide paso a paso con la sección 9.2; cada paso reemplaza el no terminal de más a la izquierda; termina en la entrada; A1 en G0 da 4 derivaciones distintas |
| `packages/core/test/command-line/derive.test.ts` | los pasos numerados con su producción y `--tree`                                                                                                                         |

## 5. Referencia bibliográfica

- Hopcroft, Motwani y Ullman, _Introducción a la teoría de autómatas, lenguajes y computación_, secciones 5.1.4 (derivaciones más a la izquierda) y 5.2.5 (de los árboles a las derivaciones).
