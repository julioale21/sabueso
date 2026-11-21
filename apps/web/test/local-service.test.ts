// The AnalysisService that runs the core in the browser (SPEC 03, step 3).
import { describe, expect, it } from 'vitest';
import { createLocalAnalysisService } from '../src/analysis/local-service';

const service = createLocalAnalysisService();

describe('createLocalAnalysisService', () => {
  it('loads the grammars of the catalog: G1 and G0 of the detective story, with Σ and analysis', async () => {
    const { genres, grammars } = await service.grammars();
    expect(genres.map((genre) => genre.id)).toEqual(['detective']);
    expect(grammars.map((grammar) => grammar.id)).toEqual(['detective/g1', 'detective/g0']);
    const [g1, g0] = grammars;
    expect(g1?.alphabet).toHaveLength(14);
    expect(g1?.text).toContain('Relato        -> Planteo Investigacion Desenlace');
    expect(g1?.analysis.predictiveTable.isPredictive).toBe(true);
    expect(g0?.analysis.predictiveTable.isPredictive).toBe(false);
  });

  it('analyze: A1 with G0 counts 4 trees and builds the first 3', async () => {
    const result = await service.analyze('detective/g0', 'CRI SOS PIS INT REV');
    expect(result.accepted).toBe(true);
    if (result.accepted) {
      expect(result.treeCount).toBe(4n);
      expect(result.trees).toHaveLength(3);
      expect(result.trace).toEqual([]);
    }
  });

  it('analyze: I1 with G1 is rejected at position 2, expecting CRI or HAL', async () => {
    const result = await service.analyze('detective/g1', 'CTX PER PIS REV');
    expect(result.accepted).toBe(false);
    if (!result.accepted) {
      expect(result.error).toMatchObject({ position: 2, found: 'PIS', expected: ['CRI', 'HAL'] });
    }
  });

  it('trace: records every step of Earley', async () => {
    const result = await service.trace('detective/g1', 'CRI PIS REV');
    expect(result.trace.length).toBeGreaterThan(0);
  });

  it('normalFormAndCyk, pushdown, ambiguity and compare call the core', async () => {
    const { normalForm, cyk } = await service.normalFormAndCyk('detective/g1', 'CRI PIS REV');
    expect(normalForm.grammar.productions).toHaveLength(78);
    expect(cyk.accepted).toBe(true);
    const { automaton, run } = await service.pushdown('detective/g1', 'CRI PIS REV');
    expect(automaton.transitions).toHaveLength(54);
    expect(run.result).toBe('accept');
    expect((await service.ambiguity('detective/g0', 4))?.sentence).toEqual([
      'CRI',
      'SOS',
      'ATQ',
      'REV',
    ]);
    expect((await service.compare('detective/g0', 'detective/g1', 3)).onlyInFirst).toEqual([
      ['CRI', 'DSC', 'REV'],
      ['HAL', 'DSC', 'REV'],
    ]);
  });

  it('rejects an unknown grammar id: there is no way to analyze an arbitrary grammar', async () => {
    await expect(service.analyze('arithmetic', 'id')).rejects.toThrow(
      'Unknown grammar "arithmetic"',
    );
  });
});
