// The Earley items left open where a story fails (SPEC 03, step 18).
import { describe, expect, it } from 'vitest';
import { createLocalAnalysisService } from '../src/analysis/local-service';
import { openItemsAt } from '../src/domain/open-items';

const service = createLocalAnalysisService();

async function openItemsOf(input: string) {
  const result = await service.analyze('detective/g1', input);
  if (result.accepted) {
    throw new Error(`${input} should be rejected`);
  }
  return openItemsAt({ chart: result.chart, error: result.error });
}

describe('openItemsAt', () => {
  it('I1: the setting is complete, so Planteo waits for the crime in S2', async () => {
    expect(await openItemsOf('CTX PER PIS REV')).toEqual({
      set: 2,
      started: [{ text: 'Planteo → Marco • Hecho, 0' }],
      waiting: [{ text: 'Hecho → • CRI HallazgoOpc, 2' }, { text: 'Hecho → • HAL, 2' }],
    });
  });

  it('the empty story: nothing started, only what a story can begin with', async () => {
    const open = await openItemsOf('');
    expect(open?.started).toEqual([]);
    expect(open?.waiting.map((item) => item.text)).toEqual([
      'Hecho → • CRI HallazgoOpc, 0',
      'Hecho → • HAL, 0',
      'Marco → • CTX PerOpc, 0',
      'Marco → • PER CtxOpc, 0',
    ]);
  });

  it('a tag outside Σ stops before Earley: no chart, no open items', async () => {
    expect(await openItemsOf('CRI XYZ')).toBeNull();
  });
});
