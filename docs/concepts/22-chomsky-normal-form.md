# 22 — Forma Normal de Chomsky

> START, DEL y UNIT llegaron en el paso 23; USELESS, TERM y BIN, en el paso 24.

## 1. Definición formal

- Una gramática está en **Forma Normal de Chomsky (FNC)** si toda producción es **A → BC** (dos no terminales) o **A → a** (un terminal). Además se permite **S → ε** para el símbolo inicial S si ε ∈ L(G), siempre que S no aparezca en ningún lado derecho.
- Toda GLC G tiene una G' en FNC con L(G') = L(G) (Sipser 2.1, Teorema 2.9; Hopcroft 7.1.5 lo prueba para L − {ε}). La conversión tiene seis pasos, uno por función, y **cada uno preserva el lenguaje**:

| #   | Paso    | Qué hace                                                                                                                 |
| --- | ------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1   | START   | Si el inicial S aparece en algún lado derecho, agrega un inicial nuevo S0 y la producción S0 → S. Si no, no cambia nada. |
| 2   | DEL     | Elimina las producciones ε. Cada A → α se reemplaza por todas las versiones que borran algunos símbolos anulables de α.  |
| 3   | UNIT    | Elimina las producciones unitarias A → B. Por cada **par unitario** (A, B) y cada B → α no unitaria, agrega A → α.       |
| 4   | USELESS | Elimina los no terminales no productivos o no alcanzables (ficha 08) y las producciones que los usan.                    |
| 5   | TERM    | Reemplaza cada terminal a de un cuerpo de largo ≥ 2 por un T_a nuevo, con T_a → a.                                       |
| 6   | BIN     | Parte cada cuerpo de largo k ≥ 3 en k − 1 producciones de largo 2, con no terminales nuevos X1, X2, …                    |

