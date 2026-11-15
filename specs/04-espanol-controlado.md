# SPEC 04 — Español controlado: del texto del relato a la secuencia de etiquetas

> **Estado:** Borrador
> **Depende de:** SPEC 01, SPEC 02, SPEC 03
> **Fecha:** 2026-11-14
> **Objetivo:** Construir `@sabueso/nl`, un paquete que traduce un relato escrito en español controlado (oraciones simples, una por evento, con un vocabulario cerrado) a la secuencia de etiquetas que analiza el núcleo, reutilizando el AFD y el motor de Earley del SPEC 02 y explicando en la UI por qué cada oración recibió su etiqueta.

---

## 1. Por qué existe este spec

El anteproyecto define esta etapa como "ampliación opcional": tres etapas (autómata finito léxico, gramática de oración con el mismo motor de Earley y tabla de reglas), que se encaran solo con el núcleo terminado. Este spec la concreta con tres principios:

1. **El núcleo no se modifica.** `@sabueso/nl` depende de `@sabueso/core` y usa solo su API pública (`runDfa`, `parseGrammarText`, `buildGrammar`, `parse`, `analyzeGrammar`, `findAmbiguityWitness`). Así se cumple lo que dice el anteproyecto: "la ampliación se conecta delante, sin modificarlo".
2. **Los conceptos de la materia que el núcleo usa poco aparecen acá.** Son autómatas finitos aplicados a texto, el **autómata finito traductor** (Augusto 1.3.3), el **homomorfismo** palabra → categoría y la ambigüedad natural (el sintagma preposicional). Además, la regla "el culpable apareció antes", que la ficha 26 declara fuera de las GLC, se puede **verificar en código** porque ahora los personajes tienen nombre.
3. **Escalable por datos.** El vocabulario, la gramática de oración y las reglas de etiquetado son archivos de texto. Ampliar el español aceptado (coordinación, más verbos, pronombres) consiste en cambiar datos y, como mucho, el extractor de marcos. El motor no cambia (ver sección 9).

---

## 2. Alcance

**Entra:**

- El paquete `packages/nl` (`@sabueso/nl`), con una sola dependencia: `@sabueso/core`.
- **Lexer de texto con AFD** (tabla propia sobre el `runDfa` del núcleo): palabras con o sin mayúscula inicial, punto final y errores para cualquier otro carácter.
- **Lexer de archivos de datos con AFD** y **parsers LL(1)** para `lexico.txt` y `reglas.txt`. Sus meta-gramáticas (`meta-lexico.glc` y `meta-reglas.glc`) se certifican LL(1) con el `analyzeGrammar` del núcleo.
- **Morfología con un transductor de Mealy** construido como un trie de sufijos invertidos, más irregulares y contracciones del léxico.
- **Léxico cerrado** de 100 a 150 entradas: categoría y clase semántica.
- **Gramática de oración `oracion.glc`** sobre categorías, para oraciones simples: sujeto, verbo, objeto directo opcional y complementos con preposición. Se analiza con el `parse` del núcleo, incluida su ambigüedad.
- **Extracción del marco semántico** desde el árbol: sujeto, verbo, objetos, complementos y personajes.
- **Reglas de etiquetado** en orden de prioridad: gana la primera coincidencia. Cada oración informa la regla aplicada (con número de línea) como justificación.
- **Política de ambigüedad:** si todos los árboles de una oración dan la misma etiqueta, se acepta con una nota. Si dan etiquetas distintas, es un error.
- **Errores localizados sin adivinar:** carácter no permitido, falta el punto final, palabra desconocida (con sugerencia por distancia de Levenshtein), oración fuera de la gramática (con las categorías esperadas que da Earley), oración sin regla y etiqueta ambigua.
- **Verificación del culpable**, aparte de la gramática: el acusado de la oración REV tiene que haber aparecido en alguna oración anterior. Si no, se emite una advertencia.
- **CLI `sabueso-nl`, un comando por etapa** (sección 7.1): `lex-texto`, `lex-datos`, `lexico`, `reglas`, `mealy`, `palabra`, `sugerir`, `distancia`, `oracion`, `marco`, `etiqueta`, `culpable` y `etiquetar`. Cada comando tiene su prueba.
- **Integración en la UI** (`apps/web`):
  - interruptor "Etiquetas | Español controlado";
  - tabla de oraciones con etiqueta, regla, árboles y personajes;
  - árbol de cada oración;
  - la secuencia resultante pasa a la vista Análisis existente.
- Tres relatos de ejemplo (`ashby.txt`, `condesa.txt` y `banquero.txt`) con sus resultados esperados.
- Fichas 28 a 35 en `docs/conceptos/`.

**Fuera de alcance (para specs futuros):**

- Coordinación con "y", pronombres y anáfora, subordinadas, oraciones con varios eventos, voz pasiva, tiempos compuestos y preguntas. El diseño las prevé (sección 9), pero no se implementan.
- Ambigüedad léxica: una forma con dos categorías. El léxico la prohíbe por validación (ver Decisiones).
- Texto libre arbitrario, aprendizaje automático y modelos estadísticos (fuera de alcance según el anteproyecto).
- Etiqueta manual de respaldo cuando una oración falla. El autor eligió "error localizado, sin adivinar".
- Cambios en `@sabueso/core`.
- Otros idiomas.

---

## 3. Fundamentos teóricos que se implementan

### 3.1 Pipeline: composición de traducciones

```text
texto ─AFD texto─► palabras ─transductor + léxico─► (lema, categoría, clase)
      ─h: palabra→categoría─► cadena de categorías ─Earley(oracion.glc)─► árboles
      ─marco + reglas─► etiqueta por oración ─► secuencia ─Earley(G1)─► relato
                                                      └─► verificación del culpable
```

Hay **dos niveles de gramática** con el **mismo motor**:

- el nivel oración, cuyos terminales son las categorías;
- el nivel relato, cuyos terminales son las etiquetas.

Este es el argumento central de la ficha 33: la salida de un análisis sintáctico es la entrada de otro.

### 3.2 AFD del texto (ficha 28)

- **Clases de caracteres:** minúscula (con á é í ó ú ü ñ), mayúscula (con Á É Í Ó Ú Ü Ñ), espacio, salto de línea, punto y otro.
- **Tokens:**
  - `PALABRA_MAY`: mayúscula inicial seguida de minúsculas;
  - `PALABRA`: solo minúsculas;
  - `PUNTO`;
  - los espacios se descartan.
- **Errores:**
  - cualquier carácter de la clase "otro" (coma, dígito, comillas, signos de interrogación) es un error léxico con línea y columna. La etapa 1 no acepta comas, por diseño;
  - una palabra con una mayúscula en el medio (como "MiLLer") es un error;
  - un texto que no termina en punto da el error "falta el punto final".
- **Segmentación:** una oración es la secuencia de palabras hasta un `PUNTO`.
- Referencias: Augusto 1.3; Hopcroft 2.2.

### 3.3 AFD de archivos de datos (ficha 28)

El mismo ejecutor `runDfa`, con otra tabla. Tokens:

