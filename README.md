# Sabueso

Sabueso decide si un relato respeta la estructura del **policial de enigma**, usando una gramática libre de contexto y un analizador de **Earley** implementado desde cero.

Laboratorio Integrador Final de **Fundamentos Teóricos de Informática**.

## Requisitos

- Node.js 24 (la versión fijada en `.nvmrc`). La mínima soportada es 20.19.
- npm, que viene con Node.

## Specs

El proyecto se implementa por specs, en este orden:

| Spec | Contenido | Estado |
| --- | --- | --- |
| [01 — Setup del proyecto](specs/01-setup-proyecto.md) | Monorepo, tooling, esqueletos y CLI base | Approved |
| [02 — Núcleo y motor de Earley](specs/02-nucleo-motor-earley.md) | Librería de gramáticas y analizador de Earley (`@sabueso/core`) | Borrador |
| [03 — Interfaz web](specs/03-interfaz-web.md) | Análisis visual y vistas didácticas (`apps/web`) | Borrador |
| [04 — Español controlado](specs/04-espanol-controlado.md) | Del texto del relato a la secuencia de etiquetas (`@sabueso/nl`) | Borrador |

La guía para la exposición está en [`guia-presentacion.md`](guia-presentacion.md).
