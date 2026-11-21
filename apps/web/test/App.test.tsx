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

  it('splits the tabs in two groups: about the story and about the grammar', () => {
    render(<App />);
    const tabsOf = (group: string) =>
      Array.from(
        screen.getByRole('group', { name: group }).querySelectorAll('[role="tab"]'),
        (tab) => tab.firstChild?.textContent,
      );
    expect(tabsOf('Sobre el relato')).toEqual([
      'Análisis',
      'Earley paso a paso',
      'FNC y CYK',
      'Autómata de pila',
    ]);
    expect(tabsOf('Sobre la gramática')).toEqual(['LL(1)', 'G0 vs G1']);
  });

  it('Analizar is busy for a moment, and then the result appears', async () => {
    render(<App />);
    fireEvent.change(await screen.findByRole('textbox', { name: /Relato/ }), {
      target: { value: 'CRI PIS REV' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Analizar' }));
    expect(screen.getByRole('button', { name: /Analizando/ })).toBeDisabled();
    expect(screen.queryByRole('region', { name: 'Resultado' })).not.toBeInTheDocument();
    expect(await screen.findByRole('region', { name: 'Resultado' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Analizar' })).toBeEnabled();
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
    expect(
      screen.getByRole('region', { name: 'Estructuras empezadas que no pudieron seguir' }),
    ).toHaveTextContent('Planteo → Marco • Hecho, 0');
  });

  it('the empty story is analyzed: ε is not in L(G1), and it says what a story can start with', async () => {
    render(<App />);
    await screen.findByRole('textbox', { name: /Relato/ });
    fireEvent.click(screen.getByRole('button', { name: 'Analizar' }));
    expect(await screen.findByRole('status')).toHaveTextContent('✗ Rechazado');
    expect(screen.getByText('ε (relato vacío)')).toBeInTheDocument();
    expect(screen.getByText(/se esperaba: CRI, CTX, HAL, PER/)).toBeInTheDocument();
  });

  it('Limpiar resets the story and the result', async () => {
    await analyze({ input: 'CRI PIS REV', grammar: 'detective/g1' });
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar' }));
    expect(screen.getByRole('textbox', { name: /Relato/ })).toHaveValue('');
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('region', { name: 'Resultado' })).not.toBeInTheDocument();
  });

  it('Reiniciar goes back to the initial state: G1, empty story, no result, first tab', async () => {
    await analyze({ input: 'CRI SOS PIS INT REV', grammar: 'detective/g0' });
    fireEvent.click(screen.getByRole('button', { name: 'Reiniciar' }));
    expect(await screen.findByRole('textbox', { name: /Relato/ })).toHaveValue('');
    expect(screen.getByRole('combobox', { name: 'Gramática' })).toHaveValue('detective/g1');
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('tab', { name: 'Análisis' })).toHaveAttribute('aria-selected', 'true');
  });

  it('Analizar enables the tabs about the story, and they use the analyzed story', async () => {
    await analyze({ input: 'CRI PIS REV', grammar: 'detective/g1' });
    fireEvent.change(screen.getByRole('textbox', { name: /Relato/ }), {
      target: { value: 'CRI SOS PIS INT REV' },
    });
    const earley = screen.getByRole('tab', { name: 'Earley paso a paso' });
    expect(earley).toBeEnabled();
    fireEvent.click(earley);
    expect(await screen.findByText('CRI PIS REV')).toBeInTheDocument();
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
