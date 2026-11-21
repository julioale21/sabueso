/**
 * Ready-made stories for the demo: cases of SPEC 02, section 9.1, with what each one shows.
 */
/** One sentence of the story told in words, with the tag (or tags) it becomes. */
export interface NarrativeLine {
  tags: string;
  text: string;
}

export interface Example {
  id: string;
  /** A short name for its card. */
  title: string;
  /** What the example shows. */
  description: string;
  input: string;
  /** The story in words, as a person would tell it: one sentence per tag (SPEC 04 reads this). */
  narrative: readonly NarrativeLine[];
}

export const EXAMPLES: readonly Example[] = [
  {
    id: 'V1',
    title: 'El caso de Lord Ashby',
    description: 'Válido: 8 árboles en G0 y 1 en G1.',
    input: 'CTX HAL ENC INT SOS PIS DSC REV CNF CAP',
    narrative: [
      { tags: 'CTX', text: 'Lord Ashby vivía en una mansión de Kent.' },
      { tags: 'HAL', text: 'El mayordomo encontró el cadáver de Lord Ashby.' },
      { tags: 'ENC', text: 'La viuda llamó al inspector Miller.' },
      { tags: 'INT', text: 'Miller interrogó a la cocinera.' },
      { tags: 'SOS', text: 'Miller sospechó del sobrino.' },
      { tags: 'PIS', text: 'Miller encontró un pañuelo en el jardín.' },
      { tags: 'DSC', text: 'El sobrino tenía una coartada.' },
      { tags: 'REV', text: 'Miller acusó a la cocinera.' },
      { tags: 'CNF', text: 'La cocinera confesó el crimen.' },
      { tags: 'CAP', text: 'La policía arrestó a la cocinera.' },
    ],
  },
  {
    id: 'A1',
    title: 'Ambiguo con G0',
    description: 'Válido con las dos: 4 árboles en G0 y 1 en G1.',
    input: 'CRI SOS PIS INT REV',
    narrative: [
      { tags: 'CRI', text: 'Alguien envenenó al banquero Ferrer en su despacho.' },
      { tags: 'SOS', text: 'La inspectora Ríos sospechó del socio.' },
      { tags: 'PIS', text: 'Ríos encontró una taza con restos de veneno.' },
      { tags: 'INT', text: 'Ríos interrogó a la secretaria.' },
      { tags: 'REV', text: 'Ríos reveló que el culpable era el socio.' },
    ],
  },
  {
    id: 'I1',
    title: 'Un relato inválido',
    description: 'Falta el crimen: falla en el evento 3.',
    input: 'CTX PER PIS REV',
    narrative: [
      { tags: 'CTX', text: 'Era un pueblo tranquilo junto al río.' },
      { tags: 'PER', text: 'Allí vivía Ortiz, un detective retirado.' },
      { tags: 'PIS', text: 'Ortiz encontró una huella en el muelle.' },
      {
        tags: 'REV',
        text: 'Ortiz señaló al barquero como culpable… ¿de qué? Nunca hubo un crimen.',
      },
    ],
  },
  {
    id: 'I5',
    title: 'Válido en G0, inválido en G1',
    description: 'Descarta a alguien de quien nadie sospechó: G0 lo acepta y G1 no.',
    input: 'CRI DSC REV',
    narrative: [
      { tags: 'CRI', text: 'Robaron el collar de la condesa.' },
      {
        tags: 'DSC',
        text: 'El chofer tenía coartada y quedó descartado… pero nadie había sospechado de él.',
      },
      { tags: 'REV', text: 'El detective acusó a la doncella.' },
    ],
  },
  {
    id: 'L1',
    title: 'Un relato largo',
    description: '200 eventos: CRI, 198 pistas y REV. En G0 tiene C(197) árboles.',
    input: ['CRI', ...Array.from({ length: 198 }, () => 'PIS'), 'REV'].join(' '),
    narrative: [
      { tags: 'CRI', text: 'Mataron al coleccionista Vidal.' },
      { tags: 'PIS × 198', text: 'El detective juntó 198 pistas, una tras otra.' },
      { tags: 'REV', text: 'Al final, señaló a la sobrina.' },
    ],
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
