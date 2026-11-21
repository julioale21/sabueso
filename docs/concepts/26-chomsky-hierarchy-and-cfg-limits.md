# 26 — Jerarquía de Chomsky y límites de las GLC

## 1. Definición formal

La **jerarquía de Chomsky** ordena las gramáticas por la forma de sus reglas, y cada tipo tiene su máquina:

| Tipo | Gramáticas               | Reglas                                        | Máquina que las reconoce     | En el proyecto                                   |
| ---- | ------------------------ | --------------------------------------------- | ---------------------------- | ------------------------------------------------ |
| 3    | regulares                | A → aB o A → a (lineales)                     | autómata finito              | los tokens del formato `.grammar` (el lexer AFD) |
| 2    | libres de contexto (GLC) | A → α, con un solo no terminal a la izquierda | autómata de pila             | G0, G1, `meta.grammar`, `parentheses`            |
| 1    | sensibles al contexto    | αAβ → αγβ                                     | autómata linealmente acotado | —                                                |
| 0    | sin restricciones        | α → β                                         | máquina de Turing            | —                                                |

Cada tipo genera estrictamente más lenguajes que el siguiente: regulares ⊊ libres de contexto ⊊ sensibles al contexto ⊊ recursivamente enumerables.

- **G0 y G1 son gramáticas de tipo 2:** tienen reglas como `Relato → Planteo Investigacion Desenlace`, que no son lineales. Ojo: los **lenguajes** que generan resultan regulares (en G0, `Pasos` genera cualquier cadena no vacía de pasos; en G1 toda la recursión es por la derecha). El proyecto usa GLC por los árboles y porque el motor tiene que servir para cualquier gramática, incluso no regulares como `parentheses` (( )ⁿ anidados).
- **Lema de bombeo para GLC** (Hopcroft 7.2): si L es libre de contexto, existe n tal que toda z ∈ L con |z| ≥ n se escribe z = uvwxy con |vwx| ≤ n, |vx| ≥ 1 y u vⁱ w xⁱ y ∈ L para todo i ≥ 0. Se usa para demostrar que un lenguaje **no** es libre de contexto. El ejemplo clásico es {aⁿbⁿcⁿ | n ≥ 1}: al bombear, vwx toca a lo sumo dos de las tres letras, y las cantidades dejan de ser iguales.
- **Clausura** (Hopcroft 7.3): la intersección de un lenguaje libre de contexto con uno **regular** es libre de contexto. La intersección de dos libres de contexto, en general, no lo es.

## 2. Ejemplo resuelto a mano: dos reglas del género que una GLC no puede expresar

**Regla 1: "hay tantas sospechas como descartes y como interrogatorios"** (#SOS = #DSC = #INT).

1. Sea L = { w ∈ L(G0) | w tiene igual cantidad de SOS, DSC e INT }. Supongamos que L es libre de contexto.
2. Sea R = `CRI SOS* DSC* INT* REV`, un lenguaje regular. Todas sus cadenas con al menos un paso están en L(G0), porque `Pasos` genera cualquier sucesión de pasos.
3. Entonces L ∩ R = { CRI SOSⁿ DSCⁿ INTⁿ REV | n ≥ 1 } sería libre de contexto (clausura con regulares).
4. Pero ese lenguaje es aⁿbⁿcⁿ con un prefijo y un sufijo fijos, y el lema de bombeo muestra que no es libre de contexto. Contradicción: **L no es libre de contexto**, y ninguna GLC puede expresar la regla.

**Regla 2: "el culpable tiene que haber aparecido antes en el relato".**

- **Con un elenco finito y fijo** de k personajes, la regla es **regular**: alcanza un AFD que recuerda qué personajes ya aparecieron (2^k estados) y acepta la acusación solo si el acusado está en ese conjunto.
- **Con nombres no acotados** (cualquier relato puede inventar personajes nuevos), la regla obliga a comparar un nombre con otro que apareció antes, arbitrariamente lejos. Se parece a {w#w}, que no es libre de contexto (lema de bombeo): una pila puede comparar w con su reverso, no con una copia.
- **En Sabueso:** las etiquetas no llevan nombres, así que el núcleo no puede ni intentarlo. El SPEC 04 (español controlado) sí conoce los nombres, y verifica esta regla **aparte de la gramática**, en código, como una advertencia.

**Conclusión:** la gramática captura la **estructura** del relato (planteo, investigación, desenlace, qué puede seguir a qué). Las reglas que exigen contar o recordar identidades quedan fuera de las GLC, y por eso fuera de G0 y G1.

## 3. Dónde está en el código

Ficha sin código propio: ubica en la jerarquía lo que el código ya hace.

| Qué                                    | Dónde                                                                                                                       |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Tipo 3: el AFD del lexer               | `packages/core/src/automata/deterministic-finite-automaton.ts`, `grammar-format/lexer.ts` (`lex g1 --states`)               |
| Tipo 2: las gramáticas y su máquina    | `packages/core/grammars/`, y el autómata de pila de `pushdown-automaton/` (`pushdown-automaton --grammar g1 "CRI PIS REV"`) |
| Un lenguaje tipo 2 no regular          | `parentheses`: `trees --grammar parentheses "( ( ) )"`                                                                      |
| La regla del culpable, fuera de la GLC | SPEC 04 (borrador): verificación aparte de la gramática                                                                     |

## 4. Qué prueba lo verifica

Las demostraciones de la sección 2 son a mano: un programa no puede demostrar que un lenguaje **no** es libre de contexto. Lo que sí verifican las pruebas:

| Prueba                                                             | Qué verifica                                                  |
| ------------------------------------------------------------------ | ------------------------------------------------------------- |
| `packages/core/test/automata/`, `test/grammar-format/`             | el AFD del lexer (tipo 3)                                     |
| `packages/core/test/pushdown-automaton/pushdown-automaton.test.ts` | el autómata de pila acepta lo mismo que la gramática (tipo 2) |

## 5. Referencia bibliográfica

- Hopcroft, Motwani y Ullman, _Introducción a la teoría de autómatas, lenguajes y computación_, secciones 7.2 (lema de bombeo para GLC) y 7.3 (propiedades de clausura; intersección con regulares en 7.3.4).
- Augusto, sección 2.2.
