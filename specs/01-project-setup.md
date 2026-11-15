# SPEC 01 — Setup del proyecto: monorepo, tooling, esqueletos y CLI base

> **Estado:** Approved
> **Depende de:** ninguno (primer spec del proyecto)
> **Fecha:** 2026-11-14
> **Objetivo:** Dejar el repositorio `~/Desktop/sabueso` listo para implementar, con el monorepo, el tooling, los esqueletos de `core`, `nl` y `web` funcionando y probados, la infraestructura de la CLI, la estructura de documentación, los hooks de git y el CI, sin ninguna lógica de dominio.

---

## 1. Por qué existe este spec

Los specs 02 (núcleo), 03 (interfaz) y 04 (español controlado) empezaban cada uno con su propio andamiaje. Eso mezclaba dos tipos de trabajo: decisiones de infraestructura que se toman una vez, y lógica teórica que es lo que se evalúa. Este spec separa la infraestructura, por tres razones:

1. **Cada spec de dominio arranca directo con su primer concepto.** El SPEC 02 empieza por el AFD, no por configurar TypeScript.
2. **El tooling se resuelve y se prueba una sola vez.** Configurar Vite, Vitest con jsdom, las referencias entre paquetes o ESLint para tres workspaces trae problemas propios. Resueltos acá, no interrumpen la implementación de los algoritmos.
3. **Las decisiones de tecnología quedan en un solo lugar.** Antes estaban repartidas entre los specs. Ahora están en la sección 9 de este spec, y los demás la referencian.

**Regla de este spec:** no contiene lógica de dominio. Nada de gramáticas, autómatas ni etiquetas. Al terminar, el programa solo sabe decir su versión y su ayuda, pero todo lo que lo rodea (build, pruebas, lint, CLI, UI, CI y hooks) funciona.

---

## 2. Alcance

**Entra:**

- Repositorio git en `~/Desktop/sabueso` (rama `main`), con `.gitignore`, `.editorconfig` y `README.md` base.
- Monorepo con npm workspaces: `packages/core`, `packages/nl` y `apps/web`.
- TypeScript estricto con configuración base compartida y referencias entre paquetes.
- ESLint (configuración plana) y Prettier para los tres workspaces.
- Vitest con una configuración raíz que corre los tres proyectos.
- Esqueleto de `@sabueso/core`: `VERSION`, prueba de humo y la **infraestructura de la CLI** (`createCli`, `runCli` con `io` inyectado, utilidades de formato, comandos `version` y `help`).
- Esqueleto de `@sabueso/nl`: dependencia de `core`, CLI propia con `version` y `help`, prueba de humo.
- Esqueleto de `@sabueso/web`: Vite + React 19, una pantalla que muestra "Sabueso" y la versión del núcleo, Vitest con jsdom y Testing Library, prueba de humo.
- Scripts raíz: `build`, `test`, `lint`, `format`, `format:check`, `typecheck`, `sabueso` y `sabueso-nl`.
- Estructura de documentación: `docs/concepts/` con una plantilla de ficha, y `docs/console-demo.md` con su prueba automática.
- Hooks de git nativos (`.githooks/`): `pre-commit` con formato y lint, `pre-push` con pruebas.
- CI en GitHub Actions: lint, formato, typecheck, build y pruebas en cada push y pull request.

**Fuera de alcance (para specs futuros):**

- Cualquier lógica de dominio: gramáticas, AFD, Earley, etiquetas, catálogo de géneros (SPEC 02).
- Componentes de la UI más allá de la pantalla de humo (SPEC 03).
- El workflow de publicación en GitHub Pages (SPEC 03, paso 16).
- Crear el repositorio remoto en GitHub. Es un paso manual documentado en el README.
- Publicar paquetes en npm.

---

## 3. Estructura resultante

