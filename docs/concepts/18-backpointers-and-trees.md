# 18 — Enlaces (backpointers) y árboles de derivación

## 1. Definición formal

- Un **árbol de derivación** de G para w tiene la raíz S, cada nodo interno A con hijos X₁…Xₖ por una producción A → X₁…Xₖ (o una hoja ε si A → ε), y sus hojas, leídas de izquierda a derecha, forman w (su **yield**). Hopcroft 5.2.
- G es **ambigua** si alguna w tiene más de un árbol.
- En Earley, cada avance del punto guarda un **enlace**: el **predecesor** (el mismo ítem con el punto un lugar antes) y la **causa** (un token leído, un ítem hijo completo, o un símbolo anulable).
- Desde ($S → S •, 0) en Sn, seguir los enlaces hacia atrás da los hijos de cada nodo: **el árbol**. Un ítem con varios enlaces da varios árboles: **la ambigüedad**.
- Los árboles se **enumeran de a uno** (un generador) y hasta un límite, porque pueden ser muchísimos: L1 tiene C(197) en G0.
- Con un ciclo (A ⇒⁺ A) habría infinitos; la enumeración saltea las ramas que repiten un ítem del camino y siempre termina.

## 2. Ejemplo resuelto a mano

G0, A1 = `CRI SOS PIS INT REV`. Planteo y Desenlace son iguales en todos los árboles; cambia la Investigación:

| Árbol | Agrupación de los pasos | Qué abarca la sospecha |
| ----- | ----------------------- | ---------------------- |
| 1     | ((SOS) (PIS)) (INT)     | nada                   |
| 2     | (SOS PIS) (INT)         | PIS                    |
| 3     | (SOS) ((PIS) (INT))     | nada                   |
| 4     | (SOS (PIS INT))         | PIS e INT              |

**4 árboles y 3 lecturas:** los árboles 1 y 3 dicen lo mismo (la sospecha no abarca nada) y solo difieren en cómo se agrupan los pasos (`Pasos → Pasos Pasos`). En G1, A1 tiene **1** árbol: la sospecha abarca todo hasta la revelación.

## 3. Dónde está en el código

| Qué                | Dónde                                                                                    |
| ------------------ | ---------------------------------------------------------------------------------------- |
| Enlaces            | el tipo `Link` y `addItem` (`earley/item.ts`, `earley/chart.ts`)                         |
| Árbol              | el tipo `ParseTree` en `trees/tree.ts`                                                   |
| Enumeración        | `enumerateTrees` y `parseTrees({ grammar, recognition, limit })` en `trees/enumerate.ts` |
| Dibujo             | `renderTree` en `trees/render.ts`                                                        |
| Comando de consola | `npm run sabueso -- trees --grammar g0 "CRI SOS PIS INT REV" [--max 50]`                 |

## 4. Qué prueba lo verifica

| Prueba                                          | Qué verifica                                                                                                                                              |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core/test/trees/enumerate.test.ts`    | A1 da 4 árboles distintos en G0 y 1 en G1; con límite 2 da 2; V1 da 8 y V3 112; las hojas de cada árbol son la entrada; el dibujo exacto de `CRI PIS REV` |
| `packages/core/test/command-line/trees.test.ts` | los árboles numerados, `--max` y un rechazo                                                                                                               |

## 5. Referencia bibliográfica

- Hopcroft, Motwani y Ullman, _Introducción a la teoría de autómatas, lenguajes y computación_, sección 5.2 (árboles de derivación) y 5.4 (ambigüedad).
- Augusto, sección 2.4.2.
- SPEC 02, secciones 3.18 y 3.21.
