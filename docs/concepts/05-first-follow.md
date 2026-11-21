# 05 — FIRST y FOLLOW

## 1. Definición formal

- **FIRST(α)**, para una secuencia α de símbolos: los terminales con que puede empezar una cadena derivada de α, más ε si α ⇒\* ε.
  - FIRST(a) = {a} para un terminal a.
  - Para A → X₁…Xₖ: FIRST(A) incluye FIRST(X₁) sin ε; si X₁ puede ser ε, también FIRST(X₂) sin ε; y así. Si todos pueden ser ε, incluye ε.
- **FOLLOW(A)**, para un no terminal A: los terminales que pueden aparecer **inmediatamente después** de A en alguna forma sentencial, más `$` (el fin de la entrada) si A puede quedar al final.
  - `$` ∈ FOLLOW(S).
  - Para B → α A β: FIRST(β) sin ε está en FOLLOW(A); si β ⇒\* ε, FOLLOW(B) también está en FOLLOW(A).
- Ambos se calculan por **punto fijo**: todos los conjuntos empiezan vacíos y se itera hasta que ninguno cambie. Primero FIRST, porque FOLLOW lo usa.
- Para qué sirven: la tabla LL(1) (ficha 06) pone A → α en la casilla [A, a] para cada a ∈ FIRST(α) y, si α ⇒\* ε, para cada a ∈ FOLLOW(A).

## 2. Ejemplo resuelto a mano: un mini policial

`examples/grammars/mini-detective.grammar`: `Relato → Inicio Pistas Final`, `Inicio → CRI Hallazgo | HAL`, `Hallazgo → HAL | ε`, `Pistas → Pista MasPistas`, `MasPistas → Pista MasPistas | ε`, `Pista → PIS | INT`, `Final → REV Epilogo`, `Epilogo → EPI | ε`.

| No terminal | FIRST         | FOLLOW          | Por qué el FOLLOW                                                       |
| ----------- | ------------- | --------------- | ----------------------------------------------------------------------- |
| Relato      | {CRI, HAL}    | {$}             | es el símbolo inicial                                                   |
| Inicio      | {CRI, HAL}    | {INT, PIS}      | detrás vienen las Pistas                                                |
| Hallazgo    | {HAL, ε}      | {INT, PIS}      | está al final de Inicio: lo sigue lo mismo que a Inicio                 |
| Pistas      | {INT, PIS}    | {REV}           | detrás viene el Final                                                   |
| MasPistas   | {INT, PIS, ε} | {REV}           | está al final de Pistas                                                 |
| Pista       | {INT, PIS}    | {INT, PIS, REV} | detrás viene MasPistas; como puede ser ε, también lo que sigue a Pistas |
| Final       | {REV}         | {$}             | está al final del Relato                                                |
| Epilogo     | {EPI, ε}      | {$}             | está al final del Final                                                 |

FIRST se estabiliza en 2 rondas (más la de verificación): en la 1 entran los que empiezan con un terminal; en la 2, Relato (copia de Inicio), Pistas (copia de Pista) y MasPistas.

En G1, FOLLOW(Pasos) = {REV}: después de la investigación viene la revelación. En G0 es {ATQ, DSC, INT, PIS, REV, SOS}, porque `Pasos → Pasos Pasos` hace que detrás de un `Pasos` pueda venir otro.

## 3. Dónde está en el código

| Qué                | Dónde                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------ |
| Archivo            | `packages/core/src/analysis/first-follow.ts`                                                           |
| Funciones          | `computeFirstFollow`, `computeFirst`, `computeFollow`, `firstOfSequence`                               |
| Punto fijo         | `repeatRuleOnSetsUntilNoChange` en `analysis/fixed-point.ts` (un conjunto por símbolo)                 |
| Comando de consola | `npm run sabueso -- first-follow --grammar g1 [--steps]`                                               |
| Quién lo usa       | la tabla LL(1) (paso 12); el parser de `.grammar` (paso 4) usa los mismos conjuntos, calculados a mano |

## 4. Qué prueba lo verifica

| Prueba                                                 | Qué verifica                                                                                                                   |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `packages/core/test/analysis/first-follow.test.ts`     | las tablas del mini policial; los conjuntos de la sección 4.4 del spec para G1; FOLLOW(Pasos) en G0; ε ∈ FIRST(A) ⇔ A anulable |
| `packages/core/test/command-line/first-follow.test.ts` | la tabla de G1 y las rondas con `--steps`                                                                                      |

## 5. Referencia bibliográfica

- Aho, Lam, Sethi y Ullman, _Compiladores: principios, técnicas y herramientas_ (2.ª ed.), sección 4.4.2 (FIRST y FOLLOW).
