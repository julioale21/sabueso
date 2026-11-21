// The grammar panel: selector, summary and read-only text (SPEC 03, step 6).
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { createLocalAnalysisService } from '../src/analysis/local-service';
import type { Catalog } from '../src/analysis/use-grammars';
import { GrammarPanel } from '../src/components/grammar-panel/GrammarPanel';
import { grammarOptionsOf } from '../src/domain/grammar-options';

const catalog: Catalog = await createLocalAnalysisService().grammars();

function Harness() {
  const [grammarId, setGrammarId] = useState('detective/g1');
  return (
    <GrammarPanel
      catalog={catalog}
      genreId="detective"
      grammarId={grammarId}
      onSelect={(choice) => {
        setGrammarId(choice.grammarId);
      }}
    />
  );
}

const summary = () => screen.getByRole('list', { name: 'Resumen del análisis' });

describe('GrammarPanel', () => {
  it('G1: LL(1) ✓, its numbers and its text, read-only', () => {
    render(<Harness />);
    expect(summary()).toHaveTextContent('LL(1) ✓');
    expect(summary()).toHaveTextContent('anulables: 10');
    expect(summary()).toHaveTextContent('inútiles: 0');
    const text = screen.getByLabelText('Gramática activa');
    expect(text.tagName).toBe('PRE');
    expect(text).toHaveTextContent('Relato -> Planteo Investigacion Desenlace');
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('choosing G0 shows LL(1) ✗ with its 13 conflicts', () => {
    render(<Harness />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Gramática' }), {
      target: { value: 'detective/g0' },
    });
    expect(summary()).toHaveTextContent('LL(1) ✗ · 13 conflictos');
  });

  it('offers only the grammars of the genre: G1 official and G0 alternative', () => {
    render(<Harness />);
    const options = [
      ...screen.getByRole('combobox', { name: 'Gramática' }).querySelectorAll('option'),
    ];
    expect(options.map((option) => option.textContent)).toEqual([
      'G1 · oficial',
      'G0 · alternativa',
    ]);
    expect(screen.getByRole('combobox', { name: 'Género' })).toHaveDisplayValue(
      'Policial de enigma',
    );
  });

  it('grammarOptionsOf lists the official grammar first', () => {
    const genre = catalog.genres[0];
    expect(genre && grammarOptionsOf(genre)).toEqual([
      { id: 'detective/g1', label: 'G1 · oficial' },
      { id: 'detective/g0', label: 'G0 · alternativa' },
    ]);
  });
});
