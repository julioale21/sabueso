# 21 — Ambigüedad: G0 contra G1

## 1. Definición formal

- G es **ambigua** si existe una cadena w con dos árboles de derivación distintos (equivalentemente, dos derivaciones más a la izquierda distintas).
- Decidir si una GLC cualquiera es ambigua es **indecidible**. Se puede: demostrar que **no** lo es con una condición suficiente (LL(1), paso 12), o mostrar que **sí** lo es con un **testigo**: una cadena con dos árboles.
- **Árbol no es lo mismo que lectura:** dos árboles distintos pueden decir lo mismo sobre el relato (por ejemplo, solo cambia cómo se agrupan los pasos).

## 2. Ejemplo resuelto a mano

**El testigo de G0:** A1 = `CRI SOS PIS INT REV` tiene **4 árboles** (ficha 18). Vienen de las dos reglas ambiguas del anteproyecto:

| Regla                 | Qué no decide                  | Analogía                   |
| --------------------- | ------------------------------ | -------------------------- |
| `Pasos → Pasos Pasos` | cómo se agrupan los pasos      | una suma sin asociatividad |
| `Linea → SOS Pasos`   | hasta dónde llega una sospecha | el "else colgante"         |

Los 4 árboles dan **3 lecturas**: la sospecha abarca nada, solo PIS, o PIS e INT. Dos árboles difieren solo en la agrupación, que no cambia el significado.

**G1 no es ambigua:** es LL(1) (0 conflictos, paso 12), y A1 tiene 1 árbol: la sospecha abarca todo hasta la revelación.

**Cuántos árboles puede tener un relato en G0:** con n pasos sin sospechas, C(n−1), el número de Catalan. L1 (198 pistas) tiene C(197), un número de 115 dígitos.

**El testigo más corto de G0:** la búsqueda acotada (ficha 25) encuentra `CRI SOS ATQ REV`, de largo 4, con 2 árboles: la sospecha abarca el ataque o no. Con largo 3 no hay ninguno. En G1 no hay testigo hasta largo 7, y la tabla LL(1) demuestra que no hay ninguno.

**Los lenguajes:** L(G1) ⊊ L(G0). G1 rechaza un descarte sin sospecha (`CRI DSC REV`) y dos descartes de la misma sospecha (`CRI SOS DSC DSC REV`). `compare g0 g1 --max-length 3` lo muestra: solo G0 tiene `CRI DSC REV` y `HAL DSC REV`, y G1 no tiene ninguna oración propia (hasta largo 4 tampoco).

## 3. Dónde está en el código

| Qué                    | Dónde                                                                   |
| ---------------------- | ----------------------------------------------------------------------- |
| Los árboles de A1      | `npm run sabueso -- trees --grammar g0 "CRI SOS PIS INT REV"` (paso 19) |
| G1 es LL(1)            | `npm run sabueso -- predictive-table --grammar g1` (paso 12)            |
| Conteo (Catalan)       | paso 20 (`count`)                                                       |
| Testigo más corto      | `npm run sabueso -- ambiguity --grammar g0 --max-length 4` (paso 27)    |
| Comparar los lenguajes | `npm run sabueso -- compare g0 g1 --max-length 3` (paso 27)             |

## 4. Qué prueba lo verifica

| Prueba                                                 | Qué verifica                                                                              |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `packages/core/test/trees/enumerate.test.ts`           | A1: 4 árboles en G0, 1 en G1                                                              |
| `packages/core/test/analysis/predictive-table.test.ts` | G1 sin conflictos                                                                         |
| `packages/core/test/bounded/bounded.test.ts`           | el testigo de G0 (B2), ninguno en G1 hasta largo 7 (B3) y la diferencia de lenguajes (B4) |

## 5. Referencia bibliográfica

- Hopcroft, Motwani y Ullman, sección 5.4 (ambigüedad) y 9.5.2 (indecidibilidad de la ambigüedad).
- Augusto, sección 2.4.2 (el "else colgante").
