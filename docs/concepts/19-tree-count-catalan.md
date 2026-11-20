# 19 — Conteo de árboles

## 1. Definición formal

- **Conteo por programación dinámica** sobre los enlaces de Earley:
  - cuenta(ítem con el punto en 0) = 1;
  - cuenta(ítem) = Σ sobre sus enlaces de cuenta(predecesor) × cuenta(causa), donde cuenta(token) = 1, cuenta(ítem hijo) es recursiva y cuenta(anulable B) = cantidad de árboles ε de B (ficha 18);
  - se recuerda la cuenta de cada ítem (memoización): cada ítem se cuenta una sola vez.
- Se usa **`bigint`**: los números crecen muy rápido y `number` pierde precisión después de 2⁵³.
- Si el recorrido encuentra un ítem que todavía se está contando, hay un ciclo: la cuenta es **`'infinite'`**.
- **Crecimiento en G0:** `Pasos → Pasos Pasos` agrupa los pasos de a dos de todas las formas posibles, y cada agrupación es un árbol: la cantidad crece **exponencialmente** con los pasos. _Nota fuera de la materia:_ esa sucesión (1, 1, 2, 5, 14, 42…) son los números de Catalan, C(n − 1) para n pasos; las pruebas la usan para comprobar L1.

## 2. Ejemplo resuelto a mano

G0, `CRI PIS PIS PIS REV` (3 pasos): `Pasos` tiene que agrupar `PIS PIS PIS` de a dos.

| Agrupación    |
| ------------- |
| (PIS PIS) PIS |
| PIS (PIS PIS) |

**2 árboles**. Con 4 pasos, 5; con 198 pasos (L1), un número de 115 dígitos.

| Relato (tabla 9.1)                           | G0          | G1  |
| -------------------------------------------- | ----------- | --- |
| V1 `CTX HAL ENC INT SOS PIS DSC REV CNF CAP` | 8           | 1   |
| V3 `CRI ENC SOS INT DSC PIS SOS ATQ REV CAP` | 112         | 1   |
| A1 `CRI SOS PIS INT REV`                     | 4           | 1   |
| L1 `CRI` + 198 × `PIS` + `REV`               | 115 dígitos | 1   |

## 3. Dónde está en el código

| Qué                | Dónde                                                                             |
| ------------------ | --------------------------------------------------------------------------------- |
| Archivo            | `packages/core/src/trees/count.ts`                                                |
| Función            | `countTrees(grammar, recognition)`                                                |
| Comando de consola | `npm run sabueso -- count --grammar g0 --file packages/core/test/fixtures/l1.txt` |

## 4. Qué prueba lo verifica

| Prueba                                          | Qué verifica                                                                                                                                      |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core/test/trees/count.test.ts`        | los valores de la tabla 9.1; L1 = C(197) comparado con la fórmula; n pasos dan C(n − 1); coincide con la enumeración; `test-cyclic` da `infinite` |
| `packages/core/test/command-line/count.test.ts` | el número completo de L1 con sus 115 dígitos, `--file` y los casos especiales                                                                     |

## 5. Referencia bibliográfica

- SPEC 02, sección 3.20.
- Para la nota sobre la sucesión: Graham, Knuth y Patashnik, _Matemáticas concretas_, sección 7.5 (los números de Catalan).
