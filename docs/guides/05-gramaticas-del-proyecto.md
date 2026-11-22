# 05 — Las gramáticas del proyecto (G0, G1 y las internas)

> Archivos: `packages/core/grammars/` (10 archivos `.grammar`), `packages/core/src/genres/`, `packages/core/src/command-line/built-in-grammars.ts`, `packages/core/src/command-line/program.ts`, los comandos `genres` y `grammars`, `packages/core/test/helpers/load.ts` y `packages/core/test/fixtures/l1.txt`.

## 1. Teoría

Una gramática es **ambigua** si alguna cadena de su lenguaje tiene **dos árboles de derivación distintos** (o, lo que es lo mismo, dos derivaciones más a la izquierda distintas).

El proyecto tiene dos gramáticas del policial de enigma:

- **G0**, la del anteproyecto: natural, pero ambigua.
- **G1**, la oficial: no ambigua, porque es LL(1) y toda gramática LL(1) es no ambigua ([guía 12](12-tabla-ll1-y-no-ambiguedad.md)).

G0 es ambigua por dos reglas:

| Regla                 | Qué no decide                                        | Analogía                               |
| --------------------- | ---------------------------------------------------- | -------------------------------------- |
| `Pasos → Pasos Pasos` | cómo se agrupan los pasos: ¿(P₁ P₂) P₃ o P₁ (P₂ P₃)? | la suma sin asociatividad: `a + b + c` |
| `Linea → SOS Pasos`   | hasta dónde llega una sospecha                       | el "else colgante"                     |

### Ejemplo

`CRI SOS PIS INT REV` tiene **4 árboles en G0** y **1 en G1**. Todo pasa en `SOS PIS INT`:

| Árbol | Agrupación en G0       | Qué abarca la sospecha       |
| ----- | ---------------------- | ---------------------------- |
| 1     | `Linea(SOS) [PIS INT]` | nada                         |
| 2     | `[Linea(SOS) PIS] INT` | nada (agrupado distinto)     |
| 3     | `Linea(SOS PIS) INT`   | la pista                     |
| 4     | `Linea(SOS PIS INT)`   | la pista y el interrogatorio |

G1 se queda solo con el árbol 4: una sospecha abarca todo hasta la próxima `SOS` o el desenlace. Con n pasos sin sospechas, G0 tiene C(n−1) árboles (números de Catalan, crecen exponencialmente; ver la [guía 20](20-conteo-de-arboles.md)); G1 siempre tiene 1.

## 2. Por qué así

- **Las gramáticas son datos, no código.** Es lo que pide el anteproyecto: "modificar la gramática no requiere tocar el código". Cada una es un archivo que se lee con el lexer y el parser de las guías [03](03-lexer-afd.md) y [04](04-parser-ll1.md).
- **G0 se conserva sin cambios** para estudiar la ambigüedad y comparar con G1.
- **De G0 a G1**, cuatro transformaciones:
  1. `Pasos → Pasos Pasos` se reemplaza por listas recursivas a derecha (`Libres`, `Lineas`), que solo se arman de una forma.
  2. Una línea es `SOS CuerpoLinea`, y el cuerpo sigue mientras vengan evidencias: así se fija el alcance de la sospecha, como el `else` que va con el `if` más cercano.
  3. `DSC` solo aparece dentro de una línea y la cierra.
  4. Se factoriza a izquierda (`MarcoOpc`, `HallazgoOpc`, `Cierre`…) para decidir con un token.
- **G1 cambia el lenguaje a propósito:** L(G1) ⊊ L(G0). G1 rechaza `CRI DSC REV` (descartar una sospecha que nunca se planteó) y `CRI SOS DSC DSC REV` (dos descartes de la misma).
- **Gramáticas internas** (`test/`): prueban que el motor es genérico y muestran conceptos aislados por consola.
- **El catálogo de géneros** describe cada género con datos. El motor no lo importa: sigue siendo genérico.

### Las 10 gramáticas

| Nombre en la CLI       | Para qué está                                         | Guía que la usa    |
| ---------------------- | ----------------------------------------------------- | ------------------ |
| `detective/g1`, `g1`   | la oficial: no ambigua y LL(1)                        | 11 a 21            |
| `detective/g0`, `g0`   | la del anteproyecto, ambigua                          | 12, 19, 20, 27     |
| `meta`                 | la gramática del formato `.grammar`                   | 04, 12             |
| `arithmetic-ambiguous` | ambigüedad de libro: `id + id * id` tiene dos árboles | 14, 28             |
| `arithmetic`           | la misma con precedencia; recursiva a izquierda       | 03, 04, 12, 14     |
| `parentheses`          | paréntesis balanceados, con ε                         | 07, 08, 13, 15, 25 |
| `epsilon-trap`         | `S → A A x`, `A → ε`: rompe al Earley clásico         | 15                 |
| `test-useless`         | símbolos inútiles                                     | 09                 |
| `test-empty`           | lenguaje vacío                                        | 09                 |
| `test-cyclic`          | un ciclo S ⇒ A ⇒ S: infinitos árboles                 | 10, 20             |

### G0 y G1

```text
# G0
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

```text
# G1
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

