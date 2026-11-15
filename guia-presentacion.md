# Sabueso — Guía de presentación

> Fecha: 2026-11-14 · Material de apoyo para la exposición del Laboratorio Integrador Final de Fundamentos Teóricos de Informática.
> Los valores de los ejemplos (ítems de Earley, cantidad de árboles) fueron calculados a mano: verificarlos antes de la exposición.

---

## 1. Qué es Sabueso

Sabueso decide si un relato respeta la estructura del **policial de enigma**, usando una gramática libre de contexto y un analizador de **Earley** implementado desde cero.

- **Entrada (v1):** el relato como secuencia de etiquetas narrativas, una por evento. Ejemplo: `CRI SOS PIS INT REV` (crimen, sospecha, pista, interrogatorio, revelación).
- **Salida si es válido:** el árbol sintáctico, la derivación más a la izquierda y la cantidad de árboles posibles.
- **Salida si es inválido:** la posición del error, el símbolo encontrado y los símbolos que se esperaban.
- **Análisis de ambigüedad:** comparación entre G0 (la gramática natural, ambigua) y G1 (la oficial, no ambigua).

El alfabeto tiene 14 etiquetas:

| Etiqueta | Función narrativa | Ejemplo de evento |
| --- | --- | --- |
| CTX | Contexto | Lord Ashby vivía en una mansión de Kent. |
| PER | Presentación del detective | El inspector Miller era un detective famoso. |
| CRI | Crimen | El asesino envenenó a Lord Ashby. |
| HAL | Hallazgo del crimen | El mayordomo encontró el cadáver. |
| ENC | Encargo al detective | La viuda llamó al inspector Miller. |
| PIS | Pista | Miller encontró un pañuelo en el jardín. |
| INT | Interrogatorio | Miller interrogó a la cocinera. |
| SOS | Sospecha | Miller sospechó del sobrino. |
| DSC | Descarte de una sospecha | El sobrino tenía una coartada. |
| ATQ | Nuevo ataque u obstáculo | Alguien atacó al jardinero. |
| REV | Revelación del culpable | Miller acusó a la cocinera. |
| CNF | Confesión | La cocinera confesó el crimen. |
| CAP | Captura | La policía arrestó a la cocinera. |
| EPI | Epílogo | Miller volvió a Londres. |

| Versión | Qué ingresa el usuario | Specs |
| --- | --- | --- |
| v1 | Etiquetas (paleta de botones o texto) | Núcleo + consola, interfaz web |
| v2 | Texto en español controlado, que el programa traduce a etiquetas | Español controlado |

---

## 2. Arquitectura en capas

```
┌──────────────────────────── Usuario ────────────────────────────┐
│        Consola (CLI `sabueso`)          Navegador (UI React)     │
└──────────────┬──────────────────────────────────┬───────────────┘
               │                                  │ postMessage
               │                          ┌───────▼────────┐
               │                          │   Web Worker   │  (no congela la pantalla)
               │                          └───────┬────────┘
┌──────────────▼──────────────────────────────────▼───────────────┐
│                     Núcleo  @sabueso/core                        │
│                                                                  │
│  Catálogo de géneros ─► .glc ─► AFD ─► LL(1) ─► Grammar          │
│                                                   │              │
│  Relato ─► tokenizador ─► EARLEY ─► diagnóstico / árboles /      │
│                                     conteo / derivación          │
│                                                                  │
│  Análisis: anulables, FIRST/FOLLOW, LL(1), FNC+CYK, AP,          │
│            búsquedas acotadas (ambigüedad, comparación)          │
└──────────────────────────────────────────────────────────────────┘
               ▲ (v2) se conecta delante, sin modificar el núcleo
┌──────────────┴──────────────────────────────────────────────────┐
│   @sabueso/nl: texto ─► AFD ─► Mealy ─► categorías ─► Earley      │
│                ─► marco ─► reglas ─► etiquetas                    │
└──────────────────────────────────────────────────────────────────┘
```

- **Núcleo:** toda la lógica teórica. No sabe nada de pantallas. Se prueba por consola.
- **CLI:** un comando por etapa, para mostrar cada concepto aislado.
- **UI:** solo presentación. Todo resultado viene del núcleo.
- **Web Worker:** corre el núcleo en segundo plano. G0 con 200 eventos tarda hasta 3 s, y la pantalla sigue respondiendo.
- **v2:** un paquete aparte que traduce texto a etiquetas y le pasa la secuencia al núcleo.

---

## 3. Por qué hay dos lenguajes

El programa analiza dos lenguajes distintos porque el anteproyecto pide que la gramática sea un dato y no código: *"las gramáticas se guardan como archivos de texto, de modo que modificarlas no requiere tocar el código"*.

