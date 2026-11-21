# 17 — Aceptación y diagnóstico de errores

## 1. Definición formal

- **Aceptación:** la entrada w = a₁…aₙ ∈ L(G) si y solo si ($S → S •, 0) ∈ Sn.
- **Posición:** índice del token, desde 0. La consola la muestra también como número de evento, desde 1.
- **Error por token inesperado:** si S(k+1) queda vacío después de procesar Sk, ningún ítem de Sk pudo leer aₖ₊₁. El error está en la posición k, `found` = aₖ₊₁ y `expected` = los terminales que aparecen justo después del punto en los ítems de Sk.
- **Error por fin de entrada:** si ningún conjunto queda vacío pero ($S → S •, 0) ∉ Sn, la entrada terminó antes de tiempo. Posición n, `found` = null, `expected` = los terminales después del punto en Sn. Si no hay ninguno, el mensaje es "entrada incompleta".
- **Símbolo desconocido:** un token fuera de Σ se informa antes de correr Earley (ficha 01).
- `expected` va ordenado alfabéticamente, para que las pruebas sean deterministas.
- **Por qué funciona:** Sk contiene todas las posibilidades que siguen vivas en la posición k. Los terminales después de sus puntos son exactamente los tokens que mantendrían viva alguna. Si el siguiente no es ninguno de ellos, S(k+1) queda vacío.

## 2. Ejemplo resuelto a mano

G1, `CTX PER PIS REV` (falta el crimen):

| Conjunto | Qué pasa                                                                             |
| -------- | ------------------------------------------------------------------------------------ |
| S1       | se leyó CTX: el Marco empezó                                                         |
| S2       | se leyó PER: el Marco terminó, y el Planteo `Marco Hecho` espera un Hecho: CRI o HAL |
| S3       | viene PIS: nadie en S2 lo esperaba. **S3 queda vacío**                               |

Resultado: error en la posición 2 (evento 3), se encontró PIS, se esperaba CRI o HAL. En palabras del género: el relato tiene marco, pero no tiene crimen.

**Los ítems abiertos (SPEC 05):** un relato rechazado no tiene árbol, pero el conjunto del error dice qué estructuras quedaron a medias. `openItemsAt` separa dos grupos: los ítems con algo antes del punto (estructuras empezadas que no pudieron seguir) y los ítems predichos con el punto al principio que habrían leído una etiqueta esperada (de ahí sale "se esperaba: …"). Con I1 en G1, en S2: `Planteo → Marco • Hecho, 0` quedó esperando el hecho, y esperaban `Hecho → • CRI HallazgoOpc, 2` y `Hecho → • HAL, 2`.

## 3. Dónde está en el código

| Qué                | Dónde                                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Archivo            | `packages/core/src/earley/diagnostics.ts`                                                                                 |
| Funciones          | `diagnose({ grammar, chart, tokens, accepted })`, `expectedTerminals({ grammar, set })` y `openItemsAt({ chart, error })` |
| Tipos              | `ParseError { kind, position, found, expected }` y `OpenItems { set, started, waiting }`                                  |
| Comando de consola | `npm run sabueso -- earley --grammar g1 "CTX PER PIS REV"` y `parse` (con los ítems abiertos)                             |

## 4. Qué prueba lo verifica

| Prueba                                           | Qué verifica                                                                        |
| ------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `packages/core/test/earley/diagnostics.test.ts`  | I1 a I7 con G0 y G1, y P2 con `parentheses`: posición, `found` y `expected` exactos |
| `packages/core/test/command-line/earley.test.ts` | los mensajes: evento, fin de entrada, entrada incompleta y símbolo fuera de Σ       |
| `packages/core/test/earley/open-items.test.ts`   | los ítems abiertos de I1, del relato vacío y de un símbolo fuera de Σ               |

## 5. Referencia bibliográfica

- SPEC 02, sección 3.17.
- Earley, J., "An efficient context-free parsing algorithm", _Communications of the ACM_ 13(2), 1970: la propiedad de prefijo correcto (el algoritmo detecta el error en el primer token que no puede extender ningún prefijo válido).
