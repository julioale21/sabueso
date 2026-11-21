// How counts and diagnoses are written on screen (SPEC 03, step 9).
import { describe, expect, it } from 'vitest';
import { diagnosticMessage } from '../src/domain/diagnostic-message';
import { formatTreeCount, treesWord } from '../src/domain/tree-count';

describe('formatTreeCount', () => {
  it('writes up to 15 digits whole', () => {
    expect(formatTreeCount(4n)).toBe('4');
    expect(formatTreeCount(123456789012345n)).toBe('123456789012345');
  });

  it('approximates longer counts with the number of digits', () => {
    expect(formatTreeCount(5n * 10n ** 114n + 3n)).toBe('≈ 5,0 × 10¹¹⁴ (115 dígitos)');
  });

  it('infinitely many trees, and the singular', () => {
    expect(formatTreeCount('infinite')).toBe('infinitos');
    expect(treesWord(1n)).toBe('árbol');
    expect(treesWord(4n)).toBe('árboles');
  });
});

describe('diagnosticMessage', () => {
  it('an unexpected tag: the position, the event and what was expected', () => {
    expect(
      diagnosticMessage({
        kind: 'unexpected-token',
        position: 2,
        found: 'PIS',
        expected: ['CRI', 'HAL'],
      }),
    ).toBe('Posición 2 (evento 3): se encontró PIS; se esperaba: CRI, HAL.');
  });

  it('a tag outside Σ, and a story that ends too soon', () => {
    expect(
      diagnosticMessage({ kind: 'unknown-symbol', position: 1, found: 'XYZ', expected: [] }),
    ).toBe('Posición 1 (evento 2): XYZ no es una etiqueta de este género.');
    expect(
      diagnosticMessage({ kind: 'unexpected-end', position: 2, found: null, expected: ['REV'] }),
    ).toBe('El relato termina antes de completarse (posición 2); se esperaba: REV.');
  });
});
