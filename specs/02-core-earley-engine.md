# SPEC 02 — Núcleo de Sabueso: librería de gramáticas y motor de Earley

> **Estado:** Approved
> **Depende de:** SPEC 01
> **Fecha:** 2026-11-14
> **Objetivo:** Construir desde cero `@sabueso/core`, una librería TypeScript sin dependencias de runtime que lee gramáticas libres de contexto desde archivos de texto, decide con un motor de Earley propio si un relato policial (secuencia de etiquetas) pertenece al lenguaje, y expone cada concepto teórico de la materia como un módulo atómico, probado y explicable por consola.

---

## 1. Por qué existe este spec

Sabueso es el Laboratorio Integrador Final de Fundamentos Teóricos de Informática (UNPSJB, 2026), opción 3: "Sintaxis estructural de relatos". El anteproyecto v2 fija el dominio (el relato policial de enigma), el alfabeto (14 etiquetas), la gramática preliminar G0, la elección de Earley y la arquitectura núcleo + interfaz + ampliación.

Este spec cubre **solo el núcleo**: la librería y su CLI. Hay tres razones para separarlo de la interfaz:

1. **El anteproyecto lo exige.** Su metodología dice: "La interfaz se empieza cuando el núcleo pasa las pruebas por consola". Un spec por hito respeta ese orden.
2. **La defensa es oral y por conceptos.** Cada concepto vive en un archivo propio, con su ficha en `docs/concepts/` y su prueba. Así puede explicarse aislado: "acá está el Predictor, esta es su prueba y esta es la página del Hopcroft".
3. **El motor no debe depender de la UI.** El criterio de éxito "el mismo motor funciona con gramáticas de libro sin cambios en el código" solo se verifica si el motor es una librería pura.

### 1.1 Regla rectora: "solo si se usa en el fondo"

El autor pidió incluir LL(k), LR(k) o la Máquina de Turing **solo si el proyecto realmente los usa**. Cada concepto con código en este spec tiene un uso funcional, no decorativo:

| Concepto                                                        | ¿Tiene código?      | Uso real que lo justifica                                                                                                                                                                                                                                             |
| --------------------------------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Autómata finito determinista                                    | Sí                  | Es el analizador léxico que lee los archivos `.grammar`.                                                                                                                                                                                                              |
| LL(1): FIRST, FOLLOW, tabla, parser descendente                 | Sí                  | (a) El lector de `.grammar` es un parser descendente predictivo LL(1). (b) Certifica que G1 no es ambigua: toda gramática LL(1) es no ambigua. (c) Certifica que la meta-gramática de `.grammar` es LL(1).                                                            |
| Anulables, productivos, alcanzables, vacuidad, ciclos           | Sí                  | Earley necesita los anulables para el arreglo de ε. El validador de gramáticas necesita los inútiles y la vacuidad. El conteo de árboles necesita los ciclos.                                                                                                         |
| Earley (reconocedor, árboles, derivación)                       | Sí                  | Es el analizador central que pide el enunciado.                                                                                                                                                                                                                       |
| Forma Normal de Chomsky + CYK                                   | Sí                  | Es la comparación que fundamenta la elección de Earley en el anteproyecto. También es un segundo reconocedor que valida a Earley por pruebas diferenciales.                                                                                                           |
| GLC → Autómata de pila                                          | Sí                  | Demuestra en código el teorema GLC ≡ AP (Hopcroft 6.3.1). Además es un tercer reconocedor para las pruebas diferenciales.                                                                                                                                             |
| Búsqueda acotada de ambigüedad y de diferencias entre lenguajes | Sí                  | Responde lo que pide el anteproyecto: "qué lecturas da cada una" y "qué relatos acepta una y no la otra". Ilustra que esos problemas son indecidibles pero semidecidibles.                                                                                            |
| LR(k)                                                           | **No**              | Nada del proyecto lo usa. G0 es ambigua, y ninguna gramática ambigua es LR(k). G1 ya está certificada por LL(1). Implementarlo sería decorativo.                                                                                                                      |
| Máquina de Turing                                               | **No (solo ficha)** | Ningún algoritmo del proyecto necesita simular una MT. Aparece como modelo de referencia en la ficha de decidibilidad (por la tesis de Church-Turing, cada algoritmo del núcleo es una MT que siempre se detiene). También aparece en la ficha de límites de las GLC. |

---

## 2. Alcance

**Entra:**

- Monorepo `~/Desktop/sabueso` con npm workspaces y el paquete `packages/core` (`@sabueso/core`).
- Formato de archivo `.grammar` para gramáticas, con lexer AFD y parser LL(1) propios.
- Gramáticas definidas por nosotros y organizadas **por género**, con un catálogo (sección 4.6). El único género de este spec es el **policial**: `genres/detective/g1.grammar` (oficial, no ambigua y LL(1), propuesta en este spec) y `genres/detective/g0.grammar` (la del anteproyecto, ambigua, para el análisis de ambigüedad). Sumar otro género en el futuro es agregar una carpeta y una entrada al catálogo.
- Gramáticas internas que el usuario no ve como género: `meta.grammar` (la gramática del formato `.grammar`), las gramáticas de libro y las de análisis, en `grammars/test/`. Se usan en las pruebas y en la CLI de desarrollo.
- Análisis de gramáticas: anulables, longitud mínima derivable, productivos, alcanzables, inútiles, vacuidad, ciclos, FIRST, FOLLOW, tabla LL(1) y conflictos.
- Motor de Earley: reconocedor con Predictor, Scanner y Completer, arreglo de ε de Aycock-Horspool, diagnóstico de errores y traza de operaciones.
- Árboles: backpointers, conteo exacto con `bigint` (o `'infinite'`), enumeración acotada, árboles ε, derivación más a la izquierda y render ASCII.
- Conversión a Forma Normal de Chomsky paso a paso, y reconocedor CYK con extracción de un árbol.
- Construcción GLC → AP de un estado (aceptación por pila vacía) y simulador acotado con traza de descripciones instantáneas.
- Búsquedas acotadas: generación de oraciones hasta longitud k, testigo de ambigüedad y comparación de lenguajes.
- CLI `sabueso` que crece paso a paso: **cada módulo tiene su comando de consola y la prueba de ese comando** (sección 8.1). Ejemplos: `lex`, `grammar`, `nullable`, `first-follow`, `predictive-table`, `earley`, `trace`, `trees`, `count`, `derive`, `parse`, `chomsky-normal-form`, `cocke-younger-kasami`, `pushdown-automaton`, `ambiguity`, `compare`, `differential` y `bench`.
- Guion de consola `docs/console-demo.md`, verificado por una prueba que ejecuta cada comando.
- Batería de pruebas con Vitest: unitarias, valores esperados calculados a mano, diferenciales Earley/CYK/AP y rendimiento.
- Fichas de exposición `docs/concepts/NN-*.md`, una por concepto atómico.
- Todo el código en inglés, incluidos los comentarios, con prioridad en los algoritmos (regla del SPEC 01).
- README con instrucciones y un índice que relaciona cada concepto con su archivo y su ficha.

**Fuera de alcance (para specs futuros):**

- Interfaz web React (SPEC 03, ver la hoja de ruta en la sección 10).
- Entrada en español controlado con etiquetado automático (SPEC 04, sección 10).
- Parser LR(k) de cualquier tipo (justificado en 1.1).
- Simulador de Máquina de Turing (justificado en 1.1).
- SPPF (bosque compartido de análisis). Se usan backpointers (ver Decisiones).
- Optimización de Leo para recursión a derecha. No hace falta para 200 eventos.
- Líneas de sospecha anidadas y otros subgéneros (trabajo futuro del anteproyecto).
- Publicar el paquete en npm.

---

## 3. Fundamentos teóricos que se implementan

Esta sección es la referencia teórica del spec. Cada subsección corresponde a una ficha de `docs/concepts/` y a uno o más archivos de código.

### 3.1 Alfabeto, cadena y lenguaje

- Σ es el conjunto finito de terminales. En el dominio del relato, Σ = {CTX, PER, CRI, HAL, ENC, PIS, INT, SOS, DSC, ATQ, REV, CNF, CAP, EPI}, con |Σ| = 14.
- Un relato es una cadena w ∈ Σ*, con un símbolo por evento narrativo.
- L(G) ⊆ Σ* es el conjunto de relatos bien formados según la gramática G.
- Referencias: Augusto 1.2; Hopcroft 1.5.

### 3.2 Gramática libre de contexto

- G = (N, Σ, P, S): no terminales, terminales, producciones A → α con α ∈ (N ∪ Σ)*, y símbolo inicial.
- **Convención de `.grammar`:** un identificador es no terminal si aparece como lado izquierdo de alguna regla. En otro caso es terminal. Los literales entre comillas simples (`'+'`) son siempre terminales. Su nombre de símbolo es el contenido **sin comillas**: `'+'` es el terminal `+`, y así coincide con la entrada separada por espacios (`id + id`). Dos casos son errores de construcción: un literal cuyo contenido coincide con el nombre de un no terminal, y un literal que contiene `$`. El `$` queda reservado para el fin de entrada de FOLLOW y para `$S`.
- Referencias: Augusto 2.4; Hopcroft 5.1.

### 3.3 Autómata finito determinista (lexer de `.grammar`)

- M = (Q, Σc, δ, q0, F), donde Σc son **clases de caracteres** (letra, dígito, espacio, salto de línea, `-`, `>`, `→`, `|`, `ε`, `'`, `#`, `%` y otro).
- δ se implementa como **tabla explícita**: un objeto `Record<Estado, Partial<Record<ClaseChar, Estado>>>`, no como `if` anidados. Así la tabla puede mostrarse en la exposición igual que en el pizarrón.
- **Separación motor y tabla:** `automata/deterministic-finite-automaton.ts` es un **ejecutor genérico de AFD**. Recibe una definición `DeterministicAutomatonDefinition` (estado inicial `initialState`, función de clasificación `classifyCharacter`, tabla δ `transitions`, y estados de aceptación `acceptingStates` con el tipo de token que emiten, o `null` para los que se descartan, como espacios y comentarios). Los estados del lexer de `.grammar` se llaman con su número del grafo seguido de su significado (`q0Start`, `q1ReadingIdentifier`, `q2ExpectingArrowHead`…) y aplica _maximal munch_. `grammar-format/lexer.ts` solo declara la tabla del formato `.grammar`. Se separa porque el SPEC 04 reutiliza el mismo ejecutor con otras dos tablas (texto en español y archivos de léxico y reglas), así que el concepto "un AFD es una tabla más un ejecutor" se ve en código.
- Regla de _maximal munch_: el token se emite cuando no hay transición posible desde un estado de aceptación.
- Referencias: Augusto 1.3; Hopcroft 2.2.

### 3.4 Gramática LL(1) y parser descendente recursivo (lector de `.grammar`)

- Cada no terminal de `meta.grammar` es una función. Cada función elige su alternativa mirando **un solo token** (el _lookahead_).
- La elección es determinista porque `meta.grammar` es LL(1). El propio módulo de la sección 3.6 lo demuestra en una prueba: el lector se certifica con el análisis que implementa el núcleo.
- Referencia: Aho, Lam, Sethi y Ullman, _Compiladores_ (2.ª ed.), 4.4.

### 3.5 FIRST y FOLLOW

- FIRST(α) es el conjunto de terminales con que puede empezar una cadena derivada de α (más ε si α ⇒* ε).
- FOLLOW(A) es el conjunto de terminales que pueden aparecer inmediatamente después de A en alguna forma sentencial. Incluye `$` si A puede quedar al final.
- Ambos se calculan por **punto fijo**: se itera hasta que ningún conjunto cambie.
- Referencia: Aho et al. 4.4.2.

### 3.6 Tabla LL(1), conflictos y no ambigüedad

- Para cada producción A → α:
  - por cada a ∈ FIRST(α), M[A, a] ∋ A → α;
  - si ε ∈ FIRST(α), por cada b ∈ FOLLOW(A), M[A, b] ∋ A → α.
- Hay un **conflicto** cuando una celda recibe más de una producción. G es LL(1) si y solo si no hay conflictos.
- **Teorema usado en la defensa:** toda gramática LL(1) es no ambigua. Para cada prefijo y cada lookahead hay una sola producción aplicable, así que la derivación más a la izquierda es única.
- Referencia: Aho et al. 4.4.3.

### 3.7 Símbolos anulables

- A es anulable si A ⇒* ε. Se calcula por punto fijo: A es anulable si existe A → X1…Xk con todos los Xi anulables (k = 0 incluido).
- Lo usan Earley (sección 3.15), FIRST/FOLLOW y la Forma Normal de Chomsky.
- Referencias: Hopcroft 7.1.3; Augusto 2.3.

### 3.8 Productivos, alcanzables, inútiles y vacuidad

- **Productivo** (generador): A ⇒* w para algún w ∈ Σ*.
- **Alcanzable:** S ⇒* αAβ.
- **Inútil:** no es productivo o no es alcanzable. Para eliminarlos, primero se quitan los no productivos y después los no alcanzables. El orden importa (Hopcroft 7.1.1).
- **Vacuidad:** L(G) = ∅ si y solo si S no es productivo. Es un problema **decidible**.
- Referencias: Hopcroft 7.1.1, 7.1.2 y 7.4.3.

### 3.9 Ciclos

- G es cíclica si existe A tal que A ⇒+ A. Pasa por producciones unitarias, posiblemente rodeadas de símbolos anulables.
- Una gramática cíclica tiene **infinitos árboles** para alguna cadena. El conteo devuelve `'infinite'` en lugar de entrar en un bucle.
- Se detecta con un grafo A → B por cada producción A → αBβ con α y β anulables, buscando un ciclo con DFS.

### 3.10 Longitud mínima derivable

- minYield(a) = 1 para todo terminal a.
- minYield(A) = mín sobre las producciones A → X1…Xk de la suma de minYield(Xi). Se calcula por punto fijo.
- La usan la poda del autómata de pila (sección 3.24) y la generación acotada de oraciones (sección 3.25).

### 3.11 Ítem de Earley

- Un ítem es una regla punteada con origen: `(A → α • β, j)`.
- Lectura: "estoy reconociendo A, ya reconocí α desde la posición j y me falta β".
- Su identidad en un conjunto es la clave `productionId:dot:origin`.

### 3.12 Conjuntos de Earley (chart)

- S0 … Sn, un conjunto por cada posición entre tokens.
- Cada conjunto es una **lista de solo agregado** con índice por clave. Recorrerla con un índice que crece mientras crece la lista es la "cola de trabajo" del algoritmo, sin estructuras extra.
- Se inicia con S0 = { ($S → • S, 0) }, donde `$S` es un símbolo inicial aumentado que ninguna gramática puede contener: `$` no es carácter de identificador y está prohibido en los literales (sección 3.2).

### 3.13 Predictor