- `PALABRA`: empieza en minúscula o es una palabra capitalizada, como "Kent";
- `MAYUS`: dos o más letras, todas mayúsculas, como `SUST` o `HAL`;
- `CONDICION`: palabra, `:` y palabra, como `objeto:cadaver`;
- `IGUAL` (`=`), `FLECHA` (`->`), `NL` y `FIN`;
- comentarios `#`.

La distinción entre `PALABRA` y `MAYUS` la decide el **estado** del autómata (sección 3.3 del SPEC 02): después de una mayúscula, si sigue otra mayúscula el autómata va a "todo mayúsculas", y si sigue una minúscula va a "palabra". Es un buen ejemplo de que el AFD "recuerda" una cantidad finita de información.

### 3.4 Parsers LL(1) de léxico y reglas (ficha 28)

`meta-lexico.glc`:

```text
%inicio Archivo
%terminales PALABRA MAYUS IGUAL NL FIN
Archivo  -> Linea Archivo | FIN
Linea    -> NL | PALABRA Resto
Resto    -> MAYUS ClaseOpc NL | IGUAL PALABRA Palabras NL
ClaseOpc -> PALABRA | ε
Palabras -> PALABRA Palabras | ε
```

`meta-reglas.glc`:

```text
%inicio Archivo
%terminales PALABRA CONDICION FLECHA MAYUS NL FIN
Archivo     -> Linea Archivo | FIN
Linea       -> NL | Regla
Regla       -> PALABRA Condiciones FLECHA MAYUS NL
Condiciones -> CONDICION Condiciones | ε
```

Las dos son LL(1). El cálculo a mano da FOLLOW(ClaseOpc) = FOLLOW(Palabras) = {NL} y FOLLOW(Condiciones) = {FLECHA}, todos disjuntos de los FIRST de las alternativas. Los parsers son descendentes recursivos, con una función por no terminal, igual que el lector de `.glc` del SPEC 02.

**Semántica de una línea de `lexico.txt`:**

- `forma CATEGORIA [clase]` es una entrada. Los verbos se escriben en infinitivo, y los nombres propios con mayúscula (`Kent NOMBRE lugar`).
- `forma = lema` (una palabra a la derecha) es un **irregular**: `fue = ser`.
- `forma = p1 p2 …` (dos o más palabras) es una **contracción**: `al = a el`.

### 3.5 Morfología: trie de sufijos y transductor de Mealy (ficha 29)

- **Tabla de sufijos** (`suffixes.ts`), con reemplazo y rasgos:

  | Sufijo | Reemplazo | Rasgos |
  | --- | --- | --- |
  | `ó` | `ar` | pret3s |
  | `ió` | `er` o `ir` | pret3s |
  | `aron` | `ar` | pret3p |
  | `ieron` | `er` o `ir` | pret3p |
  | `aba` | `ar` | imp3s |
  | `aban` | `ar` | imp3p |
  | `ía` | `er` o `ir` | imp3s |
  | `ían` | `er` o `ir` | imp3p |
  | `s` | (nada) | pl |
  | `es` | (nada) | pl |

- **Construcción:** los sufijos se insertan **invertidos** en un trie. El trie es un AFD: cada nodo es un estado y cada arista es una transición por letra.
- **Transductor de Mealy:** la máquina lee la palabra **de derecha a izquierda**. Cada transición que completa un sufijo **emite** una salida (largo del sufijo, reemplazos y rasgos). Una palabra puede emitir varias salidas: "temió" emite `ó` e `ió`.
- **Candidatos:** cada salida genera candidatos de lema (raíz + reemplazo). Se agrega siempre el candidato identidad (la palabra misma, sin rasgos).
- **Validación contra el léxico:** se queda solo el candidato cuyo lema existe en el léxico con una categoría compatible. Los rasgos verbales solo valen para `VERBO`, y `pl` solo para `SUST` y `ADJ`.
- **Resultado:**
  - si queda un solo candidato, ese es;
  - si no queda ninguno, la palabra es **desconocida**;
  - si quedan dos o más, es el error `ambiguous-form`. Es un problema de datos, y el mensaje lo dice.
- **Orden de búsqueda:** contracción → irregular → transductor → nombre propio (sección 3.6).
- **Normalización:** la búsqueda se hace en minúsculas. El acento es significativo (`cadáver` ≠ `cadaver`), y la sugerencia de Levenshtein cubre el caso de un acento faltante.
- Referencias: Augusto 1.3.3 (autómatas finitos traductores); Hopcroft 2.2.

### 3.6 Léxico como homomorfismo palabra → categoría (ficha 30)

- Cada palabra resuelta se reemplaza por su categoría: h(encontró) = VERBO, h(cadáver) = SUST.
- Los terminales de `oracion.glc` son las categorías: Σ_oración = {ADJ, DET, INDEF, NOMBRE, PREP, SUST, TITULO, VERBO}.
- h es un **homomorfismo** de un símbolo a un símbolo. El lema, la clase y la superficie viajan aparte, en un arreglo indexado por posición, para recuperarlos desde el árbol.
- **Nombres propios:** una `PALABRA_MAY` cuya forma en minúsculas no está en el léxico es `NOMBRE`, con clase `persona` por defecto. Los lugares se declaran en el léxico (`Kent NOMBRE lugar`). Una palabra en minúscula desconocida es un error.
- **Primera palabra de la oración:** siempre está en mayúscula. Primero se busca en minúsculas ("El" → "el"), y solo si no está se trata como nombre propio.
- **Unicidad:** cada lema tiene una sola categoría. Lo verifica la validación del léxico.
- Referencia: Hopcroft 4.2.3 (homomorfismos).

### 3.7 Gramática de oración y ambigüedad del sintagma preposicional (ficha 31)

`oracion.glc`:

```text
%inicio Oracion
%terminales DET SUST ADJ VERBO PREP TITULO NOMBRE INDEF
Oracion        -> Sujeto Predicado
Sujeto         -> SN
Predicado      -> VERBO ObjetoDirecto Complementos | VERBO Complementos
ObjetoDirecto  -> SN
Complementos   -> Complemento Complementos | ε
Complemento    -> PREP SN
SN             -> SNBase Modificadores
SNBase         -> DET Nucleo | NombrePropio | DET TITULO NOMBRE | INDEF
NombrePropio   -> NOMBRE | TITULO NOMBRE
Nucleo         -> SUST | SUST ADJ
Modificadores  -> Complemento Modificadores | ε
```

- **Es ambigua a propósito:** un `PREP SN` después de un objeto puede modificar al objeto (`Modificadores`) o al verbo (`Complementos`). Es el ejemplo clásico de ambigüedad del lenguaje natural, análogo a `Linea → SOS Pasos` en G0.
- **No es LL(1)** (hay conflictos en PREP), y por eso se analiza con Earley.
- **Testigo mínimo:** `findAmbiguityWitness(oracion, 5)` = `[INDEF, VERBO, INDEF, PREP, INDEF]` con 2 árboles, y con k = 4 no hay testigo. Sirve para conectar con la ficha 25.
- **"a" personal:** `Predicado` no distingue la preposición "a" del objeto directo. Todo `a SN` es un `Complemento`. El extractor de marcos lo reinterpreta como objeto cuando su clase es de persona (sección 3.8). Así se evita una ambigüedad sintáctica más, sin perder información.
- **Atributo de "ser":** en "era un detective famoso", el SN se analiza como `ObjetoDirecto`. Es una simplificación documentada, porque la regla de etiquetado solo necesita su clase.

