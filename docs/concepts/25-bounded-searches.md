# 25 — Búsquedas acotadas: semidecisión

## 1. Definición formal

- Un problema es **decidible** si hay un algoritmo que siempre termina y responde sí o no. Es **semidecidible** si hay un algoritmo que responde "sí" cuando la respuesta es sí, pero puede no terminar cuando es no.
- Dos problemas sobre GLC son **indecidibles** (Hopcroft 9.5.2 y 9.5.3):
  - **ambigüedad:** ¿existe una cadena con dos árboles?
  - **equivalencia:** ¿L(G) = L(H)?
- Los dos son semidecidibles "por el lado del sí". La **búsqueda acotada** prueba todas las oraciones hasta un largo k:
  - si G es ambigua, para algún k aparece un **testigo** (una oración con dos árboles), y eso lo **demuestra**;
  - si L(G) ≠ L(H), para algún k aparece una oración que está en un lenguaje y no en el otro, y eso lo **demuestra**;
  - "nada hasta k" **no demuestra nada**: el testigo podría estar en k + 1.
- **Generar** las oraciones de largo ≤ k sí es decidible: una búsqueda en anchura sobre formas sentenciales más a la izquierda, que descarta las formas cuyo minYield (ficha 10) ya supera k. Esa poda la hace terminar.
- La **no** ambigüedad se demuestra por otro camino: una condición suficiente, como ser LL(1) (ficha 06).

## 2. Ejemplo resuelto a mano

**Generar G1 hasta largo 3:** toda oración tiene al menos un hecho, un paso y la revelación (minYield(Relato) = 3). Con largo 3 hay 2 hechos (`CRI`, `HAL`) × 4 pasos (`ATQ`, `INT`, `PIS`, `SOS`) × `REV` = **8 oraciones**.

**El testigo de G0 (largo 4):** el primero, en orden de largo y después alfabético, es `CRI SOS ATQ REV`, con **2 árboles**: la sospecha abarca el ataque (`Linea → SOS Pasos`) o no (`Pasos → Pasos Pasos`, con `Linea → SOS` sola). Con largo 3 no hay testigo: hace falta una sospecha seguida de algo.

**G1 hasta largo 7:** sin testigo entre sus 19 986 oraciones. Eso no demuestra nada por sí solo; lo que demuestra que G1 no es ambigua es su tabla LL(1) sin conflictos.

**G0 contra G1 hasta largo 3:** solo G0 tiene `CRI DSC REV` y `HAL DSC REV` (un descarte sin sospecha previa). Eso **demuestra** L(G0) ≠ L(G1). G1 no tiene ninguna oración propia (hasta largo 4 tampoco): coincide con L(G1) ⊊ L(G0) (ficha 21).

## 3. Dónde está en el código

| Qué                   | Dónde                                                                                                           |
| --------------------- | --------------------------------------------------------------------------------------------------------------- |
| Generar oraciones     | `packages/core/src/bounded/generate.ts`: `generateSentences`                                                    |
| Testigo de ambigüedad | `packages/core/src/bounded/ambiguity.ts`: `findAmbiguityWitness` (usa Earley y `countTrees`)                    |
| Comparar lenguajes    | `packages/core/src/bounded/compare.ts`: `compareLanguages`                                                      |
| Comandos de consola   | `generate --grammar g1 --max-length 3`, `ambiguity --grammar g0 --max-length 4`, `compare g0 g1 --max-length 3` |

## 4. Qué prueba lo verifica

| Prueba                                            | Qué verifica                                                                                                       |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `packages/core/test/bounded/bounded.test.ts`      | B1 a B4 del spec; generar da exactamente las cadenas que acepta Earley; el límite ante una recursión sin etiquetas |
| `packages/core/test/command-line/bounded.test.ts` | Los tres comandos, los mensajes "no demuestra nada" y los errores de uso                                           |

## 5. Referencia bibliográfica

- Hopcroft, Motwani y Ullman, _Introducción a la teoría de autómatas, lenguajes y computación_, secciones 9.5.2 (la ambigüedad es indecidible) y 9.5.3 (otros problemas indecidibles sobre GLC), y 9.2 (lenguajes recursivamente enumerables: semidecisión).
- Hopcroft, Motwani y Ullman, misma obra, secciones 5.1 (gramáticas y derivaciones, de donde sale la generación de oraciones por derivaciones más a la izquierda) y 7.4.3 (vacuidad de una GLC, la misma idea de "producir algo" que usa la poda por longitud mínima).