- Si el ítem es (A → α • B β, j) con B no terminal, se agrega a Sk el ítem (B → • γ, k) por cada producción B → γ.
- Es la parte **descendente** (_top-down_) de Earley.

### 3.14 Scanner

- Si el ítem es (A → α • a β, j) con a terminal y el token a(k+1) es igual a a, se agrega a S(k+1) el ítem (A → α a • β, j).
- Es el único paso que consume entrada.

### 3.15 Completer

- Si el ítem es (B → γ •, i), por cada ítem (A → α • B β, j) de Si se agrega a Sk el ítem (A → α B • β, j).
- Es la parte **ascendente** (_bottom-up_) de Earley.
- Relación con el autómata de pila: Earley simula en paralelo todas las pilas posibles del AP no determinista y las comparte a través de los orígenes. Esto se explica en la ficha 24.

### 3.16 Arreglo de ε (Aycock y Horspool, 2002)

- **Problema del Earley clásico:** si B → • ε se completa en Sk antes de que se agregue otro ítem que espera B en el mismo Sk, ese ítem nunca avanza. El caso de prueba es `S → A A 'x'`, `A → ε`, con la entrada `x`.
- **Arreglo:** en el Predictor, si B es anulable, además de predecir B se agrega (A → α B • β, j) con un enlace de tipo `nullable`.
- **Regla complementaria de este proyecto:** el Completer **ignora** los ítems completos con origen igual a k (lapso vacío), porque el Predictor ya hizo todos los avances sobre ε. Esto evita enlaces duplicados, y con ellos el doble conteo de árboles.
- Referencia: Aycock y Horspool, "Practical Earley Parsing", _The Computer Journal_ 45(6), 2002.

### 3.17 Aceptación y diagnóstico de errores

- **Aceptación:** la entrada se acepta si y solo si ($S → S •, 0) ∈ Sn.
- **Convención de posición:** índice de token **basado en 0**. La UI podrá mostrar "evento p+1".
- **Error por token inesperado:** si S(k+1) queda vacío después de procesar Sk, el error está en la posición k. `found` es el token k. `expected` son los terminales que aparecen inmediatamente después del punto en los ítems de Sk.
- **Error por fin de entrada:** si se procesó Sn y no hay aceptación, la posición es n, `found` es `null` (fin de entrada) y `expected` son los terminales después del punto en Sn. Si ese conjunto queda vacío, el mensaje es "entrada incompleta".
- **Símbolo desconocido:** antes de ejecutar Earley se valida que cada token pertenezca a Σ. Si no pertenece, se informa el error `unknown-symbol` en esa posición.
- `expected` se devuelve ordenado alfabéticamente, para que las pruebas sean deterministas.

### 3.18 Backpointers y árbol de derivación

- Cada avance de punto guarda un **enlace** (_link_) con dos partes:
  - el **predecesor**: el mismo ítem con el punto una posición antes;
  - la **causa**: un token (scan), un ítem completo (complete) o un símbolo anulable (nullable).
- Un ítem puede tener **varios enlaces**. Esa es exactamente la representación de la ambigüedad.
- **No hace falta deduplicar enlaces**, y eso se justifica así. Cada ítem se procesa una sola vez. Cada Scanner, Predictor (avance anulable) y Completer genera a lo sumo un enlace por par (predecesor, causa). El Completer ignora los lapsos vacíos (sección 3.16). Por lo tanto ningún par se genera dos veces. Agregar un enlace cuesta O(1). Una búsqueda lineal de duplicados (`links.some`) daría O(n⁴) en G0 y rompería el presupuesto de 9.5. En modo de prueba, una aserción verifica que no haya enlaces repetidos.
- El árbol se reconstruye recorriendo enlaces desde ($S → S •, 0) ∈ Sn.
- Referencias: Hopcroft 5.2; Augusto 2.4.2.

### 3.19 Árboles ε

- Un enlace `nullable` no apunta a un ítem: el símbolo anulable B se derivó a ε sin consumir entrada.
- Sus subárboles se generan **desde la gramática**: B → X1…Xk con todos los Xi anulables, en forma recursiva, con hoja `ε` cuando k = 0.
- La cantidad de árboles ε de B también se cuenta, y da `'infinite'` si hay ciclos.

### 3.20 Conteo de árboles (programación dinámica)

- cuenta(ítem con punto 0) = 1.
- cuenta(ítem) = Σ sobre sus enlaces de cuenta(predecesor) × cuenta(causa), donde:
  - cuenta(token) = 1;
  - cuenta(ítem completo) es recursiva;
  - cuenta(anulable B) = cantidad de árboles ε de B.
- Se memoiza por identidad de ítem y se usa `bigint`, porque con `Pasos → Pasos Pasos` la cantidad crece según los **números de Catalan**: n pasos sin SOS dan C(n−1) árboles.
- Si el DFS encuentra un ítem "en curso", hay un ciclo y el resultado es `'infinite'`.

### 3.21 Enumeración acotada

- Un generador `function*` recorre los enlaces en orden de inserción, lo que hace el orden determinista.
- Produce árboles hasta un límite (por defecto 50).
- Referencia: el riesgo "cantidad excesiva de árboles" del anteproyecto.

### 3.22 Derivación más a la izquierda

- Se obtiene del árbol recorriéndolo en preorden: en cada paso se reemplaza el no terminal de más a la izquierda por los hijos de su nodo.
- Cada paso guarda la forma sentencial y la producción aplicada.
- Referencia: Hopcroft 5.2.5 (de los árboles a las derivaciones).

### 3.23 Forma Normal de Chomsky y CYK

- **FNC:** toda producción es A → BC o A → a. Además se permite S0 → ε si ε ∈ L(G), con S0 fuera de todo lado derecho.
- La conversión tiene seis pasos, uno por función:
  1. **START:** nuevo S0 → S.
  2. **DEL:** elimina las producciones ε.
  3. **UNIT:** elimina las producciones unitarias usando pares unitarios.
  4. **USELESS:** elimina los símbolos inútiles.
  5. **TERM:** reemplaza un terminal a por T_a en los cuerpos de largo 2 o más.
  6. **BIN:** binariza los cuerpos largos con nuevos X1, X2, …
- **CYK:** tabla T[i][l] (inicio i, largo l) de conjuntos de no terminales, que se llena por programación dinámica en O(n³·|G|). Acepta si S0 ∈ T[0][n].
- **Fundamento de la comparación:** los árboles de FNC no tienen la forma de la gramática diseñada, porque aparecen T_a y X1 y desaparecen las producciones unitarias. Ese es el argumento del anteproyecto para elegir Earley, y ahora puede **mostrarse** con un ejemplo concreto.
- Referencias: Hopcroft 7.1 (7.1.1–7.1.5) y 7.4.4; Augusto 2.4.3.

### 3.24 GLC → Autómata de pila

- **Construcción** (Hopcroft 6.3.1): P = ({q}, Σ, N ∪ Σ, δ, q, S), con aceptación por pila vacía.
  - δ(q, ε, A) = { (q, β) | A → β ∈ P } (expandir);
  - δ(q, a, a) = { (q, ε) } (emparejar).
- **Simulación** no determinista por BFS sobre descripciones instantáneas (q, posición, pila):
  - conjunto de visitados para no repetir configuraciones;
  - poda: se descarta la configuración si minYield(pila) es mayor que la entrada restante. La poda es correcta porque ningún contenido de pila puede derivar menos de minYield terminales;
  - límite de pasos (`maxSteps`, por defecto 200 000). Si se agota, el resultado es `'undetermined'`.
- **Teorema mostrado en código:** en una gramática no ambigua, la secuencia de expansiones del camino de aceptación es **exactamente** la derivación más a la izquierda. Hay una prueba que lo verifica con G1.
- Referencias: Hopcroft 6.1–6.3; Augusto 2.5 y 2.6.

### 3.25 Búsquedas acotadas: semidecisión de problemas indecidibles

- `generateSentences(G, k)`: BFS sobre formas sentenciales más a la izquierda, con poda por minYield > k y conjunto de visitados. Devuelve las oraciones de L(G) de longitud ≤ k, sin repetir.
- `findAmbiguityWitness(G, k)`: la primera oración de longitud ≤ k con más de un árbol, en orden de longitud y después lexicográfico.
- `compareLanguages(G, H, k)`: las oraciones de longitud ≤ k que están solo en L(G) y las que están solo en L(H).
- **Fundamento:** la ambigüedad de una GLC es indecidible (Hopcroft 9.5.2) y la equivalencia de GLC también. Pero si G es ambigua, aumentando k el testigo **siempre aparece**: es una semidecisión. La búsqueda acotada responde "sí" con certeza. "No hasta k" no demuestra nada.
- La no ambigüedad de G1 se demuestra por otro camino: la tabla LL(1) (sección 3.6).

### 3.26 Jerarquía de Chomsky y límites de las GLC (solo ficha, sin código)

