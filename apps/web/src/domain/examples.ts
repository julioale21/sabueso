/**
 * Ready-made stories for the demo: cases of SPEC 02, section 9.1, with what each one shows.
 */
export interface Example {
  id: string;
  /** What the example is good for, shown as a tooltip. */
  description: string;
  input: string;
}

export const EXAMPLES: readonly Example[] = [
  {
    id: 'V1',
    description: 'El relato de Lord Ashby: válido (8 árboles en G0, 1 en G1)',
    input: 'CTX HAL ENC INT SOS PIS DSC REV CNF CAP',
  },
  {
    id: 'A1',
    description: 'Ambiguo en G0: 4 árboles (1 en G1)',
    input: 'CRI SOS PIS INT REV',
  },
  {
    id: 'I1',
    description: 'Inválido: falta el crimen (error en el evento 3)',
    input: 'CTX PER PIS REV',
  },
  {
    id: 'I5',
    description: 'Descarte sin sospecha: G0 lo acepta, G1 no',
    input: 'CRI DSC REV',
  },
  {
    id: 'L1',
    description: '200 eventos: CRI, 198 pistas y REV (C(197) árboles en G0)',
    input: ['CRI', ...Array.from({ length: 198 }, () => 'PIS'), 'REV'].join(' '),
  },
];
