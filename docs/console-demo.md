# Guion de la demo por consola

Los comandos de la demo de la exposición, en el orden en que se muestran. Cada spec agrega los suyos.

La prueba `packages/core/test/cli/demo-doc.test.ts` ejecuta todas las líneas `npm run sabueso -- …` de los bloques de código de este archivo, y falla si alguna termina con código 2 (uso incorrecto). Así el guion siempre corresponde a comandos que existen.

## Versión y ayuda

```sh
npm run sabueso -- version
npm run sabueso -- help
```

## Español controlado

```sh
npm run sabueso-nl -- version
```
