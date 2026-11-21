# Verificación manual de la web

Una lista para revisar la web a mano, vista por vista. Cada caso dice qué hacer y qué tienes que ver. Marca la casilla cuando lo compruebes.

- **En línea:** [julioale21.github.io/sabueso](https://julioale21.github.io/sabueso/).
- **En local:** `npm run dev -w @sabueso/web`.

Los valores salen de las pruebas de `apps/web/test` y de los comandos de la [demo por consola](console-demo.md). Si algo no coincide, compara con su comando.

Revisa la lista en **Chrome** y en **Firefox**, en sus versiones actuales:

- [ ] Chrome
- [ ] Firefox

## Al abrir

- [ ] Abre la página. Ves "Sabueso", la gramática **G1 · oficial**, el relato vacío y ningún resultado.
- [ ] La consola del navegador no muestra errores.
- [ ] Las etiquetas, los ejemplos y el texto de la gramática están plegados: "Ver las 14 etiquetas", "Probar un ejemplo" y "Ver la gramática".
- [ ] "Ver las 14 etiquetas" abre 14 botones, cada uno con su función (por ejemplo, PIS · Pista).
- [ ] "Probar un ejemplo" abre 5 tarjetas: V1, A1, I1, I5 y L1. La de L1 dice "CRI PIS PIS … PIS REV (200 etiquetas)".
- [ ] "Ver la gramática" muestra LL(1) ✓, anulables: 10, inútiles: 0, y el texto de G1, que no se puede editar.
- [ ] El selector de gramática ofrece solo G1 · oficial y G0 · alternativa.

## Navegación

- [ ] La barra lateral tiene dos grupos: **Sobre el relato** (Análisis, Earley paso a paso, FNC y CYK, Autómata de pila) y **Sobre la gramática** (LL(1), G0 vs G1).
- [ ] Antes de analizar, Earley, FNC y CYK y Autómata de pila están desactivadas y dicen "Analiza un relato primero (pestaña Análisis)". LL(1) y G0 vs G1 están activas.
- [ ] Con el foco en Análisis, la flecha abajo (o derecha) salta a LL(1): el teclado salta las desactivadas. Fin va a G0 vs G1, e Inicio vuelve a Análisis.
- [ ] Después de Analizar, las cuatro vistas del relato se activan.

## Análisis

Elige el ejemplo o escribe el relato, elige la gramática y aprieta **Analizar**. El panel Resultado aparece recién entonces.

| Caso | Relato                                    | G0                                | G1                                |
| ---- | ----------------------------------------- | --------------------------------- | --------------------------------- |
| V1   | `CTX HAL ENC INT SOS PIS DSC REV CNF CAP` | ✓ 8 árboles (se muestran 3)       | ✓ 1 árbol                         |
| A1   | `CRI SOS PIS INT REV`                     | ✓ 4 árboles (se muestran 3)       | ✓ 1 árbol, 18 pasos               |
| I1   | `CTX PER PIS REV`                         | ✗ evento 3, se esperaba: CRI, HAL | ✗ evento 3, se esperaba: CRI, HAL |
| I5   | `CRI DSC REV`                             | ✓ 1 árbol                         | ✗ evento 2, se encontró DSC       |
| L1   | `CRI`, 198 × `PIS`, `REV`                 | ✓ ≈ 8,1 × 10¹¹⁴ (115 dígitos)     | ✓ 1 árbol                         |

- [ ] V1 con G0 y con G1, como dice la tabla.
- [ ] A1 con G0: "✓ Aceptado · 4 árboles (se muestran 3)" y "la gramática es ambigua para este relato". El paginador pasa de "árbol 1/3" a "árbol 3/3".
- [ ] A1 con G1: "✓ Aceptado · 1 árbol", sin paginador, y "Derivación más a la izquierda (18 pasos)".
- [ ] A1 con G1: al elegir el paso 7 (`CRI Linea Lineas Desenlace`), se resalta el nodo `Pasos` en el árbol.
- [ ] A1 con G1 y "Colapsar ε" activado: el árbol muestra 6 nodos "⇒ ε".
- [ ] I1 con G1: "✗ Rechazado" y "Posición 2 (evento 3): se encontró PIS; se esperaba: CRI, HAL.". `PIS` queda marcado en el relato.
- [ ] I5 con G1: rechazado en la posición 1 (evento 2), se encontró DSC; se esperaba: ATQ, CTX, ENC, HAL, INT, PER, PIS, SOS.
- [ ] L1 con G0: responde en menos de un segundo, con el total "≈ 8,1 × 10¹¹⁴ (115 dígitos)".
- [ ] Relato vacío: "✗ Rechazado", "ε (relato vacío)" y "se esperaba: CRI, CTX, HAL, PER".
- [ ] Escribe `CRI XYZ REV`: antes de analizar, `XYZ` se marca en rojo y dice "No son etiquetas de este género: XYZ.". `CRI` y `REV` no se marcan.
- [ ] Con A1 analizado en G1, cambia a G0: el resultado se rehace solo y dice 4 árboles.

## Earley paso a paso

- [ ] Analiza `CRI PIS REV` con G1. La vista empieza en "evento 0/53", con solo `$S → • Relato` en S0.
- [ ] Al final ("Al final"), S0, S1, S2 y S3 tienen 8, 19, 16 y 11 ítems, y dice "✓ Aceptado: $S → Relato • está en S3.".
- [ ] Muestra el relato analizado y "Gramática: G1 · oficial". Si cambias el campo sin analizar, la vista sigue con `CRI PIS REV`.
- [ ] A1 con G1: el último evento ocurre en S5.
- [ ] I1 con G1: S3 queda vacío y dice "✗ Rechazado: $S → Relato • no está en S4.".

## FNC y CYK

- [ ] Analiza `CRI PIS REV` con G1. Los seis pasos están en orden: START, DEL, UNIT, USELESS, TERM y BIN. La FNC de G1 queda con 78 producciones.
- [ ] La tabla tiene Relato en T[0][3] y X1 en T[1][2]. Dice "✓ Aceptado: Relato en T[0][3].".
- [ ] Debajo, los dos árboles. "Solo en el árbol de CYK" incluye X1; "Solo en el árbol de Earley" incluye Pasos.

## Autómata de pila

- [ ] Analiza `CRI PIS REV` con G1. Dice "✓ Aceptado: la pila queda vacía después de leer todo el relato · 23 configuraciones exploradas.".
- [ ] |δ| = 54 (40 expandir, 14 emparejar). El camino tiene 17 transiciones (14 expandir, 3 emparejar), y la lista marca "17 usadas en el camino".
- [ ] El reproductor empieza en "paso 0/17" con `Relato` en la pila. Un paso después, la pila es `Planteo Investigacion Desenlace`. Al final, "vacía (ε)".

## LL(1)

- [ ] Con G1: "LL(1) ✓", sin conflictos, y M[Planteo, CRI] = `Hecho MarcoOpc`.
- [ ] Con G1, FIRST y FOLLOW de Relato: {CRI, HAL, CTX, PER} y {$}.
- [ ] Con G0: "13 conflictos". La celda (Linea, SOS) está resaltada, y la lista dice "M[Linea, SOS]: Linea → SOS".
- [ ] Dice "Propiedad de la gramática … : no depende del relato".

## G0 vs G1

- [ ] Con k = 3: "L(G0) ≠ L(G1)". "Relatos que solo genera G0" son exactamente `CRI DSC REV` y `HAL DSC REV`, y G1 no tiene ninguno.
- [ ] Con k = 3, G0 está "sin testigo hasta k = 3".
- [ ] Con k = 4: G0 tiene el testigo `CRI SOS ATQ REV`, que "tiene 2 árboles". G1 sigue "sin testigo hasta k = 4".
- [ ] Aparece la aclaración "no encontrar nada hasta k no demuestra nada".

## Limpiar, Reiniciar y recargar

- [ ] Limpiar vacía el relato y quita el resultado. Sin nada que limpiar, está desactivado.
- [ ] Reiniciar (con A1 en G0 analizado) vuelve a G1, al relato vacío, sin resultado y en la vista Análisis.
- [ ] Recarga la página después de analizar: abre con G1 y el relato vacío. No se guarda nada.

## Pantalla de teléfono

Achica la ventana o usa el modo de dispositivo del navegador (menos de 768 px de ancho).

- [ ] En lugar de la barra lateral hay una barra "☰ Vista: Análisis".
- [ ] La barra abre las vistas a pantalla completa. Las desactivadas dicen su motivo debajo.
- [ ] Se cierra con ✕, con Escape y al elegir una vista. Al elegir LL(1), la barra dice "☰ Vista: LL(1)".
- [ ] La página no tiene scroll horizontal.

## Tema oscuro

- [ ] Cambia el sistema operativo a tema oscuro: la página pasa a fondo oscuro y el texto se lee bien en todas las vistas.