```text
~/Desktop/sabueso/
  .editorconfig
  .gitignore
  .nvmrc                          # 24
  .prettierrc.json
  .prettierignore
  .githooks/
    pre-commit                    # npm run format:check && npm run lint
    pre-push                      # npm test
  .github/workflows/ci.yml
  eslint.config.js
  package.json                    # workspaces, scripts, devDependencies comunes
  tsconfig.base.json
  vitest.config.ts                # test.projects: core, nl, web
  README.md
  presentation-guide.md           # ya existe (no la crea este spec)
  specs/                          # ya existe
  docs/
    concepts/_template.md
    console-demo.md
  packages/
    core/
      package.json                # @sabueso/core
      tsconfig.json               # NodeNext, composite
      vitest.config.ts
      src/
        index.ts                  # VERSION + exports de la CLI
        cli.ts                    # único archivo con node:*
        cli/types.ts              # CliIo, CliCommand
        cli/run.ts                # createCli
        cli/format.ts             # table, set
        cli/commands/version.ts
      test/
        smoke.test.ts
        cli/run.test.ts
        cli/demo-doc.test.ts
    nl/
      package.json                # @sabueso/nl, depende de @sabueso/core
      tsconfig.json               # NodeNext, composite, referencia a core
      vitest.config.ts
      src/
        index.ts                  # VERSION
        cli.ts
        cli/commands/version.ts
      test/
        smoke.test.ts
        cli/version.test.ts
  apps/
    web/
      package.json                # @sabueso/web
      tsconfig.json               # bundler, noEmit
      vite.config.ts              # alias @sabueso/core → packages/core/src
      vitest.config.ts            # jsdom
      index.html
      src/
        main.tsx
        App.tsx                   # "Sabueso" + versión del núcleo
      test/
        App.test.tsx
```

---

## 4. Configuración

### 4.1 `package.json` raíz

```json
{
  "name": "sabueso",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20.19" },
  "workspaces": ["packages/core", "packages/nl", "apps/web"],
  "scripts": {
    "build": "tsc -b packages/core packages/nl && npm run build -w @sabueso/web",
    "typecheck": "tsc -b packages/core packages/nl && tsc -p apps/web --noEmit",
    "test": "vitest run",
    "lint": "eslint .",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "sabueso": "tsc -b packages/core && node packages/core/dist/cli.js",
    "sabueso-nl": "tsc -b packages/nl && node packages/nl/dist/cli.js",
    "prepare": "node -e \"require('fs').existsSync('.git') && require('child_process').execSync('git config core.hooksPath .githooks')\""
  }
}
```

- El orden de los workspaces es el de las dependencias: `core` ← `nl` ← `web`.
- `prepare` corre solo después de `npm install`, y configura los hooks si existe `.git`. Si no existe (por ejemplo, en un zip), no falla.
- Las versiones de las `devDependencies` son las estables vigentes al hacer el setup y quedan fijadas en `package-lock.json`.

### 4.2 TypeScript

- **`tsconfig.base.json`:** `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`, `target: ES2022`, `lib: ["ES2022"]`, `skipLibCheck: true`, `forceConsistentCasingInFileNames: true`.
- **`packages/core` y `packages/nl`:** `module` y `moduleResolution` en `NodeNext`, `composite: true`, `declaration: true`, `outDir: dist`, `rootDir: src`. `nl` declara `references: [{ "path": "../core" }]`.
- **`apps/web`:** `moduleResolution: bundler`, `jsx: react-jsx`, `lib: ["ES2022", "DOM"]`, `noEmit: true`, y `paths` con `@sabueso/core` apuntando a `../../packages/core/src/index.ts`.
- **Imports relativos con sufijo `.js`** en `core` y `nl`. Es lo que exige Node ESM sobre el código compilado (ver Decisiones).

### 4.3 Cómo se consumen los paquetes entre sí

