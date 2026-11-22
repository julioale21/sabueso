# NN — Título

> Plantilla de guía. Cópiala como `docs/guides/NN-nombre-del-tema.md`, donde NN es el número de paso del spec. Hay una sola guía por tema: **la teoría va primero**, después el código.
>
> Estilo:
>
> - tuteo ("sabes", no "sabés");
> - oraciones cortas y simples;
> - nombres de archivo en español; identificadores de código en inglés, también los parámetros (`findBuiltInGrammar(name)`);
> - tablas, listas o una imagen SVG en `docs/guides/images/`, nunca dibujos con caracteres;
> - rutas completas desde la raíz la primera vez; después, abreviadas (`src/…`, `test/…`, relativas a `packages/core`);
> - sin repetir: un solo ejemplo, una sola explicación de cada cosa.

> Archivos: `packages/core/src/…` (o `apps/web/src/…`).

## 1. Teoría

La definición formal, corta y en palabras simples, y un solo ejemplo resuelto a mano. Que sea el mismo caso que muestran la consola y las pruebas.

## 2. Por qué así

Las decisiones de diseño, en pocos puntos: por qué esta herramienta o este algoritmo, y qué alternativas se descartaron.

## 3. El código, función por función

Para cada función con algo que explicar: el código y qué hace, línea por línea cuando no es obvio. Las funciones triviales se nombran en una línea o se omiten. Si el paso lanza errores propios, una lista corta acá.

## 4. Consola y pruebas

- Un comando: `npm run sabueso -- …`, con su salida recortada. Agrégalo también a `docs/demo-consola.md`: `demo-doc.test.ts` ejecuta cada comando de ese archivo y falla si alguno termina con código 2.
- Las pruebas: archivo y qué verifica cada una.

## 5. Referencias

La bibliografía, como lista.