### 3.8 Marco semántico: traducción dirigida por la sintaxis (ficha 32)

El marco se extrae del árbol recorriendo los nodos **por nombre** de no terminal:

- **sujeto:** el SN de `Sujeto`.
- **verbo:** lema y rasgos del token `VERBO`.
- **objetos:**
  - los SN de `ObjetoDirecto`;
  - si no hay, los `Complemento` con preposición `a` cuyo SN tiene clase `persona`, `detective` o `policia`.
- **complementos:** los `Complemento` de `Predicado` (preposición y SN).
- **personajes:** **todos** los SN del árbol que refieren a una persona:
  - con `NOMBRE` de clase persona, la identidad es el último `NOMBRE` ("el inspector Miller" → `Miller`);
  - con `DET Nucleo` de clase `persona`, `detective` o `policia`, la identidad es el lema del sustantivo (`cocinera`);
  - `INDEF` ("alguien") no es un personaje.

Atributos de un SN:

- **núcleo:** el lema del `SUST`, o el último `NOMBRE`.
- **clase:** la clase del `SUST`, la del `TITULO` si hay título, o la del `NOMBRE`.

Los personajes y los objetos son **iguales en todos los árboles** de una oración, porque la adjunción solo cambia de lugar los modificadores. Esto se verifica en pruebas, y es lo que hace funcionar la política de ambigüedad.

Referencia: Aho et al., capítulo 5 (traducción dirigida por la sintaxis).

### 3.9 Reglas de etiquetado: tabla de decisión (ficha 32)

- Una regla es `lema [objeto:clase] [sujeto:clase] -> ETIQUETA`.
- Las condiciones omitidas son comodines. `objeto:X` se cumple si **algún** objeto tiene clase X.
- Se evalúan en orden y gana la primera que cumple. Las reglas específicas van antes que las generales.
- **Ambigüedad:** se calcula la etiqueta de cada árbol de la oración (hasta 50).
  - Si todas coinciden, la oración se acepta con la nota "oración ambigua (k árboles); todas las lecturas dan la misma etiqueta".
  - Si difieren, es el error `ambiguous-tag`, con la lista de etiquetas.
- **Validación de `reglas.txt`:**
  - el lema debe ser un `VERBO` del léxico;
  - la etiqueta debe ser una de las 14 de G1;
  - la clase debe existir en el léxico.

### 3.10 Dos niveles de análisis (ficha 33)

- La secuencia de etiquetas se analiza con la gramática del relato que esté activa: G1 por defecto, o G0, en la CLI con `--grammar`.
- El resultado es el mismo `ParseResult` del SPEC 02, y la UI lo muestra con los mismos componentes.
- Hay una prueba que verifica que el relato etiquetado de `ashby.txt` produce exactamente la secuencia de ejemplo del anteproyecto: `CTX HAL ENC INT SOS PIS DSC REV CNF CAP`.

### 3.11 Distancia de edición de Levenshtein (ficha 34)

- d(i, j) = mín(d(i−1, j) + 1, d(i, j−1) + 1, d(i−1, j−1) + [aᵢ ≠ bⱼ]). Es programación dinámica en O(|a|·|b|), como CYK.
- Para una palabra desconocida, se calcula la distancia de cada candidato de lema (identidad y salidas del transductor) contra todos los lemas del léxico.
- Se sugiere el lema más cercano si su distancia es 2 o menos. Los empates se resuelven en orden alfabético.
- **Solo se sugiere, nunca se reemplaza:** "sin adivinar".

### 3.12 Verificación del culpable fuera de la GLC (ficha 35)

- Para cada oración etiquetada `REV`, el **acusado** es el primer personaje de sus `objetos`.
- La verificación pasa si el acusado aparece entre los personajes de alguna oración **anterior**. En ese caso se informa en qué oración aparece por primera vez.
- Si no aparece, es una **advertencia**, no un error. El relato sigue siendo sintácticamente válido.
- Si la oración REV no tiene un objeto que sea personaje, la advertencia es "no se pudo identificar al acusado".
- **Fundamento** (conecta con la ficha 26):
  - con identidades no acotadas, la regla no es libre de contexto;
  - con los personajes de un relato concreto, que son finitos, la verificación es un recorrido con un conjunto de vistos, que es un autómata finito construido por relato.
  - por eso se verifica **fuera** de la gramática: es una restricción de contexto que la GLC no captura.

---

## 4. Datos

### 4.1 `lexico.txt` (contenido mínimo obligatorio, de 100 a 150 entradas en total)

```text
# Determinantes y preposiciones
el DET
la DET
los DET
las DET
un DET
una DET
unos DET
unas DET
a PREP
de PREP
en PREP
con PREP
por PREP
desde PREP
hacia PREP
sin PREP

# Contracciones e indefinidos
al = a el
del = de el
alguien INDEF
nadie INDEF

# Títulos (clase del referente)
inspector TITULO detective
inspectora TITULO detective
sargento TITULO policia
lord TITULO persona
lady TITULO persona
doctor TITULO persona
doctora TITULO persona
señor TITULO persona
señora TITULO persona

# Adjetivos
famoso ADJ
famosa ADJ
viejo ADJ
vieja ADJ
rico ADJ
rica ADJ
joven ADJ
misterioso ADJ
misteriosa ADJ
vacío ADJ
vacía ADJ
oscuro ADJ
oscura ADJ

# Sustantivos con clase
mayordomo SUST persona
viuda SUST persona
cocinera SUST persona
cocinero SUST persona
sobrino SUST persona
sobrina SUST persona
jardinero SUST persona
jardinera SUST persona
criada SUST persona
criado SUST persona
conde SUST persona
condesa SUST persona
banquero SUST persona
chofer SUST persona
socio SUST persona
socia SUST persona
asesino SUST persona
asesina SUST persona
víctima SUST persona
testigo SUST persona
médico SUST persona
hermano SUST persona
hermana SUST persona
esposo SUST persona
esposa SUST persona
detective SUST detective
policía SUST policia
cadáver SUST cadaver
cuerpo SUST cadaver
pañuelo SUST objeto
huella SUST objeto
carta SUST objeto
cuchillo SUST objeto
veneno SUST objeto
llave SUST objeto
collar SUST objeto
cofre SUST objeto
guante SUST objeto
botella SUST objeto
nota SUST objeto
copa SUST objeto
mansión SUST lugar
castillo SUST lugar
jardín SUST lugar
ventana SUST lugar
biblioteca SUST lugar
cocina SUST lugar
casa SUST lugar
habitación SUST lugar
estudio SUST lugar
crimen SUST crimen
robo SUST crimen
asesinato SUST crimen
coartada SUST coartada

# Lugares con nombre propio
Kent NOMBRE lugar
Londres NOMBRE lugar
Escocia NOMBRE lugar
Madrid NOMBRE lugar

# Verbos (infinitivo)
vivir VERBO
ser VERBO
envenenar VERBO
matar VERBO
asesinar VERBO
robar VERBO
encontrar VERBO
hallar VERBO
descubrir VERBO
llamar VERBO
contratar VERBO
interrogar VERBO
sospechar VERBO
tener VERBO
atacar VERBO
amenazar VERBO
acusar VERBO
confesar VERBO
arrestar VERBO
detener VERBO
volver VERBO
regresar VERBO
mirar VERBO

# Irregulares
fue = ser
fueron = ser
era = ser
eran = ser
tuvo = tener
tuvieron = tener
detuvo = detener
```

