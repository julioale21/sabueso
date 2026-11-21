# Sabueso

**Analizador sintáctico de relatos policiales.** Decide si un relato respeta la estructura del policial de enigma, con una gramática libre de contexto y un analizador de Earley implementado desde cero.

[![CI](https://github.com/julioale21/sabueso/actions/workflows/ci.yml/badge.svg)](https://github.com/julioale21/sabueso/actions/workflows/ci.yml)
![Versión](https://img.shields.io/badge/versi%C3%B3n-0.1.0-blue)
![Estado](https://img.shields.io/badge/SPEC%2002-paso%2026%20de%2030-orange)
![Node](https://img.shields.io/badge/node-%E2%89%A520.19-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)

Laboratorio Integrador Final de **Fundamentos Teóricos de Informática** · Licenciatura en Informática · Facultad de Ingeniería · UNPSJB · 2026.

---

## Contenido

- [Qué es](#qué-es)
  - [Por qué "Sabueso"](#por-qué-sabueso)
- [El anteproyecto en resumen](#el-anteproyecto-en-resumen)
- [Cómo funciona](#cómo-funciona)
- [Decisiones de diseño](#decisiones-de-diseño)
- [Estado](#estado)
- [Primeros pasos](#primeros-pasos)
- [Uso](#uso)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Comandos npm](#comandos-npm)
- [Calidad](#calidad)
- [Documentación](#documentación)
- [Autor](#autor)

---

## Qué es

Sabueso recibe un relato policial escrito como una **secuencia de etiquetas narrativas**, una por evento, y responde si es una oración del lenguaje del género:

- si el relato es válido, muestra el **árbol sintáctico** y la **derivación más a la izquierda**;
- si no lo es, informa la **posición del error** y los **símbolos esperados**;
- si la gramática es ambigua, **cuenta** todos los árboles sin construirlos y **dibuja** los primeros, para mostrar la ambigüedad.

El motor es genérico: recibe la gramática como dato, en un archivo de texto `.grammar`. Cambiar la gramática no requiere tocar el código.

**La entrada, hoy y en la versión final:**

| Versión                          | Qué escribe el usuario                                                                                                                        | Estado              |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| **Núcleo** (SPEC 02)             | La secuencia de etiquetas, una por evento: `CTX HAL ENC INT SOS PIS DSC REV CNF CAP`                                                          | En curso            |
| **Español controlado** (SPEC 04) | El relato en español, con oraciones simples (una por evento) y un vocabulario cerrado. Sabueso lo traduce a etiquetas y se las pasa al núcleo | Ampliación opcional |

**Un ejemplo.** Este es el relato de ejemplo del anteproyecto. Cada oración cuenta un evento, y cada evento tiene su etiqueta:

| Oración                                         | Etiqueta | Evento                  |
| ----------------------------------------------- | -------- | ----------------------- |
| Lord Ashby vivía en una mansión de Kent.        | `CTX`    | contexto                |
| El mayordomo encontró el cadáver de Lord Ashby. | `HAL`    | hallazgo del crimen     |
| La viuda llamó al inspector Miller.             | `ENC`    | encargo al detective    |
| Miller interrogó a la cocinera.                 | `INT`    | interrogatorio          |
| Miller sospechó del sobrino.                    | `SOS`    | sospecha                |
| Miller encontró un pañuelo en el jardín.        | `PIS`    | pista                   |
| El sobrino tenía una coartada.                  | `DSC`    | descarte de la sospecha |
| Miller acusó a la cocinera.                     | `REV`    | revelación del culpable |
| La cocinera confesó el crimen.                  | `CNF`    | confesión               |
| La policía arrestó a la cocinera.               | `CAP`    | captura                 |

- **En el núcleo**, la persona hace esta traducción y escribe la columna de etiquetas: `CTX HAL ENC INT SOS PIS DSC REV CNF CAP`. Sabueso la analiza y la acepta.
- **Con el SPEC 04**, la persona escribe la columna de oraciones, y Sabueso arma solo la secuencia de etiquetas antes de analizarla.

El texto libre, sin restricciones de vocabulario ni de forma, queda fuera de alcance, como dice el anteproyecto.

### Por qué "Sabueso"

Esta primera versión cubre un solo género, el **relato policial de enigma**, y de ahí el nombre. Pero el motor no depende del policial: Earley, el análisis y la FNC reciben la gramática como dato, y el género es solo una entrada del catálogo.

Para sumar otro tipo de narrativa (el cuento maravilloso, la tragedia, el relato de aventuras) no hace falta tocar el motor. Alcanza con tres archivos:

| Qué agregar                | Dónde                                       | Ejemplo del policial                         |
| -------------------------- | ------------------------------------------- | -------------------------------------------- |
| Las gramáticas del género  | `packages/core/grammars/genres/<género>/`   | `genres/detective/g0.grammar` y `g1.grammar` |
| Su alfabeto de etiquetas   | `packages/core/src/genres/<género>-tags.ts` | `detective-tags.ts` (las 14 etiquetas)       |
| Una entrada en el catálogo | `packages/core/src/genres/catalog.ts`       | la entrada `detective`                       |

---

## El anteproyecto en resumen

El documento completo está en el [**anteproyecto (PDF)**](Romero%20Julio%20-%20Ante%20proyecto%20Fundamentos%20Te%C3%B3ricos%20de%20la%20informatica.pdf).

| Tema                 | Resumen                                                                                                                                                                                                                       |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Problema**         | El policial de enigma tiene una estructura muy estable (crimen, investigación, revelación), descripta por la narratología estructural (Propp, Todorov). Eso lo vuelve un buen dominio para las gramáticas libres de contexto. |
| **Objetivo**         | Un analizador que decida si una secuencia de etiquetas respeta esa estructura, y que muestre de forma comprensible cómo llega a la decisión.                                                                                  |
| **Alfabeto**         | 14 etiquetas narrativas, de `CTX` (contexto) a `EPI` (epílogo): `CRI` crimen, `PIS` pista, `SOS` sospecha, `REV` revelación, etc.                                                                                             |
| **Gramática**        | Dos versiones: **G0**, natural y ambigua a propósito, y **G1**, rediseñada sin ambigüedad. Compararlas es el análisis de ambigüedad que pide el enunciado.                                                                    |
| **Algoritmo**        | **Earley**, implementado desde cero: acepta cualquier gramática libre de contexto, incluso ambigua, y trabaja sobre la gramática tal como se diseñó.                                                                          |
| **Alcance**          | Un **núcleo comprometido** (carga manual de etiquetas) que cubre todo el enunciado, y una **ampliación opcional**: escribir el relato en español controlado y traducirlo a etiquetas automáticamente.                         |
| **Fuera de alcance** | Comprensión de texto libre, aprendizaje automático y otros subgéneros policiales.                                                                                                                                             |

Contenidos de la materia que aplica: gramáticas libres de contexto, derivaciones y árboles, ambigüedad, formas normales (FNC y CYK), autómatas de pila, jerarquía de Chomsky, decidibilidad y autómatas finitos.

---

## Cómo funciona

El sistema tiene tres capas (los cuadros punteados): la traducción del español (ampliación), el núcleo, que calcula todo, y la presentación (la consola y la web), que recibe lo que escribe la persona y muestra los resultados, sin calcular nada. Dentro del núcleo hay dos entradas independientes, que se encuentran en los reconocedores:

- la **gramática** (un archivo `.grammar`): se carga una vez y define el lenguaje del género;
- el **relato**: lo que se analiza en cada consulta. En la primera versión (el núcleo) el flujo arranca en la **cadena de etiquetas**, que escribe la persona. La versión final (SPEC 04) agrega una etapa delante: el relato se escribe en español controlado y el programa lo traduce a esa misma cadena. Desde ahí, el flujo es idéntico.

```mermaid
flowchart LR
  subgraph NL["@sabueso/natural-language · SPEC 04 (ampliación)"]
    N["Texto en español<br/>controlado"]
  end

  subgraph CORE["@sabueso/core · SPEC 02 (núcleo)"]
    subgraph GR["Gramática: se carga una vez"]
      A[".grammar<br/>(texto)"] --> B["Lexer<br/>AFD"] --> C["Parser<br/>LL(1)"] --> D["G = (N, Σ, P, S)"]
    end
    subgraph RE["Relato: cada consulta"]
      T["Cadena de etiquetas<br/>CTX HAL ENC …<br/><i>entrada de la primera versión</i>"] --> S["¿Están en el Σ<br/>de la gramática?"]
    end
    D --> E["Análisis de G<br/>anulables, inútiles,<br/>minYield, FIRST/FOLLOW"]
    E -. "FIRST/FOLLOW" .-> V["G1 es LL(1):<br/>no ambigua"]
    D --> R
    E -- "anulables,<br/>inútiles, minYield" --> R
    S --> R
    R["Reconocedores: ¿relato ∈ L(G)?<br/>Earley (principal)<br/>CYK, sobre la FNC<br/>autómata de pila"] --> O["Resultados, como datos<br/>los tres: el veredicto<br/>Earley: diagnóstico, árboles y derivación<br/>CYK: un árbol FNC<br/>autómata de pila: el camino de IDs"]
  end

  subgraph UI["Presentación: recibe la entrada y muestra, sin calcular"]
    CLI["Consola sabueso<br/>(en @sabueso/core)"]
    WEB["Web<br/>@sabueso/web · SPEC 03"]
  end

  N -. "traducción" .-> T
  O --> CLI
  O --> WEB

  style NL stroke-dasharray: 6 4,fill:none
  style CORE stroke-dasharray: 6 4,fill:none
  style UI stroke-dasharray: 6 4,fill:none
```

| Etapa                            | Entrada                     | Salida                                              | Concepto                                                  |
| -------------------------------- | --------------------------- | --------------------------------------------------- | --------------------------------------------------------- |
| Lexer                            | texto del `.grammar`        | tokens                                              | autómata finito determinista                              |
| Parser                           | tokens                      | reglas                                              | análisis descendente LL(1)                                |
| Gramática                        | reglas                      | G = (N, Σ, P, S)                                    | gramática libre de contexto                               |
| Análisis                         | G                           | anulables, inútiles, minYield, ciclos, FIRST/FOLLOW | algoritmos de punto fijo                                  |
| Traducción (SPEC 04, ampliación) | texto en español controlado | etiquetas                                           | autómatas finitos y Earley sobre una gramática de oración |
| Relato                           | etiquetas                   | etiquetas verificadas contra Σ                      | alfabeto y cadena                                         |
| Earley                           | G y el relato               | aceptado o rechazado, con diagnóstico               | pertenencia en una GLC                                    |
| Árboles                          | el chart de Earley          | árboles, cantidad y derivación                      | árboles de derivación                                     |
| FNC                              | G                           | la misma L(G) en Forma Normal de Chomsky            | formas normales                                           |
| CYK                              | la FNC y el relato          | aceptado o rechazado, y un árbol FNC                | programación dinámica                                     |
| Autómata de pila                 | G y el relato               | aceptado o rechazado, con el camino de IDs          | equivalencia GLC ↔ AP                                     |

**Para qué sirve el análisis:** los anulables los usan Earley (el arreglo de ε), los árboles y el paso DEL de la FNC; los inútiles, el paso USELESS; minYield, la poda del autómata de pila. FIRST/FOLLOW y la tabla LL(1) no alimentan a ningún algoritmo: **validan** la gramática. Si la tabla no tiene conflictos, la gramática es LL(1) y por lo tanto no ambigua. Así se demuestra que G1 no es ambigua (G0 tiene 13 conflictos).

El detalle de cada pieza, con sus funciones clave, está en la [documentación del núcleo](docs/documentation/sabueso-es.md).

---

## Decisiones de diseño

- **Earley como analizador principal.** Acepta cualquier gramática libre de contexto, incluida G0, que es ambigua, y sus árboles tienen la forma de la gramática diseñada.
- **CYK solo como comparación.** Exige pasar la gramática a Forma Normal de Chomsky, y eso deforma los árboles: aparecen símbolos como `T_a` y `X1` que nadie diseñó. Se implementa igual, para mostrar esa diferencia y para validar Earley.
- **Ningún analizador determinista para el relato.** LL y LR no sirven porque G0 es ambigua por diseño.
- **Desde cero.** No se usan bibliotecas de análisis sintáctico ni de procesamiento de lenguaje natural.
- **Las gramáticas son datos.** Se escriben en un formato propio, `.grammar`, que se lee con un lexer AFD y un parser LL(1) hechos para el proyecto. El propio formato está descripto por una gramática (`meta.grammar`).
- **G1 es LL(1).** Su tabla predictiva no tiene conflictos, y eso demuestra por construcción que no es ambigua. G0 tiene 13 conflictos.
- **El arreglo de ε de Aycock y Horspool.** El Earley clásico falla con producciones vacías. El motor incluye el arreglo, y la consola puede mostrar el error original (`--no-epsilon-fix`).
- **Resultados como datos, no callbacks.** Las trazas (del AFD, del parser y de Earley) y las rondas de los puntos fijos se devuelven como listas, listas para mostrar en la consola o en la web.
- **Un núcleo independiente de la interfaz.** Solo la entrada de la consola usa APIs de Node, así que el mismo código corre en el navegador.
- **Cada concepto tiene su comando y su prueba.** Todo lo que hace el motor se puede ver por consola.
- **Código en inglés, documentación en español.**

---

## Estado

**SPEC 02: pasos 1 a 26 de 30 terminados.** El núcleo ya:

- lee gramáticas `.grammar` y trae las del policial: G0 y G1;
- analiza la gramática: anulables, longitud mínima, símbolos inútiles, ciclos, FIRST/FOLLOW y tabla LL(1);
- decide con Earley si un relato pertenece al lenguaje, explica el rechazo, cuenta y dibuja los árboles y escribe la derivación;
- convierte cualquier gramática a Forma Normal de Chomsky en seis pasos;
- reconoce con CYK sobre la FNC y compara su árbol con el de Earley;
- construye el autómata de pila de la gramática y lo simula, con el camino de aceptación.

**Sigue:** búsquedas acotadas (paso 27). **Después:** pruebas diferenciales y de rendimiento, el guion de consola y las fichas finales.

El proyecto avanza por specs, en orden:

| Spec                                                            | Contenido                                                                      | Estado                      |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------- |
| [01 — Setup del proyecto](specs/01-project-setup.md)            | Monorepo, tooling, esqueletos y CLI base                                       | Terminado                   |
| [02 — Núcleo y motor de Earley](specs/02-core-earley-engine.md) | Librería de gramáticas y analizador de Earley (`@sabueso/core`)                | En curso (pasos 1–26 de 30) |
| [03 — Interfaz web](specs/03-web-interface.md)                  | Análisis visual y vistas didácticas (`apps/web`)                               | Borrador                    |
| [04 — Español controlado](specs/04-controlled-spanish.md)       | Del texto del relato a la secuencia de etiquetas (`@sabueso/natural-language`) | Borrador                    |

---

## Primeros pasos

**Requisitos:** Node.js 24 (la versión de `.nvmrc`; la mínima soportada es 20.19) y npm.

```sh
git clone https://github.com/julioale21/sabueso.git
cd sabueso
nvm use          # Node 24, según .nvmrc
npm install      # instala dependencias y activa los hooks de git
npm test         # corre todas las pruebas
```

`npm install` activa los hooks de git con el script `prepare`. Si creaste el repositorio con `git init` después de instalar, vuelve a correr `npm install`.

---

## Uso

Todo el motor se usa por consola con `npm run sabueso -- <comando>`. `npm run sabueso -- help` lista los comandos.

```sh
npm run sabueso -- genres                                     # el policial de enigma y sus 14 etiquetas
npm run sabueso -- grammar g1                                 # G1 completa: G = (N, Σ, P, S)
npm run sabueso -- analyze --grammar g1                       # todos los análisis de G1
npm run sabueso -- parse --grammar g1 "CRI PIS REV"           # veredicto, árbol y derivación
npm run sabueso -- parse --grammar g1 "CRI REV"               # rechazo: posición y esperados
npm run sabueso -- earley --grammar g1 --chart "CRI PIS REV"  # los conjuntos de Earley S0 … S3
npm run sabueso -- count --grammar g0 "CRI SOS PIS INT REV"   # 4 árboles: G0 es ambigua
npm run sabueso -- count --grammar g1 "CRI SOS PIS INT REV"   # 1 árbol: G1 no lo es
npm run sabueso -- chomsky-normal-form --grammar g1           # los 6 pasos de la FNC
npm run sabueso -- cocke-younger-kasami --grammar g1 --compare "CRI PIS REV"   # CYK junto a Earley
npm run sabueso -- pushdown-automaton --grammar g1 "CRI PIS REV"              # el autómata de pila, ID por ID
```

Las gramáticas incluidas son las del género (`g0` y `g1`), la del formato (`meta`) y siete de prueba (`arithmetic`, `parentheses`, `epsilon-trap`, …). `npm run sabueso -- grammars` las lista. Para usar una gramática propia: `--grammar-file <ruta>`.

El recorrido completo de la demo está en [`docs/console-demo.md`](docs/console-demo.md).

---

## Estructura del repositorio

```plaintext
sabueso/
├── packages/
│   └── core/                          # @sabueso/core: el motor, sus pruebas y la consola
│       ├── grammars/
│       │   ├── genres/detective/      # G0 (ambigua) y G1 (oficial) del policial
│       │   ├── test/                  # gramáticas de libro y casos borde
│       │   └── meta.grammar           # la gramática del propio formato .grammar
│       ├── src/
│       │   ├── grammar/               # el modelo G = (N, Σ, P, S) y buildGrammar
│       │   ├── automata/              # el ejecutor genérico de AFD
│       │   ├── grammar-format/        # lexer (AFD) y parser LL(1) del formato .grammar
│       │   ├── input/                 # el relato: separar etiquetas y verificar Σ
│       │   ├── analysis/              # anulables, minYield, inútiles, ciclos, FIRST/FOLLOW, LL(1)
│       │   ├── earley/                # ítems, chart, reconocedor, diagnóstico y traza
│       │   ├── trees/                 # árboles, árboles ε, conteo, derivación y dibujo
│       │   ├── chomsky-normal-form/   # los 6 pasos de la FNC
│       │   ├── cocke-younger-kasami/  # CYK sobre la FNC
│       │   ├── pushdown-automaton/    # GLC → autómata de pila y su simulación
│       │   ├── genres/                # catálogo de géneros y sus etiquetas
│       │   ├── command-line/          # la consola sabueso: un archivo por comando
│       │   ├── parse.ts               # parse(): la API que usa la web
│       │   ├── index.ts               # la API pública del paquete
│       │   └── command-line.ts        # punto de entrada de la consola
│       └── test/                      # las pruebas, organizadas como src (más integración)
├── apps/
│   └── web/                           # @sabueso/web: la interfaz web (Vite + React)
├── docs/
│   ├── documentation/                 # documentación del núcleo (sabueso-es.md y su PDF)
│   ├── guides/                        # una guía de estudio por paso del SPEC 02
│   ├── concepts/                      # fichas teóricas, una por concepto
│   ├── interactive/                   # páginas paso a paso: Earley y el autómata de pila
│   └── console-demo.md                # los comandos de la demo, en orden
├── examples/grammars/                 # gramáticas chicas para mostrar casos por consola
├── specs/                             # los specs del proyecto, uno por etapa
├── .github/workflows/ci.yml           # integración continua
├── .githooks/                         # pre-commit y pre-push
└── Romero Julio - Ante proyecto …pdf  # el anteproyecto
```

## Comandos npm

| Comando                                   | Qué hace                                  |
| ----------------------------------------- | ----------------------------------------- |
| `npm run sabueso -- <comando>`            | Compila el núcleo y ejecuta su consola    |
| `npm run dev -w @sabueso/web`             | Servidor de desarrollo de la interfaz web |
| `npm test`                                | Pruebas del núcleo y de la web (Vitest)   |
| `npm run build`                           | Compila `core` y genera `apps/web/dist`   |
| `npm run typecheck`                       | Verifica los tipos del núcleo y de la web |
| `npm run lint`                            | ESLint                                    |
| `npm run format` / `npm run format:check` | Aplica o verifica el formato de Prettier  |

---

## Calidad

- **Pruebas:** más de 800 pruebas con Vitest, con valores calculados a mano. Cada comando de consola tiene la suya, y una prueba verifica que el guion de la demo sigue funcionando.
- **Hooks de git** (`.githooks/`): `pre-commit` corre `format:check` y `lint`; `pre-push` corre `npm test`.
- **Integración continua** (`.github/workflows/ci.yml`): en cada push y pull request corre `npm ci`, `format:check`, `lint`, `typecheck`, `build` y `test`.
- **TypeScript estricto**, con `exactOptionalPropertyTypes`.

---

## Documentación

| Documento                                                                                                      | Para qué                                                   |
| -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| [Documentación del núcleo](docs/documentation/sabueso-es.md)                                                   | Arquitectura, piezas, funciones clave y cómo se conectan   |
| [Guías de estudio](docs/guides/)                                                                               | El código de cada paso, función por función                |
| [Fichas teóricas](docs/concepts/)                                                                              | La teoría de cada concepto, con referencias bibliográficas |
| [Demo por consola](docs/console-demo.md)                                                                       | Los comandos de la exposición, en orden                    |
| [Specs](specs/)                                                                                                | Qué se construye en cada etapa y por qué                   |
| [Anteproyecto](Romero%20Julio%20-%20Ante%20proyecto%20Fundamentos%20Te%C3%B3ricos%20de%20la%20informatica.pdf) | La propuesta original del trabajo                          |

---

## Autor

**Julio Alejandro Romero**

- Asignatura: Fundamentos Teóricos de Informática, 2026
- Carrera: Licenciatura en Informática, Facultad de Ingeniería, UNPSJB
- Docente: Lic. Daniel Isaías Arza
- Modalidad: individual