| Consumidor        | Consume                        | Cómo                                                                               | Por qué                                                                                                                    |
| ----------------- | ------------------------------ | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `nl`              | `core`                         | Dependencia de workspace (`"@sabueso/core": "*"`), resuelta a `packages/core/dist` | `nl` corre en Node (su CLI), que necesita JavaScript compilado. `tsc -b` compila `core` primero gracias a las referencias. |
| `web`             | `core` (y en el SPEC 04, `nl`) | Alias de Vite y `paths` de TS al **código fuente** (`src/index.ts`)                | El servidor de desarrollo no necesita un build previo del núcleo, y los cambios en el núcleo se ven al instante.           |
| Vitest (los tres) | Código fuente                  | Vitest ejecuta TypeScript directamente                                             | Las pruebas no dependen de `dist/`.                                                                                        |

### 4.4 Lint, formato y editor

- **ESLint:** configuración plana (`eslint.config.js`) con `@eslint/js`, `typescript-eslint` (recomendada con tipos), `eslint-plugin-react-hooks` solo para `apps/web`, y `eslint-config-prettier` al final para que no choque con Prettier. Ignora `dist/`, `node_modules/` y `coverage/`.
- **Prettier:** `singleQuote: true`, `printWidth: 100`, `trailingComma: "all"`. `.prettierignore` excluye `dist/`, `package-lock.json` y los archivos `.glc`, que tienen su propio formato.
- **`.editorconfig`:** UTF-8, fin de línea LF, 2 espacios, línea final, sin espacios al final.

### 4.5 Pruebas

- **`vitest.config.ts` raíz:** `test.projects` con los tres workspaces. `npm test` corre todo.
- **`core` y `nl`:** entorno `node`.
- **`web`:** entorno `jsdom`, con `@testing-library/react` y `@testing-library/jest-dom` como `setupFiles`.
- **`testTimeout`:** queda en el valor por defecto. Los specs que agregan pruebas largas (diferenciales y de rendimiento, en el SPEC 02) la suben por archivo.

### 4.6 Hooks de git

| Hook                   | Ejecuta                                | Por qué                                                                                                                                        |
| ---------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `.githooks/pre-commit` | `npm run format:check && npm run lint` | Es rápido (segundos). Evita commits con formato o lint roto.                                                                                   |
| `.githooks/pre-push`   | `npm test`                             | Las pruebas tardan más (las diferenciales del SPEC 02 pueden tardar decenas de segundos), así que se corren antes de subir, no en cada commit. |

Son scripts de shell con permiso de ejecución. Se activan con `git config core.hooksPath .githooks`, que corre `npm install` a través de `prepare`.

### 4.7 CI (`.github/workflows/ci.yml`)

- **Disparadores:** `push` a cualquier rama y `pull_request`.
- **Pasos:** `actions/checkout`, `actions/setup-node` con `node-version-file: .nvmrc` y caché de npm, y después `npm ci`, `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run build` y `npm test`.
- Un solo job en `ubuntu-latest`. La matriz de versiones de Node no hace falta: el proyecto fija una (`.nvmrc`).

---

## 5. Modelo de datos

La única estructura nueva es la de la CLI, compartida por `core` y `nl`:

```ts
// packages/core/src/cli/types.ts
interface CliIo {
  stdout(text: string): void; // salida normal
  stderr(text: string): void; // errores
  readFile(path: string): Promise<string>; // la única puerta al sistema de archivos
}

interface CliCommand {
  name: string; // 'version'
  description: string; // una línea, para help
  usage: string; // 'sabueso version'
  run(args: string[], io: CliIo): Promise<number>; // devuelve el código de salida
}

// packages/core/src/cli/run.ts
function createCli(options: {
  program: string;
  version: string;
  commands: CliCommand[];
}): (argv: string[], io: CliIo) => Promise<number>;
// Agrega help automáticamente. Sin argumentos muestra help.
// Un comando desconocido escribe el error y la lista de comandos en stderr, y devuelve 2.

// packages/core/src/cli/format.ts
function table(header: string[], rows: string[][]): string; // columnas alineadas
function set(items: Iterable<string>): string; // '{a, b, c}', ordenado

// packages/core/src/index.ts
const VERSION = '0.1.0';
```