| | Lenguaje 1: archivos de gramática (`.glc`) | Lenguaje 2: relatos |
| --- | --- | --- |
| Ejemplo | `Pasos -> Paso \| Pasos Pasos` | `CRI SOS PIS INT REV` |
| Quién define sus reglas | Nosotros, una vez (`meta.glc`) | Las gramáticas del género (G0 y G1) |
| ¿Es ambiguo? | No: lo diseñamos LL(1) | Puede serlo (G0 lo es a propósito) |
| Analizador | AFD + parser LL(1) | Earley |
| Cuándo se usa | Una vez, al iniciar | En cada análisis |

- **Los relatos** son lo que el programa analiza: el lenguaje del problema.
- **Los `.glc`** son cómo se le dice al programa contra qué analizar: el lenguaje de la configuración.

No compiten: trabajan en cadena.

```
 g1.glc ──► [AFD] ──► tokens ──► [LL(1)] ──► Grammar ──┐
                                                       ├──► [Earley] ──► acepta / árbol / error
 "CRI SOS PIS INT REV" ────────────────────────────────┘
```

**Gramáticas por género.** Las gramáticas las definimos nosotros. El usuario no carga ni edita gramáticas: elige un género y una versión. Hoy hay un solo género, el policial:

- **G1:** la oficial. Con esta se decide si el relato es policial.
- **G0:** la natural y ambigua, que se usa para mostrar el análisis de ambigüedad.

Un catálogo lista los géneros. Sumar otro en el futuro (por ejemplo, el policial negro) es agregar una carpeta con sus `.glc` y una entrada en el catálogo, sin tocar el motor ni la UI.

Las **gramáticas de libro** (expresiones aritméticas, paréntesis, la trampa de ε) no identifican relatos. Solo prueban que el motor es genérico y sirven para demostraciones por consola.

---

## 4. El AFD: de caracteres a tokens

**Qué hace:** recorre el archivo `.glc` carácter por carácter y lo agrupa en **tokens**, las "palabras" del formato. Descarta espacios y comentarios. Es como agrupar letras en palabras.

**Cómo lo hace:** con una **tabla de transiciones**. Según el estado actual y la clase del carácter leído, la tabla dice a qué estado pasar.

| Estado actual | letra | espacio | `-` | `>` | `\|` |
| --- | --- | --- | --- | --- | --- |
| INICIO | → EN_IDENT | → INICIO (se ignora) | → GUION | error | emite BARRA |
| EN_IDENT | → EN_IDENT | emite IDENT | emite IDENT | emite IDENT | emite IDENT |
| GUION | error | error | error | emite FLECHA | error |

**Ejemplo**, con la línea `Pasos -> Evidencia Libres Lineas | Linea Lineas`:

```
P a s o s  → EN_IDENT (5 veces)
' '        → no hay transición con espacio: emite IDENT("Pasos"), vuelve a INICIO
'-'        → GUION
'>'        → emite FLECHA
…
'|'        → emite BARRA
fin        → emite NL
```

**Resultado:**

```
IDENT(Pasos) FLECHA IDENT(Evidencia) IDENT(Libres) IDENT(Lineas) BARRA IDENT(Linea) IDENT(Lineas) NL
```

**Por qué un AFD:** reconocer palabras es un problema **regular**. Para saber si una palabra sigue o terminó, alcanza con recordar en qué estado se está, sin pila ni memoria extra. Si hay un carácter inválido o un literal sin cerrar, el AFD informa la línea y la columna exactas.

En el código hay **un ejecutor genérico** de AFD y **varias tablas**: la del formato `.glc` y, en la v2, la del texto en español y la de los archivos de léxico y reglas. La idea para explicar: *el autómata es la tabla; el programa solo la recorre*.

Consola: `npm run sabueso -- lex g1 --estados`

---

## 5. El parser LL(1): de tokens a reglas

**Qué hace:** recibe los tokens y verifica que formen reglas bien escritas. A medida que las reconoce, arma la estructura que va a usar Earley. Es como agrupar palabras en oraciones con estructura.

**Cómo lo hace:** hay **una función por cada regla de `meta.glc`**, la gramática del formato `.glc`. Cada función mira **un solo token**, el siguiente (ese es el "1" de LL(1)), y con eso decide qué hacer, sin probar alternativas ni retroceder.

```
Regla           → IDENT FLECHA Alternativas NL
Alternativas    → Secuencia MasAlternativas
MasAlternativas → BARRA Secuencia MasAlternativas | ε
Secuencia       → EPSILON | Simbolos
Simbolos        → Simbolo Simbolos | ε
```

**Recorrido sobre los tokens del ejemplo:**

```
leerRegla()
 ├ espera IDENT        → "Pasos"            (lado izquierdo)
 ├ espera FLECHA       → ok
 ├ leerAlternativas()
 │  ├ leerSecuencia()     mira IDENT  → secuencia de símbolos
 │  │  ├ leerSimbolos()   mira IDENT  → "Evidencia"
 │  │  ├ leerSimbolos()   mira IDENT  → "Libres"
 │  │  ├ leerSimbolos()   mira IDENT  → "Lineas"
 │  │  └ leerSimbolos()   mira BARRA  → terminó la alternativa
 │  └ leerMasAlternativas() mira BARRA → hay otra alternativa
 │     ├ consume BARRA
 │     ├ leerSecuencia() → "Linea", "Lineas"
 │     └ leerMasAlternativas() mira NL → no hay más
 └ espera NL           → fin de la regla
```

