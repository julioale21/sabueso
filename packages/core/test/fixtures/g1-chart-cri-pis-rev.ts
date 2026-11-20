// The chart of CRI PIS REV with G1, computed by hand in SPEC 02, section 9.6: every item of
// S0 … S3 in the order the algorithm adds it, with its origin and how it got there.
// 'S from S0#5' = Scanner from item 5 of S0; 'C' = Completer; 'ε' = advance over a
// nullable symbol (Aycock-Horspool); 'P (ignored)' = predicted ε-item the Completer skips.

export interface ExpectedChartItem {
  set: number;
  item: string;
  origin: number;
  how: string;
}

export const g1ChartOfCriPisRev: readonly ExpectedChartItem[] = [
  { set: 0, item: '$S → • Relato', origin: 0, how: 'initial' },
  { set: 0, item: 'Relato → • Planteo Investigacion Desenlace', origin: 0, how: 'P' },
  { set: 0, item: 'Planteo → • Hecho MarcoOpc', origin: 0, how: 'P' },
  { set: 0, item: 'Planteo → • Marco Hecho', origin: 0, how: 'P' },
  { set: 0, item: 'Hecho → • CRI HallazgoOpc', origin: 0, how: 'P' },
  { set: 0, item: 'Hecho → • HAL', origin: 0, how: 'P' },
  { set: 0, item: 'Marco → • CTX PerOpc', origin: 0, how: 'P' },
  { set: 0, item: 'Marco → • PER CtxOpc', origin: 0, how: 'P' },
  { set: 1, item: 'Hecho → CRI • HallazgoOpc', origin: 0, how: 'S from S0#5' },
  { set: 1, item: 'HallazgoOpc → • HAL', origin: 1, how: 'P' },
  { set: 1, item: 'HallazgoOpc → •', origin: 1, how: 'P (ignored)' },
  { set: 1, item: 'Hecho → CRI HallazgoOpc •', origin: 0, how: 'ε' },
  { set: 1, item: 'Planteo → Hecho • MarcoOpc', origin: 0, how: 'C from S0#3' },
  { set: 1, item: 'MarcoOpc → • Marco', origin: 1, how: 'P' },
  { set: 1, item: 'MarcoOpc → •', origin: 1, how: 'P (ignored)' },
  { set: 1, item: 'Planteo → Hecho MarcoOpc •', origin: 0, how: 'ε' },
  { set: 1, item: 'Marco → • CTX PerOpc', origin: 1, how: 'P' },
  { set: 1, item: 'Marco → • PER CtxOpc', origin: 1, how: 'P' },
  { set: 1, item: 'Relato → Planteo • Investigacion Desenlace', origin: 0, how: 'C from S0#2' },
  { set: 1, item: 'Investigacion → • Pasos', origin: 1, how: 'P' },
  { set: 1, item: 'Investigacion → • ENC Pasos', origin: 1, how: 'P' },
  { set: 1, item: 'Pasos → • Evidencia Libres Lineas', origin: 1, how: 'P' },
  { set: 1, item: 'Pasos → • Linea Lineas', origin: 1, how: 'P' },
  { set: 1, item: 'Evidencia → • PIS', origin: 1, how: 'P' },
  { set: 1, item: 'Evidencia → • INT', origin: 1, how: 'P' },
  { set: 1, item: 'Evidencia → • ATQ', origin: 1, how: 'P' },
  { set: 1, item: 'Linea → • SOS CuerpoLinea', origin: 1, how: 'P' },
  { set: 2, item: 'Evidencia → PIS •', origin: 1, how: 'S from S1#16' },
  { set: 2, item: 'Pasos → Evidencia • Libres Lineas', origin: 1, how: 'C from S1#14' },
  { set: 2, item: 'Libres → • Evidencia Libres', origin: 2, how: 'P' },
  { set: 2, item: 'Libres → •', origin: 2, how: 'P (ignored)' },
  { set: 2, item: 'Pasos → Evidencia Libres • Lineas', origin: 1, how: 'ε' },
  { set: 2, item: 'Evidencia → • PIS', origin: 2, how: 'P' },
  { set: 2, item: 'Evidencia → • INT', origin: 2, how: 'P' },
  { set: 2, item: 'Evidencia → • ATQ', origin: 2, how: 'P' },
  { set: 2, item: 'Lineas → • Linea Lineas', origin: 2, how: 'P' },
  { set: 2, item: 'Lineas → •', origin: 2, how: 'P (ignored)' },
  { set: 2, item: 'Pasos → Evidencia Libres Lineas •', origin: 1, how: 'ε' },
  { set: 2, item: 'Linea → • SOS CuerpoLinea', origin: 2, how: 'P' },
  { set: 2, item: 'Investigacion → Pasos •', origin: 1, how: 'C from S1#12' },
  { set: 2, item: 'Relato → Planteo Investigacion • Desenlace', origin: 0, how: 'C from S1#11' },
  { set: 2, item: 'Desenlace → • Resolucion EpiOpc', origin: 2, how: 'P' },
  { set: 2, item: 'Resolucion → • REV Cierre', origin: 2, how: 'P' },
  { set: 3, item: 'Resolucion → REV • Cierre', origin: 2, how: 'S from S2#16' },
  { set: 3, item: 'Cierre → • CNF CapOpc', origin: 3, how: 'P' },
  { set: 3, item: 'Cierre → • CAP', origin: 3, how: 'P' },
  { set: 3, item: 'Cierre → •', origin: 3, how: 'P (ignored)' },
  { set: 3, item: 'Resolucion → REV Cierre •', origin: 2, how: 'ε' },
  { set: 3, item: 'Desenlace → Resolucion • EpiOpc', origin: 2, how: 'C from S2#15' },
  { set: 3, item: 'EpiOpc → • EPI', origin: 3, how: 'P' },
  { set: 3, item: 'EpiOpc → •', origin: 3, how: 'P (ignored)' },
  { set: 3, item: 'Desenlace → Resolucion EpiOpc •', origin: 2, how: 'ε' },
  { set: 3, item: 'Relato → Planteo Investigacion Desenlace •', origin: 0, how: 'C from S2#14' },
  { set: 3, item: '$S → Relato •', origin: 0, how: 'C from S0#1' },
];
