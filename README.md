# Sabueso

Sabueso decide si un relato respeta la estructura del **policial de enigma**, usando una gramática libre de contexto y un analizador de **Earley** implementado desde cero.

Laboratorio Integrador Final de **Fundamentos Teóricos de Informática**.

## Requisitos

- Node.js 24 (la versión fijada en `.nvmrc`). La mínima soportada es 20.19.
- npm, que viene con Node.

## Primeros pasos

```sh
nvm use          # Node 24, según .nvmrc
npm install      # instala dependencias y activa los hooks de git
```

`npm install` también ejecuta `git config core.hooksPath .githooks` (script `prepare`). Si clonaste o hiciste `git init` después de instalar, vuelve a correr `npm install` para activar los hooks.

## Estructura

| Carpeta         | Paquete         | Qué contiene                                                          |
| --------------- | --------------- | --------------------------------------------------------------------- |
| `packages/core` | `@sabueso/core` | El núcleo: gramáticas, motor de Earley y la CLI `sabueso`             |
| `packages/nl`   | `@sabueso/nl`   | El español controlado y la CLI `sabueso-nl`                           |
| `apps/web`      | `@sabueso/web`  | La interfaz web (Vite + React)                                        |
| `docs/`         | —               | Fichas de conceptos (`docs/concepts/`) y guion de la demo por consola |

## Comandos

| Comando                                   | Qué hace                                                                          |
| ----------------------------------------- | --------------------------------------------------------------------------------- |
| `npm run sabueso -- <comando>`            | Compila el núcleo y ejecuta su CLI (`npm run sabueso -- help` lista los comandos) |
| `npm run sabueso-nl -- <comando>`         | Lo mismo para la CLI de español controlado                                        |
| `npm run dev -w @sabueso/web`             | Servidor de desarrollo de la interfaz web                                         |
| `npm test`                                | Pruebas de los tres paquetes                                                      |
| `npm run build`                           | Compila `core` y `nl`, y genera `apps/web/dist`                                   |
| `npm run typecheck`                       | Verifica los tipos de los tres paquetes                                           |
| `npm run lint`                            | ESLint                                                                            |
| `npm run format` / `npm run format:check` | Aplica o verifica el formato de Prettier                                          |

## Calidad

- **Hooks de git** (`.githooks/`): `pre-commit` corre `format:check` y `lint`; `pre-push` corre `npm test`.
- **CI** (`.github/workflows/ci.yml`): en cada push y pull request corre `npm ci`, `format:check`, `lint`, `typecheck`, `build` y `test`.

## Specs

El proyecto se implementa por specs, en este orden:

| Spec                                                            | Contenido                                                        | Estado   |
| --------------------------------------------------------------- | ---------------------------------------------------------------- | -------- |
| [01 — Setup del proyecto](specs/01-project-setup.md)            | Monorepo, tooling, esqueletos y CLI base                         | Approved |
| [02 — Núcleo y motor de Earley](specs/02-core-earley-engine.md) | Librería de gramáticas y analizador de Earley (`@sabueso/core`)  | Borrador |
| [03 — Interfaz web](specs/03-web-interface.md)                  | Análisis visual y vistas didácticas (`apps/web`)                 | Borrador |
| [04 — Español controlado](specs/04-controlled-spanish.md)       | Del texto del relato a la secuencia de etiquetas (`@sabueso/nl`) | Borrador |

La guía para la exposición está en [`presentation-guide.md`](presentation-guide.md).

## Repositorio remoto

Crear el repositorio remoto es un paso manual:

1. Crear un repositorio vacío llamado `sabueso` en GitHub (sin README, `.gitignore` ni licencia).
2. Conectarlo y subir la rama principal:

   ```sh
   git remote add origin git@github.com:<usuario>/sabueso.git
   git push -u origin main
   ```

3. En la pestaña **Actions** del repositorio, el workflow **CI** debería quedar en verde.