`mirar` se incluye **a propósito sin regla**, para probar el error `no-rule`. El implementador puede agregar entradas hasta 150, siempre que no rompa ninguna prueba.

### 4.2 `reglas.txt`

```text
# lema [condiciones] -> ETIQUETA   (gana la primera que cumple)
vivir                            -> CTX
ser       objeto:detective       -> PER
envenenar                        -> CRI
matar                            -> CRI
asesinar                         -> CRI
robar                            -> CRI
encontrar objeto:cadaver         -> HAL
hallar    objeto:cadaver         -> HAL
descubrir objeto:cadaver         -> HAL
descubrir objeto:crimen          -> HAL
encontrar objeto:objeto          -> PIS
hallar    objeto:objeto          -> PIS
descubrir objeto:objeto          -> PIS
llamar    objeto:detective       -> ENC
contratar objeto:detective       -> ENC
interrogar                       -> INT
sospechar                        -> SOS
tener     objeto:coartada        -> DSC
atacar                           -> ATQ
amenazar                         -> ATQ
acusar                           -> REV
confesar                         -> CNF
arrestar                         -> CAP
detener                          -> CAP
volver                           -> EPI
regresar                         -> EPI
```

### 4.3 Relatos de ejemplo (`data/relatos/`)

**`ashby.txt`** (el relato del anteproyecto, sin cambios):

> Lord Ashby vivía en una mansión de Kent. El mayordomo encontró el cadáver de Lord Ashby. La viuda llamó al inspector Miller. Miller interrogó a la cocinera. Miller sospechó del sobrino. Miller encontró un pañuelo en el jardín. El sobrino tenía una coartada. Miller acusó a la cocinera. La cocinera confesó el crimen. La policía arrestó a la cocinera.

**`condesa.txt`:**

> La condesa vivía en un castillo de Escocia. La inspectora Duarte era una detective famosa. Alguien robó el collar de la condesa. La criada descubrió el robo. El conde llamó a la inspectora Duarte. Duarte encontró una huella en la ventana. Duarte sospechó del jardinero. Duarte interrogó al jardinero. El jardinero tenía una coartada. Duarte sospechó de la criada. Duarte acusó a la criada. La policía arrestó a la criada.

**`banquero.txt`** (el culpable no aparece antes):

> El banquero vivía en Madrid. El inspector Ríos era un detective famoso. El mayordomo encontró el cadáver del banquero. La viuda llamó al inspector Ríos. Ríos interrogó al chofer. Ríos acusó al socio. El socio confesó el crimen.

---

## 5. Modelo de datos

```ts
// src/lexicon/types.ts
type Category = 'DET' | 'SUST' | 'ADJ' | 'VERBO' | 'PREP' | 'TITULO' | 'NOMBRE' | 'INDEF';
interface LexiconEntry { lemma: string; category: Category; semClass: string | null; line: number }
interface Lexicon {
  entries: Map<string, LexiconEntry>;          // clave: lema en minúsculas (o con mayúscula para NOMBRE)
  irregulars: Map<string, string>;             // forma → lema
  contractions: Map<string, string[]>;         // 'al' → ['a', 'el']
  classes: Set<string>;
}

// src/tagging/types.ts
interface TagRule { lemma: string; objectClass: string | null; subjectClass: string | null; tag: string; line: number; text: string }

// src/morphology/mealy.ts
interface MealyMachine<O> { start: number; delta: Map<number, Map<string, number>>; output: Map<string, O[]> } // clave "estado|letra"
interface SuffixOutput { length: number; replacements: string[]; features: string[] }

// src/text/types.ts
interface WordAnalysis {
  surface: string;                             // como aparece en el texto
  lemma: string;
  category: Category;
  semClass: string | null;
  features: string[];                          // ['pret3s'], ['pl'], []
  source: 'lexicon' | 'morphology' | 'irregular' | 'contraction' | 'proper-name';
  sentenceOffset: number;                      // columna en el texto original (para subrayar)
}

// src/semantics/frame.ts
interface NounPhrase { head: string; semClass: string | null; characterId: string | null; text: string }
interface Frame {
  subject: NounPhrase | null;
  verb: { lemma: string; features: string[] };
  objects: NounPhrase[];                       // arreglo desde ya: la coordinación futura no cambia el tipo
  complements: { prep: string; np: NounPhrase }[];
  characters: string[];                        // identidades, sin repetir, en orden de aparición
}

// src/index.ts
type NlError =
  | { kind: 'lexical'; line: number; column: number; message: string }
  | { kind: 'missing-period'; line: number; column: number }
  | { kind: 'unknown-word'; wordIndex: number; word: string; suggestion: string | null }
  | { kind: 'ambiguous-form'; wordIndex: number; word: string; candidates: string[] }
  | { kind: 'syntax'; error: ParseError; words: string[] }   // ParseError del núcleo sobre categorías
  | { kind: 'no-rule'; frame: Frame }
  | { kind: 'ambiguous-tag'; tags: string[] };

interface SentenceAnalysis {
  index: number;                               // base 0
  text: string;
  words: WordAnalysis[];
  categories: Category[];
  treeCount: TreeCount;
  trees: ParseTree[];                          // hasta 50
  frame: Frame | null;
  tag: string | null;
  rule: TagRule | null;
  note: string | null;                         // nota de ambigüedad coincidente
  error: NlError | null;
}

interface CulpritCheck {
  status: 'ok' | 'warning' | 'not-applicable'; // not-applicable: no hay oración REV
  accused: string | null;
  revSentence: number | null;
  firstMention: number | null;
  message: string;
}

interface StoryAnalysis {
  sentences: SentenceAnalysis[];
  tags: string[] | null;                       // null si alguna oración falló
  story: ParseResult | null;                   // análisis del relato con el núcleo
  culprit: CulpritCheck | null;
}

interface NlResources { lexicon: Lexicon; rules: TagRule[]; sentenceGrammar: Grammar; storyGrammar: Grammar }
// loadResources(texts) parsea y valida los tres archivos y lanza errores con línea y columna.
// analyzeStory(text, resources) es una función pura.
```

**Convenciones:**

- Las posiciones de palabra son base 0 **después de expandir las contracciones**. La UI subraya usando `sentenceOffset`.
- Igual que en el núcleo, `src/` no importa `node:*` salvo `cli.ts`. El paquete también corre en el Worker de la UI.