**Códigos de salida (para todos los comandos de todos los specs):**

| Código | Significado                                                                  |
| ------ | ---------------------------------------------------------------------------- |
| `0`    | Éxito, o entrada aceptada                                                    |
| `1`    | Entrada rechazada, o error del usuario (por ejemplo, un símbolo desconocido) |
| `2`    | Uso incorrecto: comando desconocido u opciones faltantes                     |

**Convención de `cli.ts`:** es el único archivo que importa `node:*`. Arma el `io` real (`process.stdout`, `process.stderr` y `fs.promises.readFile`), llama a `runCli(process.argv.slice(2), io)` y termina con `process.exit(código)`. Empieza con `#!/usr/bin/env node`.

---

## 6. Plan de implementación

Cada paso es un commit y deja el repositorio funcionando. Siguiendo la regla del proyecto, cada paso es **ejecutable** (por consola o con `npm run dev`) y **testeable** siempre que se pueda. Los pasos de pura configuración se verifican con el comando indicado.

1. **Repositorio.**
   - `git init -b main` en `~/Desktop/sabueso` (la carpeta ya existe, con `specs/` y `presentation-guide.md`).
   - `.gitignore` (`node_modules/`, `dist/`, `coverage/`, `*.tsbuildinfo`, `.DS_Store`), `.editorconfig` y un `README.md` base con el nombre del proyecto, la materia, los requisitos (Node 24 según `.nvmrc`) y la lista de specs.
   - Primer commit con `specs/`, `presentation-guide.md` y estos archivos.
   - **Verificación:** `git log --oneline` muestra el commit y `git status` queda limpio.

2. **Monorepo raíz.**
   - `package.json` raíz (sección 4.1, sin los scripts que dependen de paquetes todavía inexistentes), `.nvmrc`, `tsconfig.base.json`, `eslint.config.js`, `.prettierrc.json` y `.prettierignore`.
   - Instalar `typescript`, `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-config-prettier`, `prettier` y `vitest` como `devDependencies` raíz.
   - **Verificación:** `npm install`, `npm run lint` y `npm run format:check` terminan sin errores.

3. **Esqueleto de `@sabueso/core`.**
   - `package.json` (`"type": "module"`, `"main": "dist/index.js"`, `"types": "dist/index.d.ts"`, `"bin": { "sabueso": "dist/cli.js" }`, sin `dependencies`), `tsconfig.json` y `vitest.config.ts`.
   - `src/index.ts` con `VERSION`. `test/smoke.test.ts` verifica que `VERSION` sea `'0.1.0'`.
   - `vitest.config.ts` raíz con el proyecto `core`. Scripts `build`, `typecheck` y `test` en la raíz.
   - **Verificación:** `npm test` (1 prueba) y `npm run build` (genera `packages/core/dist/index.js`).

4. **Infraestructura de la CLI en `core`.**
   - `cli/types.ts`, `cli/run.ts` (`createCli`, con `help` automático), `cli/format.ts` (`table` y `set`), `cli/commands/version.ts` y `cli.ts`. `index.ts` exporta `createCli`, `CliCommand`, `CliIo`, `table` y `set`.
   - Script raíz `sabueso`.
   - **Pruebas** (`test/cli/run.test.ts`, con un `io` en memoria):
     - `version` escribe `Sabueso core 0.1.0` y devuelve 0;
     - `help` lista `version` y `help`;
     - sin argumentos se muestra la ayuda;
     - `foo` escribe en `stderr` y devuelve 2;
     - `table` alinea columnas y `set` ordena.
   - **Consola:** `npm run sabueso -- version` imprime `Sabueso core 0.1.0`. `npm run sabueso -- foo` termina con código 2.