- Clasificación de G0 y G1 (tipo 2) y por qué no son tipo 3.
- **Regla "el culpable debe haber aparecido antes":**
  - con un conjunto **finito y fijo** de personajes, la regla es **regular** (alcanza un AFD que recuerda qué personajes ya aparecieron, con 2^k estados);
  - con identidades **no acotadas**, se parece a {w#w} y **no es libre de contexto**.
- **Regla "#SOS = #DSC = #INT":** no es GLC. Se demuestra intersecando con el regular SOS*DSC*INT*: daría aⁿbⁿcⁿ, y las GLC son cerradas bajo intersección con regulares. Se cierra con el lema de bombeo.
- Referencias: Augusto 2.2; Hopcroft 7.2 y 7.3.

### 3.27 Decidibilidad y Máquina de Turing (solo ficha, sin código)

- Problemas **decidibles** y dónde está implementado cada uno:
  - pertenencia: Earley, que siempre se detiene;
  - vacuidad: `isEmpty`;
  - "G es LL(1)": `predictiveTable`.
- Problemas **indecidibles**: ambigüedad y equivalencia. En el proyecto aparecen solo como búsquedas acotadas.
- Por la tesis de Church-Turing, cada algoritmo del núcleo es una MT que siempre se detiene (un decisor).
- Qué verifica el programa y qué se demuestra a mano. El caso a mano es L(G1) ⊂ L(G0) (sección 4.4).
- Referencias: Augusto 3 (3.4 y 3.8); Hopcroft 8.2, 7.4.5 y 9.5.2.

---

## 4. Gramáticas

### 4.1 Formato `.grammar`

Cada regla ocupa una línea. Las líneas en blanco y los comentarios `#` se ignoran. La flecha puede ser `->` o `→`. ε se escribe `ε` o con una alternativa vacía. Las directivas son opcionales:

- `%start X` define el símbolo inicial. Por defecto es el lado izquierdo de la primera regla.
- `%terminals A B …` declara Σ. Si está presente, todo identificador que no sea lado izquierdo de una regla y no esté declarado es un **error**. Esto evita que un no terminal mal escrito se convierta silenciosamente en terminal.

```text
# example
%start E
E -> E '+' T | T
T -> 'id' | '(' E ')'
```

### 4.2 `meta.grammar`: la gramática del formato `.grammar`, escrita en `.grammar`

Sus terminales son los tipos de token que emite el lexer AFD. El lexer garantiza un `NEWLINE` antes de `END_OF_FILE`.

```text
%start File
%terminals IDENTIFIER LITERAL ARROW BAR EPSILON NEWLINE START TERMINALS END_OF_FILE
File         -> Element File | END_OF_FILE
Element        -> NEWLINE | Directive | Rule
Directive       -> START IDENTIFIER NEWLINE | TERMINALS Symbols NEWLINE
Rule           -> IDENTIFIER ARROW Alternatives NEWLINE
Alternatives    -> Sequence MoreAlternatives
MoreAlternatives -> BAR Sequence MoreAlternatives | ε
Sequence       -> EPSILON | Symbols
Symbols        -> Symbol Symbols | ε
Symbol         -> IDENTIFIER | LITERAL
```

Verificación LL(1) a mano. La prueba la repite en código.

- FOLLOW(MoreAlternatives) = FOLLOW(Alternatives) = {NEWLINE}, disjunto de {BAR}.
- FOLLOW(Symbols) = {BAR, NEWLINE}, disjunto de {IDENTIFIER, LITERAL}.
- Para Sequence: {EPSILON} es disjunto de FIRST(Symbols) ∪ FOLLOW(Sequence) = {IDENTIFIER, LITERAL, BAR, NEWLINE}.
- Resultado: 0 conflictos.

### 4.3 `genres/detective/g0.grammar`: la gramática del anteproyecto, sin cambios

```text
%start Relato
%terminals CTX PER CRI HAL ENC PIS INT SOS DSC ATQ REV CNF CAP EPI
Relato        -> Planteo Investigacion Desenlace
Planteo       -> Hecho | Marco Hecho | Hecho Marco
Marco         -> CTX | PER | CTX PER | PER CTX
Hecho         -> CRI | HAL | CRI HAL
Investigacion -> Pasos | ENC Pasos
Pasos         -> Paso | Pasos Pasos
Paso          -> PIS | INT | DSC | ATQ | Linea
Linea         -> SOS | SOS Pasos
Desenlace     -> Resolucion | Resolucion EPI
Resolucion    -> REV | REV CNF | REV CAP | REV CNF CAP
```

G0 tiene dos fuentes de ambigüedad: `Pasos → Pasos Pasos` (asociatividad) y `Linea → SOS Pasos` (hasta dónde llega la sospecha).

**Árboles y lecturas.** Para `CRI SOS PIS INT REV`, G0 da **4 árboles** pero solo **3 lecturas narrativas**: la sospecha abarca nada, PIS, o PIS INT. Dos de los cuatro árboles difieren solo en cómo `Pasos → Pasos Pasos` agrupa los pasos cuando la sospecha no abarca nada. El anteproyecto habla de "tres lecturas". El motor cuenta árboles. La ficha 21 explica la diferencia.

### 4.4 `genres/detective/g1.grammar`: la oficial, no ambigua y LL(1) (propuesta)

**Criterio de diseño.** Una línea de sospecha empieza en SOS y abarca los pasos siguientes hasta la próxima SOS o hasta el desenlace. DSC solo puede aparecer **dentro** de una línea abierta, y la cierra. Los pasos posteriores a un DSC quedan bajo el nodo `Descarte` de esa línea. Esta convención elimina la ambigüedad del mismo modo que la regla "el `else` corresponde al último `then`" (Augusto 2.4.2). Además, la gramática está factorizada a izquierda para ser LL(1).

```text
%start Relato
%terminals CTX PER CRI HAL ENC PIS INT SOS DSC ATQ REV CNF CAP EPI
Relato        -> Planteo Investigacion Desenlace
Planteo       -> Hecho MarcoOpc | Marco Hecho
MarcoOpc      -> Marco | ε
Marco         -> CTX PerOpc | PER CtxOpc
PerOpc        -> PER | ε
CtxOpc        -> CTX | ε
Hecho         -> CRI HallazgoOpc | HAL
HallazgoOpc   -> HAL | ε
Investigacion -> Pasos | ENC Pasos
Pasos         -> Evidencia Libres Lineas | Linea Lineas
Libres        -> Evidencia Libres | ε
Lineas        -> Linea Lineas | ε
Linea         -> SOS CuerpoLinea
CuerpoLinea   -> Evidencia CuerpoLinea | Descarte | ε
Descarte      -> DSC Libres
Evidencia     -> PIS | INT | ATQ
Desenlace     -> Resolucion EpiOpc
EpiOpc        -> EPI | ε
Resolucion    -> REV Cierre
Cierre        -> CNF CapOpc | CAP | ε
CapOpc        -> CAP | ε
```

Verificación LL(1) a mano, solo de las celdas críticas. La prueba la repite en código.

- FOLLOW(Pasos) = FOLLOW(Lineas) = FIRST(Desenlace) = {REV}.
- FOLLOW(Linea) = FOLLOW(CuerpoLinea) = FOLLOW(Descarte) = {SOS, REV}.
- FOLLOW(Libres) = {SOS, REV}, disjunto de FIRST(Evidencia) = {PIS, INT, ATQ}.
- Las alternativas de CuerpoLinea son {PIS, INT, ATQ} | {DSC} | ε con FOLLOW {SOS, REV}: disjuntas.
- FOLLOW(MarcoOpc) = FIRST(Investigacion) = {ENC, PIS, INT, ATQ, SOS}, disjunto de {CTX, PER}.
- FOLLOW(HallazgoOpc) = {CTX, PER, ENC, PIS, INT, ATQ, SOS}, que no contiene HAL.
- FOLLOW(Cierre) = FOLLOW(CapOpc) = {EPI, $}.
- Resultado: 0 conflictos, por lo tanto G1 es no ambigua (sección 3.6).

**Relación entre lenguajes:** L(G1) ⊊ L(G0).

- L(G1) ⊆ L(G0): en G0, `Pasos` genera **toda** cadena no vacía sobre {PIS, INT, DSC, ATQ, SOS}. Los `Pasos` de G1 son cadenas no vacías sobre ese mismo alfabeto. Planteo y Desenlace generan los mismos lenguajes en ambas. La demostración a mano está en la ficha 21.
- La inclusión es estricta: G1 rechaza un DSC sin línea abierta (por ejemplo `CRI DSC REV`) y dos DSC en la misma línea (por ejemplo `CRI SOS DSC DSC REV`).
- **Fundamento de género:** no puede descartarse una sospecha que nunca se planteó. El cambio de lenguaje es deliberado, y `compareLanguages` lo exhibe.

### 4.5 Gramáticas de libro y de análisis (internas)

Viven en `packages/core/grammars/test/`. **No identifican ningún género** y no aparecen en la UI. Su único propósito es probar que el motor no depende del relato policial (criterio del anteproyecto: "el mismo motor funciona con gramáticas de libro") y permitir demostraciones por consola, como el bug de ε. Las de libro son:

- `arithmetic-ambiguous.grammar`: `E -> E '+' E | E '*' E | '(' E ')' | 'id'`.
- `arithmetic.grammar`: `E -> E '+' T | T`, `T -> T '*' F | F`, `F -> '(' E ')' | 'id'`. Es no ambigua y recursiva a izquierda, así que no es LL(1). Earley la acepta igual.
- `parentheses.grammar`: `S -> '(' S ')' S | ε`. Tiene ε y su lenguaje contiene la cadena vacía.
- `epsilon-trap.grammar`: `S -> A A 'x'` y `A -> ε`. Es el caso que rompe al Earley clásico.

Las de análisis prueban el análisis de gramáticas. En la CLI se nombran `test-useless`, `test-empty` y `test-cyclic`:

- `useless.grammar`: `S -> A 'a' | 'b'`, `A -> A 'a'`, `C -> 'c'`. A no es productivo y C no es alcanzable.
- `empty.grammar`: `S -> S 'a'`. L(G) = ∅.
- `cyclic.grammar`: `S -> A | 'a'`, `A -> S`.

### 4.6 Catálogo de géneros

`src/genres/catalog.ts` es un archivo **solo de datos**, que el motor no importa. Lista los géneros que el programa sabe identificar:

```ts
// src/genres/types.ts
interface TagInfo {
  tag: string;
  narrativeFunction: string;
  example: string;
} // narrative function and example (table from the project proposal)
interface Genre {
  id: string; // 'detective'
  name: string; // 'Policial de enigma'
  description: string;
  officialGrammar: string; // 'detective/g1': decides whether a story belongs to the genre
  alternativeGrammar?: string; // 'detective/g0': ambiguous version, for the ambiguity analysis
  tags: TagInfo[]; // the 14 tags: UI palette and help
}
```

- El catálogo de este spec tiene un solo género: `detective` (policial de enigma). Sus etiquetas viven en `src/genres/detective-tags.ts`.
- Los **identificadores de gramática** tienen la forma `<genre>/<version>` (`detective/g1`). `g1` y `g0` son alias de `detective/g1` y `detective/g0`, para acortar los comandos.
- **Sumar un género futuro** (por ejemplo, el policial negro del trabajo futuro del anteproyecto) consiste en crear `grammars/genres/<id>/` con su `.grammar`, agregar sus etiquetas y una entrada al catálogo. El motor, la CLI y la UI no cambian, porque leen el catálogo.
- Las etiquetas son datos de dominio. Antes estaban previstas en la web (SPEC 03). Se mueven al catálogo del núcleo para que la CLI y la UI usen la misma fuente, y para que cada género traiga las suyas.

---

## 5. Modelo de datos

Los identificadores y los comentarios del código van en inglés. Los tipos viven en los archivos indicados.

```ts
// src/grammar/types.ts
type SymbolName = string; // 'Pasos', 'CTX', '+'
interface Production {
  id: number;
  leftSide: SymbolName;
  rightSide: SymbolName[];
} // rightSide [] = ε
interface Grammar {
  name: string;
  start: SymbolName; // declared start symbol
  nonterminals: ReadonlySet<SymbolName>;
  terminals: ReadonlySet<SymbolName>; // Σ
  productions: readonly Production[];
  productionsByLeftSide: ReadonlyMap<SymbolName, readonly Production[]>;
}
const AUGMENTED_START = '$S'; // never produced by the lexer

// src/automata/deterministic-finite-automaton.ts
interface DeterministicAutomatonDefinition<
  State extends string,
  CharacterClass extends string,
  TokenKind extends string,
> {
  initialState: State; // q0
  classifyCharacter: (character: string) => CharacterClass;
  transitions: Record<State, Partial<Record<CharacterClass, State>>>; // δ
  acceptingStates: Partial<Record<State, TokenKind | null>>; // F; null = recognized but discarded (whitespace, comments)
}
interface AutomatonToken<TokenKind> {
  kind: TokenKind;
  text: string;
  line: number;
  column: number;
}

// src/grammar-format/lexer.ts
type TokenKind =
  | 'IDENTIFIER'
  | 'LITERAL'
  | 'ARROW'
  | 'BAR'
  | 'EPSILON'
  | 'NEWLINE'
  | 'START'
  | 'TERMINALS'
  | 'END_OF_FILE';
interface Token {
  kind: TokenKind;
  text: string;
  line: number;
  column: number;
}
class GrammarSyntaxError extends Error {
  line: number;
  column: number;
}

// src/analysis/*.ts
interface GrammarAnalysis {
  nullable: Set<SymbolName>;
  minYield: Map<SymbolName, number>;
  productive: Set<SymbolName>;
  reachable: Set<SymbolName>;
  useless: Set<SymbolName>;
  isEmpty: boolean; // L(G) = ∅
  cycles: SymbolName[][]; // every cycle A ⇒+ A found
  first: Map<SymbolName, Set<SymbolName | 'ε'>>;
  follow: Map<SymbolName, Set<SymbolName | '$'>>;
  predictiveTable: {
    table: Map<SymbolName, Map<SymbolName, Production[]>>;
    conflicts: PredictiveTableConflict[];
    isPredictive: boolean;
  };
}
interface PredictiveTableConflict {
  nonterminal: SymbolName;
  lookahead: SymbolName;
  productions: Production[];
}

// src/earley/item.ts
interface EarleyItem {
  production: Production;
  dot: number;
  origin: number;
  setIndex: number;
  key: string;
  links: Link[];
}
type Link =
  | { kind: 'scan'; predecessor: EarleyItem; tokenIndex: number }
  | { kind: 'complete'; predecessor: EarleyItem; child: EarleyItem }
  | { kind: 'nullable'; predecessor: EarleyItem; symbol: SymbolName };

// src/earley/chart.ts
interface EarleySet {
  index: number;
  items: EarleyItem[];
  byKey: Map<string, EarleyItem>;
}
type Chart = EarleySet[];

// src/earley/trace.ts
interface TraceEvent {
  set: number;
  op: 'predict' | 'scan' | 'complete' | 'nullable';
  item: string;
  cause?: string;
}

// src/earley/diagnostics.ts
interface ParseError {
  kind: 'unexpected-token' | 'unexpected-end' | 'unknown-symbol';
  position: number; // token index, 0-based
  found: SymbolName | null; // null = end of input
  expected: SymbolName[]; // sorted alphabetically
}

// src/trees/tree.ts
type ParseTree =
  | { kind: 'terminal'; symbol: SymbolName; tokenIndex: number }
  | { kind: 'epsilon' }
  | { kind: 'nonterminal'; symbol: SymbolName; production: Production; children: ParseTree[] };
type TreeCount = bigint | 'infinite';
interface DerivationStep {
  form: SymbolName[];
  production: Production | null;
} // the first step has null

// src/index.ts — public result of parse()
interface ParseOptions {
  maxTrees?: number /* 50 */;
  trace?: boolean /* false */;
  countTrees?: boolean /* true */;
  classicEpsilon?: boolean; /* false; teaching only: reproduces the ε bug */
}
type ParseResult =
  | {
      accepted: true;
      tokens: SymbolName[];
      trees: ParseTree[];
      treeCount: TreeCount;
      derivation: DerivationStep[];
      chart: Chart;
      trace: TraceEvent[];
    }
  | { accepted: false; tokens: SymbolName[]; error: ParseError; chart: Chart; trace: TraceEvent[] };

// src/chomsky-normal-form/*.ts
interface ChomskyNormalFormResult {
  grammar: Grammar;
  acceptsEmpty: boolean;
  steps: { name: 'START' | 'DEL' | 'UNIT' | 'USELESS' | 'TERM' | 'BIN'; grammar: Grammar }[];
}

// src/cocke-younger-kasami/recognizer.ts
interface CockeYoungerKasamiResult {
  accepted: boolean;
  table: Set<SymbolName>[][];
  tree: ParseTree | null;
}

// src/pushdown-automaton/*.ts
interface PushdownAutomaton {
  state: 'q';
  inputAlphabet: Set<SymbolName>;
  stackAlphabet: Set<SymbolName>;
  startStack: SymbolName;
  transitions: PushdownTransition[];
}
type PushdownTransition =
  | { kind: 'expand'; top: SymbolName; push: SymbolName[]; production: Production }
  | { kind: 'match'; terminal: SymbolName };
interface InstantaneousDescription {
  position: number;
  stack: SymbolName[];
} // top = index 0
interface PushdownRun {
  result: 'accept' | 'reject' | 'undetermined';
  steps: number;
  acceptingPath: { id: InstantaneousDescription; via: PushdownTransition | null }[] | null;
}

// src/bounded/*.ts
interface AmbiguityWitness {
  sentence: SymbolName[];
  treeCount: TreeCount;
}
interface LanguageComparison {
  onlyInFirst: SymbolName[][];
  onlyInSecond: SymbolName[][];
  maxLength: number;
}
```

**Convenciones:**

- Las posiciones de token son base 0. La posición k es el hueco anterior al token k, y la posición n es el final.
- Las entradas de secuencia se separan solo por espacios en blanco y distinguen mayúsculas.
- Todo conjunto que se devuelve en una API pública con orden observable (`expected`, conflictos, oraciones) se ordena, para que las pruebas sean deterministas.
- El núcleo no importa nada de `node:*`. Solo `src/command-line.ts` usa `node:fs` y `node:process`. Así el mismo paquete corre en el navegador en el SPEC 03.

---

## 6. Estructura de archivos

Los archivos de la raíz, los esqueletos de los paquetes y la infraestructura de la CLI los crea el SPEC 01. Este spec agrega lo que vive dentro de `packages/core` y `docs/`.

```text
~/Desktop/sabueso/
  package.json                 # workspaces: ["packages/*", "apps/*"]; scripts build/test/lint
  .nvmrc                       # 24
  tsconfig.base.json           # strict, ES2022; core usa `module`/`moduleResolution: NodeNext` (imports relativos con sufijo `.js`; `bundler` queda para `apps/web` en el SPEC 03)
  eslint.config.js
  .prettierrc
  .gitignore
  README.md
  specs/
    02-core-earley-engine.md
    .spec-config.yml
  docs/concepts/              # una ficha por concepto (tabla 7.1)
  docs/console-demo.md         # guion de exposición por consola (paso 29)
  packages/core/
    package.json               # @sabueso/core, "type": "module", bin: { sabueso: dist/command-line.js }
    tsconfig.json
    vitest.config.ts           # testTimeout 60000 para differential, performance y bounded
    grammars/
      meta.grammar                 # gramática del formato .grammar (interna)
      genres/detective/        # g0.grammar y g1.grammar: las gramáticas del género
      test/                    # arithmetic-ambiguous, arithmetic, parentheses, epsilon-trap, useless, empty, cyclic (.grammar)
    src/
      index.ts                 # API pública
      command-line.ts                   # único archivo con node:*; arma environment y llama a runCommandLine
      cli/run.ts
      cli/format.ts
      command-line/built-in-grammars.ts   # registro de gramáticas incorporadas (nombres, alias, grupos)
      command-line/grammar-source.ts      # elige la gramática: un nombre (--grammar) o --grammar-file
      genres/types.ts
      genres/catalog.ts        # catálogo de géneros (solo datos)
      genres/detective-tags.ts
      command-line/commands/*.ts        # un archivo por comando (sección 8.2)
      grammar/types.ts
      grammar/build.ts
      automata/deterministic-finite-automaton.ts
      grammar-format/lexer.ts
      grammar-format/parser.ts
      input/sequence.ts
      analysis/nullable.ts
      analysis/min-yield.ts
      analysis/useful.ts
      analysis/cycles.ts
      analysis/first-follow.ts
      analysis/predictive-table.ts
      analysis/index.ts
      earley/item.ts
      earley/chart.ts
      earley/trace.ts
      earley/recognizer.ts
      earley/diagnostics.ts
      trees/tree.ts
      trees/epsilon.ts
      trees/count.ts
      trees/enumerate.ts
      trees/derivation.ts
      trees/render.ts
      chomsky-normal-form/add-new-start.ts
      chomsky-normal-form/remove-epsilon-productions.ts
      chomsky-normal-form/remove-unit-productions.ts
      chomsky-normal-form/remove-useless-symbols.ts
      chomsky-normal-form/isolate-terminals.ts
      chomsky-normal-form/binarize.ts
      chomsky-normal-form/index.ts
      cocke-younger-kasami/recognizer.ts
      pushdown-automaton/build.ts
      pushdown-automaton/simulate.ts
      bounded/generate.ts
      bounded/ambiguity.ts
      bounded/compare.ts
    test/
      fixtures/                # l1.txt (200 eventos)
      command-line/                     # una prueba por comando, más demo-doc.test.ts
      helpers/load.ts          # lee .grammar con node:fs (solo en las pruebas)
      *.test.ts                # una por módulo, más hand-computed, differential y performance
```

---

## 7. Fichas de exposición y comentarios

### 7.1 Fichas `docs/concepts/`

Cada ficha tiene siempre las mismas cinco partes:

1. Definición formal.
2. Ejemplo resuelto a mano sobre el dominio.
3. Dónde está en el código (archivo y función).
4. Qué prueba lo verifica.
5. Referencia bibliográfica.

Cada ficha tiene como máximo unas 2 páginas, pensadas para una diapositiva o dos.

| #   | Archivo                                     | Concepto                                      | Código                                                                  |
| --- | ------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------- |
| 01  | `01-alphabet-and-language.md`               | Σ, cadenas, L(G)                              | `input/sequence.ts`                                                     |
| 02  | `02-context-free-grammar.md`                | 4-upla, convención de terminales              | `grammar/types.ts`, `grammar/build.ts`                                  |
| 03  | `03-finite-automaton-lexer.md`              | AFD como tabla más ejecutor                   | `automata/deterministic-finite-automaton.ts`, `grammar-format/lexer.ts` |
| 04  | `04-predictive-recursive-descent-parser.md` | Descendente recursivo predictivo              | `grammar-format/parser.ts`                                              |
| 05  | `05-first-follow.md`                        | FIRST, FOLLOW, punto fijo                     | `analysis/first-follow.ts`                                              |
| 06  | `06-predictive-table-and-unambiguity.md`    | Tabla, conflictos, teorema LL(1) ⇒ no ambigua | `analysis/predictive-table.ts`                                          |
| 07  | `07-nullable-symbols.md`                    | Anulables                                     | `analysis/nullable.ts`                                                  |
| 08  | `08-useless-symbols-and-emptiness.md`       | Productivos, alcanzables, vacuidad            | `analysis/useful.ts`                                                    |
| 09  | `09-cycles.md`                              | A ⇒+ A, infinitos árboles                     | `analysis/cycles.ts`                                                    |
| 10  | `10-minimum-yield.md`                       | minYield                                      | `analysis/min-yield.ts`                                                 |
| 11  | `11-earley-item.md`                         | Regla punteada                                | `earley/item.ts`                                                        |
| 12  | `12-earley-sets.md`                         | Chart, lista como cola                        | `earley/chart.ts`                                                       |
| 13  | `13-predictor.md`                           | Predictor                                     | `earley/recognizer.ts#predict`                                          |
| 14  | `14-scanner.md`                             | Scanner                                       | `earley/recognizer.ts#scan`                                             |
| 15  | `15-completer.md`                           | Completer                                     | `earley/recognizer.ts#complete`                                         |
| 16  | `16-epsilon-aycock-horspool.md`             | El bug de ε y su arreglo                      | `earley/recognizer.ts#predict`                                          |
| 17  | `17-acceptance-and-errors.md`               | Aceptación, posición, esperados               | `earley/diagnostics.ts`                                                 |
| 18  | `18-backpointers-and-trees.md`              | Enlaces y árbol                               | `trees/enumerate.ts`                                                    |
| 19  | `19-tree-count-catalan.md`                  | Programación dinámica, Catalan, `'infinite'`  | `trees/count.ts`                                                        |
| 20  | `20-leftmost-derivation.md`                 | Preorden y formas sentenciales                | `trees/derivation.ts`                                                   |
| 21  | `21-ambiguity-g0-vs-g1.md`                  | 4 árboles contra 3 lecturas; L(G1) ⊊ L(G0)    | `genres/detective/g0.grammar`, `genres/detective/g1.grammar`            |
| 22  | `22-chomsky-normal-form.md`                 | Los 6 pasos                                   | `chomsky-normal-form/*.ts`                                              |
| 23  | `23-cocke-younger-kasami.md`                | Tabla CYK, comparación con Earley             | `cocke-younger-kasami/recognizer.ts`                                    |
| 24  | `24-pushdown-automaton.md`                  | GLC → AP, ID, Earley como AP compartido       | `pushdown-automaton/*.ts`                                               |
| 25  | `25-bounded-searches.md`                    | Semidecisión                                  | `bounded/*.ts`                                                          |
| 26  | `26-chomsky-hierarchy-and-cfg-limits.md`    | Chomsky, bombeo, reglas no GLC                | (sin código)                                                            |
| 27  | `27-decidability-and-turing.md`             | Decidible / indecidible, Church-Turing        | (sin código)                                                            |

### 7.2 Comentarios en el código

- Cada archivo empieza con un bloque `/** … */` en inglés con tres líneas: **qué concepto implementa**, **referencia** (libro y sección) y **ficha** (`docs/concepts/NN-*.md`).
- Cada paso de un algoritmo lleva un comentario que lo nombra como en la teoría. Por ejemplo: `// PREDICTOR: (A → α • B β, j) ⇒ (B → • γ, k)`.
- Los invariantes de los bucles de punto fijo se comentan explícitamente. Por ejemplo: "el conjunto solo crece y está acotado por |N|, por lo tanto el bucle termina".
- Los comentarios no repiten lo obvio del código: explican el **por qué** teórico.

---

## 8. Plan de implementación

### 8.1 Regla de los pasos: cada etapa se ejecuta por consola y se prueba

Cada paso termina con cuatro cosas, y ningún paso se da por cerrado sin ellas:

1. **Una prueba automatizada** del módulo, con los valores esperados de la sección 9.
2. **Un comando de consola** que ejecuta el módulo sobre una entrada real y muestra su resultado de forma legible. Así cada concepto se puede demostrar en vivo apenas se implementa, sin esperar a la API final ni a la UI.
3. **Una prueba del comando:** que la salida contenga lo esperado y que el código de salida sea el correcto.
4. **Una guía de estudio** en `docs/guides/NN-nombre.md` (plantilla en `docs/guides/_template.md`). Documenta las decisiones del paso: qué problema resuelve, por qué se eligió esa herramienta y no otra, cómo se usa en el programa, cómo funciona y cada función del código, con un ejemplo recorrido a mano y las preguntas probables de la defensa. La ficha del concepto (`docs/concepts/`) es el resumen teórico; la guía es la explicación completa del código y de sus decisiones.

Además, cada paso deja `npm test` en verde y es un commit propio. Cada paso que introduce un concepto incluye su ficha. **Antes de cada paso de algoritmo, el autor simula el caso a mano** (metodología del anteproyecto).

### 8.2 Arquitectura de la CLI

La infraestructura (`command-line.ts`, `createCommandLineProgram`, `runCommandLine` con `environment` inyectado, `format.ts`, el comando `help`, el script `npm run sabueso` y los códigos de salida) **la crea el SPEC 01**. Este spec la usa y le agrega `command-line/built-in-grammars.ts` y `command-line/grammar-source.ts`, las opciones `--grammar`, `--file` y `--steps`, y un comando por paso. Se repite la descripción completa como referencia.

- `src/command-line.ts` es el único archivo que toca `node:*`. Lee `process.argv`, arma un objeto `environment` con `writeOutput`, `writeError` y `readFile` (basado en `node:fs`) y llama a `runCommandLine(commandLineArguments, environment)`.
- `src/command-line/run.ts` contiene `createCommandLineProgram(commands)`, que devuelve `runCommandLine(commandLineArguments, environment): Promise<number>`. `createCommandLineProgram`, el tipo `Command` y `cli/format.ts` se exportan desde `index.ts` para que `@sabueso/natural-language` (SPEC 04) registre sus comandos con la misma infraestructura. Busca el comando en el registro, interpreta las opciones comunes (`--grammar`, `--file` y `--steps`) y devuelve el código de salida.
- `src/command-line/commands/<comando>.ts` tiene **un archivo por comando**. Cada uno exporta `{ name, description, usage, run(commandArguments, environment) }`. Los comandos no importan `node:*`: leen archivos solo a través de `environment.readFile`. Así se prueban en memoria, sin lanzar procesos.
- `src/command-line/grammar-source.ts` resuelve `--grammar`, y también `--grammar-file <ruta>` para un archivo `.grammar` propio (ver Decisiones). Como nombre acepta **solo identificadores de gramáticas incorporadas**, registradas en `src/command-line/built-in-grammars.ts`: las de género del catálogo (`detective/g1`, `detective/g0`, y sus alias `g1` y `g0`), y las internas de desarrollo (`meta`, `arithmetic-ambiguous`, `arithmetic`, `parentheses`, `epsilon-trap`, `test-useless`, `test-empty` y `test-cyclic`). `help` las lista en dos grupos: "Géneros" y "Desarrollo". Las rutas van siempre por `--grammar-file`, nunca como nombre. Un nombre desconocido termina con código 2 y lista los nombres válidos.
- `src/command-line/format.ts` tiene las utilidades de salida: tablas alineadas, conjuntos ordenados como `{a, b}` y árboles ASCII.
- **Ejecución sin pasos manuales:** el `package.json` raíz tiene el script `"sabueso": "tsc -b packages/core && node packages/core/dist/command-line.js"`. Así `npm run sabueso -- <comando> …` compila de forma incremental y ejecuta. También funciona `node packages/core/dist/command-line.js` después de `npm run build`.
- **Códigos de salida:**
  - `0`: éxito, o entrada aceptada.
  - `1`: entrada rechazada o error del usuario (gramática inválida, símbolo desconocido).
  - `2`: uso incorrecto del comando (opciones faltantes).
- `--steps` muestra las iteraciones de los algoritmos de punto fijo. Las funciones de análisis aceptan un callback opcional, `onIteration(iteration, snapshot)`, que no cuesta nada si no se pasa. Sirve para explicar en la exposición cómo converge cada punto fijo.
- `--file <ruta>` lee la secuencia de un archivo en lugar del argumento. Hace falta para L1 (200 eventos), que vive en `test/fixtures/l1.txt`.
- Pruebas de la CLI en `test/command-line/<comando>.test.ts`. Llaman a `runCommandLine` con un `environment` en memoria.

### 8.3 Pasos

1. **Punto de partida (cubierto por el SPEC 01).**
   - El monorepo, el esqueleto de `packages/core`, el tooling y la infraestructura de la CLI los crea el SPEC 01. Este paso no agrega código.
   - Verificación antes de empezar: `npm test`, `npm run lint` y `npm run build` pasan, y `npm run sabueso -- help` lista los comandos.

2. **Tipos de gramática y construcción.**
   - `grammar/types.ts` y `grammar/build.ts`: `buildGrammar(name, rules, start?, declaredTerminals?)`.
   - Clasifica terminales y no terminales, indexa `productionsByLeftSide`, numera producciones, y valida el inicio inexistente, los terminales no declarados y las producciones duplicadas.
   - Prueba unitaria. Fichas 01 y 02.
   - **Consola:** `npm run sabueso -- demo-grammar` construye en código la gramática de expresiones `E → E + T | T`, `T → id`, e imprime la 4-upla G = (N, Σ, P, S) con las producciones numeradas.
   - **Decisión (2026-11-20):** el comando `demo-grammar` se eliminó. Era necesario en el paso 2, cuando todavía no se leían archivos; desde el paso 4, `npm run sabueso -- grammar arithmetic` muestra la misma 4-upla pasando por el lexer, el parser y `buildGrammar`.

3. **Lexer AFD.**
   - `automata/deterministic-finite-automaton.ts`: el ejecutor genérico con _maximal munch_, probado con un AFD de juguete (números enteros y espacios).
   - `grammar-format/lexer.ts`: la tabla de transiciones explícita del formato `.grammar` (sección 3.3).
   - Comentarios `#`, `->` y `→`, literales `'…'`, `ε`, `%start` y `%terminals`.
   - Agrega un `NEWLINE` final antes de `END_OF_FILE`.
   - Errores con línea y columna: literal sin cerrar, carácter inválido, directiva desconocida.
   - Pruebas: la secuencia de tokens de un ejemplo de 3 líneas y cada error. Ficha 03.
   - **Consola:**
     - `npm run sabueso -- lex arithmetic` imprime la tabla de tokens (tipo, texto, línea:columna).
     - Con `--states`, imprime además la secuencia de estados del AFD de la primera línea, para explicar δ en la exposición.
     - `npm run sabueso -- lex --grammar-file <ruta>` hace lo mismo con un archivo `.grammar` propio. Con un archivo así, los errores léxicos también se ven por consola (código 1).
     - Los errores léxicos (literal sin cerrar, carácter inválido) se verifican además en las pruebas con textos en memoria.
   - **Decisión de orden (2026-11-19):** como `lex arithmetic` necesita su archivo, este paso adelanta `grammars/test/arithmetic.grammar` y una primera versión del registro de gramáticas (hoy `command-line/built-in-grammars.ts` y `command-line/grammar-source.ts`) que solo resuelve `arithmetic`. El paso 5 agrega las demás gramáticas y completa el resolvedor.

4. **Parser LL(1) de `.grammar`.**
   - `grammar-format/parser.ts`: una función por no terminal de `meta.grammar`. Cada función elige la alternativa por el `kind` del lookahead.
   - Expone `parseGrammarText(text, name)` y la arma con `buildGrammar`.
   - Pruebas: errores de sintaxis con línea y columna. Ficha 04.
   - **Consola:**
     - `npm run sabueso -- grammar arithmetic` imprime G = (N, Σ, P, S). También acepta `--grammar-file <ruta>`.
     - Con `--parser-trace`, imprime cada llamada recursiva del parser con el lookahead que decidió la alternativa (por ejemplo, `Sequence [IDENTIFIER] → Symbols`).
   - **Decisión (2026-11-19):** `%start` o `%terminals` repetidos son un `GrammarSyntaxError` en la posición de la segunda aparición, porque la segunda pisaría a la primera sin aviso. El spec original no lo definía.

5. **Archivos de gramáticas.**
   - Escribir `meta.grammar`, `genres/detective/g0.grammar` y `g1.grammar`, las siete de `test/` y `test/fixtures/l1.txt`, más `test/helpers/load.ts` y `command-line/built-in-grammars.ts`.
   - Escribir el catálogo: `genres/types.ts`, `genres/catalog.ts` y `genres/detective-tags.ts`.
   - Prueba: todos parsean. G0 tiene 10 no terminales, 14 terminales y 28 producciones. G1 tiene 21 no terminales, 14 terminales y 40 producciones.
   - **Consola:**
     - `npm run sabueso -- genres` lista los géneros del catálogo (hoy, policial) con su gramática oficial, su alternativa y sus etiquetas.
     - `npm run sabueso -- grammars` lista todas las gramáticas incorporadas con sus tamaños, en dos grupos: "Géneros" y "Desarrollo".
     - `npm run sabueso -- grammar g0` imprime las 28 producciones.
   - **Decisiones (2026-11-19):**
     - El campo `function` de `TagInfo` se llama `narrativeFunction`, más descriptivo.
     - Las gramáticas de género se registran leyendo el catálogo (`grammars/genres/<id de gramática>.grammar`); los alias `g1` y `g0` son una tabla propia del registro.
     - `help` muestra los grupos mediante una opción nueva y compatible de `createCommandLineProgram`: `helpFooter`.

6. **Tokenizador de secuencias.**
   - `input/sequence.ts`: `tokenizeSequence(text)` separa por espacios. `checkAlphabet(tokens, grammar)` devuelve un `ParseError` `unknown-symbol` o `null`.
   - Prueba: el caso I6.
   - **Consola:** `npm run sabueso -- tokens --grammar g1 "CRI XYZ REV"` lista los tokens con su posición y termina con código 1, informando `XYZ` en la posición 1.
   - **Decisiones (2026-11-20):**
     - El tipo `ParseError` se crea ahora en `earley/diagnostics.ts`, donde lo ubica la sección 5. Las funciones de diagnóstico se agregan en el paso 16.
     - En un error `unknown-symbol`, `expected` es la lista vacía: el problema no es la posición sino el símbolo, que no está en Σ. La consola muestra Σ completo como ayuda.
     - `checkAlphabet` informa solo el **primer** símbolo desconocido, como los demás errores.
     - Los comandos que leen un relato eligen la gramática con la opción `--grammar <nombre>` (o `--grammar-file`), porque sus argumentos posicionales son el relato. El relato puede ir entre comillas o como palabras sueltas.
     - Un relato vacío no es un error del tokenizador: ε ∈ Σ\*. Rechazarlo es tarea de Earley (caso I2).
     - Refactor (2026-11-20, sin cambio de comportamiento): Σ se calcula en su propio paso (`collectTerminals`); `command-line/grammars.ts` se divide en `built-in-grammars.ts` y `grammar-source.ts`; `reportUsageError` compartido; `formatTable`/`formatSet`; convención de nombres: MAYÚSCULAS para valores simples y camelCase para tablas y listas.
     - Todo el código queda en inglés, comentarios incluidos; solo la documentación (`docs/`, specs, README) va en español. Cada función tiene un comentario corto que dice qué hace, y las funciones clave explican también la teoría que implementan. (Hubo, por un rato, comentarios de estudio en español con el prefijo `// ES:`; se tradujeron al inglés el 2026-11-20.)

7. **Anulables.**
   - `analysis/nullable.ts`, por punto fijo, con `onIteration`.
   - Pruebas: G0 da ∅. `parentheses` da {S}. `epsilon-trap` da {A}. G1 da {MarcoOpc, PerOpc, CtxOpc, HallazgoOpc, Libres, Lineas, CuerpoLinea, EpiOpc, Cierre, CapOpc}. Ficha 07.
   - **Consola:** `npm run sabueso -- nullable --grammar g1 --steps` imprime el conjunto después de cada iteración y el resultado final.
   - **Decisiones (2026-11-20):**
     - La función se llama `computeNullable(grammar, onIteration?)` y devuelve `Set<SymbolName>`.
     - El punto fijo es **por rondas** (cada ronda mira solo el conjunto de la anterior), no "agregar sobre la marcha". Así la ronda i tiene significado teórico (altura del árbol ε más bajo) y la cantidad de rondas no depende del orden de las producciones. La última ronda no agrega nada: es la verificación del punto fijo. G1 da 2 rondas.
     - Con `--steps` la tabla muestra, por ronda, cuántos anulables hay y cuáles se agregaron (el conjunto completo solo al final, para que la tabla no sea demasiado ancha). El conjunto vacío se imprime ∅.
     - `readGrammar(source, environment)` en `grammar-source.ts` lee y construye la gramática elegida; la comparten `tokens`, `nullable` y los análisis siguientes.
     - Ejemplo nuevo `examples/grammars/nullable-chain.grammar`, con un anulable por ronda, para mostrar cómo crece el punto fijo.
     - Refactor (2026-11-20): el esquema de punto fijo por rondas se escribe una sola vez, `leastFixedPoint(start, newSymbolsOfRound, onIteration?)` en `analysis/fixed-point.ts`, junto con `leftSidesWhere`. Lo usan los anulables, los productivos y los alcanzables; cada análisis solo aporta su regla. minYield (números, no conjuntos) mantiene su propio ciclo.

8. **Longitud mínima.**
   - `analysis/min-yield.ts`.
   - Prueba: minYield(Relato) es 3 en G0 y en G1. minYield(S) en `parentheses` es 0. Ficha 10.
   - **Consola:** `npm run sabueso -- min-yield --grammar g1` imprime la tabla de no terminales con su longitud mínima.
   - **Decisiones (2026-11-20):**
     - Funciones: `computeMinYield(grammar)` devuelve `Map<SymbolName, number>` con todos los no terminales, y `minYieldOfSequence(symbols, minYield)` suma los de una secuencia (un terminal vale 1). La segunda queda exportada para la poda del AP (paso 26) y la generación acotada (paso 27).
     - Un no terminal que no deriva ninguna cadena de terminales vale `Infinity` (∞). La consola lo muestra como `∞ (derives no string)` y, si es el inicial, informa L(G) = ∅.
     - Mismo punto fijo por rondas que los anulables. El spec no pide `--steps` para este paso, así que no se agregó `onIteration`.

9. **Productivos, alcanzables, inútiles y vacuidad.**
   - `analysis/useful.ts`, con `onIteration`.
   - Pruebas: con `useless.grammar`, no productivos = {A}, no alcanzables (después de quitar A) = {C}. `empty.grammar` da `isEmpty` igual a `true`. G0 y G1 no tienen inútiles y no son vacías. Ficha 08.
   - **Consola:**
     - `npm run sabueso -- useful --grammar test-useless --steps` imprime las iteraciones de productivos y de alcanzables, los inútiles y la gramática limpia.
     - Con `test-empty`, imprime `L(G) = ∅`.
   - **Decisiones (2026-11-20):**
     - `analyzeUsefulSymbols(grammar, onIteration?)` devuelve `{ productive, reachable, useless, isEmpty, usefulGrammar }`. `reachable` se calcula **después** de quitar los no productivos (orden de Hopcroft 7.1.1). `usefulGrammar` es G sin inútiles, construida de nuevo con `buildGrammar` (ids nuevos, Σ solo con los terminales usados), o `null` si L(G) = ∅.
     - Los conjuntos son de **no terminales**. Los terminales que dejan de usarse desaparecen solos de Σ en `usefulGrammar`.
     - `onIteration(phase, iteration, symbols)` agrega la fase (`'productive'` o `'reachable'`) a la forma general de la sección 8.2, porque este paso tiene dos puntos fijos. Si L(G) = ∅ no se corre la fase de alcanzables.
     - Con `--steps`, la tabla de alcanzables muestra S como ronda 0, porque ese punto fijo no parte de ∅.
     - Ejemplo nuevo `examples/grammars/useless-order.grammar` (ejemplo 7.2 de Hopcroft adaptado: B → B c hace de símbolo sin producciones) para mostrar por qué importa el orden.

10. **Ciclos.**
    - `analysis/cycles.ts`.
    - Pruebas: `cyclic.grammar` da el ciclo [S, A]. G0, G1 y `arithmetic` no tienen ciclos. Ficha 09.
    - **Consola:** `npm run sabueso -- cycles --grammar test-cyclic` imprime `S ⇒+ A ⇒+ S`.
    - **Decisiones (2026-11-20):**
      - `findCycles(grammar)` devuelve un ciclo por cada arista de retroceso de la DFS sobre el grafo unitario (en el orden de la gramática). Alcanza para decidir si G es cíclica y para mostrar los ciclos; no enumera todos los ciclos simples.
      - `buildUnitGraph(grammar, nullable)` queda exportada: el comando la muestra con `--graph`.
      - Ejemplo nuevo `examples/grammars/hidden-cycle.grammar`: un ciclo escondido detrás de símbolos anulables (`S → A S B` con A y B anulables).

11. **FIRST y FOLLOW.**
    - `analysis/first-follow.ts`, con `onIteration`.
    - Pruebas: los conjuntos de la sección 4.4 para G1 y FOLLOW(Pasos) = {REV} en G0. Ficha 05.
    - **Consola:** `npm run sabueso -- first-follow --grammar g1 [--steps]` imprime una tabla con FIRST y FOLLOW por no terminal.
    - **Decisiones (2026-11-20):**
      - **Desvío en la prueba de G0:** el spec pedía FOLLOW(Pasos) = {REV} en G0, pero ese es el valor de **G1**. En G0, `Pasos → Pasos Pasos` hace que FIRST(Pasos) ⊆ FOLLOW(Pasos), y `Linea → SOS Pasos` agrega FOLLOW(Linea): el valor correcto es {ATQ, DSC, INT, PIS, REV, SOS}. La prueba usa ese valor; {REV} se prueba en G1.
      - Funciones: `computeFirstFollow(grammar, onIteration?)`, y por separado `computeFirst`, `computeFollow` y `firstOfSequence` (la usa la tabla LL(1) del paso 12). Los conjuntos son `Map<SymbolName, Set<SymbolName>>`, con ε y `$` como los textos `'ε'` y `'$'` (`EMPTY_STRING`, `END_OF_INPUT`).
      - El punto fijo de "un conjunto por símbolo" se escribe una vez, `leastFixedPointOfSets` en `analysis/fixed-point.ts`, igual que `leastFixedPoint` para un solo conjunto. `onIteration(phase, round, sets)` agrega la fase (`'first'` o `'follow'`).
      - Ejemplo nuevo `examples/grammars/mini-detective.grammar`: el mini policial con el que se explican a mano LL(1), FIRST, FOLLOW y la tabla (guía 11 y notas de la defensa).

12. **Tabla LL(1) y análisis completo.**
    - `analysis/predictive-table.ts` y `analysis/index.ts` (`analyzeGrammar`).
    - Pruebas: `meta.grammar` y G1 tienen 0 conflictos. G0 tiene conflictos, entre ellos (Linea, SOS), (Planteo, CRI) y (Pasos, PIS). `arithmetic` tiene conflictos por recursión a izquierda. Ficha 06.
    - **Consola:**
      - `npm run sabueso -- predictive-table --grammar g0` imprime la tabla M[A, a], marca los conflictos y termina con `No es LL(1): k conflictos`.
      - Con `g1`, imprime `Es LL(1) ⇒ no ambigua`.
      - `npm run sabueso -- analyze --grammar g1` resume los pasos 7 a 12 en un solo informe.
    - **Decisiones (2026-11-20):**
      - Funciones: `buildPredictiveTable(grammar, sets?)` (recibe FIRST/FOLLOW si ya están calculados) y `predictionSet(production, sets)`, que da el conjunto de predicción de una producción. `analyzeGrammar(grammar)` en `analysis/index.ts` devuelve el `GrammarAnalysis` de la sección 5.
      - La salida de los comandos sigue en inglés, como el resto: `Not LL(1): k conflict(s)…` y `LL(1): no cell has two productions, so the grammar is unambiguous` en lugar de los textos en español de este punto.
      - La tabla muestra en cada casilla los números de sus producciones (con `✗` si hay más de una), seguida de la lista numerada de producciones y de los conflictos.
      - G0 tiene 13 conflictos: 6 por ambigüedad (`Pasos` en 5 columnas y `Linea` en SOS) y 7 por falta de factorización (`Planteo`, `Marco`, `Hecho`, `Desenlace`, `Resolucion`). `arithmetic` tiene 4, por recursión a izquierda.

13. **Ítems y chart.**
    - `earley/item.ts` (crear ítem, clave, avanzar, `nextSymbol`, `isComplete` y `label` legible) y `earley/chart.ts` (agregar con deduplicación de ítems por clave; los enlaces se agregan sin buscar duplicados, según la sección 3.18).
    - Pruebas unitarias. Fichas 11 y 12.
    - **Consola:** `npm run sabueso -- items --grammar parentheses` lista todas las reglas punteadas posibles de la gramática (por ejemplo, `S → ( • S ) S`). Es el universo finito de ítems, y explica por qué Earley siempre termina.
    - **Decisiones (2026-11-20):**
      - `item.ts`: `createItem`, `itemKey`, `nextSymbol`, `isComplete`, `dottedRule` (la regla con el punto, `A → •` para ε), `label` (`E → E + • T, 0`) y `dottedRulesOf` (el universo de reglas punteadas, para el comando). "Avanzar" no es una función aparte: el reconocedor del paso 14 agrega el ítem con `dot + 1` mediante `addItem`, que ya deduplica.
      - `chart.ts`: `createChart(tokenCount)` y `addItem(set, production, dot, origin, link?)`, que devuelve `{ item, isNew }`. El enlace se agrega también cuando el ítem ya estaba (es otro camino: ambigüedad); `isNew` dice si hay que procesarlo.
      - El comando `items` muestra, además, qué operación dispara cada regla punteada (Predictor, Scanner o Completer).

14. **Reconocedor sin ε.**
    - `earley/recognizer.ts` con `predict`, `scan`, `complete` y el bucle principal (sección 3.12) que devuelve `accepted`.
    - Pruebas: V1 a V3 y A1 aceptadas con G0, I1 a I4 rechazadas, y las gramáticas de aritmética. Fichas 13, 14 y 15.
    - **Consola:**
      - `npm run sabueso -- earley --grammar arithmetic "id + id * id"` imprime `ACEPTA` o `RECHAZA` y termina con código 0 o 1.
      - Con `--chart`, imprime los conjuntos S0…Sn con todos sus ítems: `S2: E → E + • T, 0`.
    - **Decisiones (2026-11-20):**
      - `recognize(grammar, tokens)` devuelve `{ accepted, chart, startProduction }`. La producción $S → S se arma en el reconocedor con `id: -1`, para que su clave no choque con ninguna producción real.
      - `predict`, `scan` y `complete` quedan exportadas (una ficha cada una). El Completer recorre una copia de la lista del conjunto de origen: los ítems que esperaban cuando B se completó. Es el comportamiento clásico, y por eso `epsilon-trap` todavía rechaza `x` (una prueba lo fija; se invierte en el paso 15).
      - Salida en inglés, como el resto: `ACCEPTED: the input is a sentence of L(G)` / `REJECTED: …` en lugar de `ACEPTA` / `RECHAZA`. Con `--chart`, cada conjunto es una tabla con #, ítem, origen y cómo llegó (`initial`, `P`, `S from Sk#i`, `C from Sk#i`; varios separados por `;` si el ítem tiene varios enlaces). Un símbolo fuera de Σ se informa antes de correr Earley.

15. **Arreglo de ε.**
    - Predictor con avance sobre anulables. Completer que ignora los ítems con origen k.
    - Opción interna didáctica `classicEpsilon: true`: desactiva el arreglo para **reproducir el bug** del Earley clásico.
    - Pruebas:
      - `epsilon-trap` acepta `x`;
      - con `classicEpsilon: true` lo rechaza, lo que demuestra el bug;
      - `parentheses` acepta la cadena vacía y `( ( ) ) ( )`;
      - toda la batería de G1.
    - Ficha 16.
    - **Consola:**
      - `npm run sabueso -- earley --grammar g1 "CRI PIS REV" --chart` imprime exactamente el chart de la sección 9.6 (8, 19, 16 y 11 ítems). Una prueba compara la salida ítem por ítem.
      - `npm run sabueso -- earley --grammar epsilon-trap "x" --chart` imprime `ACEPTA`.
      - Con `--no-epsilon-fix` imprime `RECHAZA` y el chart donde falta el ítem `S → A A • x, 0`.
    - **Decisiones (2026-11-20):**
      - Las tres operaciones reciben un `RecognizerContext` (gramática, chart, tokens, anulables y modo) en lugar de parámetros sueltos. En modo clásico, el conjunto de anulables queda vacío: el mismo código del Predictor no avanza sobre nada.
      - `isEmptySpan(item)` (origen = conjunto actual) queda exportada: la usa el Completer y el comando para marcar `P (ignored)`.
      - En `--chart`, la columna "How" usa `ε` para el avance del Predictor y `P (ignored)` para los ítems ε que el Completer ignora, igual que la sección 9.6. Una prueba compara las 54 filas con `test/fixtures/g1-chart-cri-pis-rev.ts`, tomado de esa sección: coinciden todas.
      - Una prueba recorre seis corridas y verifica que ningún ítem tenga dos veces el mismo par (predecesor, causa), en lugar de una aserción dentro del código (sección 3.18).

16. **Diagnóstico.**
    - `earley/diagnostics.ts`: aceptación y `ParseError`, según la sección 3.17.
    - Pruebas: I1 a I7 y P2, con posición, `found` y `expected` exactos. Ficha 17.
    - **Consola:** `npm run sabueso -- earley --grammar g1 "CTX PER PIS REV"` imprime `RECHAZA · posición 2 (evento 3) · se encontró PIS · se esperaba: CRI, HAL` y termina con código 1.
    - **Decisiones (2026-11-20):**
      - `diagnose(grammar, chart, tokens, accepted)` devuelve `ParseError | null`, y `expectedTerminals(grammar, set)` los terminales después del punto de un conjunto, sin repetir y ordenados.
      - El mensaje sigue en inglés, como el resto de la salida: `REJECTED · position 2 (event 3) · found PIS · expected: CRI, HAL`. Para el fin de entrada: `position n (end of input) · expected: …` o `incomplete input`; para un símbolo fuera de Σ: `XYZ is not in Σ`.
      - Todos los casos de error de la tabla 9.1 (I1 a I7, con G0 y G1) y P2 coinciden exactamente con el spec.

17. **Traza.**
    - `earley/trace.ts`, activable con `{ trace: true }`. Sin la opción, no hay costo extra.
    - Prueba: en G1 con `CRI PIS REV`, el primer evento es `predict` en el conjunto 0 y el último conjunto contiene `$S → Relato •, 0`.
    - **Consola:** `npm run sabueso -- trace --grammar g1 "CRI PIS REV"` imprime los eventos numerados (`#12 S1 SCANNER  Hecho → CRI • HallazgoOpc, 0  ← token 0 CRI`). Es la misma información que el reproductor de la UI, pero en texto.
    - **Decisiones (2026-11-20):**
      - Un evento por cada `addItem` que cambia el chart: un ítem nuevo, o uno que ya estaba y recibe otro enlace (`isNew: false`, la ambigüedad). Una predicción repetida sin enlace no es evento. El ítem inicial no es evento.
      - `TraceEvent` agrega el campo `isNew` a la forma de la sección 5, y la operación del avance ε se llama `nullable` (en consola, `NULLABLE`). La causa es texto: el ítem que predijo, `token k X`, el ítem completado o `B ⇒* ε`.
      - Sin la opción `trace` no se crea el `TraceRecorder`, y la causa se pasa como función, así que su texto no se construye.
      - El número del evento del ejemplo de este punto (`#12`) era ilustrativo: con esta definición, el Scanner de `CRI` es el evento `#8`.

18. **Árboles ε.**
    - `trees/epsilon.ts`: genera y cuenta los árboles ε de un símbolo anulable.
    - Prueba: en G1, todo anulable tiene exactamente 1 árbol ε.
    - **Consola:** `npm run sabueso -- epsilon-trees --grammar g1 CuerpoLinea` imprime la cantidad de árboles ε y los árboles en ASCII.
    - **Decisiones (2026-11-20):**
      - Se adelantan dos archivos del paso 19, porque este paso ya los necesita: `trees/tree.ts` (el tipo `ParseTree`, `TreeCount` y la aritmética `addCounts`/`multiplyCounts`, donde `'infinite'` absorbe salvo frente a 0) y `trees/render.ts` (`renderTree`, el dibujo con `├─` y `└─`).
      - `countEpsilonTrees(grammar, nullable, symbol)` cuenta con memoización y detecta ciclos con el conjunto de símbolos "en curso" (`'infinite'`). `epsilonTrees(grammar, nullable, symbol)` genera los árboles saltando las producciones que repetirían un símbolo del camino: con un ciclo, lista solo los árboles sin símbolos repetidos.
      - Sin símbolo, el comando lista la cuenta de cada anulable. Ejemplo nuevo `examples/grammars/epsilon-choices.grammar` (un símbolo con 4 árboles ε).

19. **Enumeración y render de árboles.**
    - `trees/tree.ts`, `trees/enumerate.ts` (`function*` con límite) y `trees/render.ts` (árbol ASCII con `├─` y `└─`).
    - Pruebas: A1 con G0 da 4 árboles distintos. Con límite 2 da 2. El render de un árbol chico coincide con un texto esperado. Fichas 18 y 21 (borrador).
    - **Consola:** `npm run sabueso -- trees --grammar g0 "CRI SOS PIS INT REV" [--max 50]` imprime cada árbol numerado.
    - **Decisiones (2026-11-20):**
      - `enumerateTrees(grammar, recognition)` es un generador que sigue los enlaces desde ($S → S •, 0); `parseTrees(grammar, recognition, limit = 50)` junta hasta el límite. El árbol que se entrega es el de S (sin la raíz $S).
      - Ciclos: se lleva el conjunto de ítems del camino y se saltea la rama que vuelve a uno; así la enumeración siempre termina (el conteo del paso 20 dirá `'infinite'`).
      - El comando avisa si `--max` cortó la lista (pide un árbol más que el límite para saberlo) y, si hay más de uno, que la gramática es ambigua para esa entrada.
      - La ficha 21 queda en borrador; se completa en el paso 27.

20. **Conteo.**
    - `trees/count.ts`, con `bigint`, memoización y detección de ciclos.
    - Pruebas: los valores de la tabla 9.1. El relato largo en G0 da C(197), comparado con la fórmula de Catalan calculada en la prueba. `cyclic.grammar` con `a` da `'infinite'`. Ficha 19.
    - **Consola:**
      - `npm run sabueso -- count --grammar g0 "CTX HAL ENC INT SOS PIS DSC REV CNF CAP"` imprime `8 árboles`.
      - `npm run sabueso -- count --grammar g0 --file packages/core/test/fixtures/l1.txt` imprime el número completo con su cantidad de dígitos y el tiempo empleado.

21. **Derivación más a la izquierda.**
    - `trees/derivation.ts`.
    - Prueba: la derivación de A1 con G1 coincide paso a paso con la sección 9.2. Ficha 20.
    - **Consola:** `npm run sabueso -- derive --grammar g1 "CRI SOS PIS INT REV"` imprime las 19 formas sentenciales numeradas (pasos 0 a 18), con la producción aplicada en cada una.

22. **API pública.**
    - `src/index.ts`: `parseGrammarText`, `buildGrammar`, `analyzeGrammar`, `parse`, `renderTree`, `renderDerivation`, `runDeterministicAutomaton`, `createCommandLineProgram` y el catálogo de géneros (`genres`), más los tipos públicos, y los módulos de FNC, CYK, AP y búsquedas acotadas a medida que se agregan. `buildGrammar` y `runDeterministicAutomaton` se exportan porque el SPEC 04 los reutiliza.
    - Prueba de integración que usa solo la API pública.
    - **Consola:** `npm run sabueso -- parse --grammar g0 [--trees N] [--trace] "CRI SOS PIS INT REV"` combina reconocimiento, diagnóstico, conteo, árboles y derivación del primer árbol. Es el comando "completo" que usa la API pública.

23. **FNC: START, DEL y UNIT.**
    - `chomsky-normal-form/add-new-start.ts`, `chomsky-normal-form/remove-epsilon-productions.ts` y `chomsky-normal-form/remove-unit-productions.ts`.
    - Prueba: después de cada paso, el lenguaje se preserva (las oraciones ≤ 4 de G1 siguen aceptadas por Earley sobre la gramática transformada). Ficha 22 (primera parte).
    - **Consola:** `npm run sabueso -- chomsky-normal-form --grammar g1 --until UNIT` imprime la gramática después de START, de DEL y de UNIT, con las producciones agregadas y quitadas en cada paso.

24. **FNC: USELESS, TERM y BIN.**
    - `chomsky-normal-form/remove-useless-symbols.ts`, `chomsky-normal-form/isolate-terminals.ts`, `chomsky-normal-form/binarize.ts` y `chomsky-normal-form/index.ts` (`toChomskyNormalForm` e `isChomskyNormalForm`).
    - Pruebas: `isChomskyNormalForm` da verdadero para todas las gramáticas. `parentheses` da `acceptsEmpty` verdadero. Ficha 22.
    - **Consola:** `npm run sabueso -- chomsky-normal-form --grammar g1` imprime los 6 pasos y termina con `FNC ✓ (n producciones)`.

25. **CYK.**
    - `cocke-younger-kasami/recognizer.ts`: tabla y extracción de un árbol.
    - Pruebas: la tabla de `( ) ( )` con `parentheses` y el árbol de `CRI PIS REV` con G0, que contiene nodos `T_`/`X` o pierde los unitarios. Ficha 23.
    - **Consola:** `npm run sabueso -- cocke-younger-kasami --grammar parentheses "( ) ( )"` imprime la tabla triangular, `ACEPTA` y el árbol FNC. Con `--compare`, imprime al lado el árbol de Earley para la misma entrada.

26. **Autómata de pila.**
    - `pushdown-automaton/build.ts` y `pushdown-automaton/simulate.ts`.
    - Pruebas: P1 y la correspondencia entre el camino de aceptación y la derivación de A1 con G1. Ficha 24.
    - **Consola:** `npm run sabueso -- pushdown-automaton --grammar g1 "CRI SOS PIS INT REV"` imprime las transiciones (con `--transitions`), el resultado, la cantidad de configuraciones exploradas y el camino de aceptación como tabla de descripciones instantáneas (posición, entrada restante, pila).
    - **Adelanto (2026-11-20):** la ficha 24 se escribió en borrador antes del código, con el grafo (`docs/guides/images/24-pushdown-automaton.svg`), la corrida de `CRI PIS REV` con G1 como tabla de descripciones instantáneas y una página interactiva paso a paso (`docs/interactive/pushdown-automaton-g1.html`, también con A1). En este paso, la prueba del comando debe reproducir esa misma tabla.

27. **Búsquedas acotadas.**
    - `bounded/generate.ts`, `bounded/ambiguity.ts` y `bounded/compare.ts`.
    - Pruebas: B1 a B4. Fichas 25 y 21 (final).
    - **Consola:**
      - `npm run sabueso -- generate --grammar g1 --max-length 3` lista las oraciones.
      - `npm run sabueso -- ambiguity --grammar g0 --max-length 4` imprime el testigo y sus 2 árboles.
      - `npm run sabueso -- compare g0 g1 --max-length 3` imprime las listas "solo en G0" y "solo en G1".

28. **Pruebas diferenciales y de rendimiento.**
    - `test/differential.test.ts` y `test/performance.test.ts`, según las secciones 9.4 y 9.5.
    - **Consola:**
      - `npm run sabueso -- differential --grammar g1 --max-length 3` corre Earley, CYK y el AP sobre el corpus exhaustivo, e imprime la cantidad de cadenas y de discrepancias (0).
      - `npm run sabueso -- bench --grammar g0 --file packages/core/test/fixtures/l1.txt` imprime los tiempos de reconocimiento y de conteo.

29. **Guion de consola completo.**
    - Completar `docs/console-demo.md` (creado vacío en el SPEC 01) con el recorrido de la exposición: un comando por concepto, en el orden de las fichas.
    - La prueba `demo-doc.test.ts` del SPEC 01 ya ejecuta cada comando del documento con `runCommandLine` y verifica que ninguno termine con código 2. Este paso no la modifica: solo agrega comandos al guion.

30. **Fichas teóricas y README.**
    - Fichas 26 y 27.
    - `README.md` con requisitos, instalación, comandos, el índice concepto → archivo → ficha → comando (la tabla 7.1 con una columna "Comando"), y una declaración del uso de IA (lo exige el anteproyecto).

> Algunos pasos (14, 23 y 24) pueden superar las 50 líneas. Si pasa, se dividen en subcommits por función (por ejemplo, 14a `predict`, 14b `scan`, 14c `complete`, 14d bucle). Cada subcommit lleva su prueba, y el comando `earley` se extiende en cada uno.

---

## 9. Batería de pruebas y valores esperados

Todos los valores fueron **calculados a mano** en este spec. El autor debe **verificarlos a mano antes de implementar** cada paso. Si algún valor resulta incorrecto, se corrige primero el spec y después el código.

### 9.1 Casos del relato

| Id  | Entrada                                   | G0                                                                                 | G1                                                                            |
| --- | ----------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| V1  | `CTX HAL ENC INT SOS PIS DSC REV CNF CAP` | acepta, **8** árboles                                                              | acepta, **1** árbol                                                           |
| V2  | `HAL PIS REV EPI`                         | acepta, 1                                                                          | acepta, 1                                                                     |
| V3  | `CRI ENC SOS INT DSC PIS SOS ATQ REV CAP` | acepta, **112**                                                                    | acepta, 1                                                                     |
| A1  | `CRI SOS PIS INT REV`                     | acepta, **4** (3 lecturas)                                                         | acepta, 1                                                                     |
| M1  | `CRI PIS REV` (relato mínimo, largo 3)    | acepta, 1                                                                          | acepta, 1                                                                     |
| L1  | `CRI` + 198 × `PIS` + `REV` (200 eventos) | acepta, C(197)                                                                     | acepta, 1                                                                     |
| I1  | `CTX PER PIS REV` (falta el crimen)       | error pos 2, found `PIS`, expected `[CRI, HAL]`                                    | ídem                                                                          |
| I2  | (vacía)                                   | error pos 0, found `null`, expected `[CRI, CTX, HAL, PER]`                         | ídem                                                                          |
| I3  | `CRI REV` (sin investigación)             | error pos 1, found `REV`, expected `[ATQ, CTX, DSC, ENC, HAL, INT, PER, PIS, SOS]` | error pos 1, found `REV`, expected `[ATQ, CTX, ENC, HAL, INT, PER, PIS, SOS]` |
| I4  | `CRI PIS` (sin desenlace)                 | error pos 2, found `null`, expected `[ATQ, DSC, INT, PIS, REV, SOS]`               | error pos 2, found `null`, expected `[ATQ, INT, PIS, REV, SOS]`               |
| I5  | `CRI DSC REV` (descarte sin sospecha)     | acepta, 1                                                                          | error pos 1, found `DSC`, expected `[ATQ, CTX, ENC, HAL, INT, PER, PIS, SOS]` |
| I6  | `CRI XYZ REV`                             | `unknown-symbol` pos 1, found `XYZ`                                                | ídem                                                                          |
| I7  | `CRI SOS DSC DSC REV` (doble descarte)    | acepta, 4                                                                          | error pos 3, found `DSC`, expected `[ATQ, INT, PIS, REV, SOS]`                |

Cálculo de referencia para G0. P(w) es la cantidad de árboles de `Pasos` sobre w, y Paso(w) es la cantidad de árboles de `Paso`:

- P(x) = 1 para un solo símbolo.
- Paso(SOS·u) = P(u) si u no es vacía. Para cualquier otra w de largo 2 o más, Paso(w) = 0.
- P(w) = Paso(w) + Σ sobre los cortes w = uv (u y v no vacías) de P(u)·P(v).
- Ejemplos: P(SOS PIS INT) = 1 + 1 + 2 = 4, y P(INT SOS PIS DSC) = 4 + 1 + 3 = 8.
- En V3, P(SOS INT DSC PIS SOS ATQ) = 112. Los intermedios están en la ficha 19.

### 9.2 Derivación más a la izquierda de A1 con G1 (18 pasos)

```text
 0 Relato
 1 Planteo Investigacion Desenlace
 2 Hecho MarcoOpc Investigacion Desenlace
 3 CRI HallazgoOpc MarcoOpc Investigacion Desenlace
 4 CRI MarcoOpc Investigacion Desenlace
 5 CRI Investigacion Desenlace
 6 CRI Pasos Desenlace
 7 CRI Linea Lineas Desenlace
 8 CRI SOS CuerpoLinea Lineas Desenlace
 9 CRI SOS Evidencia CuerpoLinea Lineas Desenlace
10 CRI SOS PIS CuerpoLinea Lineas Desenlace
11 CRI SOS PIS Evidencia CuerpoLinea Lineas Desenlace
12 CRI SOS PIS INT CuerpoLinea Lineas Desenlace
13 CRI SOS PIS INT Lineas Desenlace
14 CRI SOS PIS INT Desenlace
15 CRI SOS PIS INT Resolucion EpiOpc
16 CRI SOS PIS INT REV Cierre EpiOpc
17 CRI SOS PIS INT REV EpiOpc
18 CRI SOS PIS INT REV
```

### 9.3 Gramáticas de libro, autómata de pila y búsquedas acotadas

| Id  | Caso                                   | Esperado                                                                                 |
| --- | -------------------------------------- | ---------------------------------------------------------------------------------------- |
| AR1 | `arithmetic-ambiguous`, `id + id * id` | acepta, 2 árboles                                                                        |
| AR2 | `arithmetic`, `id + id * id`           | acepta, 1 árbol; la raíz aplica `E → E '+' T`                                            |
| P1  | `parentheses`, `( ( ) ) ( )`           | acepta, 1 árbol; la cadena vacía acepta con 1 árbol                                      |
| P2  | `parentheses`, `( ( )`                 | error pos 3, found `null`, expected `['(', ')']`                                         |
| E1  | `epsilon-trap`, `x`                    | acepta, 1 árbol                                                                          |
| C1  | `cyclic`, `a`                          | acepta, conteo `'infinite'`; la enumeración con límite 3 devuelve 3 árboles              |
| AP1 | AP de G1 con A1                        | `accept`; las expansiones del camino coinciden en orden con las 18 producciones de 9.2   |
| B1  | `findAmbiguityWitness(G0, 3)`          | `null`                                                                                   |
| B2  | `findAmbiguityWitness(G0, 4)`          | `[CRI, SOS, ATQ, REV]`, 2 árboles (primera en orden de longitud y después lexicográfico) |
| B3  | `findAmbiguityWitness(G1, 7)`          | `null`                                                                                   |
| B4  | `compareLanguages(G0, G1, 3)`          | onlyInFirst = `[[CRI, DSC, REV], [HAL, DSC, REV]]`, onlyInSecond = `[]`                  |

### 9.4 Pruebas diferenciales (Earley, CYK y AP)

Para **toda** cadena del corpus exhaustivo, los tres reconocedores dan la misma aceptación: Earley sobre G, CYK sobre FNC(G) y el AP de G (que debe dar `accept` o `reject`, nunca `undetermined`). El corpus es:

- G0 y G1: todas las cadenas sobre las 14 etiquetas de largo ≤ 4 (unas 41 000).
- `arithmetic` y `arithmetic-ambiguous`: todas las cadenas sobre {id, +, *, (, )} de largo ≤ 5.
- `parentheses`: todas las cadenas sobre {(, )} de largo ≤ 8.

No se compara la cantidad de árboles entre CYK y Earley: la FNC cambia los árboles (sección 3.23).

### 9.5 Rendimiento

Se mide con `performance.now()` en Vitest, sin traza y con `maxTrees: 1`:

- **G1 con L1 (200 eventos):** reconocimiento, árbol, derivación y conteo en **menos de 1000 ms**. Es el criterio del anteproyecto.
- **G0 con L1:** reconocimiento y conteo `bigint` en **menos de 3000 ms**. G0 genera O(n³) enlaces por `Pasos → Pasos Pasos`, y el criterio lo reconoce explícitamente.

### 9.6 Chart de Earley de `CRI PIS REV` con G1

Es el valor esperado del comando `earley --grammar g1 "CRI PIS REV" --chart` y de la prueba del paso 15. Se calculó a mano: el autor lo verifica antes de implementar.

- **Orden:** los ítems se listan en el orden en que el algoritmo los agrega. Cada conjunto es una lista de solo agregado. Para que el orden sea reproducible, el spec fija esta convención:
  - los ítems de un conjunto se procesan en orden de inserción;
  - el Predictor agrega las producciones del no terminal en el orden del archivo `.grammar` y, **después**, el avance por anulable si el símbolo es anulable;
  - el Completer recorre los ítems del conjunto de origen en su orden de inserción.
- **Cantidad de ítems por conjunto:** S0 = 8, S1 = 19, S2 = 16, S3 = 11.
- **Notación de la columna "Cómo":** P = Predictor, S = Scanner, C = Completer, ε = avance por anulable (arreglo de Aycock-Horspool). "Ignorado" marca un ítem completo con origen igual al conjunto actual, que el Completer no procesa (sección 3.16).

**S0**

| #   | Ítem                                         | Origen | Cómo    |
| --- | -------------------------------------------- | ------ | ------- |
| 1   | `$S → • Relato`                              | 0      | inicial |
| 2   | `Relato → • Planteo Investigacion Desenlace` | 0      | P       |
| 3   | `Planteo → • Hecho MarcoOpc`                 | 0      | P       |
| 4   | `Planteo → • Marco Hecho`                    | 0      | P       |
| 5   | `Hecho → • CRI HallazgoOpc`                  | 0      | P       |
| 6   | `Hecho → • HAL`                              | 0      | P       |
| 7   | `Marco → • CTX PerOpc`                       | 0      | P       |
| 8   | `Marco → • PER CtxOpc`                       | 0      | P       |

**S1** (después de `CRI`)

| #   | Ítem                                         | Origen | Cómo         |
| --- | -------------------------------------------- | ------ | ------------ |
| 1   | `Hecho → CRI • HallazgoOpc`                  | 0      | S de S0#5    |
| 2   | `HallazgoOpc → • HAL`                        | 1      | P            |
| 3   | `HallazgoOpc → •`                            | 1      | P (ignorado) |
| 4   | `Hecho → CRI HallazgoOpc •`                  | 0      | ε            |
| 5   | `Planteo → Hecho • MarcoOpc`                 | 0      | C de S0#3    |
| 6   | `MarcoOpc → • Marco`                         | 1      | P            |
| 7   | `MarcoOpc → •`                               | 1      | P (ignorado) |
| 8   | `Planteo → Hecho MarcoOpc •`                 | 0      | ε            |
| 9   | `Marco → • CTX PerOpc`                       | 1      | P            |
| 10  | `Marco → • PER CtxOpc`                       | 1      | P            |
| 11  | `Relato → Planteo • Investigacion Desenlace` | 0      | C de S0#2    |
| 12  | `Investigacion → • Pasos`                    | 1      | P            |
| 13  | `Investigacion → • ENC Pasos`                | 1      | P            |
| 14  | `Pasos → • Evidencia Libres Lineas`          | 1      | P            |
| 15  | `Pasos → • Linea Lineas`                     | 1      | P            |
| 16  | `Evidencia → • PIS`                          | 1      | P            |
| 17  | `Evidencia → • INT`                          | 1      | P            |
| 18  | `Evidencia → • ATQ`                          | 1      | P            |
| 19  | `Linea → • SOS CuerpoLinea`                  | 1      | P            |

**S2** (después de `PIS`)

| #   | Ítem                                         | Origen | Cómo         |
| --- | -------------------------------------------- | ------ | ------------ |
| 1   | `Evidencia → PIS •`                          | 1      | S de S1#16   |
| 2   | `Pasos → Evidencia • Libres Lineas`          | 1      | C de S1#14   |
| 3   | `Libres → • Evidencia Libres`                | 2      | P            |
| 4   | `Libres → •`                                 | 2      | P (ignorado) |
| 5   | `Pasos → Evidencia Libres • Lineas`          | 1      | ε            |
| 6   | `Evidencia → • PIS`                          | 2      | P            |
| 7   | `Evidencia → • INT`                          | 2      | P            |
| 8   | `Evidencia → • ATQ`                          | 2      | P            |
| 9   | `Lineas → • Linea Lineas`                    | 2      | P            |
| 10  | `Lineas → •`                                 | 2      | P (ignorado) |
| 11  | `Pasos → Evidencia Libres Lineas •`          | 1      | ε            |
| 12  | `Linea → • SOS CuerpoLinea`                  | 2      | P            |
| 13  | `Investigacion → Pasos •`                    | 1      | C de S1#12   |
| 14  | `Relato → Planteo Investigacion • Desenlace` | 0      | C de S1#11   |
| 15  | `Desenlace → • Resolucion EpiOpc`            | 2      | P            |
| 16  | `Resolucion → • REV Cierre`                  | 2      | P            |

**S3** (después de `REV`, fin de la entrada)

| #   | Ítem                                         | Origen | Cómo                   |
| --- | -------------------------------------------- | ------ | ---------------------- |
| 1   | `Resolucion → REV • Cierre`                  | 2      | S de S2#16             |
| 2   | `Cierre → • CNF CapOpc`                      | 3      | P                      |
| 3   | `Cierre → • CAP`                             | 3      | P                      |
| 4   | `Cierre → •`                                 | 3      | P (ignorado)           |
| 5   | `Resolucion → REV Cierre •`                  | 2      | ε                      |
| 6   | `Desenlace → Resolucion • EpiOpc`            | 2      | C de S2#15             |
| 7   | `EpiOpc → • EPI`                             | 3      | P                      |
| 8   | `EpiOpc → •`                                 | 3      | P (ignorado)           |
| 9   | `Desenlace → Resolucion EpiOpc •`            | 2      | ε                      |
| 10  | `Relato → Planteo Investigacion Desenlace •` | 0      | C de S2#14             |
| 11  | `$S → Relato •`                              | 0      | C de S0#1 → **acepta** |

**Verificaciones que se derivan del chart:**

- Los terminales esperados en S1 (`ATQ, CTX, ENC, HAL, INT, PER, PIS, SOS`) coinciden con el error de I3 en G1.
- Los terminales esperados en S2 (`ATQ, INT, PIS, REV, SOS`) coinciden con el error de I4 en G1.

---

## 10. Hoja de ruta: specs siguientes (solo esbozo)

Estos specs **no** están definidos. Se crean con `/spec` cuando este esté implementado y tienen su propia fase de preguntas.

- **SPEC 03 — Interfaz web (MVP visual).**
  - `apps/web` con Vite + React + TypeScript, que consume `@sabueso/core` sin modificarlo.
  - Paneles en el orden del análisis: entrada de etiquetas, gramática activa (selector y editor de `.grammar`), resultado (árbol en SVG propio, derivación, árboles alternativos paginados), diagnóstico de errores, chart de Earley paso a paso (desde la traza), y paneles de análisis (FIRST/FOLLOW y LL(1), FNC paso a paso, tabla CYK, traza del AP, ambigüedad y comparación).
  - Las gramáticas se importan con `?raw`.
- **SPEC 04 — Español controlado.**
  - Un AFD léxico para palabras.
  - Una gramática de oración, analizada con el mismo motor de Earley.
  - Una tabla de reglas verbo y argumentos → etiqueta.
  - Se suma a la UI con un interruptor.
  - No condiciona la aprobación (lo dice el anteproyecto).

---

## 11. Criterios de aceptación

- [ ] `npm install`, `npm run build`, `npm test` y `npm run lint` terminan sin errores desde un clon limpio con Node 24.
- [ ] `packages/core/package.json` no tiene `dependencies`. Solo tiene `devDependencies` de TypeScript, Vitest, ESLint, Prettier y sus tipos.
- [ ] Ningún archivo de `packages/core/src/` fuera de `command-line.ts` importa módulos `node:*`. Lo verifica una prueba que lee los fuentes.
- [ ] Los 10 `.grammar` de `grammars/` (meta, 2 del género policial y 7 de pruebas) parsean con `parseGrammarText`.
- [ ] El catálogo tiene el género `policial`, con `officialGrammar` igual a `detective/g1`, `alternativeGrammar` igual a `detective/g0` y 14 etiquetas, todas terminales de G1.
- [ ] `npm run sabueso -- genres` lista el género policial con sus dos gramáticas.
- [ ] `npm run sabueso -- parse --grammar ./any.grammar "CRI"` termina con código 2 y lista los nombres válidos: la CLI no acepta rutas.
- [ ] Un `.grammar` con un literal sin cerrar en la línea 3 lanza `GrammarSyntaxError` con `line === 3`.
- [ ] Un `.grammar` con `%terminals` y un identificador no declarado que no es lado izquierdo de ninguna regla lanza un error que nombra ese identificador.
- [ ] `analyzeGrammar(meta).predictiveTable.isPredictive === true` y `analyzeGrammar(g1).predictiveTable.isPredictive === true`.
- [ ] `analyzeGrammar(g0).predictiveTable.conflicts` incluye la celda (Linea, SOS).
- [ ] Los anulables, inútiles, la vacuidad y los ciclos coinciden con los pasos 7 a 10 del plan.
- [ ] Cada caso de la tabla 9.1 da exactamente la aceptación, la cantidad de árboles y el `ParseError` (posición, `found` y `expected`) indicados, con G0 y con G1.
- [ ] La derivación de A1 con G1 es idéntica a la sección 9.2.
- [ ] El chart de `CRI PIS REV` con G1 es idéntico a la sección 9.6: mismos ítems, mismo orden y misma operación de origen en cada conjunto.
- [ ] Cada caso de la tabla 9.3 da exactamente el resultado indicado.
- [ ] `isChomskyNormalForm(toChomskyNormalForm(g).grammar)` es verdadero para G0, G1 y las 4 gramáticas de libro.
- [ ] La prueba diferencial de la sección 9.4 pasa sin discrepancias y sin resultados `undetermined`.
- [ ] La prueba de rendimiento de la sección 9.5 pasa: G1 en menos de 1000 ms y G0 en menos de 3000 ms.
- [ ] `node packages/core/dist/command-line.js parse --grammar g0 "CRI SOS PIS INT REV"` imprime "4 árboles", los 4 árboles en ASCII y la derivación del primero.
- [ ] `node packages/core/dist/command-line.js parse --grammar g1 "CTX PER PIS REV"` imprime la posición 2, `PIS` y los esperados `CRI, HAL`, y termina con código de salida 1.
- [ ] Cada paso de la sección 8.3 tiene su comando registrado en la CLI y una prueba en `test/command-line/` que verifica la salida y el código de salida.
- [ ] `npm run sabueso -- help` lista todos los comandos de la sección 8.3.
- [ ] `npm run sabueso -- earley --grammar epsilon-trap "x" --no-epsilon-fix` imprime `RECHAZA`, y sin la opción imprime `ACEPTA`.
- [ ] `npm run sabueso -- nullable --grammar g1 --steps` muestra al menos dos iteraciones y termina con los 10 anulables.
- [ ] La prueba `demo-doc.test.ts` ejecuta todos los comandos de `docs/console-demo.md` y ninguno termina con código 2.
- [ ] Existen las 27 fichas de la tabla 7.1, cada una con las cinco partes de la sección 7.1.
- [ ] Cada archivo de `src/` empieza con el bloque de comentario en inglés de la sección 7.2 (concepto, referencia y ficha).
- [ ] El README contiene el índice concepto → archivo → ficha y los comandos de la CLI.

---

## 12. Decisiones tomadas y descartadas

**Organización del trabajo**

- **Sí:** tres specs (núcleo, UI y español controlado). Siguen los hitos del anteproyecto y su regla "interfaz al final". Un solo spec mezclaría decisiones de cuatro dominios.
- **No:** un spec único con fases. Sería imposible de verificar paso a paso y contradice la metodología incremental del anteproyecto.
- **Sí:** todo el código en inglés (identificadores, comentarios, nombres de archivos y carpetas, opciones de la CLI, directivas `%start`/`%terminals`, tipos de token y no terminales de `meta.grammar`), según la regla del SPEC 01. Quedan en español los datos del dominio y de la exposición: los símbolos de G0 y G1 (`Relato`, `CRI`…), el nombre visible del género ("Policial de enigma"), la salida de la CLI (`ACEPTA`, `RECHAZA`, los grupos de `help`) y las fichas, cuyo contenido es documentación.
- **Sí:** un monorepo con npm workspaces (`packages/core` y luego `apps/web`). La frontera entre motor e interfaz queda en la estructura de carpetas: la UI no puede tocar el motor por accidente, y se ve en la defensa.
- **No:** un solo paquete con `src/core` y `src/ui`. La separación dependería solo de la disciplina.
- **Sí:** las gramáticas viven en `packages/core/grammars/`, separadas en `genres/` (lo que el programa identifica) y `test/` (internas). Son datos que usan la CLI, las pruebas y la UI.
- **Sí:** catálogo de géneros con carpeta por género. Las gramáticas las definimos nosotros, y las del usuario son solo las que identifican un género. Dejar la estructura lista hace que sumar un género futuro sea agregar datos, sin tocar el motor ni la UI.
- **No:** gramáticas de libro visibles para el usuario. No identifican ningún relato. Quedan en las pruebas y en la CLI de desarrollo.

**Tecnología**

Las decisiones generales de tecnología (TypeScript estricto, `tsc` + `node`, sin `tsx`, versión de Node, herramientas de desarrollo, idioma de los identificadores) están en el SPEC 01. Las propias del núcleo son:

- **No:** bibliotecas de parsing (nearley, chevrotain, ohm, PEG.js) o de PLN. Las prohíbe explícitamente el anteproyecto, y resolverían exactamente lo que se evalúa.
- **Sí:** cero `dependencies` de runtime en `@sabueso/core`. Lo garantiza un criterio de aceptación verificable.
- **Sí:** el núcleo no usa `node:*`, salvo la CLI. El mismo código tiene que correr en el navegador en el SPEC 03.

- **Sí:** cada paso con su comando de consola y la prueba del comando. El autor lo pidió explícitamente: cada etapa tiene que poder ejecutarse por consola y probarse. Además, cada concepto se puede demostrar en vivo apenas existe, sin depender de la UI.
- **Sí:** comandos como funciones puras con un `environment` inyectado. Se prueban en memoria (rápido, sin lanzar procesos), y `node:*` queda confinado a `command-line.ts`, que es la regla que permite reutilizar el núcleo en el navegador.
- **No:** una CLI única escrita al final. Así era la primera versión de este spec: dejaba 20 pasos sin forma de ejecutarlos fuera de las pruebas.
- **Sí:** el script `npm run sabueso` (`tsc -b` incremental + `node`). Ejecuta por consola sin `tsx` y sin pasos manuales de build.
- **Sí:** las opciones didácticas `--steps` (iteraciones de los puntos fijos) y `--no-epsilon-fix` (`classicEpsilon`). Permiten **mostrar** la convergencia de un punto fijo y el bug de ε, no solo afirmarlos. No cuestan nada cuando no se usan.
- **Sí:** un guion de consola verificado por una prueba. El guion de la exposición no puede quedar desactualizado respecto del código.

**Teoría y algoritmos**

- **Sí:** Earley como analizador principal. Acepta cualquier GLC (incluida G0, ambigua) sobre la gramática tal como se diseñó. Es la decisión del anteproyecto.
- **No:** CYK como analizador principal. Exige FNC y deforma los árboles. Se implementa igual, como comparación y como validación cruzada.
- **No:** LL(1) o LR(k) como analizador del relato. Son deterministas y G0 es ambigua.
- **Sí:** LL(1) como análisis y como lector de `.grammar`. Se usa de verdad en tres lugares (sección 1.1) y da una demostración **constructiva** de que G1 no es ambigua.
- **No:** LR(k) en cualquier forma. Ningún componente lo necesita, y el autor pidió incluirlo solo si se usa en el fondo.
- **No:** código de Máquina de Turing. Ningún algoritmo lo requiere. Su lugar teórico (decisores, Church-Turing, indecidibilidad) queda cubierto en la ficha 27, de nuevo por la regla "solo si se usa".
- **Sí:** G1 factorizada a izquierda y LL(1). Su no ambigüedad queda certificada por el propio motor de análisis, en vez de depender solo de una demostración a mano o de una búsqueda acotada que no prueba nada.
- **Costo asumido de la factorización:** G1 suma 10 no terminales `…Opc` o anulables, y la derivación de A1 tiene 18 pasos, 5 de ellos ε. Esto contradice en parte el argumento del anteproyecto ("los árboles deben corresponder al diseño"). Respuesta para la defensa: la factorización es parte de la gramática que **diseña el autor**, mientras que los `T_a` y `Xn` de la FNC los introduce la máquina. El SPEC 03 podrá colapsar visualmente los subárboles ε.
- **No:** una G1 "más legible" no LL(1) (con `Lineas → LineaAbierta Lineas | LineaCerrada Pasos`). Era no ambigua, pero solo podía argumentarse a mano. La versión LL(1) se autoverifica.
- **Sí:** G1 cambia el lenguaje (L(G1) ⊊ L(G0)). El género no admite descartar una sospecha inexistente, el anteproyecto pide comparar "qué relatos acepta una y no la otra", y `compareLanguages` lo exhibe.
- **Sí:** el formato `.grammar` propio, con lexer AFD y parser LL(1). El anteproyecto pide gramáticas como archivos de texto, y el lector aplica dos conceptos de la materia en vez de ser código ad hoc.
- **No:** gramáticas en JSON. No requiere parser, pero pierde el AFD y el LL(1), y es menos legible para la cátedra.
- **Sí:** gramáticas incorporadas por nombre (`--grammar g1`, o el nombre como argumento en `lex` y `grammar`). El propósito del programa es analizar relatos policiales con sus gramáticas.
- **Sí (decisión del 2026-11-19, cambia la anterior "solo gramáticas incorporadas"):** además, los comandos que leen una gramática aceptan `--grammar-file <ruta>` con un archivo `.grammar` propio. Sirve para probar el lexer y el parser a mano con textos nuevos, y para mostrar en la defensa que el motor es genérico con una gramática escrita en el momento. La ruta relativa se resuelve desde el directorio donde se ejecutó el comando (`INIT_CWD` de npm).
- **Sí:** la directiva `%terminals`. Evita que un error de tipeo en un no terminal se convierta silenciosamente en terminal, el error más probable al editar gramáticas.
- **Sí:** soporte de ε con Aycock-Horspool. G1 lo necesita (tiene 10 anulables), las gramáticas de libro también, y el bug de ε es un concepto atómico excelente para la exposición.
- **No:** prohibir ε. Habría que reescribir G1 sin ε, con más producciones y menos legibilidad, y se perdería el caso didáctico.
- **Sí:** el Completer ignora los ítems con lapso vacío. Es la forma más simple de evitar el doble conteo de árboles cuando el Predictor ya avanzó sobre los anulables. Es una regla de una línea, fácil de justificar.
- **Sí:** backpointers con conteo `bigint` y enumeración acotada. Es simple de explicar y responde al riesgo "cantidad excesiva de árboles" del anteproyecto (mostrar el total y enumerar hasta un límite).
- **No:** SPPF. Es más eficiente en memoria, pero bastante más difícil de explicar en una defensa oral. No hace falta para 200 eventos.
- **Sí:** árboles ε generados desde la gramática. Un enlace `nullable` no apunta a ningún ítem, así que esta es la única forma correcta de reconstruir esos subárboles y de contarlos.
- **Sí:** posiciones base 0. Es la convención natural de los índices de Earley (Sk). La UI traducirá a "evento k+1".
- **Sí:** la traza es opcional. La UI la necesita para la vista paso a paso, pero en G0 con 200 eventos costaría memoria sin aportar nada.
- **Sí:** el AP con poda por minYield y límite de pasos. El BFS sin cota no termina con recursión a izquierda. La poda es correcta, y el límite transforma un posible bucle en un `undetermined` explícito.
- **Sí:** búsquedas acotadas de ambigüedad y equivalencia. Muestran en código la diferencia entre decidible y semidecidible, y responden preguntas concretas del anteproyecto.
- **Sí:** valores esperados calculados en el spec y verificados por el autor. Respeta la metodología del anteproyecto ("los resultados esperados se calculan a mano") sin bloquear la escritura del spec.
- **Sí:** se distingue entre 4 árboles y 3 lecturas en A1. El motor cuenta árboles y el anteproyecto habla de lecturas. Explicitarlo evita una contradicción en la defensa.

---

## 13. Riesgos identificados

| Riesgo                                                                    | Mitigación                                                                                                                                                                                                |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Algún valor esperado calculado a mano está mal                            | El autor lo verifica antes de cada paso. Las pruebas diferenciales (9.4) detectan errores de aceptación de forma independiente. Si hay discrepancia, se corrige primero el spec.                          |
| G0 con 200 eventos supera 3 s o consume demasiada memoria (O(n³) enlaces) | Enlaces como objetos chicos, sin traza, enumeración con límite 1. Si igual falla, se mide y se registra en el informe como evidencia del costo de la ambigüedad. El criterio estricto de 1 s aplica a G1. |
| Doble conteo de árboles por enlaces ε duplicados                          | Regla de la sección 3.16 (el Completer ignora el lapso vacío), cubierta por las pruebas E1, P1 y la batería de G1.                                                                                        |
| Explosión de configuraciones del AP en el corpus diferencial              | Corpus acotado (largo ≤ 4 para el relato), poda por minYield y visitados. El criterio exige que no haya `undetermined`. Si aparece, se sube `maxSteps` solo en la prueba.                                 |
| La cátedra pide cambios en G1                                             | Las gramáticas son datos: los cambios no tocan el motor. Las pruebas de G1 se recalculan con el mismo método de la sección 9.                                                                             |
| La cátedra prefiere CYK                                                   | CYK ya está implementado y validado. Cambiar el analizador principal no afecta el resto.                                                                                                                  |
| Las fichas consumen tiempo del código                                     | Cada ficha se escribe en el mismo paso que su módulo, con un largo máximo de unas 2 páginas.                                                                                                              |

---

## Lo que **no** está en este spec

- Interfaz web React (SPEC 03).
- Español controlado y etiquetado automático (SPEC 04).
- Parsers LR(k) y simulador de Máquina de Turing (justificado en 1.1).
- SPPF y optimización de Leo.
- Líneas de sospecha anidadas y otros subgéneros.

Cada uno de esos puntos, si se hace, va en su propio spec.
