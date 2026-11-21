/**
 * Ready-made stories for the demo: cases of SPEC 02, section 9.1, with what each one shows.
 */
export interface Example {
  id: string;
  /** A short name for its card. */
  title: string;
  /** What the example shows. */
  description: string;
  input: string;
}

export const EXAMPLES: readonly Example[] = [
  {
    id: 'V1',
    title: 'El caso de Lord Ashby',
    description: 'Válido: 8 árboles en G0 y 1 en G1.',
    input: 'CTX HAL ENC INT SOS PIS DSC REV CNF CAP',
  },
  {
    id: 'A1',
    title: 'Un relato ambiguo',
    description: '4 árboles en G0 y 1 en G1.',
    input: 'CRI SOS PIS INT REV',
  },
  {
    id: 'I1',
    title: 'Un relato inválido',
    description: 'Falta el crimen: falla en el evento 3.',
    input: 'CTX PER PIS REV',
  },
  {
    id: 'I5',
    title: 'G0 sí, G1 no',
    description: 'Un descarte sin sospecha: G0 lo acepta y G1 no.',
    input: 'CRI DSC REV',
  },
  {
    id: 'L1',
    title: 'Un relato largo',
    description: '200 eventos: CRI, 198 pistas y REV. En G0 tiene C(197) árboles.',
    input: ['CRI', ...Array.from({ length: 198 }, () => 'PIS'), 'REV'].join(' '),
  },
];

/** The story shortened for a card: long ones keep the first and last tags and their count. */
export function storyPreview(input: string): string {
  const tags = input.split(' ');
  const shown = 12;
  return tags.length <= shown
    ? input
    : `${tags.slice(0, 3).join(' ')} … ${tags.slice(-2).join(' ')} (${tags.length} etiquetas)`;
}
