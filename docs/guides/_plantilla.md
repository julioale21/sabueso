# Guía de estudio: NN — Nombre del paso

> Plantilla de guía. Copiarla como `docs/guides/NN-step-name.md` (nombre de archivo en inglés, contenido en español), donde NN es el número de paso del spec (sección 8.3). Ojo: los pasos y las fichas tienen numeraciones distintas (el paso 12, tabla LL(1), usa la ficha 06). Cuando la guía cite otro paso, tomar el número de la sección 8.3; cuando cite una ficha, el de la tabla 7.1. La ficha del concepto (`docs/concepts/`) es el resumen teórico; esta guía es la explicación completa del código y de sus decisiones. Para los diagramas, usar tablas, listas numeradas o una imagen SVG, nunca cajas dibujadas con caracteres: se desalinean en las vistas previas sin fuente monoespaciada. Los SVG van en `docs/guides/images/`, junto al script que los genera (ver la guía 03).
>
> Estilo: tuteo ("sabes", no "sabés"); identificadores de código en inglés, también los parámetros (`findBuiltInGrammar(name)`); oraciones cortas; rutas completas desde la raíz del repo la primera vez y abreviadas (`src/…`, `test/…`, relativas a `packages/core`) después.

> Las secciones son una guía, no un molde: si el paso no tiene algoritmo o no lanza errores, se omiten, y se pueden agregar secciones propias del paso. Lo que no puede faltar: el problema, cómo funciona, el código, el ejemplo a mano, consola y pruebas, y las preguntas de la defensa.

> **Paso N del SPEC 0X.** Archivos: `packages/core/src/…`.
> Ficha teórica relacionada: [`docs/concepts/NN-….md`](../concepts/NN-….md).

## 1. El problema que resuelve

Qué le falta al programa antes de este paso y qué no podría hacer sin él. Dónde se ubica en la cadena (archivo → lexer → parser → gramática → análisis → Earley → …).

## 2. Por qué esta herramienta

- **Qué se eligió** (por ejemplo: un AFD, un parser LL(1)) y **qué propiedad del problema la hace adecuada**.
- **Por qué es eso y no otra cosa:** qué la hace un AFD, un LL(1), etc. Comprobarlo contra la definición formal.
- **Alternativas descartadas** y por qué (más potente pero innecesaria, más simple pero insuficiente…).

## 3. Cómo se usa en el programa

Quién la llama, con qué entrada, qué devuelve y quién usa el resultado. Un diagrama de las piezas y sus dependencias.

## 4. Cómo funciona

El algoritmo explicado en palabras y con la notación de la materia, antes de mirar el código.

## 5. El código, función por función

Para cada función (exportada o interna): el código, qué hace, cómo, qué devuelve, qué errores lanza y por qué está diseñada así.

## 6. Ejemplo recorrido a mano

Una entrada chica, paso a paso, con una tabla del estado en cada paso. Es el mismo caso que muestra el comando de consola y que verifica la prueba.

## 7. Errores

| Mensaje | Función | Qué lo provoca | Ejemplo |
| ------- | ------- | -------------- | ------- |

## 8. Consola y pruebas

- Comando: `npm run sabueso -- …`, con su salida. Agregarlo también a `docs/console-demo.md`: `demo-doc.test.ts` ejecuta cada comando de ese archivo y falla si alguno termina con código 2.
- Pruebas: archivo y qué verifica cada una.

## 9. Preguntas probables en la defensa

**¿…?**
Respuesta.
