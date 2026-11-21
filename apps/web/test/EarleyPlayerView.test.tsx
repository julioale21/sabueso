// Earley step by step: the sets fill up event by event (SPEC 03, step 10).
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AnalysisServiceProvider } from '../src/analysis/context';
import { createLocalAnalysisService } from '../src/analysis/local-service';
import { chartAfter, splitItem } from '../src/domain/earley-events';
import { createInitialState } from '../src/state/app-state';
import { EarleyPlayerView } from '../src/views/EarleyPlayerView';

const service = createLocalAnalysisService();

function renderPlayer({
  input,
  grammarId = 'detective/g1',
}: {
  input: string;
  grammarId?: string;
}) {
  const state = { ...createInitialState(), input, analyzedInput: input, grammarId };
  render(
    <AnalysisServiceProvider value={service}>
      <EarleyPlayerView state={state} dispatch={() => undefined} />
    </AnalysisServiceProvider>,
  );
}

const itemsOf = (set: string) =>
  within(screen.getByRole('region', { name: set })).queryAllByRole('listitem');

describe('EarleyPlayerView', () => {
  it('step 0 shows only the initial item in S0', async () => {
    renderPlayer({ input: 'CRI PIS REV' });
    expect(await screen.findByText('evento 0/53')).toBeInTheDocument();
    expect(itemsOf('S0').map((item) => item.textContent)).toEqual(['$S → • Relato0']);
    expect(itemsOf('S1')).toHaveLength(0);
  });

  it('at the end, the chart of CRI PIS REV has 8, 19, 16 and 11 items, and accepts', async () => {
    renderPlayer({ input: 'CRI PIS REV' });
    fireEvent.click(await screen.findByRole('button', { name: 'Al final' }));
    expect(['S0', 'S1', 'S2', 'S3'].map((set) => itemsOf(set).length)).toEqual([8, 19, 16, 11]);
    expect(screen.getByRole('status')).toHaveTextContent('✓ Aceptado: $S → Relato • está en S3.');
  });

  it('the next step adds one item, highlighted, and explains it', async () => {
    renderPlayer({ input: 'CRI PIS REV' });
    fireEvent.click(await screen.findByRole('button', { name: 'Paso siguiente' }));
    expect(screen.getByText(/Predictor/)).toBeInTheDocument();
    const current = itemsOf('S0').find((item) => item.hasAttribute('aria-current'));
    expect(current).toHaveTextContent('Relato → • Planteo Investigacion Desenlace');
  });

  it('A1 with G1: the last event happens in S5 (SPEC 03, section 7)', async () => {
    renderPlayer({ input: 'CRI SOS PIS INT REV' });
    fireEvent.click(await screen.findByRole('button', { name: 'Al final' }));
    expect(screen.getByRole('region', { name: 'S5' }).className).toContain('border-indigo');
  });

  it('I1 is rejected: the chart stops filling after the error', async () => {
    renderPlayer({ input: 'CTX PER PIS REV' });
    fireEvent.click(await screen.findByRole('button', { name: 'Al final' }));
    expect(itemsOf('S3')).toHaveLength(0);
    expect(screen.getByRole('status')).toHaveTextContent(
      '✗ Rechazado: $S → Relato • no está en S4.',
    );
  });

  it('says which story and grammar it traces, and where they are changed', async () => {
    renderPlayer({ input: 'CRI PIS REV' });
    expect(await screen.findByText('CRI PIS REV')).toBeInTheDocument();
    expect(screen.getByText(/Relato analizado/)).toBeInTheDocument();
    expect(screen.getByText(/Gramática: G1 · oficial/)).toBeInTheDocument();
    expect(screen.getByText('(se cambian en la pestaña Análisis)')).toBeInTheDocument();
  });

  it('the empty story: 7 predictions in S0, what a story can start with, and rejected', async () => {
    renderPlayer({ input: '' });
    fireEvent.click(await screen.findByRole('button', { name: 'Al final' }));
    expect(screen.getByText('evento 7/7')).toBeInTheDocument();
    expect(itemsOf('S0')).toHaveLength(8);
    expect(screen.getByRole('status')).toHaveTextContent(
      '✗ Rechazado: $S → Relato • no está en S0.',
    );
  });

  it('a story longer than 15 tags asks to shorten it', () => {
    renderPlayer({ input: Array.from({ length: 16 }, () => 'PIS').join(' ') });
    expect(screen.getByText(/acorta la entrada a 15 o menos/)).toBeInTheDocument();
  });

  it('splitItem and chartAfter group the trace by set', () => {
    expect(splitItem('Hecho → CRI • HallazgoOpc, 0')).toEqual({
      rule: 'Hecho → CRI • HallazgoOpc',
      origin: '0',
    });
    const sets = chartAfter({
      events: [{ set: 0, op: 'predict', item: 'A → • a, 0', cause: '$S → • A, 0', isNew: true }],
      step: 1,
      setCount: 2,
      start: 'A',
    });
    expect(sets.map((set) => set.map((entry) => entry.rule))).toEqual([
      ['$S → • A', 'A → • a'],
      [],
    ]);
  });
});
