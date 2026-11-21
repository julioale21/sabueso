# 09 — Ciclos (A ⇒⁺ A)

## 1. Definición formal

- Una gramática es **cíclica** si existe un no terminal A con A ⇒⁺ A: A se deriva a sí mismo en uno o más pasos, **sin producir nada más**.
- Si G es cíclica (y A es útil), alguna cadena tiene **infinitos árboles de derivación**: la vuelta A ⇒⁺ A se puede repetir cualquier cantidad de veces antes de seguir.
- Un ciclo pasa por producciones "casi unitarias": A → α B β donde α y β pueden desaparecer (son anulables). En ese caso A ⇒⁺ B sin producir nada.
- **Grafo unitario:** una arista A → B por cada producción A → α B β con α y β anulables. G es cíclica si y solo si ese grafo tiene un ciclo. Se busca con una **búsqueda en profundidad** (DFS): un ciclo aparece cuando la búsqueda vuelve a un símbolo que todavía está en el camino actual (arista de retroceso).
- **Ciclo no es lo mismo que ambigüedad:** una gramática ambigua tiene **más de un** árbol para alguna cadena; una cíclica tiene **infinitos**. G0 es ambigua pero no cíclica.

## 2. Ejemplo resuelto a mano

**`test-cyclic`:** `S → A | a`, `A → S`.

| Producción | ¿Lo que rodea a B es anulable?     | Arista |
| ---------- | ---------------------------------- | ------ |
| `S → A`    | no hay nada alrededor              | S → A  |
| `S → a`    | `a` es terminal, no es no terminal | —      |
| `A → S`    | no hay nada alrededor              | A → S  |

DFS desde S: S → A → S, y S está en el camino: ciclo **S ⇒⁺ A ⇒⁺ S**. La cadena `a` tiene infinitos árboles: S ⇒ a, S ⇒ A ⇒ S ⇒ a, S ⇒ A ⇒ S ⇒ A ⇒ S ⇒ a…

**Un ciclo escondido** (`examples/grammars/hidden-cycle.grammar`): `S → A S B | x`, `A → ε | a`, `B → ε | b`. `S → A S B` no es unitaria, pero A y B son anulables, así que da la arista S → S: S ⇒ A S B ⇒⁺ S.

**G0 no es cíclica:** `Pasos → Pasos Pasos` no da la arista Pasos → Pasos, porque el otro `Pasos` no es anulable: siempre produce al menos un evento. Por eso G0 tiene muchos árboles (C(n−1), Catalan) pero siempre **finitos**.

## 3. Dónde está en el código

| Qué                | Dónde                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Archivo            | `packages/core/src/analysis/cycles.ts`                                                                              |
| Funciones          | `findCycles(grammar)` y `buildUnitGraph({ grammar, nullableSymbols })`                                              |
| Comando de consola | `npm run sabueso -- cycles --grammar test-cyclic` (con `--graph`, el grafo)                                         |
| Quién lo usa       | el conteo de árboles (paso 20) devuelve `'infinite'` en lugar de entrar en un bucle; el informe `analyze` (paso 12) |

## 4. Qué prueba lo verifica

| Prueba                                           | Qué verifica                                                                                                                   |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `packages/core/test/analysis/cycles.test.ts`     | `test-cyclic` da [S, A]; G0, G1, `arithmetic` no tienen ciclos; el ciclo escondido; `S → S S` es cíclica solo si S es anulable |
| `packages/core/test/command-line/cycles.test.ts` | el comando imprime `S ⇒+ A ⇒+ S`, el grafo con `--graph` y "No cycles" para G1                                                 |

## 5. Referencia bibliográfica

- SPEC 02, sección 3.9.
- Hopcroft, Motwani y Ullman, sección 7.1.4 (eliminación de producciones unitarias: los pares unitarios (A, B) con A ⇒\* B son las aristas de este grafo).