5. **Esqueleto de `@sabueso/nl`.**
   - `package.json` (`"dependencies": { "@sabueso/core": "*" }`, `"bin": { "sabueso-nl": "dist/cli.js" }`), `tsconfig.json` con referencia a `core`, `vitest.config.ts`, `src/index.ts` (`VERSION`) y `src/cli.ts` con el comando `version`, registrado con `createCli` de `core`.
   - Script raíz `sabueso-nl`, y `nl` agregado a `build`, `typecheck` y a los proyectos de Vitest.
   - **Pruebas:** humo, y `version` escribe `Sabueso nl 0.1.0 (core 0.1.0)`.
   - **Consola:** `npm run sabueso-nl -- version` y `npm run sabueso-nl -- help`.

6. **Esqueleto de `@sabueso/web`.**
   - Vite + React 19 + TypeScript: `index.html`, `src/main.tsx` y `src/App.tsx`, que muestra el título "Sabueso" y "núcleo v0.1.0", importando `VERSION` de `@sabueso/core` por el alias.
   - `vite.config.ts` con el alias. `vitest.config.ts` con `jsdom` y Testing Library. `eslint-plugin-react-hooks` en la configuración de ESLint para `apps/web`.
   - `web` agregado a `build`, `typecheck` y a los proyectos de Vitest.
   - **Prueba:** `App.test.tsx` renderiza `App` y encuentra "Sabueso" y "0.1.0".
   - **Ejecutable:** `npm run dev -w @sabueso/web` muestra la pantalla. `npm run build` genera `apps/web/dist/index.html`.

7. **Estructura de documentación.**
   - `docs/concepts/_template.md`, con las cinco partes de una ficha: definición formal, ejemplo resuelto a mano, dónde está en el código (archivo, función y comando de consola), qué prueba lo verifica, y referencia bibliográfica.
   - `docs/console-demo.md`, con un bloque de código que contiene `npm run sabueso -- version`.
   - **Prueba:** `packages/core/test/cli/demo-doc.test.ts`:
     - lee `docs/console-demo.md` y extrae las líneas `npm run sabueso -- …` de los bloques de código;
     - ejecuta cada una con `runCli` y un `io` en memoria, y verifica que ninguna devuelva 2;
     - ignora las líneas de `sabueso-nl` hasta que el SPEC 04 extienda la prueba.
   - **Verificación:** `npm test` incluye la prueba del guion.

8. **Hooks de git.**
   - `.githooks/pre-commit` y `.githooks/pre-push` (sección 4.6), con permiso de ejecución, y el script `prepare`.
   - **Verificación:**
     - después de `npm install`, `git config core.hooksPath` devuelve `.githooks`;
     - un commit con un archivo mal formateado es rechazado por `pre-commit`.

9. **CI.**
   - `.github/workflows/ci.yml` (sección 4.7).
   - Sección "Repositorio remoto" en el README, con los pasos manuales: crear el repo `sabueso` en GitHub, `git remote add origin …` y `git push -u origin main`.
   - **Verificación:** el YAML es válido. Con el remoto creado, el primer push muestra el workflow en verde en la pestaña Actions.

---

## 7. Criterios de aceptación

- [ ] Desde un clon limpio con Node 24, `npm install`, `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run build` y `npm test` terminan sin errores.
- [ ] `npm test` corre los tres proyectos (`core`, `nl` y `web`), y cada uno tiene al menos una prueba que pasa.
- [ ] `npm run sabueso -- version` imprime `Sabueso core 0.1.0` y termina con código 0.
- [ ] `npm run sabueso -- help` lista `version` y `help`.
- [ ] `npm run sabueso -- foo` termina con código 2 y muestra la lista de comandos.
- [ ] `npm run sabueso-nl -- version` imprime `Sabueso nl 0.1.0 (core 0.1.0)`.
- [ ] `npm run dev -w @sabueso/web` sirve una página que muestra "Sabueso" y la versión del núcleo, sin errores en la consola del navegador.
- [ ] `packages/core/package.json` no tiene `dependencies`. `packages/nl/package.json` solo tiene `@sabueso/core`. `apps/web/package.json` solo tiene `react`, `react-dom` y `@sabueso/core`.
- [ ] Ningún archivo de `packages/*/src`, salvo los `cli.ts`, importa módulos `node:*`.
- [ ] `docs/concepts/_template.md` tiene las cinco partes, y la prueba del guion de consola pasa.
- [ ] Con los hooks activos, un commit con formato roto es rechazado.
- [ ] `.github/workflows/ci.yml` existe y corre formato, lint, typecheck, build y pruebas.
- [ ] No hay ninguna lógica de dominio: ni gramáticas, ni etiquetas, ni autómatas.

