# Recorrido completo: Earley con G0 sobre `CRI PIS REV`

> Los 60 pasos de Earley, uno por uno, para seguirlos con calma. Es exactamente lo que hace el programa: se generó con el motor real (`recognize` del paso 14) y coincide con la página interactiva [`earley-g0.html`](earley-g0.html) (en esta misma carpeta) y con `npm run sabueso -- earley --grammar g0 --chart "CRI PIS REV"`.
> Guías relacionadas: [13 — ítems y conjuntos](../guides/13-earley-items-y-conjuntos.md) y [14 — el reconocedor](../guides/14-reconocedor-de-earley.md).

---

## Antes de empezar

### La gramática G0 (las reglas que se usan acá)

```
Relato        → Planteo Investigacion Desenlace
Planteo       → Hecho | Marco Hecho | Hecho Marco
Marco         → CTX | PER | CTX PER | PER CTX
Hecho         → CRI | HAL | CRI HAL
Investigacion → Pasos | ENC Pasos
Pasos         → Paso | Pasos Pasos
Paso          → PIS | INT | DSC | ATQ | Linea
Linea         → SOS | SOS Pasos
Desenlace     → Resolucion | Resolucion EPI
Resolucion    → REV | REV CNF | REV CAP | REV CNF CAP
```

### Cómo leer las tablas

- **Las libretas están entre los eventos.** S0 es antes de leer nada; S1, después de CRI; S2, después de PIS; S3, después de REV.

  | S0                 | CRI      | S1             | PIS      | S2             | REV      | S3       |
  | ------------------ | -------- | -------------- | -------- | -------------- | -------- | -------- |
  | antes de leer nada | evento 1 | después de CRI | evento 2 | después de PIS | evento 3 | el final |

- **Un ítem** `A → α • β, j` dice: "estoy armando A; ya reconocí α; me falta β; empecé en la posición j".
- **S1#3** es el ítem número 3 de la libreta S1.
- **Cada paso** toma el próximo ítem de la libreta actual y le aplica la única operación que corresponde, según lo que hay después del punto:

  | Después del punto | Operación                                                                | En las tablas                 |
  | ----------------- | ------------------------------------------------------------------------ | ----------------------------- |
  | un no terminal    | Predictor: anota sus reglas en la misma libreta                          | **P · baja**                  |
  | un evento         | Scanner: si coincide con el que viene, pasa a la libreta siguiente       | **S · llega** o **S · muere** |
  | nada (completo)   | Completer: vuelve a la libreta de origen y avanza a quienes lo esperaban | **C · sube**                  |

- **Un ítem que ya está no se anota de nuevo.** Por eso a veces una operación "no agrega nada": es lo que evita los bucles.

---

## S0: antes de leer nada

