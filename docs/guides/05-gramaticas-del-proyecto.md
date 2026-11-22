# Guía de estudio: las gramáticas del proyecto (G0, G1 y las internas)

> **Paso 5 del SPEC 02.** Archivos: `packages/core/grammars/` (10 archivos `.grammar`), `packages/core/src/genres/`, `packages/core/src/command-line/built-in-grammars.ts`, `packages/core/src/command-line/program.ts`, los comandos `genres` y `grammars`, `test/helpers/load.ts` y `test/fixtures/l1.txt`.
> Fichas relacionadas: [`01-alphabet-and-language.md`](../concepts/01-alphabet-and-language.md), [`02-context-free-grammar.md`](../concepts/02-context-free-grammar.md). La ficha 21 (ambigüedad de G0 contra G1) se escribe en borrador en el paso 19 y se completa en el paso 27.

---

## 1. El problema que resuelve

Hasta el paso 4 el programa sabía **leer** gramáticas, pero solo tenía una de prueba (`arithmetic`). Este paso agrega **las gramáticas del proyecto**:

- las dos del **policial de enigma**: G0 (la del anteproyecto) y G1 (la oficial);
- la gramática del propio formato, `meta.grammar`;
- las gramáticas **de libro y de análisis**, que demuestran que el motor no depende del relato policial.

Y organiza todo con un **catálogo de géneros**: qué géneros identifica el programa, con qué gramáticas y con qué etiquetas.

Desde este paso, toda gramática es un **dato** (un archivo de texto), no código. Es lo que pide el anteproyecto: "modificar la gramática no requiere tocar el código".

---

## 2. Qué objetivo cumple cada archivo

### 2.1 Las gramáticas (`packages/core/grammars/`)

| Archivo                             | Nombre en la CLI       | Para qué está                                                                                 | Qué paso la usa                                                               |
| ----------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `genres/detective/g1.grammar`       | `detective/g1`, `g1`   | **la oficial**: decide si un relato es un policial de enigma. No ambigua y LL(1)              | FIRST/FOLLOW y LL(1) (11–12), Earley (13–17), árboles (18–21)                 |
| `genres/detective/g0.grammar`       | `detective/g0`, `g0`   | **la del anteproyecto**, sin cambios. Natural pero ambigua: sirve para estudiar la ambigüedad | conflictos LL(1) (12), árboles (19), conteo (20), comparación con G1 (27)     |
| `meta.grammar`                      | `meta`                 | la gramática del **formato `.grammar`**. Documenta el parser del paso 4                       | tabla LL(1) sin conflictos (12)                                               |
| `test/arithmetic-ambiguous.grammar` | `arithmetic-ambiguous` | ambigüedad clásica de libro: `id + id * id` tiene dos árboles                                 | Earley (14), caso AR1 de la tabla 9.3 (2 árboles), pruebas diferenciales (28) |
| `test/arithmetic.grammar`           | `arithmetic`           | la misma, no ambigua, con precedencia. Recursiva a izquierda: **no** es LL(1)                 | lexer y parser (3–4), conflictos LL(1) (12), Earley (14)                      |
| `test/parentheses.grammar`          | `parentheses`          | paréntesis balanceados, con ε; su lenguaje contiene la cadena vacía                           | anulables (7), longitud mínima (8), ítems (13), ε (15), CYK (25)              |
| `test/epsilon-trap.grammar`         | `epsilon-trap`         | `S → A A x`, `A → ε`: **el caso que rompe al Earley clásico**                                 | el arreglo de ε (15)                                                          |
| `test/useless.grammar`              | `test-useless`         | símbolos inútiles: A no es productivo, C no es alcanzable                                     | inútiles (9)                                                                  |
| `test/empty.grammar`                | `test-empty`           | lenguaje vacío, L(G) = ∅                                                                      | vacuidad (9)                                                                  |
| `test/cyclic.grammar`               | `test-cyclic`          | un ciclo S ⇒ A ⇒ S: infinitos árboles                                                         | ciclos (10), conteo `'infinite'` (20)                                         |

Las de `test/` son **internas**: no identifican ningún género. Sirven para dos cosas: probar que el motor es genérico ("el mismo motor funciona con gramáticas de libro", criterio del anteproyecto) y demostrar conceptos aislados por consola.

Los números de la última columna son **pasos** del spec (sección 8.3), no fichas: por ejemplo, la tabla LL(1) es el paso 12 pero la ficha 06.

### 2.2 El código

