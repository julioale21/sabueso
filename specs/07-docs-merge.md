# SPEC 07 — Una sola guía por tema: fusionar fichas y guías, en español y sin repetir

> **Estado:** Aprobado
> **Depende de:** SPEC 02, SPEC 03, SPEC 05 y SPEC 06
> **Fecha:** 2026-11-21
> **Rama:** `docs_merge` (sale de `main`, con `ui_fixes` ya mergeado)
> **Objetivo:** Fusionar las fichas teóricas (`docs/concepts/`) con las guías de estudio (`docs/guides/`) en una sola guía por tema, con nombres de archivo en español, una estructura corta (teoría y código) y sin contenido repetido, actualizando todas las referencias y explicando en el README cómo se trabajó con specs.

---

## 1. Por qué existe este spec

Hoy hay dos documentos por tema: la **ficha** (la teoría, una página) y la **guía** (el código, larga). Se pisan:

- las dos tienen un ejemplo a mano y un "dónde está en el código";
- tienen **numeraciones distintas** (la guía 15, el arreglo de ε, corresponde a la ficha 16; la guía 12, tabla LL(1), a la ficha 06), y la plantilla tiene que advertirlo;
- los nombres de archivo están en inglés y el contenido en español.

El 2026-11-21 se decidió dejar **una sola guía por tema**: la teoría de la ficha al principio, después el código. Con nombres en español, una estructura corta y sin repetir: solo lo importante y lo que explica las funciones del código. La materia evalúa conceptos, así que la teoría queda primera.

---

## 2. Alcance

**Entra:**

- **Fusionar** las 27 fichas en las guías, según el mapa de la sección 3. Las fichas 26 y 27 (jerarquía de Chomsky, decidibilidad), que no tienen código, quedan como dos guías de teoría (30 y 31).
- **Renombrar** al español todas las guías, la plantilla y los dos documentos sueltos (`console-demo.md` → `demo-consola.md`, `web-manual-check.md` → `verificacion-manual-web.md`), con `git mv` para conservar la historia. La carpeta se sigue llamando `docs/guides/`.
- **Recortar** cada guía a la estructura de la sección 3: una sola versión de cada cosa.
- **Mover** las secciones "Preguntas probables en la defensa" de las guías públicas al archivo privado `.olfato/defense-questions.md`, sin duplicar las que ya estén.
- **Borrar** `docs/concepts/`.
- **Actualizar todas las referencias:**
  - las cabeceras `Card:`/`Cards:` del código del núcleo (66 archivos) pasan a `Guide:`, con la ruta de la guía;
  - las menciones "card N" / "(card N)" en los comentarios del núcleo y de la web pasan a "guide N";
  - el README, el documento oficial (español e inglés), los specs, la prueba `demo-doc.test.ts`, los scripts de los PDF y los documentos de `docs/interactive/`;
  - el material privado: `.olfato/guion.md`, `.olfato/defense-questions.md`, `.olfato/presentation-guide.md` y `~/Desktop/recorrido-completo.md`.
- **README: cómo se trabajó.** Una sección nueva, "Cómo se desarrolló: specs", que explique brevemente que el proyecto se desarrolló guiado por specs (_spec-driven development_): qué es un spec, cómo funciona el ciclo (escribir el spec, revisarlo y aprobarlo, implementarlo paso a paso en su rama, verificar los criterios de aceptación y marcarlo implementado), y la tabla de los specs del proyecto con su estado. Corta: unos pocos párrafos y la tabla.
- **Validación final:** ningún enlace roto, ninguna mención a `docs/concepts/`, los PDF regenerados y todos los chequeos en verde.

**Fuera de alcance (para otros specs):**

- Cambiar el contenido teórico: se mueve y se recorta, no se reescribe la teoría. Si aparece un error teórico, se anota.
- Renombrar las carpetas (`docs/guides/`, `docs/documentation/`, `docs/interactive/`) o los archivos de `docs/documentation/` (`sabueso-es.md`, `sabueso-en.md`).
- Traducir las guías al inglés.
- Cambiar código. Solo cambian comentarios (cabeceras y menciones a fichas) y la ruta que lee `demo-doc.test.ts`.

