# 08 — Símbolos inútiles y vacuidad

## 1. Definición formal

- A es **productivo** (o generador) si A ⇒\* w para alguna w ∈ Σ\*: deriva alguna cadena de terminales.
- A es **alcanzable** si S ⇒\* αAβ: aparece en alguna forma sentencial.
- A es **útil** si es las dos cosas: aparece en alguna derivación S ⇒\* αAβ ⇒\* w de una oración. Si no, es **inútil**.
- **Eliminarlos** (Hopcroft 7.1.1): primero se quitan los no productivos (con todas las producciones que los usan); **después**, sobre lo que queda, los no alcanzables. La gramática resultante genera el mismo lenguaje.
- **Vacuidad** (Hopcroft 7.4.3): L(G) = ∅ si y solo si S no es productivo. Es un problema **decidible**: el algoritmo siempre termina con la respuesta.
- Ambos conjuntos se calculan por punto fijo:
  - productivos: ronda 1, los A con un lado derecho de puros terminales (o ε); ronda i, los A con un lado derecho de terminales y productivos;
  - alcanzables: se parte de {S}; cada ronda agrega los no terminales de los lados derechos de los ya alcanzados.

## 2. Ejemplo resuelto a mano

**`test-useless`:** `S → A a | b`, `A → A a`, `C → c`.

| Fase        | Cálculo                                                                           | Resultado                  |
| ----------- | --------------------------------------------------------------------------------- | -------------------------- |
| Productivos | ronda 1: S (por `S → b`) y C (por `C → c`). A solo tiene `A → A a`: nunca termina | {S, C}; A no es productivo |
| Se quitan   | `A → A a` y `S → A a` (usan A)                                                    | quedan `S → b`, `C → c`    |
| Alcanzables | desde {S}: `S → b` no menciona ningún no terminal                                 | {S}; C no es alcanzable    |
| Resultado   | inútiles = {A, C}                                                                 | G sin inútiles: `S → b`    |

**Por qué importa el orden** (`examples/grammars/useless-order.grammar`): `S → A B | a`, `A → b`, `B → B c`.

| Orden                         | Qué pasa                                                                                                     | Resultado                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------- |
| Correcto: productivos primero | B no es productivo: se quitan `B → B c` y `S → A B`. Ahora A no es alcanzable                                | `S → a`                           |
| Al revés: alcanzables primero | S, A y B son alcanzables (por `S → A B`). Después se quita B y `S → A B`, pero A ya pasó el filtro: se queda | `S → a`, `A → b`: A sigue, inútil |

**`test-empty`:** `S → S a`. S nunca termina: no es productivo, así que L(G) = ∅.

## 3. Dónde está en el código

| Qué                | Dónde                                                                                                                |
| ------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Archivo            | `packages/core/src/analysis/useful.ts`                                                                               |
| Funciones          | `analyzeUsefulSymbols(grammar)`, `computeReachable` (y `productiveRounds` y `reachableRounds`, con todas las rondas) |
| Comando de consola | `npm run sabueso -- useful --grammar test-useless --steps`                                                           |
| Quién lo usa       | el informe `analyze` (paso 12) y la Forma Normal de Chomsky, paso USELESS (paso 24)                                  |

## 4. Qué prueba lo verifica

| Prueba                                           | Qué verifica                                                                                                                                  |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core/test/analysis/useful.test.ts`     | `test-useless` da no productivos {A} y no alcanzables {C}; `test-empty` es vacía; G0, G1 y las demás no tienen inútiles; el ejemplo del orden |
| `packages/core/test/command-line/useful.test.ts` | el comando muestra las rondas, los inútiles, la gramática limpia y L(G) = ∅                                                                   |

## 5. Referencia bibliográfica

- Hopcroft, Motwani y Ullman, _Introducción a la teoría de autómatas, lenguajes y computación_, secciones 7.1.1 (eliminación de símbolos inútiles), 7.1.2 (cálculo de generadores y alcanzables) y 7.4.3 (comprobación de que un LIC es vacío).
