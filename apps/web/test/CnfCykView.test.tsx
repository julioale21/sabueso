// FNC y CYK: the six steps, the triangular table and the two trees (SPEC 03, step 12).
import { parseGrammarText } from '@sabueso/core';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AnalysisServiceProvider } from '../src/analysis/context';
import { createLocalAnalysisService } from '../src/analysis/local-service';
import { stepChanges } from '../src/domain/normal-form';
import { createInitialState } from '../src/state/app-state';
import { CnfCykView } from '../src/views/CnfCykView';
import { noAnalysis } from './no-analysis';

const service = createLocalAnalysisService();

function renderView({ input, grammarId = 'detective/g1' }: { input: string; grammarId?: string }) {
  const state = { ...createInitialState(), input, analyzedInput: input, grammarId };
  render(
    <AnalysisServiceProvider value={service}>
      <CnfCykView state={state} dispatch={() => undefined} analysis={noAnalysis} />
    </AnalysisServiceProvider>,
  );
}

describe('CnfCykView', () => {
  it('lists the six steps in order, and G1 ends with 78 productions', async () => {
    renderView({ input: 'CRI PIS REV' });
    expect(
      await screen.findByRole('region', { name: /Forma normal de Chomsky/ }),
    ).toHaveAccessibleName(/a 78 producciones/);
    for (const name of ['START', 'DEL', 'UNIT', 'USELESS', 'TERM', 'BIN']) {
      expect(screen.getByText(new RegExp(`^\\d\\. ${name}$`))).toBeInTheDocument();
    }
  });

  it('CRI PIS REV: the top cell holds Relato, and T[1][2] holds X1', async () => {
    renderView({ input: 'CRI PIS REV' });
    const table = await screen.findByRole('table', { name: 'Tabla CYK' });
    const goal = table.querySelector('[data-goal]');
    expect(goal?.textContent).toContain('Relato');
    const rowOfTwo = within(table).getByRole('row', { name: /l = 2/ });
    expect(within(rowOfTwo).getAllByRole('cell')[1]).toHaveTextContent('X1');
    expect(screen.getByRole('status')).toHaveTextContent('✓ Aceptado: Relato en T[0][3].');
  });

  it('draws both trees and names the categories only Earley keeps', async () => {
    renderView({ input: 'CRI PIS REV' });
    expect(await screen.findByRole('region', { name: 'Árbol de CYK' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Árbol de Earley' })).toBeInTheDocument();
    // UNIT and DEL remove Pasos and the optional parts; BIN adds the chain X1.
    expect(screen.getByText(/Solo en el árbol de Earley/).parentElement).toHaveTextContent('Pasos');
    expect(screen.getByText(/Solo en el árbol de CYK/).parentElement).toHaveTextContent('X1');
  });

  it('a rejected story has a table but no trees', async () => {
    renderView({ input: 'CTX PER PIS REV' });
    expect(await screen.findByRole('status')).toHaveTextContent('✗ Rechazado');
    expect(screen.getByRole('table', { name: 'Tabla CYK' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Árbol de CYK' })).not.toBeInTheDocument();
  });

  it('the empty story has no cells and is decided by S → ε', async () => {
    renderView({ input: '' });
    expect(await screen.findByText(/la tabla no tiene celdas/)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

describe('stepChanges', () => {
  it('compares the productions as text', () => {
    const grammar = (text: string) => parseGrammarText({ text, name: 'test' });
    expect(
      stepChanges({ before: grammar("S -> A\nA -> 'a'"), after: grammar("S -> 'a'\nA -> 'a'") }),
    ).toEqual({ added: ['S → a'], removed: ['S → A'] });
  });
});

describe('the CYK table filling by length (step 18)', () => {
  const states = () =>
    [...document.querySelectorAll('td[data-state]')].map((cell) => cell.getAttribute('data-state'));

  it('step by step, row l fills after the shorter rows, up to the top cell', async () => {
    renderView({ input: 'CRI PIS REV' });
    await screen.findByRole('table', { name: 'Tabla CYK' });
    fireEvent.click(screen.getByRole('button', { name: 'Al principio' }));
    expect(screen.getByText('largo 0/3')).toBeInTheDocument();
    expect(states().every((state) => state === 'pending')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Paso siguiente' }));
    expect(screen.getByText(/Largo 1: cada etiqueta sola/)).toBeInTheDocument();
    // Rows from the top: l = 3 (1 cell), l = 2 (2 cells), l = 1 (3 cells).
    expect(states()).toEqual(['pending', 'pending', 'pending', 'current', 'current', 'current']);
    fireEvent.click(screen.getByRole('button', { name: 'Al final' }));
    expect(states().every((state) => state === 'done')).toBe(true);
    expect(screen.getByText(/Es la celda de arriba: decide/)).toBeInTheDocument();
  });

  it('with motion allowed, it starts empty and fills by itself', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query }));
    try {
      renderView({ input: 'CRI PIS REV' });
      await screen.findByRole('table', { name: 'Tabla CYK' });
      expect(screen.getByText('largo 0/3')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Pausa/ })).toBeInTheDocument();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