| Archivo                                 | Objetivo                                                                                                                                                                          |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/genres/types.ts`                   | los tipos `Genre` (un género: nombre, gramática oficial y alternativa, etiquetas) y `TagInfo` (una etiqueta: terminal, función narrativa y ejemplo)                               |
| `src/genres/detective-tags.ts`          | las **14 etiquetas** del policial con su función y un ejemplo: es el alfabeto Σ, con significado. Son datos de dominio, en español                                                |
| `src/genres/catalog.ts`                 | el **catálogo**: la lista de géneros. Solo datos; el motor no lo importa                                                                                                          |
| `src/command-line/built-in-grammars.ts` | el **registro de gramáticas incorporadas**: nombre → archivo, alias (`g1`, `g0`) y grupo ("Géneros" o "Desarrollo"). Las de género se arman **leyendo el catálogo**               |
| `src/command-line/grammar-source.ts`    | de dónde toma un comando su gramática: un nombre del registro o `--grammar-file` (ver la guía 03, §7.3)                                                                           |
| `src/command-line/commands/genres.ts`   | el comando `genres`: muestra el catálogo. Escribe cada gramática con sus alias usando `nameWithAliases` del registro                                                              |
| `src/command-line/commands/grammars.ts` | el comando `grammars`: lee las 10 gramáticas con la cadena completa (lexer → parser → `buildGrammar`) y muestra \|N\|, \|Σ\| y \|P\|, una tabla por cada grupo de `grammarGroups` |
| `src/command-line/run.ts` (cambio)      | `createCommandLineProgram` acepta una opción nueva, `helpFooter`: un texto que `help` muestra al final                                                                            |
| `src/command-line/program.ts` (cambio)  | registra los comandos `genres` y `grammars`, y pasa `helpFooter: formatGrammarGroups()` (las gramáticas por grupo)                                                                |
| `test/helpers/load.ts`                  | lee gramáticas con `node:fs`, **solo en las pruebas** (el programa lee a través del `environment`)                                                                                |
| `test/fixtures/l1.txt`                  | **L1**: `CRI`, 198 × `PIS`, `REV`. 200 eventos, el relato largo de las pruebas de rendimiento                                                                                     |

---

## 3. G0: la gramática del anteproyecto

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

**De dónde sale:** de la estructura clásica del policial de enigma, en tres partes. Cada regla dice algo del género:

| Regla                                         | Qué dice del relato                                                                     |
| --------------------------------------------- | --------------------------------------------------------------------------------------- |
| Relato → Planteo Investigacion Desenlace      | todo policial tiene planteo, investigación y desenlace, en ese orden                    |
| Planteo → Hecho \| Marco Hecho \| Hecho Marco | el crimen, con contexto antes o después, o sin contexto                                 |
| Hecho → CRI \| HAL \| CRI HAL                 | se narra el crimen, su hallazgo, o ambos                                                |
| Investigacion → Pasos \| ENC Pasos            | la investigación, con o sin el encargo al detective                                     |
| Pasos → Paso \| Pasos Pasos                   | uno o más pasos de investigación                                                        |
| Paso → PIS \| INT \| DSC \| ATQ \| Linea      | un paso es una pista, un interrogatorio, un descarte, un ataque o una línea de sospecha |
| Linea → SOS \| SOS Pasos                      | una sospecha, que puede abarcar los pasos siguientes                                    |
| Desenlace / Resolucion                        | la revelación, con confesión, captura y epílogo opcionales                              |

Tamaño: |N| = 10, |Σ| = 14, |P| = 28.

---

## 4. Por qué G0 es ambigua

### 4.1 La definición

Una gramática es **ambigua** si existe **una cadena** de su lenguaje con **dos árboles de derivación distintos**, o, lo que es equivalente, con dos derivaciones más a la izquierda distintas. (Hopcroft 5.4.)

G0 es ambigua por **dos** reglas:

| Regla                 | Qué no decide                                                                               | Analogía                                               |
| --------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `Pasos → Pasos Pasos` | **cómo se agrupan** los pasos: con tres pasos, ¿(P₁ P₂) P₃ o P₁ (P₂ P₃)?                    | la suma sin asociatividad: `a + b + c`                 |
| `Linea → SOS Pasos`   | **hasta dónde llega** una sospecha: ¿abarca el paso siguiente, los dos siguientes, ninguno? | el "else colgante": ¿a qué `if` corresponde el `else`? |

### 4.2 Un ejemplo: `CRI SOS PIS INT REV`

Planteo (`CRI`) y Desenlace (`REV`) tienen un solo árbol. Todo pasa en **Pasos**, con `SOS PIS INT`. Hay **4 árboles**, escritos como agrupaciones (cada par de corchetes es un nodo `Pasos → Pasos Pasos`, y `Linea(…)` muestra qué abarca la sospecha):

| Árbol | Agrupación             | Qué abarca la sospecha       | Lectura narrativa                                           |
| ----- | ---------------------- | ---------------------------- | ----------------------------------------------------------- |
| 1     | `Linea(SOS) [PIS INT]` | nada                         | se sospecha, y la investigación sigue aparte                |
| 2     | `[Linea(SOS) PIS] INT` | nada                         | la misma lectura, agrupada distinto                         |
| 3     | `Linea(SOS PIS) INT`   | la pista                     | la pista se relaciona con la sospecha; el interrogatorio no |
| 4     | `Linea(SOS PIS INT)`   | la pista y el interrogatorio | todo lo que sigue es parte de la sospecha                   |

**4 árboles, pero 3 lecturas.** Los árboles 1 y 2 cuentan lo mismo: difieren solo en cómo `Pasos → Pasos Pasos` agrupa, que no cambia el significado. El anteproyecto habla de "tres lecturas"; el motor va a contar árboles. La ficha 21 (pasos 19 y 27) desarrolla esta diferencia.

El conteo se verificó a mano. Sea P(w) la cantidad de árboles de `Pasos` sobre w:

1. Si w es un solo paso, P(w) = 1.
2. Si w = SOS·u, con u no vacía, la regla `Linea → SOS Pasos` suma P(u) árboles: la sospecha abarca todo u.
3. Por cada corte w = u·v (u y v no vacías), `Pasos → Pasos Pasos` suma P(u) × P(v).

Para `SOS PIS INT`: 1 (la sospecha abarca todo) + 1 (corte `SOS | PIS INT`) + 2 (corte `SOS PIS | INT`, porque `SOS PIS` tiene 2 árboles) = **4**.

---

## 5. La cota: cuántos árboles puede tener un relato en G0

### 5.1 Los números de Catalan

La regla `Pasos → Pasos Pasos` es exactamente la gramática de las **formas de agrupar** una secuencia con una operación binaria. Con n pasos sin sospechas (por ejemplo, n veces `PIS`), la cantidad de árboles es el **número de Catalan C(n−1)**:

C(n) = (2n)! / ((n + 1)! · n!)

| Pasos (n)       | Árboles en G0 = C(n−1)               | Árboles en G1 |
| --------------- | ------------------------------------ | ------------- |
| 1               | 1                                    | 1             |
| 2               | 1                                    | 1             |
| 3               | 2                                    | 1             |
| 4               | 5                                    | 1             |
| 5               | 14                                   | 1             |
| 6               | 42                                   | 1             |
| 7               | 132                                  | 1             |
| 8               | 429                                  | 1             |
| 198 (relato L1) | C(197): **un número de 115 dígitos** | 1             |

Los valores se verificaron calculando los árboles a mano (con la recurrencia de la sección 4.2) y comparándolos con la fórmula.

**Qué significa:** la cantidad de árboles crece **exponencialmente** con el largo del relato (C(n) crece aproximadamente como 4ⁿ / (n^(3/2) · √π)). Y eso es solo por la agrupación: si además hay sospechas, hay más árboles todavía (por ejemplo, `SOS SOS PIS` tiene 6).

**Consecuencias para el diseño:**

- No se pueden **enumerar** todos los árboles de un relato largo: el paso 20 los **cuenta** con programación dinámica, sin construirlos, y usa `bigint` porque C(197) no entra en un número común. La enumeración (paso 19) se hace **acotada**: muestra los primeros k árboles y el total.
- Para L1 con G0, reconocer el relato y contar sus árboles debe tardar menos de 3 segundos (criterio de rendimiento del spec, sección 9.5).
- **G1 siempre da 1 árbol**: es no ambigua. Por eso es la oficial.

### 5.2 La otra "cota": las búsquedas acotadas

En el spec aparece otra cota, distinta. **Decidir si una gramática cualquiera es ambigua es indecidible** (Hopcroft 9.5.2): no existe un algoritmo que lo responda siempre. Lo que sí se puede hacer es **buscar** un testigo: generar todas las cadenas hasta un largo k y ver si alguna tiene dos árboles. Si la gramática es ambigua, aumentando k el testigo **siempre aparece**; si no lo es, la búsqueda no puede probarlo. Es una **semidecisión**. Eso es el paso 27 (búsquedas acotadas).

Para G1 no hace falta buscar: la no ambigüedad se **demuestra** con el teorema "toda gramática LL(1) es no ambigua", y el paso 12 verifica en código que G1 es LL(1).

---

## 6. Cómo llegamos a G1

### 6.1 El criterio

Hay que decidir **una** lectura para cada relato, con un criterio que tenga sentido narrativo:

> Una línea de sospecha empieza en `SOS` y abarca los pasos siguientes **hasta la próxima `SOS` o hasta el desenlace**. `DSC` (el descarte) solo puede aparecer **dentro** de una línea abierta, y la cierra.

Es la misma solución que el "else colgante": por convención, el `else` corresponde al `if` más cercano (Augusto 2.4.2). Acá, cada paso corresponde a la sospecha abierta más reciente.

### 6.2 Las transformaciones, de G0 a G1

**1. Eliminar `Pasos → Pasos Pasos`** (la agrupación). Se reemplaza por **listas recursivas a derecha**, que solo tienen una forma de armarse:

```text
Pasos   -> Evidencia Libres Lineas | Linea Lineas
Libres  -> Evidencia Libres | ε          # evidencias sueltas, antes de toda sospecha
Lineas  -> Linea Lineas | ε              # una línea tras otra
```

**2. Fijar el alcance de la sospecha** (el "else colgante"). Una línea es `SOS` seguida de su cuerpo, y el cuerpo se extiende mientras haya evidencias:

```text
Linea       -> SOS CuerpoLinea
CuerpoLinea -> Evidencia CuerpoLinea | Descarte | ε
Evidencia   -> PIS | INT | ATQ
```

Como `CuerpoLinea` sigue mientras venga una evidencia, una sospecha abarca **todos** los pasos hasta la próxima `SOS` o el desenlace: no hay elección.

**3. Restringir el descarte.** `DSC` deja de ser un paso cualquiera: solo aparece dentro de una línea, y la cierra. Lo que sigue queda como evidencia libre:

```text
Descarte -> DSC Libres
```

**4. Factorizar a izquierda**, para que un token alcance para decidir (LL(1)). Cuando dos alternativas empiezan igual, se saca el prefijo común y lo opcional pasa a un no terminal con ε:

| En G0                                                   | En G1                                                                             | Por qué                              |
| ------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------ |
| `Planteo → Hecho \| Marco Hecho \| Hecho Marco`         | `Planteo → Hecho MarcoOpc \| Marco Hecho`, `MarcoOpc → Marco \| ε`                | dos alternativas empezaban con Hecho |
| `Marco → CTX \| PER \| CTX PER \| PER CTX`              | `Marco → CTX PerOpc \| PER CtxOpc`, `PerOpc → PER \| ε`, `CtxOpc → CTX \| ε`      | dos empezaban con CTX y dos con PER  |
| `Hecho → CRI \| HAL \| CRI HAL`                         | `Hecho → CRI HallazgoOpc \| HAL`, `HallazgoOpc → HAL \| ε`                        | dos empezaban con CRI                |
| `Desenlace → Resolucion \| Resolucion EPI`              | `Desenlace → Resolucion EpiOpc`, `EpiOpc → EPI \| ε`                              | las dos empezaban con Resolucion     |
| `Resolucion → REV \| REV CNF \| REV CAP \| REV CNF CAP` | `Resolucion → REV Cierre`, `Cierre → CNF CapOpc \| CAP \| ε`, `CapOpc → CAP \| ε` | las cuatro empezaban con REV         |

La factorización **no cambia el lenguaje** de esas partes: solo reorganiza las reglas para decidir con un token.

Con las cuatro transformaciones, G1 pasa de 10 a 21 no terminales. La factorización agrega 7 (`MarcoOpc`, `PerOpc`, `CtxOpc`, `HallazgoOpc`, `EpiOpc`, `Cierre`, `CapOpc`). Las listas y el cuerpo de línea agregan 5 (`Libres`, `Lineas`, `CuerpoLinea`, `Descarte`, `Evidencia`). `Paso` desaparece. Las producciones pasan de 28 a 40.

### 6.3 El resultado

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

Con G1, `CRI SOS PIS INT REV` tiene **un solo árbol**: la lectura 4 de la sección 4.2 (la sospecha abarca la pista y el interrogatorio, porque no viene otra `SOS` antes del desenlace).

**G1 es LL(1)**, y por eso no ambigua. Las celdas delicadas, verificadas a mano en el spec (el paso 12 lo repite en código):

| Decisión                                     | Tokens de una alternativa | Tokens de la otra                          | Disjuntos |
| -------------------------------------------- | ------------------------- | ------------------------------------------ | --------- |
| Libres: ¿otra evidencia o termina?           | PIS, INT, ATQ             | FOLLOW = SOS, REV                          | sí        |
| CuerpoLinea: ¿evidencia, descarte o termina? | PIS, INT, ATQ \| DSC      | FOLLOW = SOS, REV                          | sí        |
| MarcoOpc: ¿hay marco?                        | CTX, PER                  | FOLLOW = ENC, PIS, INT, ATQ, SOS           | sí        |
| HallazgoOpc: ¿hay hallazgo?                  | HAL                       | FOLLOW = CTX, PER, ENC, PIS, INT, ATQ, SOS | sí        |

### 6.4 G1 cambia el lenguaje, a propósito

**L(G1) ⊊ L(G0):** todo relato válido en G1 es válido en G0, pero no al revés.

**La inclusión L(G1) ⊆ L(G0) se demuestra** (spec, sección 4.4; la demostración completa va en la ficha 21):

1. `Relato` e `Investigacion` tienen la misma forma en las dos gramáticas, con el `ENC` opcional incluido.
2. `Planteo` y `Desenlace` generan los mismos lenguajes en G0 y en G1: la factorización no los cambia.
3. En G0, `Pasos` genera **toda** cadena no vacía sobre {PIS, INT, DSC, ATQ, SOS}. Los `Pasos` de G1 son cadenas no vacías sobre ese mismo alfabeto, así que G0 también las genera.

La inclusión es **estricta**: G1 rechaza dos cosas que G0 acepta:

| Relato                | G0     | G1      | Por qué G1 lo rechaza                    |
| --------------------- | ------ | ------- | ---------------------------------------- |
| `CRI DSC REV`         | acepta | rechaza | un descarte sin ninguna sospecha abierta |
| `CRI SOS DSC DSC REV` | acepta | rechaza | dos descartes de la misma sospecha       |

**Fundamento de género:** no se puede descartar una sospecha que nunca se planteó. El cambio de lenguaje es una decisión deliberada, y el paso 27 (`compareLanguages`) lo va a mostrar buscando relatos que una acepta y la otra no.

### 6.5 Validación: ¿las gramáticas generan el lenguaje que esperamos?

En este paso el programa todavía no analiza relatos: eso llega con Earley (pasos 13 a 17). Para no esperar, G0 y G1 se validaron con un **script descartable, que no está en el repo**. El script lee los archivos `.grammar` reales y tiene su propio conteo de árboles (programación dinámica sobre las particiones de la cadena) y su propio generador de cadenas. Hizo tres comprobaciones, y **pasaron todas**.

**a) Los relatos de prueba del spec (tabla 9.1).** Cantidad de árboles, donde 0 es rechazo:

| Caso | Relato                                    | G0                     | G1  |
| ---- | ----------------------------------------- | ---------------------- | --- |
| V1   | `CTX HAL ENC INT SOS PIS DSC REV CNF CAP` | 8                      | 1   |
| V2   | `HAL PIS REV EPI`                         | 1                      | 1   |
| V3   | `CRI ENC SOS INT DSC PIS SOS ATQ REV CAP` | 112                    | 1   |
| A1   | `CRI SOS PIS INT REV`                     | 4                      | 1   |
| M1   | `CRI PIS REV`                             | 1                      | 1   |
| I1   | `CTX PER PIS REV` (sin crimen)            | 0                      | 0   |
| I2   | relato vacío                              | 0                      | 0   |
| I3   | `CRI REV` (sin investigación)             | 0                      | 0   |
| I4   | `CRI PIS` (sin desenlace)                 | 0                      | 0   |
| I5   | `CRI DSC REV`                             | 1                      | 0   |
| I7   | `CRI SOS DSC DSC REV`                     | 4                      | 0   |
| L1   | `CRI` + 198 × `PIS` + `REV`               | C(197), de 115 dígitos | 1   |

Los doce coinciden con lo que exige el spec. Falta I6 (`CRI XYZ REV`) porque no es una cuestión de árboles: `XYZ` no está en Σ, y ese error lo detecta el tokenizador de secuencias (paso 6) antes de analizar.

**b) Generación acotada.** Se generaron **todos** los relatos de hasta 7 eventos de cada gramática:

| Medida                            | Resultado                                                                |
| --------------------------------- | ------------------------------------------------------------------------ |
| relatos de G0 / de G1             | 34.420 / 19.986                                                          |
| L(G1) ⊆ L(G0)                     | se cumple, como confirma la demostración de 6.4                          |
| relatos solo en G0                | 14.434, todos con un descarte inválido (`CRI DSC REV`, `HAL DSC REV`, …) |
| relatos de G1 con más de un árbol | 0                                                                        |
| relatos de G0 con más de un árbol | 28.965; el más corto es `CRI SOS SOS REV`                                |

**c) Las reglas del género.** Sobre cada relato generado se verificó lo que esperamos de un policial de enigma:

- abre con el crimen (`CRI` o `HAL`), quizás después del marco;
- hay al menos un paso de investigación antes de la revelación;
- hay exactamente una revelación (`REV`);
- después de `REV` solo pueden venir `CNF`, `CAP` y `EPI`, en ese orden;
- `ENC` aparece a lo sumo una vez;
- en G1, todo `DSC` cierra una sospecha abierta.

Los 34.420 relatos de G0 y los 19.986 de G1 cumplen todas.

**Qué demuestra y qué no:**

- Que G1 no es ambigua **está demostrado** para todas las cadenas, por el teorema LL(1) (el paso 12 lo verifica en código). La generación solo lo confirma hasta 7 eventos.
- Que L(G1) ⊆ L(G0) también **está demostrado** (sección 6.4): `Pasos` de G0 genera toda cadena no vacía sobre {PIS, INT, DSC, ATQ, SOS}, y el resto de las partes genera lo mismo en las dos. La generación acotada solo lo confirma.
- Comparar dos gramáticas libres de contexto **en general** es indecidible. Para este par hay una demostración directa, pero no hay un algoritmo que sirva para cualquier par: por eso el paso 27 usa una búsqueda acotada.
- Lo que queda **solo como evidencia** son las reglas del género (c): están verificadas hasta 7 eventos, no demostradas para relatos más largos.
- Estas comprobaciones pasan a ser pruebas permanentes del proyecto más adelante: la tabla 9.1 con Earley (pasos 14 a 16) y el conteo de árboles (paso 20), y la generación acotada y `compareLanguages` en el paso 27. Las reglas del género (c) no están en el spec; la propuesta es sumarlas como prueba en el paso 27.

---

## 7. `meta.grammar`

La gramática del formato `.grammar`, escrita en el mismo formato. Ya se explicó en la guía del paso 4: sus terminales son los 9 tipos de token del lexer, y tiene un no terminal por cada función del parser. Tiene |N| = 9, |Σ| = 9, |P| = 17.

Que el formato pueda leer su propia gramática es una buena verificación: `meta.grammar` pasa por el mismo lexer y el mismo parser que describe.

---

## 8. El catálogo de géneros

```ts
export const genres: readonly Genre[] = [
  {
    id: 'detective',
    name: 'Policial de enigma',
    description:
      'A crime, an investigation with clues and suspicions, and the reveal of the culprit.',
    officialGrammar: 'detective/g1',
    alternativeGrammar: 'detective/g0',
    tags: detectiveTags, // las 14 etiquetas, con su función y un ejemplo
  },
];
```

- **Un género es un lenguaje** sobre su propio alfabeto de etiquetas. El catálogo lo describe con datos: su nombre, sus gramáticas y su alfabeto Σ con significado.
- **El motor no importa el catálogo:** sigue siendo genérico. El catálogo lo usan la CLI (y la web, en el SPEC 03).
- Una prueba verifica que **las etiquetas del catálogo son exactamente Σ** de G0 y de G1.

### 8.1 Cómo sumar un género

Por ejemplo, el policial negro (del trabajo futuro del anteproyecto). Son dos archivos nuevos (tres si tiene gramática alternativa) y una entrada en el catálogo, que ya existe:

| #   | Qué                                                        | Dónde                                                                                                                                                        |
| --- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | las gramáticas del género, con nombre `<género>/<versión>` | `packages/core/grammars/genres/noir/g1.grammar` (y una alternativa, si se quiere)                                                                            |
| 2   | sus etiquetas, con función narrativa y ejemplo             | `packages/core/src/genres/noir-tags.ts`, igual a `detective-tags.ts`                                                                                         |
| 3   | una entrada en el catálogo                                 | `packages/core/src/genres/catalog.ts`: importar `noirTags` y agregar `{ id: 'noir', name: 'Policial negro', officialGrammar: 'noir/g1', tags: noirTags, … }` |

Con eso, sin tocar nada más:

- **los comandos lo reconocen:** `grammar noir/g1` y `lex noir/g1` funcionan, y el género aparece en `genres`, `grammars` y `help`, porque el registro de gramáticas **lee el catálogo**;
- **las pruebas del catálogo lo validan solas:** recorren cada género y verifican que sus gramáticas existan y que sus etiquetas sean exactamente Σ;
- **el motor no cambia:** Earley y los análisis trabajan con cualquier gramática.

Dos detalles:

- **Alias cortos:** `g1` y `g0` son del policial de enigma. Si el nuevo género quiere los suyos (por ejemplo `noir`), se agregan a la tabla `aliases` de `command-line/built-in-grammars.ts`.
- **La lista exacta de gramáticas:** `test/built-in-grammars.test.ts` verifica la lista de las 10 gramáticas y sus tamaños, así que hay que sumar la nueva. Es intencional: ninguna gramática se agrega ni se pierde sin que una prueba lo note.

---

## 9. Los nombres y los comandos

### 9.1 El registro de gramáticas

`command-line/built-in-grammars.ts` tiene las 10 gramáticas en dos grupos. Los grupos están en la constante `grammarGroups` (`['Géneros', 'Desarrollo'] as const`), y el tipo `GrammarGroup` se deduce de ella:

| Grupo      | Gramáticas                                                                                                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| Géneros    | `detective/g1` (alias `g1`), `detective/g0` (alias `g0`)                                                                 |
| Desarrollo | `meta`, `arithmetic-ambiguous`, `arithmetic`, `parentheses`, `epsilon-trap`, `test-useless`, `test-empty`, `test-cyclic` |

| Función                             | Qué hace                                                                                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `listBuiltInGrammars()`             | las 10, primero las de género                                                                                                               |
| `findBuiltInGrammar(name)`          | busca por nombre **o alias**: `g1` y `detective/g1` dan la misma                                                                            |
| `builtInGrammarIds()`               | los nombres de las 10, para el mensaje `Unknown grammar: …`                                                                                 |
| `formatGrammarGroups()`             | el texto que `help` muestra al final                                                                                                        |
| `nameWithAliases(grammar)`          | `detective/g1 (g1)`: el nombre con sus alias. La usan `formatGrammarGroups` y el comando `genres`                                           |
| `builtInGrammarPath(grammar)`       | la ruta del archivo `.grammar` en el disco                                                                                                  |
| `genreGrammars(genre)` (interna)    | arma la oficial y la alternativa de un género. La ruta sale del id de la gramática: `detective/g1` → `grammars/genres/detective/g1.grammar` |
| `developmentGrammar(...)` (interna) | arma una gramática del grupo Desarrollo                                                                                                     |

### 9.2 Consola

```sh
npm run sabueso -- help
npm run sabueso -- genres
npm run sabueso -- grammars
npm run sabueso -- grammar g0
```

`grammars` lee las 10 con la cadena completa y muestra sus tamaños:

```text
Géneros:

Grammar       Aliases  |N|  |Σ|  |P|  Description
------------  -------  ---  ---  ---  ---------------------------------------
detective/g1  g1       21   14   40   Policial de enigma: official grammar
detective/g0  g0       10   14   28   Policial de enigma: alternative grammar

Desarrollo:

Grammar               Aliases  |N|  |Σ|  |P|  Description
--------------------  -------  ---  ---  ---  --------------------------------------------------------
meta                           9    9    17   The grammar of the .grammar format (LL(1))
arithmetic-ambiguous           1    5    4    E → E + E | E * E | ( E ) | id: ambiguous
…
```

`genres` muestra el policial con sus dos gramáticas y la tabla de las 14 etiquetas.

---

## 10. Las pruebas

### 10.1 `test/built-in-grammars.test.ts`

| Prueba         | Qué verifica                                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------------------- |
| las 10         | la lista exacta de gramáticas incorporadas                                                                                |
| parsean        | cada una se lee con la cadena completa (lexer → parser → `buildGrammar`) sin errores                                      |
| tamaños        | \|N\|, \|Σ\|, \|P\| de las 10. G0: 10/14/28 y G1: 21/14/40, como exige el spec                                            |
| alias          | `g1` y `g0` resuelven a las gramáticas del policial                                                                       |
| G0             | conserva las dos reglas ambiguas del anteproyecto                                                                         |
| G1             | empieza en Relato y tiene sus 10 producciones ε (las de las partes opcionales)                                            |
| `meta.grammar` | Σ son exactamente los 9 tipos de token del lexer; N son las 9 funciones del parser                                        |
| catálogo       | el policial con G1 oficial y G0 alternativa; sus gramáticas existen; **sus 14 etiquetas son exactamente Σ** de G0 y de G1 |
| L1             | 200 eventos: `CRI`, 198 × `PIS`, `REV`, todos en Σ de G1                                                                  |

### 10.2 Comandos

| Archivo (`test/command-line/`)       | Prueba                                | Qué verifica                                                                  |
| ------------------------------------ | ------------------------------------- | ----------------------------------------------------------------------------- |
| `genres.test.ts`                     | `genres`                              | el policial, sus dos gramáticas con alias y la tabla de las 14 etiquetas      |
| `grammars.test.ts`                   | `grammars`                            | los dos grupos, en orden, con los tamaños correctos                           |
| `grammar.test.ts`                    | `grammar g0` y `grammar detective/g0` | el alias y el nombre completo dan la misma gramática, con sus 28 producciones |
| `run.test.ts`                        | `help`                                | termina con las gramáticas por grupo                                          |
| `genres.test.ts`, `grammars.test.ts` | errores de uso                        | `genres` y `grammars` no aceptan argumentos (código 2)                        |

---

## 11. Preguntas probables en la defensa

**¿Por qué las gramáticas son archivos `.grammar` y no código?**
Porque el anteproyecto pide que "modificar la gramática no requiere tocar el código". Una gramática es un dato: se lee con el lexer y el parser de los pasos 3 y 4. Cambiar G1, o sumar un género, no toca el motor.

**¿Qué es una gramática ambigua?**
Una que tiene al menos una cadena con dos árboles de derivación distintos (o dos derivaciones más a la izquierda distintas).

**¿Por qué G0 es ambigua?**
Por dos reglas. `Pasos → Pasos Pasos` no decide cómo se agrupan los pasos (como una suma sin asociatividad). `Linea → SOS Pasos` no decide hasta dónde llega una sospecha (como el "else colgante").

**¿Cuántos árboles tiene `CRI SOS PIS INT REV` en G0? ¿Y lecturas?**
4 árboles y 3 lecturas: la sospecha abarca nada, la pista, o la pista y el interrogatorio. Dos de los árboles difieren solo en la agrupación de los pasos, que no cambia el significado.

**¿Cuántos árboles puede llegar a tener un relato en G0?**
Con n pasos sin sospechas, C(n−1), el número de Catalan: crece exponencialmente. Para el relato L1 (198 pistas) es C(197), un número de 115 dígitos. Por eso los árboles se cuentan con programación dinámica y `bigint`, y se enumeran de forma acotada.

**¿Cómo se resolvió la ambigüedad en G1?**
Con un criterio narrativo: una sospecha abarca todo hasta la próxima sospecha o el desenlace, y un descarte cierra la sospecha abierta. En la gramática: listas recursivas a derecha en lugar de `Pasos → Pasos Pasos`, y un cuerpo de línea que se extiende mientras haya evidencias. Además, se factorizó a izquierda para que sea LL(1).

**¿Cómo se sabe que G1 no es ambigua?**
Porque es LL(1), y toda gramática LL(1) es no ambigua: para cada prefijo y cada token hay una sola producción aplicable, así que la derivación más a la izquierda es única. El paso 12 lo verifica en código: la tabla LL(1) de G1 no tiene conflictos.

**¿G0 y G1 generan el mismo lenguaje?**
No: L(G1) ⊊ L(G0). G1 rechaza un descarte sin sospecha abierta (`CRI DSC REV`) y dos descartes de la misma sospecha. Es un cambio deliberado: no se puede descartar una sospecha que nunca se planteó.

**¿Se puede decidir si una gramática cualquiera es ambigua?**
No, es indecidible. Solo se puede buscar un testigo hasta un largo k (una semidecisión): si la gramática es ambigua, el testigo aparece aumentando k. Para G1 no hace falta: el teorema LL(1) lo demuestra.

**¿Cómo sabes que G1 genera el lenguaje que esperas?**
Se validó con un script independiente: los doce relatos de la tabla 9.1 dan los árboles esperados en G0 y en G1, y se generaron todos los relatos de hasta 7 eventos (34.420 de G0, 19.986 de G1). Todos cumplen las reglas del género, y ningún relato de G1 tiene más de un árbol. Dos cosas están demostradas para todo largo: que G1 no es ambigua, por ser LL(1), y que L(G1) ⊆ L(G0), porque `Pasos` de G0 genera toda cadena no vacía sobre {PIS, INT, DSC, ATQ, SOS} y las demás partes generan lo mismo en las dos. La generación solo las confirma. Lo que queda como evidencia hasta 7 eventos son las reglas del género.

**¿Cómo se agrega otro género?**
Con datos, sin tocar el motor: sus archivos `.grammar` en `grammars/genres/<id>/`, sus etiquetas y una entrada en el catálogo. El registro de gramáticas, los comandos y las pruebas del catálogo lo toman automáticamente.

**¿Para qué están las gramáticas de `test/`?**
Para probar que el motor es genérico (funciona con gramáticas de libro sin cambios) y para demostrar conceptos aislados: la ambigüedad clásica, ε, el caso que rompe al Earley clásico, los inútiles, el lenguaje vacío y los ciclos.