**Resultado:**

```
Pasos → Evidencia Libres Lineas
Pasos → Linea Lineas
```

Si encuentra un token inesperado, informa el error con línea y columna. Por ejemplo, "línea 12, columna 7: se esperaba `->`".

**Por qué LL(1) y no Earley para leer el `.glc`:**

1. **El huevo y la gallina.** Earley necesita una gramática ya cargada para funcionar. El LL(1) es el primer lector, escrito a mano.
2. **No hace falta tanta potencia.** El formato `.glc` lo diseñamos nosotros, y lo hicimos de modo que un token alcance para decidir. Eso da un lector simple, lineal y con errores precisos.
3. **Herramienta mínima.** Cada clase de lenguaje tiene su máquina adecuada, que es justamente lo que enseña la materia.

El programa además **verifica** con su propio módulo de FIRST/FOLLOW que `meta.glc` es LL(1).

Consola: `npm run sabueso -- grammar g1 --traza-ll1`

---

## 6. Earley paso a paso

### La idea

Earley lee el relato de izquierda a derecha y, en cada posición, anota **todas las hipótesis posibles** sobre qué estructura se está reconociendo:

- cuando un token confirma una hipótesis, la hace avanzar;
- cuando una hipótesis se completa, hace avanzar a las que esperaban ese resultado;
- si al final hay una hipótesis "reconocí un Relato completo desde el principio", el relato es válido.

### El ítem

Cada hipótesis es un **ítem**: una regla con un punto `•` que marca hasta dónde se reconoció, y la posición donde empezó.

```
Hecho → CRI • HallazgoOpc , 0
        ───   ───────────   ─
        ya     falta        empezó en la
        leído  reconocer    posición 0
```

Las posiciones son los huecos entre tokens, y hay un conjunto de ítems por posición (S0, S1, …):

```
   posición:  0     1     2     3
              │ CRI │ PIS │ REV │
```

### Las tres operaciones (y el arreglo de ε)

| Operación | Cuándo | Qué hace | Intuición |
| --- | --- | --- | --- |
| **Predictor** | Después del punto hay un no terminal B | Agrega `B → • …` por cada regla de B | "Si acá espero un B, puede empezar cualquiera de sus formas" |
| **Scanner** | Después del punto hay un terminal y coincide con el próximo token | Copia el ítem al conjunto siguiente con el punto avanzado | "El token confirma la hipótesis" |
| **Completer** | El punto está al final | Avanza los ítems que esperaban ese símbolo | "Terminé un B; quien lo esperaba puede seguir" |
| **Arreglo de ε** | El símbolo esperado es anulable | El Predictor además lo salta en el momento | Evita el bug clásico de Earley con ε |

### Las reglas de G1 que intervienen

```
Relato        → Planteo Investigacion Desenlace
Planteo       → Hecho MarcoOpc | Marco Hecho
MarcoOpc      → Marco | ε
Marco         → CTX PerOpc | PER CtxOpc
Hecho         → CRI HallazgoOpc | HAL
HallazgoOpc   → HAL | ε
Investigacion → Pasos | ENC Pasos
Pasos         → Evidencia Libres Lineas | Linea Lineas
Libres        → Evidencia Libres | ε
Lineas        → Linea Lineas | ε
Linea         → SOS CuerpoLinea
Evidencia     → PIS | INT | ATQ
Desenlace     → Resolucion EpiOpc
EpiOpc        → EPI | ε
Resolucion    → REV Cierre
Cierre        → CNF CapOpc | CAP | ε
```

### Traza completa de `CRI PIS REV` con G1

Notación: **P** = Predictor, **S** = Scanner, **C** = Completer, **ε** = avance por anulable. "(ignorado)" marca un ítem vacío cuyo trabajo ya hizo el arreglo de ε.

**S0, antes de leer nada (8 ítems)**

| # | Ítem | Origen | Cómo |
| --- | --- | --- | --- |
| 1 | `$S → • Relato` | 0 | inicial |
| 2 | `Relato → • Planteo Investigacion Desenlace` | 0 | P |
| 3 | `Planteo → • Hecho MarcoOpc` | 0 | P |
| 4 | `Planteo → • Marco Hecho` | 0 | P |
| 5 | `Hecho → • CRI HallazgoOpc` | 0 | P |
| 6 | `Hecho → • HAL` | 0 | P |
| 7 | `Marco → • CTX PerOpc` | 0 | P |
| 8 | `Marco → • PER CtxOpc` | 0 | P |

Llega `CRI`. Esperan un terminal los ítems 5 (CRI), 6 (HAL), 7 (CTX) y 8 (PER), y solo el 5 coincide: Scanner, pasa a S1.