---

## 6. Estructura de archivos

```text
packages/nl/
  package.json              # @sabueso/nl; dependencies: { "@sabueso/core": "*" }; bin: sabueso-nl
  tsconfig.json             # NodeNext, igual que core
  vitest.config.ts
  data/
    oracion.glc
    lexico.txt
    reglas.txt
    meta-lexico.glc
    meta-reglas.glc
    relatos/ashby.txt
    relatos/condesa.txt
    relatos/banquero.txt
  src/
    index.ts
    cli.ts                   # único archivo con node:*; usa createCli del núcleo
    cli/commands/*.ts        # un archivo por comando (sección 7.2)
    text/text-lexer.ts
    text/sentences.ts
    data-format/data-lexer.ts
    data-format/lexicon-parser.ts
    data-format/rules-parser.ts
    lexicon/types.ts
    lexicon/lexicon.ts       # búsqueda y validación
    morphology/suffixes.ts
    morphology/mealy.ts
    morphology/suffix-trie.ts
    morphology/analyze-word.ts
    sentence/parse-sentence.ts
    semantics/frame.ts
    semantics/characters.ts
    tagging/types.ts
    tagging/apply-rules.ts
    suggest/levenshtein.ts
    checks/culprit.ts
  test/                     # una prueba por módulo, más stories.test.ts y errors.test.ts
    cli/                    # una prueba por comando
apps/web/src/               # cambios de integración (sección 7, pasos 16 a 19)
  core-client/...           # nuevas operaciones nlLoad y nlAnalyze en el worker
  views/NarrativeInput.tsx
  components/SentenceTable.tsx
docs/conceptos/28-…35-*.md
```

Las fichas nuevas son:

| # | Archivo | Concepto |
| --- | --- | --- |
| 28 | `28-automatas-de-texto-y-datos.md` | AFD de texto, AFD de datos y parsers LL(1) de datos |
| 29 | `29-transductor-de-mealy.md` | Trie de sufijos invertidos como AFD con salidas |
| 30 | `30-lexico-y-homomorfismo.md` | Palabra → categoría como homomorfismo |
| 31 | `31-gramatica-de-oracion.md` | `oracion.glc` y la ambigüedad del sintagma preposicional |
| 32 | `32-marco-y-reglas.md` | Traducción dirigida por la sintaxis y tabla de decisión |
| 33 | `33-dos-niveles-de-analisis.md` | Composición oración → relato con el mismo motor |
| 34 | `34-levenshtein.md` | Distancia de edición, programación dinámica |
| 35 | `35-verificacion-del-culpable.md` | Restricción fuera de la GLC (relación con la ficha 26) |

---

## 7. Plan de implementación

### 7.1 Regla de los pasos

Se aplica la misma regla que en el SPEC 02 (sección 8.1). Cada paso termina con tres cosas:

1. **Una prueba automatizada** del módulo.
2. **Un comando de consola** `sabueso-nl <comando>` que lo ejecuta sobre una entrada real.
3. **Una prueba del comando.**

Además, cada paso deja `npm test` en verde y es un commit propio.

**Arquitectura de la CLI:** es la misma del núcleo, reutilizada. `@sabueso/core` exporta `createCli(commands)`, el tipo `CliCommand` y las utilidades de formato (SPEC 01, sección 5).

- `packages/nl/src/cli.ts` es el único archivo con `node:*`.
- Los comandos viven en `src/cli/commands/<comando>.ts`, uno por archivo, como funciones con `io` inyectado.
- Las pruebas de los comandos están en `test/cli/`.
- El `package.json` raíz suma el script `"sabueso-nl": "tsc -b packages/nl && node packages/nl/dist/cli.js"`.
- Los códigos de salida son los mismos del núcleo (0, 1 y 2).

En la UI (pasos 16 a 19), "ejecutable" significa visible en `npm run dev -w @sabueso/web`, con pruebas de componente. La lógica que muestra la UI ya es ejecutable por consola desde los pasos anteriores.

### 7.2 Pasos

1. **Punto de partida (cubierto por el SPEC 01).**
   - El esqueleto de `packages/nl`, su CLI con `version` y `help` y el script `sabueso-nl` los crea el SPEC 01. Este paso no agrega código.
   - Verificación antes de empezar: `npm run sabueso-nl -- version` imprime `Sabueso nl 0.1.0 (core 0.1.0)`.

2. **Lexer de texto.**
   - `text/text-lexer.ts` (tabla sobre `runDfa`) y `text/sentences.ts`.
   - Pruebas: los tokens de "Miller interrogó a la cocinera."; los errores de coma, dígito, "MiLLer" y falta de punto final, con línea y columna. Ficha 28 (primera parte).
   - **Consola:**
     - `npm run sabueso-nl -- lex-texto packages/nl/data/relatos/ashby.txt` imprime las oraciones numeradas y sus tokens (tipo, texto, línea:columna).
     - Con `--estados`, imprime la secuencia de estados del AFD para la primera oración.
     - Un texto con coma termina con código 1 e informa la línea y la columna.

3. **Lexer de datos y meta-gramáticas.**
   - `data-format/data-lexer.ts`, `meta-lexico.glc` y `meta-reglas.glc`.
   - Prueba: las dos meta-gramáticas dan `analyzeGrammar(...).ll1.isLL1 === true`.
   - **Consola:**
     - `npm run sabueso-nl -- lex-datos packages/nl/data/reglas.txt` imprime la tabla de tokens.
     - `npm run sabueso-nl -- lex-datos --certificar` imprime la tabla LL(1) de las dos meta-gramáticas (usando `analyzeGrammar` del núcleo) y confirma que no tienen conflictos.

4. **Parser de léxico.**
   - `data-format/lexicon-parser.ts` y `lexicon/lexicon.ts`, con validación de categorías válidas, unicidad de categoría por lema, irregulares que apuntan a un `VERBO` y contracciones con palabras existentes.
   - Prueba: `lexico.txt` carga entre 100 y 150 entradas, y cada validación tiene su caso de error con número de línea.
   - **Consola:**
     - `npm run sabueso-nl -- lexico` (usa `data/lexico.txt` por defecto, o `--file <ruta>`) imprime la cantidad de entradas por categoría y por clase, los irregulares y las contracciones.
     - Si hay errores de validación, los informa con su línea y termina con código 1.

5. **Parser de reglas.**
   - `data-format/rules-parser.ts`, con validación de lema `VERBO`, etiqueta dentro de los terminales de G1 y clase existente.
   - Prueba: `reglas.txt` carga 26 reglas, y una etiqueta inválida da error en su línea. Ficha 28 (completa).
   - **Consola:** `npm run sabueso-nl -- reglas` imprime la tabla de decisión numerada (prioridad, lema, condiciones, etiqueta y línea).

6. **Transductor de Mealy.**
   - `morphology/mealy.ts` (ejecutor genérico) y `morphology/suffix-trie.ts` (construye la máquina desde `suffixes.ts`).
   - Prueba: "temió" emite las salidas `ó` e `ió`; "casa" no emite nada. Ficha 29.
   - **Consola:**
     - `npm run sabueso-nl -- mealy temió` imprime la lectura de derecha a izquierda, paso a paso: estado, letra, estado siguiente y salida emitida.
     - Con `--trie`, imprime el trie de sufijos invertidos como tabla de transiciones.

