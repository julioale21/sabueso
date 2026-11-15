# Guion de la demo por consola

Los comandos de la demo de la exposición, en el orden en que se muestran. Cada spec agrega los suyos.

La prueba `packages/core/test/command-line/demo-doc.test.ts` ejecuta todas las líneas `npm run sabueso -- …` de los bloques de código de este archivo, y falla si alguna termina con código 2 (uso incorrecto). Así el guion siempre corresponde a comandos que existen.

## Ayuda

```sh
npm run sabueso -- help
```

## Gramática libre de contexto

```sh
npm run sabueso -- demo-grammar
```