**Arranque:** se anota `$S → • Relato, 0` (S0#1): "quiero un Relato". No se leyó nada.

**Qué pasa en S0:** primero **baja** desde el objetivo (Relato → Planteo → Hecho o Marco) hasta llegar a los eventos con los que puede empezar un relato. Después **mira el primer evento, CRI**, y se queda con lo que encaja.

| Paso | Ítem que se procesa                                  | Operación | Qué pasa                                                                                                                                                                          |
| ---- | ---------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | S0#1 `$S → • Relato, 0`                              | P · baja  | Hace falta un **Relato**: se anotan sus reglas con origen 0. Nuevos: S0#2 `Relato → • Planteo Investigacion Desenlace, 0`                                                         |
| 2    | S0#2 `Relato → • Planteo Investigacion Desenlace, 0` | P · baja  | Hace falta un **Planteo**: se anotan sus reglas con origen 0. Nuevos: S0#3 `Planteo → • Hecho, 0`; S0#4 `Planteo → • Marco Hecho, 0`; S0#5 `Planteo → • Hecho Marco, 0`           |
| 3    | S0#3 `Planteo → • Hecho, 0`                          | P · baja  | Hace falta un **Hecho**: se anotan sus reglas con origen 0. Nuevos: S0#6 `Hecho → • CRI, 0`; S0#7 `Hecho → • HAL, 0`; S0#8 `Hecho → • CRI HAL, 0`                                 |
| 4    | S0#4 `Planteo → • Marco Hecho, 0`                    | P · baja  | Hace falta un **Marco**: se anotan sus reglas con origen 0. Nuevos: S0#9 `Marco → • CTX, 0`; S0#10 `Marco → • PER, 0`; S0#11 `Marco → • CTX PER, 0`; S0#12 `Marco → • PER CTX, 0` |
| 5    | S0#5 `Planteo → • Hecho Marco, 0`                    | P · baja  | Hace falta un **Hecho**, pero sus reglas ya están anotadas en S0: no se agrega nada.                                                                                              |
| 6    | S0#6 `Hecho → • CRI, 0`                              | S · llega | Espera **CRI** y viene **CRI**: coincide. Pasa a S1: S1#1 `Hecho → CRI •, 0`                                                                                                      |
| 7    | S0#7 `Hecho → • HAL, 0`                              | S · muere | Espera **HAL**, pero viene **CRI**: no coincide, esta posibilidad muere.                                                                                                          |
| 8    | S0#8 `Hecho → • CRI HAL, 0`                          | S · llega | Espera **CRI** y viene **CRI**: coincide. Pasa a S1: S1#2 `Hecho → CRI • HAL, 0`                                                                                                  |
| 9    | S0#9 `Marco → • CTX, 0`                              | S · muere | Espera **CTX**, pero viene **CRI**: no coincide, esta posibilidad muere.                                                                                                          |
| 10   | S0#10 `Marco → • PER, 0`                             | S · muere | Espera **PER**, pero viene **CRI**: no coincide, esta posibilidad muere.                                                                                                          |
| 11   | S0#11 `Marco → • CTX PER, 0`                         | S · muere | Espera **CTX**, pero viene **CRI**: no coincide, esta posibilidad muere.                                                                                                          |
| 12   | S0#12 `Marco → • PER CTX, 0`                         | S · muere | Espera **PER**, pero viene **CRI**: no coincide, esta posibilidad muere.                                                                                                          |

**Resumen de S0:** 12 hipótesis sobre cómo puede empezar el relato: CRI, HAL, CTX o PER. Con CRI sobreviven **dos**, y Earley no elige entre ellas: `Hecho → CRI •` (el hecho es solo el crimen) y `Hecho → CRI • HAL` (tal vez sigue el hallazgo).

---

## S1: después de CRI

**Qué pasa en S1:** **llegan** las dos hipótesis del Hecho. Una está completa, así que **sube**: el Hecho cierra el Planteo, y el Planteo hace avanzar al Relato ("ya tengo el planteo; falta investigación y desenlace"). Después **baja** a lo que puede venir: un Marco (si el Planteo sigue) o la Investigación, hasta llegar a sus eventos. Por último **mira el segundo evento, PIS**.

| Paso | Ítem que se procesa                                  | Operación | Qué pasa                                                                                                                                                                                         |
| ---- | ---------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 13   | S1#1 `Hecho → CRI •, 0`                              | C · sube  | Terminó un **Hecho** que empezó en 0: se vuelve a S0 y avanzan los que lo esperaban. Nuevos: S1#3 `Planteo → Hecho •, 0`; S1#4 `Planteo → Hecho • Marco, 0`                                      |
| 14   | S1#2 `Hecho → CRI • HAL, 0`                          | S · muere | Espera **HAL**, pero viene **PIS**: no coincide, esta posibilidad muere.                                                                                                                         |
| 15   | S1#3 `Planteo → Hecho •, 0`                          | C · sube  | Terminó un **Planteo** que empezó en 0: se vuelve a S0 y avanzan los que lo esperaban. Nuevos: S1#5 `Relato → Planteo • Investigacion Desenlace, 0`                                              |
| 16   | S1#4 `Planteo → Hecho • Marco, 0`                    | P · baja  | Hace falta un **Marco**: se anotan sus reglas con origen 1. Nuevos: S1#6 `Marco → • CTX, 1`; S1#7 `Marco → • PER, 1`; S1#8 `Marco → • CTX PER, 1`; S1#9 `Marco → • PER CTX, 1`                   |
| 17   | S1#5 `Relato → Planteo • Investigacion Desenlace, 0` | P · baja  | Hace falta un **Investigacion**: se anotan sus reglas con origen 1. Nuevos: S1#10 `Investigacion → • Pasos, 1`; S1#11 `Investigacion → • ENC Pasos, 1`                                           |
| 18   | S1#6 `Marco → • CTX, 1`                              | S · muere | Espera **CTX**, pero viene **PIS**: no coincide, esta posibilidad muere.                                                                                                                         |
| 19   | S1#7 `Marco → • PER, 1`                              | S · muere | Espera **PER**, pero viene **PIS**: no coincide, esta posibilidad muere.                                                                                                                         |
| 20   | S1#8 `Marco → • CTX PER, 1`                          | S · muere | Espera **CTX**, pero viene **PIS**: no coincide, esta posibilidad muere.                                                                                                                         |
| 21   | S1#9 `Marco → • PER CTX, 1`                          | S · muere | Espera **PER**, pero viene **PIS**: no coincide, esta posibilidad muere.                                                                                                                         |
| 22   | S1#10 `Investigacion → • Pasos, 1`                   | P · baja  | Hace falta un **Pasos**: se anotan sus reglas con origen 1. Nuevos: S1#12 `Pasos → • Paso, 1`; S1#13 `Pasos → • Pasos Pasos, 1`                                                                  |
| 23   | S1#11 `Investigacion → • ENC Pasos, 1`               | S · muere | Espera **ENC**, pero viene **PIS**: no coincide, esta posibilidad muere.                                                                                                                         |
| 24   | S1#12 `Pasos → • Paso, 1`                            | P · baja  | Hace falta un **Paso**: se anotan sus reglas con origen 1. Nuevos: S1#14 `Paso → • PIS, 1`; S1#15 `Paso → • INT, 1`; S1#16 `Paso → • DSC, 1`; S1#17 `Paso → • ATQ, 1`; S1#18 `Paso → • Linea, 1` |
| 25   | S1#13 `Pasos → • Pasos Pasos, 1`                     | P · baja  | Hace falta un **Pasos**, pero sus reglas ya están anotadas en S1: no se agrega nada.                                                                                                             |
| 26   | S1#14 `Paso → • PIS, 1`                              | S · llega | Espera **PIS** y viene **PIS**: coincide. Pasa a S2: S2#1 `Paso → PIS •, 1`                                                                                                                      |
| 27   | S1#15 `Paso → • INT, 1`                              | S · muere | Espera **INT**, pero viene **PIS**: no coincide, esta posibilidad muere.                                                                                                                         |
| 28   | S1#16 `Paso → • DSC, 1`                              | S · muere | Espera **DSC**, pero viene **PIS**: no coincide, esta posibilidad muere.                                                                                                                         |
| 29   | S1#17 `Paso → • ATQ, 1`                              | S · muere | Espera **ATQ**, pero viene **PIS**: no coincide, esta posibilidad muere.                                                                                                                         |
| 30   | S1#18 `Paso → • Linea, 1`                            | P · baja  | Hace falta un **Linea**: se anotan sus reglas con origen 1. Nuevos: S1#19 `Linea → • SOS, 1`; S1#20 `Linea → • SOS Pasos, 1`                                                                     |
| 31   | S1#19 `Linea → • SOS, 1`                             | S · muere | Espera **SOS**, pero viene **PIS**: no coincide, esta posibilidad muere.                                                                                                                         |
| 32   | S1#20 `Linea → • SOS Pasos, 1`                       | S · muere | Espera **SOS**, pero viene **PIS**: no coincide, esta posibilidad muere.                                                                                                                         |

**Resumen de S1:** 20 ítems. El próximo evento podía ser HAL (el hallazgo), CTX o PER (un marco), ENC (el encargo) o un paso: PIS, INT, DSC, ATQ o SOS. Con PIS sobrevive **uno**: `Paso → PIS •`.

---

## S2: después de PIS

**Qué pasa en S2:** **llega** `Paso → PIS •`, que está completo, y **sube** varios niveles en cadena: el Paso cierra un Pasos, el Pasos cierra la Investigación, y la Investigación hace avanzar al Relato ("falta el desenlace"). Después **baja** a lo que puede venir: más pasos o el Desenlace, hasta llegar a sus eventos. Por último **mira el tercer evento, REV**.

| Paso | Ítem que se procesa                                  | Operación | Qué pasa                                                                                                                                                                                                            |
| ---- | ---------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 33   | S2#1 `Paso → PIS •, 1`                               | C · sube  | Terminó un **Paso** que empezó en 1: se vuelve a S1 y avanzan los que lo esperaban. Nuevos: S2#2 `Pasos → Paso •, 1`                                                                                                |
| 34   | S2#2 `Pasos → Paso •, 1`                             | C · sube  | Terminó un **Pasos** que empezó en 1: se vuelve a S1 y avanzan los que lo esperaban. Nuevos: S2#3 `Investigacion → Pasos •, 1`; S2#4 `Pasos → Pasos • Pasos, 1`                                                     |
| 35   | S2#3 `Investigacion → Pasos •, 1`                    | C · sube  | Terminó un **Investigacion** que empezó en 1: se vuelve a S1 y avanzan los que lo esperaban. Nuevos: S2#5 `Relato → Planteo Investigacion • Desenlace, 0`                                                           |
| 36   | S2#4 `Pasos → Pasos • Pasos, 1`                      | P · baja  | Hace falta un **Pasos**: se anotan sus reglas con origen 2. Nuevos: S2#6 `Pasos → • Paso, 2`; S2#7 `Pasos → • Pasos Pasos, 2`                                                                                       |
| 37   | S2#5 `Relato → Planteo Investigacion • Desenlace, 0` | P · baja  | Hace falta un **Desenlace**: se anotan sus reglas con origen 2. Nuevos: S2#8 `Desenlace → • Resolucion, 2`; S2#9 `Desenlace → • Resolucion EPI, 2`                                                                  |
| 38   | S2#6 `Pasos → • Paso, 2`                             | P · baja  | Hace falta un **Paso**: se anotan sus reglas con origen 2. Nuevos: S2#10 `Paso → • PIS, 2`; S2#11 `Paso → • INT, 2`; S2#12 `Paso → • DSC, 2`; S2#13 `Paso → • ATQ, 2`; S2#14 `Paso → • Linea, 2`                    |
| 39   | S2#7 `Pasos → • Pasos Pasos, 2`                      | P · baja  | Hace falta un **Pasos**, pero sus reglas ya están anotadas en S2: no se agrega nada.                                                                                                                                |
| 40   | S2#8 `Desenlace → • Resolucion, 2`                   | P · baja  | Hace falta un **Resolucion**: se anotan sus reglas con origen 2. Nuevos: S2#15 `Resolucion → • REV, 2`; S2#16 `Resolucion → • REV CNF, 2`; S2#17 `Resolucion → • REV CAP, 2`; S2#18 `Resolucion → • REV CNF CAP, 2` |
| 41   | S2#9 `Desenlace → • Resolucion EPI, 2`               | P · baja  | Hace falta un **Resolucion**, pero sus reglas ya están anotadas en S2: no se agrega nada.                                                                                                                           |
| 42   | S2#10 `Paso → • PIS, 2`                              | S · muere | Espera **PIS**, pero viene **REV**: no coincide, esta posibilidad muere.                                                                                                                                            |
| 43   | S2#11 `Paso → • INT, 2`                              | S · muere | Espera **INT**, pero viene **REV**: no coincide, esta posibilidad muere.                                                                                                                                            |
| 44   | S2#12 `Paso → • DSC, 2`                              | S · muere | Espera **DSC**, pero viene **REV**: no coincide, esta posibilidad muere.                                                                                                                                            |
| 45   | S2#13 `Paso → • ATQ, 2`                              | S · muere | Espera **ATQ**, pero viene **REV**: no coincide, esta posibilidad muere.                                                                                                                                            |
| 46   | S2#14 `Paso → • Linea, 2`                            | P · baja  | Hace falta un **Linea**: se anotan sus reglas con origen 2. Nuevos: S2#19 `Linea → • SOS, 2`; S2#20 `Linea → • SOS Pasos, 2`                                                                                        |
| 47   | S2#15 `Resolucion → • REV, 2`                        | S · llega | Espera **REV** y viene **REV**: coincide. Pasa a S3: S3#1 `Resolucion → REV •, 2`                                                                                                                                   |
| 48   | S2#16 `Resolucion → • REV CNF, 2`                    | S · llega | Espera **REV** y viene **REV**: coincide. Pasa a S3: S3#2 `Resolucion → REV • CNF, 2`                                                                                                                               |
| 49   | S2#17 `Resolucion → • REV CAP, 2`                    | S · llega | Espera **REV** y viene **REV**: coincide. Pasa a S3: S3#3 `Resolucion → REV • CAP, 2`                                                                                                                               |
| 50   | S2#18 `Resolucion → • REV CNF CAP, 2`                | S · llega | Espera **REV** y viene **REV**: coincide. Pasa a S3: S3#4 `Resolucion → REV • CNF CAP, 2`                                                                                                                           |
| 51   | S2#19 `Linea → • SOS, 2`                             | S · muere | Espera **SOS**, pero viene **REV**: no coincide, esta posibilidad muere.                                                                                                                                            |
| 52   | S2#20 `Linea → • SOS Pasos, 2`                       | S · muere | Espera **SOS**, pero viene **REV**: no coincide, esta posibilidad muere.                                                                                                                                            |

**Resumen de S2:** 20 ítems. El próximo evento podía ser otro paso (PIS, INT, DSC, ATQ, SOS) o REV. Con REV sobreviven **cuatro**, las cuatro formas de una Resolución que empieza con REV.

---

## S3: después de REV, el final

**Qué pasa en S3:** **llegan** las cuatro Resoluciones. `Resolucion → REV •` está completa y **sube**: cierra el Desenlace, el Desenlace cierra el **Relato desde la posición 0**, y el Relato completa el ítem de arranque. Las otras tres esperaban CNF, CAP o EPI, pero ya no quedan eventos: mueren.

| Paso | Ítem que se procesa                                  | Operación | Qué pasa                                                                                                                                                                     |
| ---- | ---------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 53   | S3#1 `Resolucion → REV •, 2`                         | C · sube  | Terminó un **Resolucion** que empezó en 2: se vuelve a S2 y avanzan los que lo esperaban. Nuevos: S3#5 `Desenlace → Resolucion •, 2`; S3#6 `Desenlace → Resolucion • EPI, 2` |
| 54   | S3#2 `Resolucion → REV • CNF, 2`                     | S · muere | Espera **CNF**, pero ya no quedan eventos: muere.                                                                                                                            |
| 55   | S3#3 `Resolucion → REV • CAP, 2`                     | S · muere | Espera **CAP**, pero ya no quedan eventos: muere.                                                                                                                            |
| 56   | S3#4 `Resolucion → REV • CNF CAP, 2`                 | S · muere | Espera **CNF**, pero ya no quedan eventos: muere.                                                                                                                            |
| 57   | S3#5 `Desenlace → Resolucion •, 2`                   | C · sube  | Terminó un **Desenlace** que empezó en 2: se vuelve a S2 y avanzan los que lo esperaban. Nuevos: S3#7 `Relato → Planteo Investigacion Desenlace •, 0`                        |
| 58   | S3#6 `Desenlace → Resolucion • EPI, 2`               | S · muere | Espera **EPI**, pero ya no quedan eventos: muere.                                                                                                                            |
| 59   | S3#7 `Relato → Planteo Investigacion Desenlace •, 0` | C · sube  | Terminó un **Relato** que empezó en 0: se vuelve a S0 y avanzan los que lo esperaban. Nuevos: S3#8 `$S → Relato •, 0`                                                        |
| 60   | S3#8 `$S → Relato •, 0`                              | C · sube  | Es el ítem de arranque completo. Nadie lo espera: no hay nada que subir.                                                                                                     |

**Resumen de S3:** `$S → Relato •, 0` está en la última libreta: se reconoció un Relato completo, del primer evento al último. **El relato es válido (ACCEPTED).**

---

## La historia completa en una tabla

| Libreta | Llega (Scanner) | Sube (Completer)                                     | Baja (Predictor)                            | Ítems | Con el evento siguiente sobreviven |
| ------- | --------------- | ---------------------------------------------------- | ------------------------------------------- | ----- | ---------------------------------- |
| S0      | (arranque)      | —                                                    | Relato → Planteo → Hecho, Marco             | 12    | 2 (con CRI)                        |
| S1      | CRI             | Hecho → Planteo → Relato avanza                      | Marco; Investigacion → Pasos → Paso → Linea | 20    | 1 (con PIS)                        |
| S2      | PIS             | Paso → Pasos → Investigacion → Relato avanza         | más Pasos; Desenlace → Resolucion           | 20    | 4 (con REV)                        |
| S3      | REV             | Resolucion → Desenlace → **Relato** → **$S: acepta** | —                                           | 8     | (fin)                              |

## ¿Y si el relato es `CRI REV`?

S0 y S1 se arman igual que arriba. Pero al mirar el segundo evento, REV, **ningún ítem de S1 lo esperaba** (S1 esperaba HAL, CTX, PER, ENC o un paso). Ningún Scanner pasa nada a S2: **S2 queda vacía**, ninguna posibilidad sobrevivió, y el relato se rechaza en el evento 2. Falta la investigación. Se puede ver eligiendo `CRI REV` en la página interactiva.