7. **Análisis de palabras.**
   - `morphology/analyze-word.ts`: contracción → irregular → transductor más validación → nombre propio.
   - Pruebas: interrogó → interrogar pret3s; vivía → vivir imp3s; descubrió → descubrir (y no descubrer); fue → ser; al → [a, el]; policía → policía (por identidad, aunque el transductor proponga `polic-er`); Ashby → NOMBRE persona; Kent → NOMBRE lugar. Ficha 30.
   - **Consola:** `npm run sabueso-nl -- palabra descubrió` imprime los candidatos del transductor, cuáles descartó la validación y por qué, y el resultado final (lema, categoría, clase, rasgos y fuente).

8. **Levenshtein.**
   - `suggest/levenshtein.ts`.
   - Pruebas: d(interogar, interrogar) = 1; "interogó" sugiere `interrogar`; "cadaver" sugiere `cadáver`; "xyzw" no sugiere nada. Ficha 34.
   - **Consola:**
     - `npm run sabueso-nl -- sugerir interogó` imprime los candidatos, las distancias más cercanas y la sugerencia.
     - `npm run sabueso-nl -- distancia interogar interrogar --tabla` imprime la matriz de programación dinámica.

9. **Gramática de oración.**
   - `oracion.glc` y `sentence/parse-sentence.ts` (palabras → categorías → `parse` del núcleo).
   - Pruebas: los conteos de árboles de la tabla 8.2; `isLL1` es falso; el testigo de ambigüedad con k = 5 coincide con la sección 3.7 y con k = 4 da `null`. Ficha 31.
   - **Consola:**
     - `npm run sabueso-nl -- oracion "El mayordomo encontró el cadáver de Lord Ashby."` imprime las palabras con su categoría (el homomorfismo h), la cadena de categorías, la cantidad de árboles y los árboles en ASCII con hojas "categoría: palabra".
     - Una oración inválida (N2) muestra el diagnóstico de Earley y termina con código 1.
     - `npm run sabueso-nl -- oracion --ambiguedad 5` imprime el testigo de ambigüedad mínimo de la gramática de oración (usando `findAmbiguityWitness` del núcleo).

10. **Marco semántico.**
    - `semantics/frame.ts` y `semantics/characters.ts`.
    - Pruebas: el marco de "La viuda llamó al inspector Miller." tiene `objects[0].characterId === 'Miller'` con clase `detective`; los personajes son iguales en los 2 árboles de "El mayordomo encontró el cadáver de Lord Ashby." (`['mayordomo', 'Ashby']`).
    - **Consola:** `npm run sabueso-nl -- marco "La viuda llamó al inspector Miller."` imprime el marco (sujeto, verbo, objetos, complementos y personajes) para cada árbol.

11. **Reglas de etiquetado.**
    - `tagging/apply-rules.ts`, con la política de ambigüedad.
    - Pruebas: las etiquetas de la tabla 8.2; `ambiguous-tag` con dos marcos sintéticos que dan etiquetas distintas; `no-rule` para "Miller miró el jardín.". Ficha 32.
    - **Consola:**
      - `npm run sabueso-nl -- etiqueta "Miller encontró un pañuelo en el jardín."` imprime la etiqueta `PIS`, la regla aplicada con su línea, y la nota de ambigüedad coincidente (2 árboles).
      - N5 termina con código 1 e informa `no-rule`.

12. **Verificación del culpable.**
    - `checks/culprit.ts`.
    - Pruebas: el resultado esperado en los tres relatos (tabla 8.1). Ficha 35.
    - **Consola:** `npm run sabueso-nl -- culpable packages/nl/data/relatos/banquero.txt` imprime el acusado, la oración REV, la primera mención (o su ausencia) y el estado. Una advertencia termina con código 0, porque no es un error.

13. **API `analyzeStory` y `loadResources`.**
    - `src/index.ts`.
    - Prueba `stories.test.ts`: los tres relatos completos según la tabla 8.1. Ficha 33.
    - **Consola:** `npm run sabueso-nl -- etiquetar packages/nl/data/relatos/ashby.txt [--grammar g0|g1]` imprime:
      - una tabla con oración, etiqueta, regla (línea N) y árboles;
      - la secuencia resultante;
      - el resultado del relato con el núcleo (aceptación y árbol);
      - la verificación del culpable.
    - Termina con código 1 si alguna oración falla.

14. **Errores de punta a punta.**
    - `errors.test.ts` con los casos de la tabla 8.3, ejecutados también a través de `runCli`: cada caso con su salida y su código de salida.
    - **Consola:** cada caso de la tabla 8.3 se puede reproducir con `etiquetar --texto "<relato>"`, que analiza un texto pasado como argumento en lugar de un archivo.

15. **Guion de consola.**
    - Bloque "Español controlado" agregado a `docs/demo-consola.md`, en el orden de las fichas 28 a 35: `lex-texto` → `mealy` → `palabra` → `oracion` → `marco` → `etiqueta` → `etiquetar` → `culpable`.
    - La prueba `demo-doc.test.ts` del núcleo se extiende para ejecutar también los comandos `sabueso-nl` del documento.

16. **Worker de la UI.**
    - Nuevas operaciones `nlLoad(texts)` y `nlAnalyze(text)` en `CoreClient`, con caché de recursos por texto.
    - Prueba con `createDirectClient`.
    - **Ejecutable:** `npm run dev -w @sabueso/web`. La app sigue funcionando igual, porque las nuevas operaciones todavía no tienen interfaz.

17. **Entrada narrativa en la UI.**
    - Interruptor "Etiquetas | Español controlado" en la vista Análisis.
    - `NarrativeInput` con un `textarea` y ejemplos (los tres relatos).
    - `SentenceTable` con columnas #, oración, etiqueta, regla, árboles y personajes, y las palabras con error subrayadas con su sugerencia.
    - La secuencia resultante alimenta el `ResultPanel` existente, y la verificación del culpable se muestra como banner.
    - Prueba de componente: `ashby.txt` produce 10 filas.
    - **Ejecutable:** en `npm run dev`, cargar el ejemplo Ashby muestra la tabla y el árbol del relato.

18. **Árbol de la oración.**
    - Al seleccionar una fila se muestra su árbol con `TreeView`, con las hojas en la forma "categoría: palabra", y el paginador si hay 2 árboles.
    - Prueba: seleccionar la fila 1 muestra "árbol 1/2".

19. **Persistencia.**
    - Persistencia `sabueso:v1` → **versión 2**: se suman `mode` y `storyText`. Lo guardado en v1 se migra copiando sus campos. Esta es la primera migración prevista por la clave versionada del SPEC 03.
    - Prueba: la migración de v1 a v2.

20. **Documentación.**
    - Fichas 28 a 35, cada una con su comando de consola en la parte "Dónde está en el código".
    - Casos nuevos en `docs/verificacion-manual-ui.md`.
    - Bloque final en `docs/guion-exposicion.md` ("Español controlado": ashby → banquero).
    - Sección de `@sabueso/nl` en el README, con la tabla de comandos.

