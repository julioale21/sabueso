# 06 — Tabla LL(1), conflictos y no ambigüedad

## 1. Definición formal

- La **tabla predictiva** M[A, a] dice qué producción usar cuando hay que expandir el no terminal A y el próximo símbolo de la entrada es a. Para cada producción A → α:
  - para cada a ∈ FIRST(α), M[A, a] ∋ A → α;
  - si ε ∈ FIRST(α), para cada b ∈ FOLLOW(A) (incluido `$`), M[A, b] ∋ A → α.
- El conjunto de símbolos que eligen A → α es su **conjunto de predicción**: FIRST(α) sin ε, más FOLLOW(A) si α ⇒\* ε.
- Hay un **conflicto** cuando una casilla recibe más de una producción. G es **LL(1)** si y solo si no hay conflictos: dos producciones del mismo A nunca tienen conjuntos de predicción con elementos en común.
- **Teorema:** toda gramática LL(1) es **no ambigua**. Para cada no terminal y cada próximo símbolo hay a lo sumo una producción aplicable, así que la derivación más a la izquierda de cada cadena es única, y con ella su árbol.
- **La vuelta no vale:** una gramática no ambigua puede no ser LL(1). `arithmetic` es no ambigua pero tiene recursión a izquierda, y eso siempre da conflictos.
- Un conflicto **no** prueba ambigüedad: puede venir solo de que falta factorizar (`Hecho → CRI | CRI HAL`).

## 2. Ejemplo resuelto a mano

**Mini policial** (`examples/grammars/mini-detective.grammar`, FIRST y FOLLOW en la ficha 05). Algunas casillas:

| Casilla           | Producción            | Por qué                                             |
| ----------------- | --------------------- | --------------------------------------------------- |
| M[Inicio, CRI]    | Inicio → CRI Hallazgo | CRI ∈ FIRST(CRI Hallazgo)                           |
| M[Inicio, HAL]    | Inicio → HAL          | HAL ∈ FIRST(HAL)                                    |
| M[Hallazgo, HAL]  | Hallazgo → HAL        | HAL ∈ FIRST(HAL)                                    |
| M[Hallazgo, PIS]  | Hallazgo → ε          | ε: PIS ∈ FOLLOW(Hallazgo)                           |
| M[MasPistas, REV] | MasPistas → ε         | ε: REV ∈ FOLLOW(MasPistas)                          |
| M[Hallazgo, REV]  | vacía: error          | REV no está ni en FIRST(HAL) ni en FOLLOW(Hallazgo) |

Ninguna casilla tiene dos producciones: es LL(1).

**G0** tiene 13 conflictos. Dos tipos:

| Conflicto       | Producciones                                | Causa                                      |
| --------------- | ------------------------------------------- | ------------------------------------------ |
| M[Pasos, PIS]   | `Pasos → Paso` y `Pasos → Pasos Pasos`      | ambigüedad: cómo se agrupan los pasos      |
| M[Linea, SOS]   | `Linea → SOS` y `Linea → SOS Pasos`         | ambigüedad: hasta dónde llega una sospecha |
| M[Planteo, CRI] | `Planteo → Hecho` y `Planteo → Hecho Marco` | falta factorizar (no es ambigüedad)        |

G1 resolvió las dos cosas: listas recursivas a derecha y factorización. Resultado: 0 conflictos.

## 3. Dónde está en el código

| Qué              | Dónde                                                                                           |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| Archivo          | `packages/core/src/analysis/predictive-table.ts`                                                |
| Funciones        | `buildPredictiveTable({ grammar, sets })` y `predictionSet({ production, sets })`               |
| Informe completo | `analyzeGrammar(grammar)` en `analysis/index.ts`: los pasos 7 a 12 juntos                       |
| Comandos         | `npm run sabueso -- predictive-table --grammar g0`, y `npm run sabueso -- analyze --grammar g1` |

## 4. Qué prueba lo verifica

| Prueba                                                     | Qué verifica                                                                                                                                         |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core/test/analysis/predictive-table.test.ts`     | G1 y `meta` con 0 conflictos; G0 con (Linea, SOS), (Planteo, CRI) y (Pasos, PIS); `arithmetic` por recursión a izquierda; la tabla del mini policial |
| `packages/core/test/analysis/analyze.test.ts`              | el informe de G1 y las propiedades de las gramáticas de prueba                                                                                       |
| `packages/core/test/command-line/predictive-table.test.ts` | la tabla con ✗, los conflictos, el veredicto y el informe `analyze`                                                                                  |

## 5. Referencia bibliográfica

- Aho, Lam, Sethi y Ullman, _Compiladores: principios, técnicas y herramientas_ (2.ª ed.), sección 4.4.3 (tablas de análisis sintáctico predictivo) y 4.4.4 (análisis predictivo no recursivo).
