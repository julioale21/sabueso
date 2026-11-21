// The Analysis view end to end, with the real core (SPEC 03, step 9).
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../src/App';

/** Types a story, picks a grammar and analyzes it, as a user would. */
async function analyze({
  input,
  grammar,
}: {
  input: string;
  grammar: 'detective/g1' | 'detective/g0';
}) {
  render(<App />);
  const field = await screen.findByRole('textbox', { name: /Relato/ });
  fireEvent.change(screen.getByRole('combobox', { name: 'Gramática' }), {
    target: { value: grammar },
  });
  fireEvent.change(field, { target: { value: input } });
  fireEvent.click(screen.getByRole('button', { name: 'Analizar' }));
  return screen.findByRole('status');
}

describe('App', () => {
  it('shows the title', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Sabueso' })).toBeInTheDocument();
  });

  it('A1 with G0: accepted, 4 trees, and the trees 2 and 3 can be browsed', async () => {
    const verdict = await analyze({ input: 'CRI SOS PIS INT REV', grammar: 'detective/g0' });
    expect(verdict).toHaveTextContent('✓ Aceptado · 4 árboles (se muestran 3)');
    expect(verdict).toHaveTextContent('la gramática es ambigua para este relato');
    expect(screen.getByText('árbol 1/3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Árbol siguiente' }));
    expect(screen.getByText('árbol 2/3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Árbol siguiente' }));
    expect(screen.getByText('árbol 3/3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Árbol siguiente' })).toBeDisabled();
  });

  it('A1 with G1: one tree and its 18-step derivation, without a pager', async () => {
    const verdict = await analyze({ input: 'CRI SOS PIS INT REV', grammar: 'detective/g1' });
    expect(verdict).toHaveTextContent('✓ Aceptado · 1 árbol');
    expect(screen.queryByText(/árbol 1\//)).toBeNull();
    expect(screen.getByText('Derivación más a la izquierda (18 pasos)')).toBeInTheDocument();
  });

  it('I1 with G1: rejected, the third event marked, expecting CRI or HAL', async () => {
    const verdict = await analyze({ input: 'CTX PER PIS REV', grammar: 'detective/g1' });
    expect(verdict).toHaveTextContent('✗ Rechazado');
    expect(
      screen.getByText('Posición 2 (evento 3): se encontró PIS; se esperaba: CRI, HAL.'),
    ).toBeInTheDocument();
    const marked = screen
      .getByRole('list', { name: 'Relato con el error marcado' })
      .querySelector('[aria-current]');
    expect(marked).toHaveTextContent('PIS');
  });

  it('changing the grammar redoes the last analysis', async () => {
    await analyze({ input: 'CRI SOS PIS INT REV', grammar: 'detective/g1' });
    fireEvent.change(screen.getByRole('combobox', { name: 'Gramática' }), {
      target: { value: 'detective/g0' },
    });
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('4 árboles');
    });
  });
});
