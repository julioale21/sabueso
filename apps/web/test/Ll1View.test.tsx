// FIRST, FOLLOW and the LL(1) table (SPEC 03, step 11).
import { fireEvent, render, screen, within } from '@testing-library/react';
import { useReducer } from 'react';
import { describe, expect, it } from 'vitest';
import { AnalysisServiceProvider } from '../src/analysis/context';
import { createLocalAnalysisService } from '../src/analysis/local-service';
import { appReducer, createInitialState } from '../src/state/app-state';
import { Ll1View } from '../src/views/Ll1View';

const service = createLocalAnalysisService();

function Harness() {
  const [state, dispatch] = useReducer(appReducer, null, createInitialState);
  return (
    <AnalysisServiceProvider value={service}>
      <Ll1View state={state} dispatch={dispatch} />
    </AnalysisServiceProvider>
  );
}

const table = () => screen.getByRole('table', { name: 'Tabla predictiva M[A, a]' });

/** The cell M[A, a]: the row of A, the column of a. */
function cell(nonterminal: string, terminal: string): HTMLElement {
  const headers = within(table())
    .getAllByRole('columnheader')
    .map((header) => header.textContent);
  const row = within(table()).getByRole('rowheader', { name: nonterminal }).closest('tr');
  const cells = row?.querySelectorAll('td') ?? [];
  return cells[headers.indexOf(terminal) - 1] as HTMLElement;
}

describe('Ll1View', () => {
  it('G1: LL(1) ✓, no conflicts, and M[Planteo, CRI] = Hecho MarcoOpc', async () => {
    render(<Harness />);
    expect(await screen.findByText('LL(1) ✓')).toBeInTheDocument();
    expect(table().querySelectorAll('[data-conflict]')).toHaveLength(0);
    expect(cell('Planteo', 'CRI')).toHaveTextContent('Hecho MarcoOpc');
    expect(cell('MarcoOpc', 'ENC')).toHaveTextContent('ε');
  });

  it('G0: 13 conflicts, and the cell (Linea, SOS) is one of them (SPEC 03, section 7)', async () => {
    render(<Harness />);
    fireEvent.change(await screen.findByRole('combobox', { name: 'Gramática' }), {
      target: { value: 'detective/g0' },
    });
    expect(screen.getByText('13 conflictos')).toBeInTheDocument();
    expect(cell('Linea', 'SOS')).toHaveAttribute('data-conflict', 'true');
    expect(screen.getByRole('list', { name: 'Conflictos' })).toHaveTextContent(
      'M[Linea, SOS]: Linea → SOS',
    );
  });

  it('FIRST and FOLLOW of G1: Relato starts like Planteo and is followed by $', async () => {
    render(<Harness />);
    const sets = await screen.findByRole('table', { name: 'FIRST y FOLLOW' });
    const relato = within(sets).getByRole('rowheader', { name: 'Relato' }).closest('tr');
    expect(relato).toHaveTextContent('Relato{CRI, HAL, CTX, PER}{$}');
  });
});