---

## 8. Valores esperados

Calculados a mano. El autor los verifica antes de implementar cada paso, con la misma metodología del SPEC 02.

### 8.1 Relatos completos (con G1)

| Relato | Secuencia | Relato válido en G1 | Verificación del culpable |
| --- | --- | --- | --- |
| `ashby.txt` | `CTX HAL ENC INT SOS PIS DSC REV CNF CAP` | sí, 1 árbol | `ok`: acusado `cocinera`, oración REV 7, primera mención 3 |
| `condesa.txt` | `CTX PER CRI HAL ENC PIS SOS INT DSC SOS REV CAP` | sí, 1 árbol | `ok`: acusado `criada`, oración REV 10, primera mención 3 |
| `banquero.txt` | `CTX PER HAL ENC INT REV CNF` | sí, 1 árbol | `warning`: acusado `socio`, oración REV 5, primera mención `null` |

Los índices de oración son base 0.

### 8.2 Oraciones de `ashby.txt`

| # | Oración | Categorías | Árboles | Etiqueta | Regla |
| --- | --- | --- | --- | --- | --- |
| 0 | Lord Ashby vivía en una mansión de Kent. | TITULO NOMBRE VERBO PREP DET SUST PREP NOMBRE | 2 | CTX | `vivir -> CTX` |
| 1 | El mayordomo encontró el cadáver de Lord Ashby. | DET SUST VERBO DET SUST PREP TITULO NOMBRE | 2 | HAL | `encontrar objeto:cadaver -> HAL` |
| 2 | La viuda llamó al inspector Miller. | DET SUST VERBO PREP DET TITULO NOMBRE | 1 | ENC | `llamar objeto:detective -> ENC` |
| 3 | Miller interrogó a la cocinera. | NOMBRE VERBO PREP DET SUST | 1 | INT | `interrogar -> INT` |
| 4 | Miller sospechó del sobrino. | NOMBRE VERBO PREP DET SUST | 1 | SOS | `sospechar -> SOS` |
| 5 | Miller encontró un pañuelo en el jardín. | NOMBRE VERBO DET SUST PREP DET SUST | 2 | PIS | `encontrar objeto:objeto -> PIS` |
| 6 | El sobrino tenía una coartada. | DET SUST VERBO DET SUST | 1 | DSC | `tener objeto:coartada -> DSC` |
| 7 | Miller acusó a la cocinera. | NOMBRE VERBO PREP DET SUST | 1 | REV | `acusar -> REV` |
| 8 | La cocinera confesó el crimen. | DET SUST VERBO DET SUST | 1 | CNF | `confesar -> CNF` |
| 9 | La policía arrestó a la cocinera. | DET SUST VERBO PREP DET SUST | 1 | CAP | `arrestar -> CAP` |

Las oraciones 0, 1 y 5 llevan la nota de ambigüedad coincidente.

### 8.3 Errores

| Id | Entrada | Esperado |
| --- | --- | --- |
| N1 | `Miller interogó a la cocinera.` | `unknown-word`, `wordIndex` 1, `interogó`, sugerencia `interrogar` |
| N2 | `Miller la cocinera interrogó.` | `syntax`: posición 1, found `DET`, expected `[PREP, VERBO]` |
| N3 | `Miller interrogó a la cocinera` | `missing-period` |
| N4 | `Miller, el inspector, sospechó.` | `lexical` en la línea 1, columna 7 (la coma) |
| N5 | `Miller miró el jardín.` | `no-rule` (verbo `mirar`, objeto de clase `lugar`) |
| N6 | `La cocinera encontró el cadaver.` | `unknown-word`, `cadaver`, sugerencia `cadáver` |
| N7 | Relato con una oración errónea en el medio | `tags === null`, `story === null`, y las demás oraciones analizadas igual |

---

## 9. Escalabilidad: cómo crece el español aceptado

El diseño separa cuatro capas, y cada ampliación toca solo las que le corresponden:

| Ampliación | Datos (`lexico`, `reglas`, `oracion.glc`) | Código |
| --- | --- | --- |
| Más vocabulario | `lexico.txt` y `reglas.txt` | ninguno |
| Coordinación ("a la cocinera y al mayordomo") | `CONJ` en el léxico; `SN -> SN CONJ SN` en `oracion.glc` | `frame.ts` recorre los SN coordinados. `objects` ya es un arreglo, así que el tipo no cambia. |
| Más tiempos verbales | filas en `suffixes.ts` | ninguno: el trie se construye solo |
| Pronombres y anáfora | `PRON` en el léxico y la gramática | un resolvedor nuevo (último personaje compatible), en su propio módulo |
| Varios eventos por oración | reglas que devuelven varias etiquetas | `tag` pasa a `tags: string[]` (cambio de tipo, va en otro spec) |

Ninguna de estas ampliaciones toca `@sabueso/core`. Esa es la prueba de que el motor es genérico.

---

## 10. Criterios de aceptación

- [ ] `@sabueso/nl` tiene como única `dependency` a `@sabueso/core`, y no se modificó ningún archivo de `packages/core/src` en este spec.
- [ ] `npm install`, `npm test`, `npm run build` y `npm run lint` terminan sin errores en la raíz.
- [ ] `meta-lexico.glc` y `meta-reglas.glc` son LL(1) según `analyzeGrammar`.
- [ ] `lexico.txt` carga entre 100 y 150 entradas sin errores de validación, y `reglas.txt` carga 26 reglas.
- [ ] Cada caso de la prueba del paso 7 (análisis de palabras) da el lema, la categoría y los rasgos indicados.
- [ ] `findAmbiguityWitness(oracion, 5)` devuelve `[INDEF, VERBO, INDEF, PREP, INDEF]`, y con k = 4 devuelve `null`.
- [ ] Cada fila de la tabla 8.2 da exactamente las categorías, la cantidad de árboles, la etiqueta y la regla indicadas.
- [ ] Cada relato de la tabla 8.1 da exactamente la secuencia, el resultado en G1 y la verificación del culpable indicados.
- [ ] Cada caso de la tabla 8.3 da exactamente el error indicado.
- [ ] Cada paso de la sección 7.2 (1 a 15) tiene su comando `sabueso-nl` y una prueba en `test/cli/` que verifica la salida y el código de salida.
- [ ] `npm run sabueso-nl -- mealy temió` muestra la lectura paso a paso y las dos salidas (`ó` e `ió`).
- [ ] `npm run sabueso-nl -- palabra policía` muestra el candidato `policer` (o `policir`) descartado por la validación y el resultado por identidad.
- [ ] `docs/demo-consola.md` incluye el bloque "Español controlado", y su prueba ejecuta esos comandos sin código 2.
- [ ] `node packages/nl/dist/cli.js etiquetar packages/nl/data/relatos/banquero.txt` imprime la secuencia `CTX PER HAL ENC INT REV CNF`, "relato válido" y la advertencia sobre `socio`.
- [ ] En la UI, en modo "Español controlado", el ejemplo `ashby.txt` muestra 10 filas con sus etiquetas, y la vista Análisis muestra el árbol del relato con G1.
- [ ] En la UI, seleccionar la oración 1 de `ashby.txt` muestra 2 árboles y la nota de ambigüedad coincidente.
- [ ] En la UI, N1 subraya "interogó" y muestra "¿quisiste decir interrogar?".
- [ ] Un estado guardado en `sabueso:v1` se migra a v2 sin perder la gramática, la entrada ni las ediciones.
- [ ] Existen las fichas 28 a 35 con las cinco partes de la sección 7.1 del SPEC 02.