---

## 3. Modelo de datos

No hay estructuras de código nuevas. Lo que cambia es la forma de los documentos.

### 3.1 Mapa de fichas a guías y nombres nuevos

Los números de las guías se mantienen (son los pasos del SPEC 02; la 29 es la web). La ficha pasa a la guía marcada.

| Guía | Archivo nuevo                               | Fichas que absorbe         |
| ---- | ------------------------------------------- | -------------------------- |
| 02   | `02-gramatica-libre-de-contexto.md`         | 02                         |
| 03   | `03-lexer-afd.md`                           | 03                         |
| 04   | `04-parser-ll1.md`                          | 04                         |
| 05   | `05-gramaticas-del-proyecto.md`             | —                          |
| 06   | `06-relato-como-cadena.md`                  | 01                         |
| 07   | `07-simbolos-anulables.md`                  | 07                         |
| 08   | `08-longitud-minima-derivable.md`           | 10                         |
| 09   | `09-simbolos-inutiles-y-vacuidad.md`        | 08                         |
| 10   | `10-ciclos.md`                              | 09                         |
| 11   | `11-first-y-follow.md`                      | 05                         |
| 12   | `12-tabla-ll1-y-no-ambiguedad.md`           | 06                         |
| 13   | `13-earley-items-y-conjuntos.md`            | 11, 12                     |
| 14   | `14-reconocedor-de-earley.md`               | 13, 14, 15                 |
| 15   | `15-arreglo-de-epsilon.md`                  | 16                         |
| 16   | `16-diagnostico-de-errores.md`              | 17                         |
| 17   | `17-traza-de-earley.md`                     | —                          |
| 18   | `18-arboles-epsilon.md`                     | —                          |
| 19   | `19-arboles-de-un-relato.md`                | 18, 21                     |
| 20   | `20-conteo-de-arboles.md`                   | 19                         |
| 21   | `21-derivacion-mas-a-la-izquierda.md`       | 20                         |
| 22   | `22-api-publica.md`                         | —                          |
| 23   | `23-fnc-start-del-unit.md`                  | 22                         |
| 24   | `24-fnc-useless-term-bin.md`                | — (usa la teoría de la 23) |
| 25   | `25-cyk.md`                                 | 23                         |
| 26   | `26-automata-de-pila.md`                    | 24                         |
| 27   | `27-busquedas-acotadas.md`                  | 25                         |
| 28   | `28-pruebas-diferenciales-y-rendimiento.md` | —                          |
| 29   | `29-interfaz-web.md`                        | —                          |
| 30   | `30-jerarquia-de-chomsky-y-limites.md`      | 26 (solo teoría)           |
| 31   | `31-decidibilidad-y-turing.md`              | 27 (solo teoría)           |

Además: `_template.md` → `_plantilla.md` (con la estructura nueva); `docs/console-demo.md` → `docs/demo-consola.md`; `docs/web-manual-check.md` → `docs/verificacion-manual-web.md`. Las imágenes de `docs/guides/images/` conservan su nombre.

### 3.2 Estructura de cada guía

```markdown
# NN — Título

> Archivos: `packages/core/src/…` (o `apps/web/src/…`).

## 1. Teoría

Definición formal (de la ficha) y un solo ejemplo resuelto a mano.

## 2. Por qué así

Las decisiones de diseño, en pocas líneas.

## 3. El código, función por función

Para cada función con algo que explicar: el código y qué hace, línea por línea cuando
no es obvio. Las funciones triviales se nombran en una línea o se omiten.

## 4. Consola y pruebas

Un comando de consola y la lista de pruebas con qué verifica cada una.

## 5. Referencias

La bibliografía (de la ficha).
```

