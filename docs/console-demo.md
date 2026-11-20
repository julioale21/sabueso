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

## Lexer AFD

```sh
npm run sabueso -- lex arithmetic
npm run sabueso -- lex arithmetic --states
```

## Parser LL(1)

```sh
npm run sabueso -- grammar arithmetic
npm run sabueso -- grammar arithmetic --parser-trace
```

## Las gramáticas del proyecto

```sh
npm run sabueso -- genres
npm run sabueso -- grammars
npm run sabueso -- grammar g0
npm run sabueso -- grammar g1
```
