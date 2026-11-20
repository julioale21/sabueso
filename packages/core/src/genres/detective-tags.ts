/**
 * Concept: the alphabet Σ of the detective story, |Σ| = 14 (table of the project proposal).
 * Reference: SPEC 02, sections 3.1 and 4.6.
 * Card: docs/concepts/01-alphabet-and-language.md
 *
 * The tags, their meaning and the examples are domain data, so they stay in Spanish.
 */
import type { TagInfo } from './types.js';

export const detectiveTags: readonly TagInfo[] = [
  {
    tag: 'CTX',
    narrativeFunction: 'Contexto',
    example: 'Lord Ashby vivía en una mansión de Kent.',
  },
  {
    tag: 'PER',
    narrativeFunction: 'Presentación del detective',
    example: 'El inspector Miller era un detective famoso.',
  },
  { tag: 'CRI', narrativeFunction: 'Crimen', example: 'El asesino envenenó a Lord Ashby.' },
  {
    tag: 'HAL',
    narrativeFunction: 'Hallazgo del crimen',
    example: 'El mayordomo encontró el cadáver.',
  },
  {
    tag: 'ENC',
    narrativeFunction: 'Encargo al detective',
    example: 'La viuda llamó al inspector Miller.',
  },
  { tag: 'PIS', narrativeFunction: 'Pista', example: 'Miller encontró un pañuelo en el jardín.' },
  { tag: 'INT', narrativeFunction: 'Interrogatorio', example: 'Miller interrogó a la cocinera.' },
  { tag: 'SOS', narrativeFunction: 'Sospecha', example: 'Miller sospechó del sobrino.' },
  {
    tag: 'DSC',
    narrativeFunction: 'Descarte de una sospecha',
    example: 'El sobrino tenía una coartada.',
  },
  {
    tag: 'ATQ',
    narrativeFunction: 'Nuevo ataque u obstáculo',
    example: 'Alguien atacó al jardinero.',
  },
  {
    tag: 'REV',
    narrativeFunction: 'Revelación del culpable',
    example: 'Miller acusó a la cocinera.',
  },
  { tag: 'CNF', narrativeFunction: 'Confesión', example: 'La cocinera confesó el crimen.' },
  { tag: 'CAP', narrativeFunction: 'Captura', example: 'La policía arrestó a la cocinera.' },
  { tag: 'EPI', narrativeFunction: 'Epílogo', example: 'Miller volvió a Londres.' },
];