**S1, después de `CRI` (19 ítems)**

| # | Ítem | Origen | Cómo |
| --- | --- | --- | --- |
| 1 | `Hecho → CRI • HallazgoOpc` | 0 | S |
| 2 | `HallazgoOpc → • HAL` | 1 | P |
| 3 | `HallazgoOpc → •` | 1 | P (ignorado) |
| 4 | `Hecho → CRI HallazgoOpc •` | 0 | ε: el Hecho está completo |
| 5 | `Planteo → Hecho • MarcoOpc` | 0 | C (avanza S0#3) |
| 6 | `MarcoOpc → • Marco` | 1 | P |
| 7 | `MarcoOpc → •` | 1 | P (ignorado) |
| 8 | `Planteo → Hecho MarcoOpc •` | 0 | ε: el Planteo está completo |
| 9 | `Marco → • CTX PerOpc` | 1 | P |
| 10 | `Marco → • PER CtxOpc` | 1 | P |
| 11 | `Relato → Planteo • Investigacion Desenlace` | 0 | C (avanza S0#2) |
| 12 | `Investigacion → • Pasos` | 1 | P |
| 13 | `Investigacion → • ENC Pasos` | 1 | P |
| 14 | `Pasos → • Evidencia Libres Lineas` | 1 | P |
| 15 | `Pasos → • Linea Lineas` | 1 | P |
| 16 | `Evidencia → • PIS` | 1 | P |
| 17 | `Evidencia → • INT` | 1 | P |
| 18 | `Evidencia → • ATQ` | 1 | P |
| 19 | `Linea → • SOS CuerpoLinea` | 1 | P |

Con solo CRI leído, Earley ya sabe todo lo que puede venir: HAL, CTX o PER (todavía en el planteo), o ENC, PIS, INT, ATQ o SOS (empieza la investigación). Llega `PIS`, coincide el #16 y pasa a S2.

> **Así salen los errores.** Si en lugar de PIS llegara REV (el relato `CRI REV`), ningún ítem lo aceptaría y S2 quedaría vacío. El mensaje sería: "posición 1: se encontró REV; se esperaba ATQ, CTX, ENC, HAL, INT, PER, PIS, SOS", es decir, los terminales que esperaban los ítems de S1.

**S2, después de `PIS` (16 ítems)**

| # | Ítem | Origen | Cómo |
| --- | --- | --- | --- |
| 1 | `Evidencia → PIS •` | 1 | S |
| 2 | `Pasos → Evidencia • Libres Lineas` | 1 | C (avanza S1#14) |
| 3 | `Libres → • Evidencia Libres` | 2 | P |
| 4 | `Libres → •` | 2 | P (ignorado) |
| 5 | `Pasos → Evidencia Libres • Lineas` | 1 | ε |
| 6 | `Evidencia → • PIS` | 2 | P |
| 7 | `Evidencia → • INT` | 2 | P |
| 8 | `Evidencia → • ATQ` | 2 | P |
| 9 | `Lineas → • Linea Lineas` | 2 | P |
| 10 | `Lineas → •` | 2 | P (ignorado) |
| 11 | `Pasos → Evidencia Libres Lineas •` | 1 | ε: los Pasos están completos |
| 12 | `Linea → • SOS CuerpoLinea` | 2 | P |
| 13 | `Investigacion → Pasos •` | 1 | C (avanza S1#12) |
| 14 | `Relato → Planteo Investigacion • Desenlace` | 0 | C (avanza S1#11) |
| 15 | `Desenlace → • Resolucion EpiOpc` | 2 | P |
| 16 | `Resolucion → • REV Cierre` | 2 | P |

Las dos posibilidades conviven: la investigación **puede seguir** (más evidencias o una sospecha) o **puede haber terminado** (viene el desenlace). Earley no elige: mantiene ambas. Llega `REV`, coincide el #16 y pasa a S3.

**S3, después de `REV`, fin de la entrada (11 ítems)**

| # | Ítem | Origen | Cómo |
| --- | --- | --- | --- |
| 1 | `Resolucion → REV • Cierre` | 2 | S |
| 2 | `Cierre → • CNF CapOpc` | 3 | P |
| 3 | `Cierre → • CAP` | 3 | P |
| 4 | `Cierre → •` | 3 | P (ignorado) |
| 5 | `Resolucion → REV Cierre •` | 2 | ε |
| 6 | `Desenlace → Resolucion • EpiOpc` | 2 | C (avanza S2#15) |
| 7 | `EpiOpc → • EPI` | 3 | P |
| 8 | `EpiOpc → •` | 3 | P (ignorado) |
| 9 | `Desenlace → Resolucion EpiOpc •` | 2 | ε |
| 10 | `Relato → Planteo Investigacion Desenlace •` | 0 | C (avanza S2#14) |
| 11 | **`$S → Relato •`** | **0** | C (avanza S0#1) |

**Decisión:** `$S → Relato •, 0` está en el último conjunto. **ACEPTA.**

### Por qué siempre termina y por qué es eficiente

- **Termina:** hay una cantidad finita de ítems posibles (regla × posición del punto × origen), y nunca se agrega uno repetido.
- **Es general:** mantiene todas las hipótesis a la vez, así que funciona con gramáticas ambiguas, recursivas a izquierda y con ε.
- **Es eficiente:** como mucho O(n³). Un autómata de pila no determinista probaría caminos uno por uno. Earley **comparte** el trabajo común a través de los orígenes.

Consola: `npm run sabueso -- earley --grammar g1 "CRI PIS REV" --chart` y `npm run sabueso -- trace --grammar g1 "CRI PIS REV"`

---

## 7. Árboles, conteo y ambigüedad

### Cómo sale el árbol

Cada avance guardó **de dónde vino** (su backpointer). El árbol se arma recorriendo desde el ítem final hacia atrás:

```
$S → Relato •
  Relato → Planteo Investigacion Desenlace •   (S3#10)
    ├ Planteo       ← S1#8: Hecho (S1#4) + MarcoOpc = ε
    │    └ Hecho    ← CRI (token 0) + HallazgoOpc = ε
    ├ Investigacion ← S2#13: Pasos (S2#11)
    │    └ Pasos    ← Evidencia (PIS) + Libres = ε + Lineas = ε
    └ Desenlace     ← S3#9: Resolucion (S3#5) + EpiOpc = ε
         └ Resolucion ← REV (token 2) + Cierre = ε
```

En G1 cada ítem tiene un solo backpointer, así que el árbol es único.

### Dónde aparece la ambigüedad: G0

Con G0 y `CRI SOS PIS INT REV`, el ítem que completa los pasos de la posición 1 a la 4 se puede formar de **varias maneras**. Queda con varios backpointers, y al seguirlos salen **4 árboles**:

| Árbol | Cómo agrupa SOS PIS INT | Lectura narrativa |
| --- | --- | --- |
| 1 | `[SOS PIS INT]` | La sospecha abarca la pista y el interrogatorio |
| 2 | `[SOS PIS] INT` | La sospecha abarca solo la pista |
| 3 | `SOS (PIS INT)` | La sospecha no abarca nada |
| 4 | `(SOS PIS) INT` | La sospecha no abarca nada (otra agrupación) |

Son **4 árboles pero 3 lecturas narrativas**. Los árboles 3 y 4 difieren solo en cómo `Pasos → Pasos Pasos` agrupa los pasos. El anteproyecto habla de "tres lecturas" y el motor cuenta árboles: conviene aclararlo en la defensa.

| Relato | G0 | G1 |
| --- | --- | --- |
| `CRI SOS PIS INT REV` | 4 árboles | 1 |
| `CTX HAL ENC INT SOS PIS DSC REV CNF CAP` (ejemplo del anteproyecto) | 8 | 1 |
| `CRI ENC SOS INT DSC PIS SOS ATQ REV CAP` | 112 | 1 |
| `CRI` + 198 × `PIS` + `REV` (200 eventos) | C(197), un número de más de 100 dígitos | 1 |

**El conteo** multiplica y suma los caminos de backpointers sin construir los árboles. Por eso puede informar C(197) sin agotar la memoria. Crece según los **números de Catalan**: n pasos sin sospecha dan C(n−1) árboles.

### Cómo se demuestra que G1 no es ambigua

Con el teorema **toda gramática LL(1) es no ambigua**. El programa calcula FIRST, FOLLOW y la tabla LL(1) de G1, y obtiene 0 conflictos. G0 tiene conflictos, por ejemplo en la celda (Linea, SOS).

### Búsquedas acotadas (los problemas indecidibles)

- `ambiguity --grammar g0 --max-length 4` encuentra el relato más corto con más de un árbol (largo 4, de la forma `CRI SOS x REV`).
- `compare g0 g1 --max-length 3` lista los relatos que acepta G0 y no G1: `CRI DSC REV` y `HAL DSC REV`. Un descarte sin sospecha previa no es un relato policial válido.

"¿Es ambigua?" y "¿son equivalentes?" son problemas **indecidibles**: ningún programa los responde siempre. La búsqueda hasta un largo k puede encontrar un ejemplo (es una **semidecisión**), pero no puede probar que no existe. Por eso la no ambigüedad de G1 se demuestra con el teorema LL(1).

Además, **L(G1) ⊊ L(G0)**: todo relato de G1 es de G0, pero no al revés.

---

## 8. Ejemplo de punta a punta (v1)

### Caso 1: relato válido con G1

**Qué hace el usuario.** En la UI elige "Género: Policial de enigma · Versión: G1", arma `CRI SOS PIS INT REV` con la paleta y presiona Analizar. En la consola:

```bash
npm run sabueso -- parse --grammar g1 "CRI SOS PIS INT REV"
```

**Qué hace cada capa.**

```
UI          SequenceInput arma el texto → coreClient.parse('policial/g1', texto)
Worker      ya tiene G1 cargada → llama a parse() del núcleo
Núcleo  0.  (al inicio) catálogo → g1.glc → AFD → LL(1) → Grammar + anulables
        1.  tokenizador → [CRI, SOS, PIS, INT, REV], todos ∈ Σ
        2.  Earley → S0…S5; ($S → Relato •, 0) ∈ S5 → acepta
        3.  conteo → 1 árbol
        4.  enumeración → el árbol, desde los backpointers
        5.  derivación → 18 pasos
UI          ResultPanel "✓ Aceptado · 1 árbol" · TreeView dibuja el SVG · DerivationView
```

**Salida por consola.**

```text
Género: Policial de enigma · Gramática: policial/g1 (oficial)
Entrada: CRI SOS PIS INT REV  (5 eventos)

✓ ACEPTA · 1 árbol

Relato
├─ Planteo
│  ├─ Hecho
│  │  ├─ CRI
│  │  └─ HallazgoOpc ─ ε
│  └─ MarcoOpc ─ ε
├─ Investigacion
│  └─ Pasos
│     ├─ Linea
│     │  ├─ SOS
│     │  └─ CuerpoLinea
│     │     ├─ Evidencia ─ PIS
│     │     └─ CuerpoLinea
│     │        ├─ Evidencia ─ INT
│     │        └─ CuerpoLinea ─ ε
│     └─ Lineas ─ ε
└─ Desenlace
   ├─ Resolucion
   │  ├─ REV
   │  └─ Cierre ─ ε
   └─ EpiOpc ─ ε

Derivación más a la izquierda (18 pasos):
 0  Relato
 1  Planteo Investigacion Desenlace
 2  Hecho MarcoOpc Investigacion Desenlace
 3  CRI HallazgoOpc MarcoOpc Investigacion Desenlace
 …
18  CRI SOS PIS INT REV
```

Código de salida: `0`.

**Salida en la UI.**

```
┌ Sabueso ─────────────────────── [Análisis] [Earley] [LL(1)] [FNC·CYK] [AP] [G0 vs G1] ┐
│ ┌ Entrada ────────────────────┐ ┌ Gramática ─────────────────────────────────────┐ │
│ │ [CTX][PER][CRI][HAL][ENC]…  │ │ Género: [Policial ▾]  Versión: [G1 ▾]          │ │
│ │ CRI SOS PIS INT REV         │ │ LL(1) ✓ ⇒ no ambigua · anulables: 10           │ │
│ │ [Analizar]                  │ │ Relato -> Planteo Investigacion Desenlace  …   │ │
│ └─────────────────────────────┘ └────────────────────────────────────────────────┘ │
│ ┌ Resultado ─────────────────────────────────────────────────────────────────────┐ │
│ │ ✓ Aceptado · 1 árbol                          [☑ colapsar ε]                    │ │
│ │              Relato                       │ Derivación (paso 7/18)              │ │
│ │     ┌──────────┼───────────┐              │ 7► CRI Linea Lineas Desenlace       │ │
│ │  Planteo  Investigacion  Desenlace        │ [◀ paso] [paso ▶]                   │ │
│ │     │          │            │             │                                     │ │
│ │   Hecho     [Pasos]     Resolucion        │                                     │ │
│ │     │       ┌──┘            │             │                                     │ │
│ │    CRI    Linea            REV            │                                     │ │
│ │          ┌──┴───────┐                     │                                     │ │
│ │         SOS    CuerpoLinea (PIS, INT)     │                                     │ │
│ └────────────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────┘
```

Al seleccionar el paso 7 de la derivación se resalta el nodo `Pasos`, que es el que ese paso expande.

### Caso 2: el mismo relato con G0

El usuario cambia a "G0 (ambigua)". Earley acepta igual, pero informa **"✓ Aceptado · 4 árboles"**, con un paginador `[◀ árbol 1/4 ▶]`. Esa es la comparación que pide el enunciado.

### Caso 3: relato inválido

El usuario ingresa `CTX PER PIS REV`: hay contexto y detective, pero **no hay crimen**.

**Qué hace Earley:** CTX y PER forman un `Marco`. En S2 las hipótesis solo esperan un `Hecho` (CRI o HAL). Llega PIS, nadie lo acepta y S3 queda vacío.

```text
✗ RECHAZA
  CTX PER [PIS] REV
  Posición 2 (evento 3): se encontró PIS
  Se esperaba: CRI, HAL
```

Código de salida: `1`. En la UI, el diagnóstico marca el tercer evento y dice "se encontró PIS (Pista) · se esperaba: CRI (Crimen), HAL (Hallazgo)".

---

## 9. Para qué sirve cada pieza y cómo se relaciona con la materia

| Pieza | Para qué la usa el programa | Tema de la materia |
| --- | --- | --- |
| AFD (lexer) | Leer los archivos `.glc`: de caracteres a tokens | Autómatas finitos (Augusto 1.3, Hopcroft 2.2) |
| Parser LL(1) | Leer los archivos `.glc`: de tokens a reglas | Análisis descendente (Aho 4.4) |
| `buildGrammar` | Armar G = (N, Σ, P, S) | Gramáticas libres de contexto (Augusto 2.4) |
| Anulables | Que Earley funcione con ε | Cadena nula (Augusto 2.3, Hopcroft 7.1.3) |
| Inútiles y vacuidad | Validar que la gramática esté bien escrita | Símbolos inútiles, problemas decidibles (Hopcroft 7.1, 7.4.3) |
| Ciclos | Que el conteo no se cuelgue | Derivaciones A ⇒+ A |
| FIRST, FOLLOW y LL(1) | Demostrar que G1 no es ambigua y certificar el lector | LL(1) ⇒ no ambigua |
| Earley | Decidir si el relato pertenece al lenguaje | Pertenencia a un LIC (Hopcroft 7.4.4) |
| Diagnóstico | Informar posición y esperados | Errores sintácticos |
| Árboles y derivación | Mostrar la estructura del relato | Árboles de derivación (Augusto 2.4.2, Hopcroft 5.2) |
| Conteo | Informar la ambigüedad sin generar todos los árboles | Ambigüedad (Hopcroft 5.4) |
| G0 vs G1 | El análisis de ambigüedad que pide el enunciado | Eliminación de ambigüedad (Hopcroft 5.4.2) |
| Búsquedas acotadas | Encontrar testigos y diferencias entre lenguajes | Indecidibilidad (Hopcroft 9.5.2) |
| FNC + CYK | Validar Earley y mostrar por qué no se eligió CYK | Forma Normal de Chomsky (Augusto 2.4.3, Hopcroft 7.1.5) |
| Autómata de pila | Validar Earley y mostrar la equivalencia GLC ≡ AP | Autómatas de pila (Augusto 2.5–2.6, Hopcroft 6.3.1) |
| Fichas sin código | Límites de las GLC y decidibilidad | Jerarquía de Chomsky, bombeo, Máquina de Turing (Augusto 2.2, 3) |

La progresión para explicar en la defensa:

| Máquina | Analiza | Por qué esa |
| --- | --- | --- |
| AFD | Caracteres → tokens | Los tokens son regulares |
| Transductor de Mealy (v2) | Forma conjugada → infinitivo | Los sufijos son regulares y hay que emitir una salida |
| LL(1) | Formatos fijos que diseñamos | No son ambiguos y alcanza un token de anticipación |
| Earley | Relatos y oraciones | Las gramáticas pueden ser ambiguas: hace falta un algoritmo general |

Cada lenguaje del programa se analiza con la máquina más simple que alcanza: es la jerarquía de la materia aplicada.

---

## 10. La v2: español controlado

### La idea

En la v2, el usuario escribe el relato en **español controlado**, y el programa lo traduce a etiquetas antes de analizarlo con G1. "Controlado" significa un **conjunto acotado**, porque el español libre sería inabordable:

- **Una oración simple por evento**, terminada en punto: sujeto, verbo y complementos. Sin comas, sin subordinadas, sin "y".
- **Vocabulario cerrado** de unas 130 palabras: los determinantes, las preposiciones, los personajes típicos del género (mayordomo, cocinera, viuda…), los objetos (pañuelo, huella, cuchillo…) y unos 23 verbos (encontrar, interrogar, sospechar, acusar…).
- **Los nombres propios** (Miller, Ashby) se reconocen por la mayúscula, sin declararlos.
- **26 reglas** deciden la etiqueta según el verbo y el tipo de objeto. Por ejemplo, "encontrar" + cadáver da HAL, pero "encontrar" + objeto da PIS.

Ejemplo de entrada:

> Lord Ashby vivía en una mansión de Kent. El mayordomo encontró el cadáver de Lord Ashby. La viuda llamó al inspector Miller. Miller interrogó a la cocinera. Miller sospechó del sobrino. Miller encontró un pañuelo en el jardín. El sobrino tenía una coartada. Miller acusó a la cocinera. La cocinera confesó el crimen. La policía arrestó a la cocinera.

Salida: `CTX HAL ENC INT SOS PIS DSC REV CNF CAP`, exactamente la secuencia del anteproyecto. Esa secuencia pasa a Earley con G1, igual que en la v1.

### Cómo escribe el usuario

En el diseño actual, el usuario **escribe libremente dentro del vocabulario cerrado**:

- Si usa una palabra que no está, el programa la marca y sugiere la más parecida: "interogó → ¿quisiste decir interrogar?". Nunca la reemplaza solo.
- Si la oración no tiene una estructura válida, informa qué categoría se esperaba, con el mismo diagnóstico de Earley.
- Hay tres relatos de ejemplo para cargar con un clic (Ashby, Condesa y Banquero).

Otra alternativa es armar cada oración eligiendo palabras de listas (sujeto, verbo, objeto). Elimina los errores, pero queda casi igual que elegir etiquetas y pierde el sentido de "lenguaje natural".

### Cómo procesa cada oración

```
"Miller interrogó a la cocinera."
   ▼ AFD de texto           → Miller · interrogó · a · la · cocinera · .
   ▼ Transductor de Mealy   → interrogó = interrogar (pretérito)
   ▼ Léxico (homomorfismo)  → NOMBRE VERBO PREP DET SUST
   ▼ Earley + oracion.glc   → árbol: sujeto (Miller), verbo, complemento (a la cocinera)
   ▼ Marco semántico        → verbo: interrogar · objeto: cocinera (persona)
   ▼ Reglas                 → INT   (regla "interrogar -> INT")
```

- **Ambigüedad natural:** "encontró el cadáver de Lord Ashby" da 2 árboles: "de Lord Ashby" puede modificar a "cadáver" o al verbo. Si todas las lecturas dan la misma etiqueta, se acepta con una nota. Si no, es un error. Nunca se adivina.
- **Verificación del culpable:** comprueba que el acusado haya aparecido antes en el relato. Esta regla no se puede expresar con una gramática libre de contexto, así que se verifica fuera de la gramática y se informa como advertencia.

### Qué tan complejo es pasar de v1 a v2

**Moderado: aproximadamente la mitad del esfuerzo de la v1.** La razón es que lo más difícil ya está hecho:

| Se reutiliza de la v1 sin cambios | Es nuevo en la v2 |
| --- | --- |
| Ejecutor de AFD | Tabla del AFD de texto y de datos |
| Earley completo (reconocedor, ε, diagnóstico, árboles, conteo) | Gramática de oración (12 reglas) |
| `buildGrammar` y análisis LL(1) | Transductor de Mealy (tabla de sufijos) |
| Infraestructura de la CLI | Léxico (~130 entradas) y reglas (26) |
| Árbol en SVG y paneles de la UI | Extracción del marco, reglas de etiquetado, Levenshtein, verificación del culpable |

- **El núcleo no se toca.** La v2 es un paquete aparte que solo usa la API pública del núcleo.
- **Pasos:** 20 contra 30 del núcleo (4 de ellos son de UI).
- **Lo más laborioso** no es algorítmico: es escribir y ajustar el léxico y las reglas para que cubran los relatos de prueba, y extraer bien el marco del árbol.
- **Riesgo principal:** que la cátedra pruebe una oración con una palabra fuera del vocabulario. El error es claro y agregar la palabra es una línea en `lexico.txt`.
- **Es opcional:** según el anteproyecto, el trabajo queda completo sin la v2.

---

## 11. Guion de demostración

Orden sugerido para la exposición. Cada paso tiene su comando de consola y su vista en la UI.

| # | Qué mostrar | Consola | UI |
| --- | --- | --- | --- |
| 1 | El problema: un relato válido | `parse --grammar g1 "CRI SOS PIS INT REV"` | Análisis, ejemplo A1 |
| 2 | Un relato inválido y su diagnóstico | `parse --grammar g1 "CTX PER PIS REV"` | Análisis, ejemplo I1 |
| 3 | Cómo se leyó la gramática (AFD) | `lex g1 --estados` | Panel de gramática |
| 4 | Cómo se leyó la gramática (LL(1)) | `grammar g1 --traza-ll1` | Panel de gramática |
| 5 | Earley paso a paso | `earley --grammar g1 "CRI PIS REV" --chart` | Pestaña Earley (◀ ▶) |
| 6 | El bug de ε y su arreglo | `earley --grammar epsilon-trampa "x" --sin-arreglo-epsilon` | — |
| 7 | La ambigüedad de G0 | `trees --grammar g0 "CRI SOS PIS INT REV"` | Análisis con G0: 4 árboles |
| 8 | G1 no es ambigua (LL(1)) | `ll1 --grammar g1` y `ll1 --grammar g0` | Pestaña LL(1) |
| 9 | Testigo y diferencia de lenguajes | `ambiguity --grammar g0 --max-length 4`, `compare g0 g1 --max-length 3` | Pestaña G0 vs G1 |
| 10 | Por qué no CYK | `cyk --grammar g1 "CRI PIS REV" --comparar` | Pestaña FNC y CYK |
| 11 | La equivalencia GLC ≡ AP | `pda --grammar g1 "CRI SOS PIS INT REV"` | Pestaña AP |
| 12 | Rendimiento con 200 eventos | `count --grammar g0 --file …/l1.txt` | Análisis con el ejemplo L1 |
| 13 | (v2) Del texto a las etiquetas | `sabueso-nl etiquetar …/ashby.txt` | Modo español controlado |
| 14 | (v2) El límite de las GLC | `sabueso-nl culpable …/banquero.txt` | Banner de advertencia |

Todos los comandos se ejecutan con `npm run sabueso -- <comando>` (o `npm run sabueso-nl -- <comando>`). El guion ejecutable completo está en `docs/demo-consola.md`, y una prueba automática verifica que todos sus comandos funcionen.