- **Sin repetir:** si la ficha y la guía tienen un ejemplo a mano, queda uno solo (el mismo caso que muestran la consola y las pruebas). La sección "dónde está en el código" de la ficha desaparece: la guía entera es eso.
- **Se recorta:** "El problema que resuelve", "Cómo se usa en el programa" y "Cómo funciona" se condensan en la Teoría o en "Por qué así"; la tabla de errores queda solo si el paso lanza errores propios, como una lista corta dentro del código.
- **Las guías 30 y 31** (solo teoría) tienen Teoría y Referencias, y un apartado corto de cómo se ve en el proyecto.

---

## 4. Plan de implementación

Cada tanda deja la documentación coherente: pasan `npm run format:check`, `npm test` (incluida `demo-doc.test.ts`) y el chequeo de enlaces del paso 0.

0. **Herramientas de verificación.**
   - Un script fuera del repositorio que revisa los enlaces relativos de todos los `.md` (públicos y privados) y las rutas `docs/…` citadas en el código, y lista los que no existen. Correrlo antes de empezar: el punto de partida debería dar 0 enlaces rotos.
   - Anotar los números de partida: cantidad de guías, fichas, palabras y pruebas.
1. **Renombrar y apuntar las referencias, sin tocar el contenido.**
   - `git mv` de las guías, la plantilla y los dos documentos sueltos a sus nombres nuevos (sección 3.1).
   - Reemplazar las rutas viejas por las nuevas en todo el repositorio y en el material privado.
   - Verificación: chequeo de enlaces en 0 y `npm test` en verde (la prueba de la demo lee la ruta nueva).
2. **Fusionar y recortar, por tandas.** Cada tanda: escribir la guía nueva con la teoría de su ficha y la estructura de la sección 3.2, pasar sus preguntas de la defensa al archivo privado y borrar la ficha absorbida.
   - Tanda A: guías 02 a 06 (gramáticas, lexer, parser, relato).
   - Tanda B: guías 07 a 12 (los análisis y LL(1)).
   - Tanda C: guías 13 a 18 (Earley).
   - Tanda D: guías 19 a 22 (árboles, derivación, API).
   - Tanda E: guías 23 a 29 (FNC, CYK, autómata, búsquedas, diferencial, web).
   - Tanda F: guías 30 y 31 (fichas 26 y 27) y la plantilla nueva.
   - Verificación por tanda: chequeo de enlaces en 0 y una lectura de una guía de la tanda para controlar que la teoría está completa y no se repite nada.
3. **Cabeceras y menciones en el código.**
   - `Card:`/`Cards:` → `Guide:` con la ruta de la guía, en `packages/core/src` (66 archivos).
   - "card N" → "guide N" con el número de guía del mapa, en los comentarios del núcleo y de la web.
   - Verificación: `npm run typecheck`, `npm run lint` y `npm test` en verde; ningún comentario dice "card".
4. **Borrar `docs/concepts/` y actualizar los índices.**
   - README: agregar la sección "Cómo se desarrolló: specs" (qué es el desarrollo guiado por specs, cómo funciona el ciclo de un spec, y la tabla de los specs con su estado, que hoy está en la sección "Estado"; si se mueve, que no quede repetida), con su entrada en el índice "Contenido".
   - README (árbol de carpetas, tabla "Conceptos de la materia en el código", tabla de documentación), el documento oficial en español y en inglés (las líneas "Detalle: guías … · fichas …"), y los specs que citen fichas.
5. **Validación final.**
   - Chequeo de enlaces en 0, en el repositorio y en el material privado.
   - `grep` sin resultados para `docs/concepts`, `concepts/`, "ficha" (salvo en notas históricas de los specs) y los nombres de archivo viejos.
   - Pasan `typecheck`, `lint`, `format:check`, `build` y `npm test`.
   - Regenerar los PDF del documento oficial y el PDF privado de estudio (ajustando su script a la carpeta única).
   - Comparar los números de partida: cantidad de guías (31), palabras totales (deberían bajar) y pruebas (sin cambios).
   - Nota corta de cierre en la sección 6 de este spec.