---

## 8. Cómo usan este setup los demás specs

| Spec        | Qué recibe de este setup                                                                                                          | Qué agrega                                                                                                    |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 02 Núcleo   | `packages/core`, la CLI (`createCli`, `io`, `format`, códigos de salida), el script `sabueso` y el guion de consola con su prueba | Los módulos teóricos, un comando por paso, `cli/grammars.ts` y las opciones `--grammar`, `--file` y `--pasos` |
| 03 Interfaz | `apps/web` con Vite, React, el alias al núcleo, Vitest con jsdom y Testing Library                                                | Componentes, vistas, Web Worker, persistencia y el workflow de Pages                                          |
| 04 Español  | `packages/nl` con su CLI y el script `sabueso-nl`                                                                                 | Los módulos de lenguaje natural, sus comandos y la integración en la UI                                       |

---

## 9. Decisiones tomadas y descartadas

**Organización**

- **Sí:** un spec propio para el setup. La infraestructura se decide una vez y no se mezcla con la lógica que se evalúa. Cada spec de dominio arranca con su primer concepto.
- **Sí:** crear los tres esqueletos (`core`, `nl` y `web`) acá. El tooling de cada tipo de paquete (Node con NodeNext, Vite con jsdom) se resuelve y se prueba una sola vez. Los specs siguientes solo agregan lógica.
- **No:** que cada spec cree su propio workspace. Así estaban los specs antes: el SPEC 03 y el SPEC 04 iban a configurar tooling en medio de la implementación.
- **Sí:** renumerar los specs (setup = 01). El orden de los archivos refleja el orden de implementación.
- **Sí:** monorepo con npm workspaces. La frontera entre motor, español e interfaz queda en la estructura de carpetas y en las dependencias declaradas. npm ya viene con Node: no hay que instalar otra herramienta.
- **No:** pnpm, yarn, Turborepo o Nx. Sumarían una herramienta más sin beneficio para tres paquetes.

**Tecnología** (aplica a todos los specs)

- **Sí:** TypeScript estricto, con `noUncheckedIndexedAccess` y `exactOptionalPropertyTypes`. Lo fija el anteproyecto. Las dos opciones extra detectan los errores típicos de los algoritmos con tablas e índices: un `chart[k]` que puede no existir obliga a tratar ese caso.
- **Sí:** `tsc` compila a `dist/` y las CLI corren con `node`. Es 100% TypeScript, funciona en cualquier Node 20.19 o superior, y no agrega dependencias.
- **Sí:** `NodeNext` con sufijo `.js` en `core` y `nl`. Con `bundler`, `tsc` emite imports sin extensión, y Node ESM falla con `ERR_MODULE_NOT_FOUND` al ejecutar la CLI. `bundler` queda solo para `web`, que compila Vite.
- **No:** `tsx`. El autor lo descartó, y no hace falta: Vitest ejecuta TypeScript directamente y la CLI usa `tsc -b`.
- **No:** el TypeScript nativo de Node (_type stripping_). Exige Node 23.6 o superior y prohíbe `enum` y otras construcciones: una restricción sin beneficio.
- **Sí:** `.nvmrc` = 24 y `engines` `>=20.19`. Node 20 terminó su soporte en abril de 2026. El autor pidió "Node 20 LTS o superior", así que el piso se respeta, pero se apunta al LTS activo (24, el instalado en la máquina). 20.19 es el mínimo que exige la versión actual de Vite.
- **Sí:** el alias de Vite al código fuente del núcleo. El servidor de desarrollo funciona sin compilar el núcleo antes, y los cambios en los algoritmos se ven al instante en la UI.
- **No:** que `web` consuma `core/dist`. Obligaría a recompilar el núcleo en cada cambio para verlo en la UI.
- **Sí:** solo herramientas de calidad como `devDependencies` (TypeScript, Vitest, ESLint, Prettier, Testing Library, Vite). No tienen lógica de dominio, así que no violan la regla del anteproyecto de no usar bibliotecas que resuelvan los conceptos.
- **Sí:** todo el código en inglés: identificadores, comentarios y nombres de las pruebas (`describe`/`it`). La documentación (`docs/`, specs, README) sigue en español. Los specs 02–04, que piden comentarios en español, adoptan esta regla cuando se trabaje cada uno.
- **No:** identificadores ni comentarios en español. Obligaría a traducir todo después.
- **Sí:** nombres de archivos y carpetas en inglés (`presentation-guide.md`, `docs/concepts/`, `docs/console-demo.md`), aunque su contenido esté en español. Es la misma razón que con los identificadores. Los specs 02–04 adoptan la regla cuando se trabaje cada uno.

