// How counts and diagnoses are written on screen (SPEC 03, step 9).
import { describe, expect, it } from 'vitest';
import { createLocalAnalysisService } from '../src/analysis/local-service';
import { stepText } from '../src/domain/cyk';
import { leftmostNonterminal } from '../src/domain/derivation';
import { nonterminalsOf } from '../src/domain/normal-form';
import { stepInterval } from '../src/domain/tree-animation';
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

describe('stepInterval', () => {
  it('builds a short derivation in about 16 seconds, 0.7 to 1.5 s per step', () => {
    expect(stepInterval(18)).toBe(889);
    expect(stepInterval(5)).toBe(1500);
    expect(stepInterval(40)).toBe(700);
  });
});

describe('leftmostNonterminal', () => {
  const alphabet = new Set(['CRI', 'PIS', 'REV']);

  it('is the first symbol outside Σ: the one the next step of the derivation replaces', () => {
    expect(
      leftmostNonterminal({ form: ['CRI', 'MarcoOpc', 'Investigacion', 'Desenlace'], alphabet }),
    ).toBe(1);
  });

  it('is null for a form made only of tags: the derivation is over', () => {
    expect(leftmostNonterminal({ form: ['CRI', 'PIS', 'REV'], alphabet })).toBeNull();
  });
});

describe('nonterminalsOf', () => {
  it('the CYK tree of CRI PIS REV with G1 has the chain X1 and no genre categories like Pasos', async () => {
    const { cyk } = await createLocalAnalysisService().normalFormAndCyk(
      'detective/g1',
      'CRI PIS REV',
    );
    if (cyk.tree === null) {
      throw new Error('CRI PIS REV should be accepted by CYK');
    }
    expect([...nonterminalsOf(cyk.tree)].sort()).toEqual([
      'Desenlace',
      'Investigacion',
      'Planteo',
      'Relato',
      'X1',
    ]);
  });
});

describe('stepText', () => {
  it('explains each length of the CYK table, and that the last one decides', () => {
    expect(stepText({ step: 0, n: 3 })).toBe('La tabla vacía: todavía no se llenó ningún largo.');
    expect(stepText({ step: 1, n: 3 })).toMatch(/^Largo 1: cada etiqueta sola/);
    expect(stepText({ step: 2, n: 3 })).not.toMatch(/decide/);
    expect(stepText({ step: 3, n: 3 })).toMatch(/Es la celda de arriba: decide\.$/);
  });
});
