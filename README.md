# Sabueso

Sabueso decide si un relato respeta la estructura del **policial de enigma**, usando una gramática libre de contexto y un analizador de **Earley** implementado desde cero.

Laboratorio Integrador Final de **Fundamentos Teóricos de Informática**.

## Estado actual

Hechos los pasos 1 a 5 del SPEC 02. El núcleo lee gramáticas en formato `.grammar` (lexer AFD y parser LL(1)) y trae las gramáticas del policial: G0 (ambigua) y G1 (la oficial). El analizador de Earley llega en los pasos 13 a 17.

Para probarlo:

```sh
npm run sabueso -- genres       # el policial de enigma y sus 14 etiquetas
npm run sabueso -- grammars     # las 10 gramáticas con |N|, |Σ| y |P|
npm run sabueso -- grammar g1   # G1 completa: G = (N, Σ, P, S)
```

El recorrido completo está en [`docs/console-demo.md`](docs/console-demo.md).

## Requisitos

- Node.js 24 (la versión fijada en `.nvmrc`). La mínima soportada es 20.19.
- npm, que viene con Node.

## Primeros pasos

```sh
nvm use          # Node 24, según .nvmrc (sin nvm: instala Node 24 a mano)
npm install      # instala dependencias y activa los hooks de git
```

`npm install` también activa los hooks de git (script `prepare`: `git config core.hooksPath .githooks`). Si creaste el repositorio con `git init` después de instalar, vuelve a correr `npm install`.

## Estructura

| Carpeta         | Paquete         | Qué contiene                                                                                                                              |
| --------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core` | `@sabueso/core` | El núcleo: gramáticas (`packages/core/grammars/`), lector de `.grammar`, motor de Earley (en curso) y la CLI `sabueso`                    |
| `apps/web`      | `@sabueso/web`  | La interfaz web (Vite + React)                                                                                                            |
| `docs/`         | —               | Fichas de conceptos (`docs/concepts/`), guías de estudio por paso (`docs/guides/`) y [guion de la demo por consola](docs/console-demo.md) |
| `specs/`        | —               | Los specs del proyecto, uno por etapa (ver abajo)                                                                                         |

## Comandos

| Comando                                   | Qué hace                                                                          |
| ----------------------------------------- | --------------------------------------------------------------------------------- |
| `npm run sabueso -- <comando>`            | Compila el núcleo y ejecuta su CLI (`npm run sabueso -- help` lista los comandos) |
| `npm run dev -w @sabueso/web`             | Servidor de desarrollo de la interfaz web                                         |
| `npm test`                                | Pruebas del núcleo y de la web                                                    |
| `npm run build`                           | Compila `core` y genera `apps/web/dist`                                           |
| `npm run typecheck`                       | Verifica los tipos del núcleo y de la web                                         |
| `npm run lint`                            | ESLint                                                                            |
| `npm run format` / `npm run format:check` | Aplica o verifica el formato de Prettier                                          |

## Calidad

- **Hooks de git** (`.githooks/`): `pre-commit` corre `format:check` y `lint`; `pre-push` corre `npm test`.
- **CI** (`.github/workflows/ci.yml`): en cada push y pull request corre `npm ci`, `format:check`, `lint`, `typecheck`, `build` y `test`.

## Specs

El proyecto se implementa por specs, en este orden:

| Spec                                                            | Contenido                                                                      | Estado                               |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------ |
| [01 — Setup del proyecto](specs/01-project-setup.md)            | Monorepo, tooling, esqueletos y CLI base                                       | Aprobado, terminado                  |
| [02 — Núcleo y motor de Earley](specs/02-core-earley-engine.md) | Librería de gramáticas y analizador de Earley (`@sabueso/core`)                | Aprobado, en curso (pasos 1–5 de 30) |
| [03 — Interfaz web](specs/03-web-interface.md)                  | Análisis visual y vistas didácticas (`apps/web`)                               | Borrador                             |
| [04 — Español controlado](specs/04-controlled-spanish.md)       | Del texto del relato a la secuencia de etiquetas (`@sabueso/natural-language`) | Borrador                             |

La guía para la exposición está en [`presentation-guide.md`](presentation-guide.md).
