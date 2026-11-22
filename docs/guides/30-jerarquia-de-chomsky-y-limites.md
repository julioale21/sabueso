# 30 — Jerarquía de Chomsky y límites de las GLC

> Guía de teoría: no tiene código propio. Ubica en la jerarquía lo que el código ya hace.

## 1. Teoría

La **jerarquía de Chomsky** ordena las gramáticas por la forma de sus reglas. Cada tipo tiene su máquina:

| Tipo | Gramáticas               | Reglas                                        | Máquina                      |
| ---- | ------------------------ | --------------------------------------------- | ---------------------------- |
| 3    | regulares                | A → aB o A → a                                | autómata finito              |
| 2    | libres de contexto (GLC) | A → α, con un solo no terminal a la izquierda | autómata de pila             |
| 1    | sensibles al contexto    | αAβ → αγβ                                     | autómata linealmente acotado |
| 0    | sin restricciones        | α → β                                         | máquina de Turing            |

Cada tipo genera estrictamente más lenguajes que el siguiente: regulares ⊊ libres de contexto ⊊ sensibles al contexto ⊊ recursivamente enumerables.

- **G0 y G1 son gramáticas de tipo 2:** tienen reglas como `Relato → Planteo Investigacion Desenlace`, que no son lineales. Ojo: los **lenguajes** que generan resultan regulares. El proyecto usa GLC por los árboles y porque el motor tiene que servir para cualquier gramática, incluso no regulares como `parentheses` (paréntesis anidados).
- **Lema de bombeo para GLC:** si L es libre de contexto, existe n tal que toda z ∈ L con |z| ≥ n se escribe z = uvwxy con |vwx| ≤ n, |vx| ≥ 1 y u vⁱ w xⁱ y ∈ L para todo i ≥ 0. Sirve para demostrar que un lenguaje **no** es libre de contexto. El ejemplo clásico es {aⁿbⁿcⁿ | n ≥ 1}.

**Ejemplo: una regla del género que una GLC no puede expresar.** "Hay tantas sospechas como descartes y como interrogatorios" (#SOS = #DSC = #INT). Si una GLC la expresara, generaría relatos como `CRI SOSⁿ DSCⁿ INTⁿ REV`: es aⁿbⁿcⁿ con un prefijo y un sufijo fijos, que no es libre de contexto. Una pila puede comparar dos cantidades, no tres.

**Conclusión:** la gramática captura la **estructura** del relato (planteo, investigación, desenlace, qué puede seguir a qué). Las reglas que exigen contar o recordar identidades quedan fuera de las GLC. Por ejemplo, "el culpable tiene que haber aparecido antes": el SPEC 04 la verifica aparte de la gramática, en código.

## 2. Cómo se ve en el proyecto

| Tipo                   | Dónde                                                                                       | Comando                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 3: el AFD del lexer    | `packages/core/src/automata/deterministic-finite-automaton.ts` ([guía 03](03-lexer-afd.md)) | `npm run sabueso -- lex g1 --states`                               |
| 2: las gramáticas      | `packages/core/grammars/` ([guía 05](05-gramaticas-del-proyecto.md))                        |                                                                    |
| 2: su autómata de pila | `packages/core/src/pushdown-automaton/` ([guía 26](26-automata-de-pila.md))                 | `npm run sabueso -- pushdown-automaton --grammar g1 "CRI PIS REV"` |
| 2, no regular          | la gramática `parentheses`                                                                  | `npm run sabueso -- trees --grammar parentheses "( ( ) )"`         |

Las demostraciones son a mano: un programa no puede demostrar que un lenguaje **no** es libre de contexto.

## 3. Referencias

- Hopcroft, Motwani y Ullman, _Introducción a la teoría de autómatas, lenguajes y computación_, secciones 7.2 (lema de bombeo para GLC) y 7.3 (propiedades de clausura; intersección con regulares en 7.3.4).
- Augusto, sección 2.2.