---

## 11. Decisiones tomadas y descartadas

- **Sí:** un comando de consola y su prueba por cada etapa. Es el requisito del autor: cada etapa ejecutable y testeable. Con `mealy`, `palabra` y `marco`, cada concepto se puede mostrar aislado en la exposición.
- **Sí:** reutilizar `createCli` del núcleo. Las dos CLI quedan iguales en estilo, opciones y códigos de salida, sin duplicar la infraestructura.
- **Sí:** el léxico, las reglas y la gramática de oración son del género **policial**. Si en el futuro se suma un género al catálogo (SPEC 02, sección 4.6) y se quiere el modo español para él, ese género tendrá sus propias reglas. Queda fuera de este spec.
- **Sí:** un paquete aparte, `packages/nl`. Cumple "la ampliación se conecta delante, sin modificarlo" (anteproyecto), y el núcleo comprometido queda aislado de la parte opcional.
- **No:** un módulo dentro de `core`. Mezclaría lo opcional con lo comprometido.
- **Sí:** reutilizar el `runDfa` del núcleo con tablas nuevas. Es el mismo concepto ("AFD = tabla + ejecutor") aplicado a tres lenguajes distintos, sin duplicar código. Por eso se separó el ejecutor en el SPEC 02.
- **Sí:** oraciones simples (sujeto, verbo, objeto y complementos), con un diseño escalable. El autor pidió empezar simple y planificar para ampliar. La sección 9 muestra que la coordinación y los pronombres son cambios de datos y de un módulo, no de arquitectura.
- **No:** coordinación en esta etapa. Introduce ambigüedad de alcance que complica el etiquetado, y queda prevista.
- **Sí:** un transductor de Mealy construido desde un trie de sufijos invertidos. Aplica un concepto de la materia (autómata traductor, Augusto 1.3.3) que no aparece en el núcleo. Además, la construcción automática desde la tabla hace que agregar tiempos verbales sea agregar filas.
- **No:** listar todas las formas en el léxico. Es más simple, pero no tiene valor teórico, y el léxico crecería en 6 formas por verbo.
- **Sí:** validar los candidatos del transductor contra el léxico. Resuelve -ió → -er o -ir y descarta lecturas falsas (`policía` → `polic-er`) sin heurísticas.
- **Sí:** léxico y reglas en archivos de texto con parsers LL(1) propios. Es coherente con "las gramáticas son datos", se cambian sin tocar código, y sus meta-gramáticas se certifican con el propio núcleo.
- **No:** JSON. No requiere parser, pero rompe la coherencia del proyecto y es menos legible para la cátedra.
- **No:** tablas en código TS. Cambiar el vocabulario requeriría recompilar.
- **Sí:** categorías como terminales de la gramática de oración, con un homomorfismo de un símbolo a un símbolo. La gramática queda chica y legible (8 terminales). La información léxica viaja aparte, indexada por posición.
- **No:** lemas como terminales con producciones léxicas generadas. La gramática crecería a más de 150 producciones, sin beneficio mientras no haya ambigüedad léxica.
- **Sí:** prohibir la ambigüedad léxica por validación. Es español **controlado**. Soportarla exigiría un Earley sobre retículas de tokens, que es un cambio en el núcleo. Queda como trabajo futuro.
- **Sí:** `oracion.glc` ambigua a propósito (sintagma preposicional). Es el caso natural más claro de ambigüedad, y conecta con G0 y la ficha 25. Earley lo maneja sin cambios.
- **Sí:** el "a" personal se resuelve en el marco y no en la gramática. Evita una segunda fuente de ambigüedad sintáctica y deja la decisión donde está la información (la clase semántica).
- **Sí:** aceptar la ambigüedad si todas las lecturas dan la misma etiqueta, y si no, dar error. Es "sin adivinar" aplicado a la sintaxis: nunca se elige una lectura arbitraria.
- **Sí:** las reglas se evalúan en orden y gana la primera coincidencia. Es la tabla de decisión más simple de explicar, y la prioridad queda visible en el archivo.
- **Sí:** errores localizados con sugerencia de Levenshtein, sin reemplazo automático. El autor eligió "sin adivinar". Además, Levenshtein es otra aplicación de programación dinámica, como CYK.
- **No:** etiqueta manual de respaldo. El autor no la eligió, y ocultaría errores del léxico o de las reglas.
- **Sí:** nombres propios por mayúscula y lugares declarados en el léxico. Los personajes cambian en cada relato y no conviene declararlos. Los lugares sí, porque son pocos y se repiten.
- **Sí:** verificación del culpable como advertencia aparte de la gramática. Ilustra en código el límite de las GLC (ficha 26). Es advertencia y no error porque el relato es sintácticamente válido.
- **Sí:** persistencia v2 con migración desde v1. Aplica la decisión de clave versionada del SPEC 03, sin perder lo que el usuario ya guardó.
- **Sí:** tres relatos de ejemplo, uno de ellos con advertencia. Cubren el caso feliz, una investigación con dos líneas de sospecha y el límite de la GLC.

---

## 12. Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| Un valor esperado calculado a mano está mal | El autor lo verifica antes de cada paso. Si hay discrepancia, se corrige primero el spec. |
| Una palabra frecuente en los relatos de prueba de la cátedra no está en el léxico | El error es localizado y trae sugerencia. Agregarla es una línea en `lexico.txt` del repositorio. |
| Los sufijos generan candidatos falsos que coinciden con otro lema | La validación por categoría compatible los descarta. Si quedan dos, `ambiguous-form` señala el problema de datos con los candidatos. |
| Se vuelve a pedir coordinación o pronombres durante la defensa | Sección 9: está prevista y se explica como ampliación por datos. Si se implementa, va en un spec nuevo. |
| Las oraciones con varios complementos generan muchos árboles | La cantidad crece según Catalan con la cantidad de sintagmas preposicionales. Con oraciones simples (2 o 3) es despreciable, y la enumeración está limitada a 50. |
| La UI consume tiempo del resto | El SPEC 04 es opcional según el anteproyecto. El trabajo queda completo sin él. |

---

## Lo que **no** está en este spec

- Coordinación, pronombres, subordinadas, pasiva y varios eventos por oración (previstos en la sección 9, en specs futuros).
- Ambigüedad léxica y Earley sobre retículas.
- Etiqueta manual de respaldo.
- Texto libre y aprendizaje automático.
- Cambios en `@sabueso/core`.

Cada uno de esos puntos, si se hace, va en su propio spec.