Las dos empiezan con `%start Relato` y `%terminals CTX PER CRI HAL ENC PIS INT SOS DSC ATQ REV CNF CAP EPI`. Tamaños: G0 tiene |N| = 10, |Σ| = 14, |P| = 28; G1, |N| = 21, |Σ| = 14, |P| = 40.

## 3. El código, función por función

### 3.1 Los géneros (`packages/core/src/genres/`)

| Archivo             | Qué tiene                                                                                             |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| `types.ts`          | `Genre` (nombre, gramática oficial y alternativa, etiquetas) y `TagInfo` (terminal, función, ejemplo) |
| `detective-tags.ts` | las 14 etiquetas del policial con su función y un ejemplo: el alfabeto Σ, con significado             |
| `catalog.ts`        | la lista de géneros. Solo datos                                                                       |

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

- Un género es un lenguaje sobre su propio alfabeto de etiquetas.
- Sumar un género (por ejemplo, el policial negro) son datos: sus `.grammar` en `grammars/genres/<id>/`, un archivo de etiquetas y una entrada aquí. El registro, los comandos y las pruebas del catálogo lo toman solos; solo hay que sumarlo a la lista exacta de `test/built-in-grammars.test.ts`, a propósito.

### 3.2 El registro de gramáticas (`packages/core/src/command-line/built-in-grammars.ts`)

Las 10 gramáticas en dos grupos, `grammarGroups = ['Géneros', 'Desarrollo'] as const`. Las de género se arman **leyendo el catálogo**.

| Función                             | Qué hace                                                                                               |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `listBuiltInGrammars()`             | las 10, primero las de género                                                                          |
| `findBuiltInGrammar(name)`          | busca por nombre **o alias**: `g1` y `detective/g1` dan la misma                                       |
| `builtInGrammarIds()`               | los nombres de las 10, para el mensaje `Unknown grammar: …`                                            |
| `formatGrammarGroups()`             | el texto que `help` muestra al final                                                                   |
| `nameWithAliases(grammar)`          | `detective/g1 (g1)`. La usan `formatGrammarGroups` y el comando `genres`                               |
| `builtInGrammarPath(grammar)`       | la ruta del `.grammar`, relativa al código (funciona desde cualquier carpeta)                          |
| `genreGrammars(genre)` (interna)    | arma la oficial y la alternativa de un género: `detective/g1` → `grammars/genres/detective/g1.grammar` |
| `developmentGrammar(...)` (interna) | arma una gramática del grupo Desarrollo                                                                |

### 3.3 Comandos y otros cambios

| Archivo                             | Qué hace                                                                                 |
| ----------------------------------- | ---------------------------------------------------------------------------------------- |
| `command-line/commands/genres.ts`   | muestra el catálogo: cada género, sus gramáticas con alias y la tabla de etiquetas       |
| `command-line/commands/grammars.ts` | lee las 10 con la cadena completa y muestra \|N\|, \|Σ\| y \|P\|, una tabla por grupo    |
| `command-line/run.ts`               | `createCommandLineProgram` acepta `helpFooter`, un texto que `help` muestra al final     |
| `command-line/program.ts`           | registra `genres` y `grammars` y pasa `helpFooter: formatGrammarGroups()`                |
| `test/helpers/load.ts`              | lee gramáticas con `node:fs`, solo en las pruebas (el programa lee por el `environment`) |
| `test/fixtures/l1.txt`              | L1: `CRI`, 198 × `PIS`, `REV`. 200 eventos, para las pruebas de rendimiento              |

## 4. Consola y pruebas

```sh
npm run sabueso -- grammars
```

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

También: `genres`, `help` y `grammar g0`.

**`packages/core/test/built-in-grammars.test.ts`:**

| Prueba         | Qué verifica                                                                       |
| -------------- | ---------------------------------------------------------------------------------- |
| las 10         | la lista exacta de gramáticas incorporadas                                         |
| parsean        | cada una se lee con la cadena completa sin errores                                 |
| tamaños        | \|N\|, \|Σ\|, \|P\| de las 10 (G0: 10/14/28, G1: 21/14/40)                         |
| alias          | `g1` y `g0` resuelven a las gramáticas del policial                                |
| G0             | conserva las dos reglas ambiguas del anteproyecto                                  |
| G1             | empieza en Relato y tiene sus 10 producciones ε                                    |
| `meta.grammar` | Σ son los 9 tipos de token del lexer; N son las 9 funciones del parser             |
| catálogo       | G1 oficial y G0 alternativa existen; las 14 etiquetas son exactamente Σ de las dos |
| L1             | 200 eventos, todos en Σ de G1                                                      |

**Comandos (`packages/core/test/command-line/`):** `genres.test.ts` (el catálogo y las etiquetas), `grammars.test.ts` (los dos grupos con sus tamaños), `grammar.test.ts` (`g0` y `detective/g0` dan lo mismo), `run.test.ts` (`help` termina con las gramáticas por grupo); `genres` y `grammars` rechazan argumentos con código 2.

## 5. Referencias

- Hopcroft, Motwani y Ullman, _Introducción a la teoría de autómatas, lenguajes y computación_, sección 5.4 (ambigüedad).
- Augusto, sección 2.4.2 (el "else colgante").
