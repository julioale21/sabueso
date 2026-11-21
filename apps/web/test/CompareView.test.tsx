// G0 vs G1: ambiguity witnesses and the bounded comparison of languages (SPEC 03, step 14).
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AnalysisServiceProvider } from '../src/analysis/context';
import { createLocalAnalysisService } from '../src/analysis/local-service';
import { sentenceText, treeCountText } from '../src/domain/bounded';
import { createInitialState } from '../src/state/app-state';
import { CompareView } from '../src/views/CompareView';

const service = createLocalAnalysisService();

function renderView(value = service) {
  render(
    <AnalysisServiceProvider value={value}>
      <CompareView state={createInitialState()} dispatch={() => undefined} />
    </AnalysisServiceProvider>,
  );
}

const sentencesOf = (list: string) =>
  within(screen.getByRole('region', { name: list }))
    .queryAllByRole('listitem')
    .map((item) => item.textContent);

describe('CompareView', () => {
  it('k = 3: exactly CRI DSC REV and HAL DSC REV are only in G0, and no witness yet', async () => {
    renderView();
    expect(await screen.findByRole('status')).toHaveTextContent('L(G0) ≠ L(G1)');
    expect(sentencesOf('Relatos que solo genera G0')).toEqual(['CRI DSC REV', 'HAL DSC REV']);
    expect(sentencesOf('Relatos que solo genera G1')).toEqual([]);
    expect(screen.getByRole('region', { name: /Ambigüedad de G0/ })).toHaveTextContent(
      'sin testigo hasta k = 3',
    );
  });

  it('k = 4: G0 has the witness CRI SOS ATQ REV, G1 still none', async () => {
    renderView();
    await screen.findByRole('status');
    fireEvent.click(screen.getByRole('button', { name: '4' }));
    expect(await screen.findByText('CRI SOS ATQ REV', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /Ambigüedad de G0/ })).toHaveTextContent(
      'tiene 2 árboles',
    );
    expect(screen.getByRole('region', { name: /Ambigüedad de G1/ })).toHaveTextContent(
      'sin testigo hasta k = 4',
    );
  });

  it('long lists show the first 20 and count the rest', async () => {
    renderView();
    await screen.findByRole('status');
    fireEvent.click(screen.getByRole('button', { name: '4' }));
    await screen.findByText('CRI SOS ATQ REV', { selector: 'span' });
    expect(
      screen.getByRole('heading', { name: 'Relatos que solo genera G0 (35)' }),
    ).toBeInTheDocument();
    expect(screen.getByText('y 15 más')).toBeInTheDocument();
  });
});

describe('CompareView searches', () => {
  it('searches once per k, not again after each result (an effect loop hung the tab)', async () => {
    const compare = vi.fn((...args: Parameters<typeof service.compare>) =>
      service.compare(...args),
    );
    const counted = { ...service, compare };
    renderView(counted);
    await screen.findByRole('status');
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(compare).toHaveBeenCalledTimes(1);
  });
});

describe('bounded text', () => {
  it('writes sentences and counts', () => {
    expect(sentenceText([])).toBe('ε');
    expect(treeCountText(2n)).toBe('2 árboles');
    expect(treeCountText('infinite')).toBe('infinitos árboles');
  });
});