**CLI**

- **Sí:** la infraestructura de la CLI acá, y los comandos en los specs de dominio. `createCli`, el `io` inyectado y los códigos de salida son infraestructura compartida por `core` y `nl`. Cada spec de dominio solo registra comandos.
- **Sí:** `io` inyectado y `cli.ts` como único archivo con `node:*`. Los comandos se prueban en memoria, sin lanzar procesos, y el resto del código corre igual en el navegador.
- **Sí:** el script `npm run sabueso` con `tsc -b` incremental. Ejecuta por consola sin pasos manuales de build.
- **Sí:** el guion de consola con su prueba desde el principio. Cada spec le agrega comandos, y la prueba garantiza que la demo de la exposición siempre funcione.

**Calidad**

- **Sí:** hooks de git nativos con `core.hooksPath`. Funcionan sin dependencias: son scripts de shell versionados en el repo.
- **No:** husky ni lint-staged. Agregarían dos dependencias para lo que resuelven dos scripts de shell.
- **Sí:** formato y lint en `pre-commit`, pruebas en `pre-push`. El commit tiene que ser rápido. Las pruebas, que van a crecer (diferenciales, rendimiento), se corren antes de subir.
- **Sí:** CI con un solo job y la versión de `.nvmrc`. Verifica lo mismo que se verifica localmente, en una máquina limpia. Una matriz de versiones no aporta, porque el proyecto fija una.
- **Sí:** `.editorconfig`. Mismo formato básico en cualquier editor, incluso antes de que corra Prettier.
- **Sí:** `.glc` excluido de Prettier. Es un formato propio que Prettier no entiende, y su legibilidad depende de la alineación manual.

---

## 10. Riesgos identificados

| Riesgo                                                                          | Mitigación                                                                                                               |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Las referencias de TypeScript entre `core` y `nl` fallan o compilan en desorden | `tsc -b` con `composite` resuelve el orden. El criterio de aceptación verifica `npm run build` desde un clon limpio.     |
| El alias de Vite y los `paths` de TypeScript se desincronizan                   | Los dos apuntan al mismo archivo (`packages/core/src/index.ts`). `npm run typecheck` y la prueba de `App` los ejercitan. |
| Los hooks no se activan (por ejemplo, si se instaló antes de `git init`)        | `prepare` vuelve a correr con cada `npm install`. El README lo indica.                                                   |
| Una versión nueva de una herramienta rompe la configuración                     | `package-lock.json` fija las versiones, y el CI usa `npm ci`.                                                            |

---

## Lo que **no** está en este spec

- Lógica de dominio de cualquier tipo (SPEC 02 y SPEC 04).
- Componentes de la UI (SPEC 03).
- Publicación en GitHub Pages (SPEC 03).
- Creación del repositorio remoto (paso manual en el README).

Cada uno de esos puntos va en su spec correspondiente.