---

## 5. Criterios de aceptación

- [ ] Existe la rama `docs_merge` y todos los cambios están en ella.
- [ ] `docs/concepts/` no existe.
- [ ] `docs/guides/` tiene las 31 guías de la sección 3.1, con nombres en español, y `_plantilla.md`.
- [ ] Existen `docs/demo-consola.md` y `docs/verificacion-manual-web.md`, y no existen los nombres viejos.
- [ ] Cada guía sigue la estructura de la sección 3.2 y no repite un ejemplo ni una explicación.
- [ ] Ninguna guía pública tiene "Preguntas probables en la defensa"; esas preguntas están en `.olfato/defense-questions.md`, sin duplicados.
- [ ] Ninguna cabecera del código dice `Card:`/`Cards:`; todas dicen `Guide:` con una ruta que existe.
- [ ] El chequeo de enlaces da 0 enlaces rotos en el repositorio y en el material privado.
- [ ] No quedan menciones a `docs/concepts/` ni a los nombres de archivo viejos.
- [ ] Pasan `typecheck`, `lint`, `format:check`, `build` y `npm test`.
- [ ] Los PDF del documento oficial y el PDF privado de estudio están regenerados.
- [ ] El README tiene la sección "Cómo se desarrolló: specs", que explica qué es el desarrollo guiado por specs y cómo funciona el ciclo de un spec, con la tabla de los specs y su estado, sin repetirla en otra sección.

---

## 6. Decisiones tomadas y descartadas

- **Sí:** una sola guía por tema, con la teoría primero (2026-11-21). Quita la doble numeración y el contenido repetido; la materia evalúa conceptos, así que la teoría abre cada guía.
- **No:** dejar fichas y guías separadas, con una nota que aclare la diferencia. Seguían la doble numeración y las secciones repetidas.
- **Sí:** nombres de archivo en español; la carpeta sigue siendo `docs/guides/` (2026-11-21). Los nombres ayudan a quien lee; la ruta de la carpeta casi no se ve y se evita otro cambio grande.
- **Sí:** la estructura corta: Teoría, Por qué así, El código, Consola y pruebas, Referencias (2026-11-21). Una sola versión de cada cosa.
- **No:** agregar la teoría al principio sin recortar el resto. Las guías quedaban casi tan largas como hoy.
- **Sí:** las preguntas de la defensa pasan al archivo privado (2026-11-21). Las guías públicas quedan con teoría y código; las preguntas son material de preparación.
- **Sí:** el README explica el desarrollo guiado por specs (2026-11-21, pedido al revisar este spec). Es la forma en que se hizo todo el proyecto, y quien lee el repositorio tiene que entender qué son los archivos de `specs/` y cómo se usaron.
- **Sí:** un spec y una rama, por tandas (2026-11-21). Son más de 100 archivos con referencias; cada tanda se verifica con el chequeo de enlaces.

---

## 7. Riesgos identificados

- **Perder teoría al recortar.** Una definición o un ejemplo de una ficha podría quedar afuera. Mitigación: en cada tanda, la teoría de la ficha se copia primero y recién después se recorta lo que repite; se lee una guía por tanda.
- **Enlaces rotos.** Más de 100 archivos citan rutas de `docs/`. Mitigación: el chequeo de enlaces del paso 0, corrido después de cada tanda, incluido el material privado.
- **La prueba de la demo.** `demo-doc.test.ts` lee `docs/console-demo.md`; si la ruta no se actualiza en el mismo paso, falla. Mitigación: se cambia en el paso 1, junto con el renombre.
- **URLs públicas que cambian.** Los enlaces de GitHub a guías y fichas dejan de andar. Mitigación: aceptado; el README y el documento oficial apuntan a las rutas nuevas.
- **Commits a mitad de una tanda** (como pasó en el SPEC 06). Mitigación: hacer commit al terminar cada tanda.
