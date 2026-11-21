// Autómata de pila: the definition, the verdict and the accepting path (SPEC 03, step 13).
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AnalysisServiceProvider } from '../src/analysis/context';
import { createLocalAnalysisService } from '../src/analysis/local-service';
import { inputLeft, stackText } from '../src/domain/pushdown';
import { createInitialState } from '../src/state/app-state';
import { PdaView } from '../src/views/PdaView';

const service = createLocalAnalysisService();

function renderView({ input, grammarId = 'detective/g1' }: { input: string; grammarId?: string }) {
  const state = { ...createInitialState(null), input, analyzedInput: input, grammarId };
  render(
    <AnalysisServiceProvider value={service}>
      <PdaView state={state} dispatch={() => undefined} />
    </AnalysisServiceProvider>,
  );
}

const rowsOfPath = () =>
  within(screen.getByRole('table', { name: 'Camino de aceptación' }))
    .getAllByRole('row')
    .slice(1);

describe('PdaView', () => {
  it('CRI PIS REV with G1: accepted after 23 configurations, by a path of 17 transitions', async () => {
    renderView({ input: 'CRI PIS REV' });
    expect(await screen.findByRole('status')).toHaveTextContent(
      '✓ Aceptado: la pila queda vacía después de leer todo el relato · 23 configuraciones exploradas.',
    );
    expect(screen.getByText(/\|δ\| = 54 \(40 expandir, 14 emparejar\)/)).toBeInTheDocument();
    const rows = rowsOfPath();
    expect(rows).toHaveLength(18);
    expect(rows[0]).toHaveTextContent('0CRI PIS REVRelato— (inicio)');
    expect(rows[4]).toHaveTextContent('emparejar CRI');
    expect(rows[17]).toHaveTextContent('17εεexpandir (33) EpiOpc → ε');
  });

  it('marks the 17 transitions the path uses', async () => {
    renderView({ input: 'CRI PIS REV' });
    await screen.findByRole('status');
    expect(screen.getByText(/17 usadas en el camino/)).toBeInTheDocument();
    expect(document.querySelectorAll('li[data-used]')).toHaveLength(17);
  });

  it('the player pushes and pops the stack step by step', async () => {
    renderView({ input: 'CRI PIS REV' });
    const stack = () =>
      within(screen.getByRole('list', { name: 'Pila' }))
        .getAllByRole('listitem')
        .map((cell) => cell.textContent);
    expect(await screen.findByText('paso 0/17')).toBeInTheDocument();
    expect(stack()).toEqual(['Relato']);
    fireEvent.click(screen.getByRole('button', { name: 'Paso siguiente' }));
    expect(stack()).toEqual(['Planteo', 'Investigacion', 'Desenlace']);
    expect(document.querySelectorAll('li[data-new]')).toHaveLength(3);
    fireEvent.click(rowsOfPath()[4] as HTMLElement);
    expect(screen.getByText(/Emparejar: sale CRI/)).toBeInTheDocument();
    expect(rowsOfPath()[4]).toHaveAttribute('aria-current', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Al final' }));
    expect(stack()).toEqual(['vacía (ε)']);
  });

  it('a rejected story has no accepting path', async () => {
    renderView({ input: 'CTX PER PIS REV' });
    expect(await screen.findByRole('status')).toHaveTextContent('✗ Rechazado');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('asks for a shorter story above 10 tags', () => {
    renderView({ input: 'CRI PIS PIS PIS PIS PIS PIS PIS PIS PIS REV' });
    expect(screen.getByText(/tiene 11 etiquetas/)).toBeInTheDocument();
  });
});

describe('pushdown text', () => {
  it('writes the empty stack and the end of the input as ε', () => {
    expect(stackText([])).toBe('ε');
    expect(inputLeft({ tokens: ['CRI', 'REV'], position: 2 })).toBe('ε');
    expect(inputLeft({ tokens: ['CRI', 'REV'], position: 1 })).toBe('REV');
  });
});