- **DEL:** si los anulables de A → X1…Xk son m, la producción da hasta 2^m versiones (cada anulable se conserva o se borra). Se descartan las versiones vacías: L(G') = L(G) − {ε}. Como START fue primero, el inicial no aparece a la derecha, y su producción ε se puede conservar sin riesgo cuando es anulable: no borra nada más.
- **Pares unitarios** (Hopcroft 7.1.4), un menor punto fijo como el de los anulables:
  - **Base:** (A, A) es un par unitario.
  - **Inducción:** si (A, B) es un par y B → C ∈ P con C ∈ N, entonces (A, C) es un par.
- **UNIT** rompe también los ciclos A ⇒+ A (ficha 09): un ciclo está hecho de pasos unitarios, y no queda ninguno.
- **USELESS** nunca borra el inicial: si L(G) = ∅, queda solo y sin producciones.
- **BIN:** A → B1 B2 … Bk pasa a A → B1 X1, X1 → B2 X2, …, X(k−2) → B(k−1) Bk. Cada X tiene una sola producción, así que no agrega cadenas ni ambigüedad.
- **De dónde sale cada paso:** START viene de Sipser (2.1): Hopcroft trabaja con L − {ε} y no lo necesita. DEL, UNIT, USELESS, TERM y BIN siguen Hopcroft 7.1.3, 7.1.4, 7.1.1 y 7.1.5. Los nombres cortos (START, DEL, UNIT, TERM, BIN) son una convención habitual, no salen de ninguno de los dos libros.
- **El orden importa:** DEL crea producciones unitarias nuevas (`Planteo → Hecho MarcoOpc` da `Planteo → Hecho`), así que UNIT va después. DEL y UNIT dejan símbolos inútiles, así que USELESS va después de los dos. TERM va antes que BIN para que BIN solo vea no terminales.

## 2. Ejemplo resuelto a mano

`parentheses`: S → ( S ) S | ε. Su lenguaje contiene ε.

| Paso    | Producciones                                                                         | Qué cambió                                                        |
| ------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| START   | S0 → S · S → ( S ) S · S → ε                                                         | + S0 → S                                                          |
| DEL     | S0 → S · S0 → ε · S → ( S ) S · S → ( S ) · S → ( ) S · S → ( )                      | anulables = {S, S0}; ( S ) S da 4 versiones; − S → ε; + S0 → ε    |
| UNIT    | S0 → ε · S0 → ( S ) S · S0 → ( S ) · S0 → ( ) S · S0 → ( ) · S → (las mismas 4 de S) | pares de S0 = {S0, S}; − S0 → S; S0 copia las 4 no unitarias de S |
| USELESS | igual                                                                                | S0 y S son útiles: nada                                           |
| TERM    | S0 → T_( S T_) S · … · T_( → ( · T_) → )                                             | ( y ) quedan solos en T_( → ( y T_) → ); 11 producciones          |
| BIN     | S0 → T_( X1 · X1 → S X2 · X2 → T_) S · …                                             | cada cuerpo de largo 3 o 4 se parte; 19 producciones, FNC ✓       |

En **G1** (40 producciones):

- **START** no cambia nada: `Relato` no aparece en ningún lado derecho, así que sigue siendo el inicial.

- **DEL** borra las 10 producciones ε (`MarcoOpc → ε`, …) y agrega 16 versiones (`Planteo → Hecho`, `Linea → SOS`, `Resolucion → REV`, …). Quedan 46 producciones. ε ∉ L(G1), así que no queda ninguna producción ε.
- **UNIT** quita las 10 unitarias (`Investigacion → Pasos`, `Planteo → Hecho`, …) y agrega 33 producciones. Por ejemplo, los pares de Investigacion son {Investigacion, Pasos, Evidencia, Linea}, así que Investigacion recibe `Investigacion → PIS` y `Investigacion → SOS CuerpoLinea`. Quedan 69 producciones.

## 3. Dónde está en el código

| Qué                   | Dónde                                                                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| START                 | `packages/core/src/chomsky-normal-form/add-new-start.ts`: `addNewStart`                                                                          |
| DEL                   | `packages/core/src/chomsky-normal-form/remove-epsilon-productions.ts`: `removeEpsilonProductions` (usa `computeNullable`, ficha 07)              |
| UNIT                  | `packages/core/src/chomsky-normal-form/remove-unit-productions.ts`: `computeUnitPairs` y `removeUnitProductions` (usa `repeatRuleUntilNoChange`) |
| USELESS               | `packages/core/src/chomsky-normal-form/remove-useless-symbols.ts`: `removeUselessSymbols` (usa `analyzeUsefulSymbols`, ficha 08)                 |
| TERM                  | `packages/core/src/chomsky-normal-form/isolate-terminals.ts`: `isolateTerminals`                                                                 |
| BIN                   | `packages/core/src/chomsky-normal-form/binarize.ts`: `binarize`                                                                                  |
| Los seis, y verificar | `packages/core/src/chomsky-normal-form/index.ts`: `toChomskyNormalForm`, `isChomskyNormalForm`                                                   |
| G → G'                | `packages/core/src/chomsky-normal-form/rewrite.ts`: `rewriteGrammar` (renumera P, quita repetidas y conserva N)                                  |
| Comando de consola    | `npm run sabueso -- chomsky-normal-form --grammar g1`                                                                                            |

## 4. Qué prueba lo verifica

| Prueba                                                            | Qué verifica                                                                                                                                                           |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core/test/chomsky-normal-form/start-del-unit.test.ts`   | El ejemplo de la sección 2 producción por producción; los pares unitarios; ningún unitario queda; el lenguaje se preserva después de cada paso (G0, G1 y las de libro) |
| `packages/core/test/chomsky-normal-form/useless-term-bin.test.ts` | USELESS, TERM y BIN a mano; las 10 gramáticas terminan en FNC; `parentheses` conserva ε; G1 da 40 → 46 → 69 → 67 → 75 → 78; el lenguaje se preserva                    |
| `packages/core/test/command-line/chomsky-normal-form.test.ts`     | El comando muestra cada paso con lo agregado y lo quitado (hasta las 78 de G1 y el veredicto FNC ✓) y rechaza un `--until` inválido                                    |

## 5. Referencia bibliográfica

- Hopcroft, Motwani y Ullman, _Introducción a la teoría de autómatas, lenguajes y computación_, secciones 7.1.1 y 7.1.2 (símbolos inútiles), 7.1.3 (producciones ε), 7.1.4 (producciones unitarias) y 7.1.5 (Forma Normal de Chomsky).
- Sipser, M., _Introducción a la teoría de la computación_, sección 2.1 (Teorema 2.9: la FNC con el inicial nuevo S0).
- Augusto, sección 2.4.3.
