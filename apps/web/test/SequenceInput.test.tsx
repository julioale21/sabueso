// The story input: palette, free text, unknown tags and examples (SPEC 03, step 5).
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { genres } from '@sabueso/core';
import { SequenceInput } from '../src/components/sequence-input/SequenceInput';
import { splitTags } from '../src/domain/tags';
import { EXAMPLES } from '../src/domain/examples';

const tags = genres[0]?.tags ?? [];

/** The input with its own state, as the view uses it. */
function Harness({ onAnalyze = () => undefined }: { onAnalyze?: () => void }) {
  const [value, setValue] = useState('');
  return (
    <SequenceInput
      tags={tags}
      value={value}
      examples={EXAMPLES}
      onChange={setValue}
      onAnalyze={onAnalyze}
      onClear={() => {
        setValue('');
      }}
    />
  );
}

const field = () => screen.getByRole('textbox', { name: /Relato/ });

describe('SequenceInput', () => {
  it('always shows the 14 tags of the genre with their meaning', () => {
    render(<Harness />);
    const palette = screen.getByRole('group', { name: 'Etiquetas válidas' });
    expect(palette.querySelectorAll('button')).toHaveLength(14);
    expect(screen.getByRole('button', { name: /PIS\s*Pista/ })).toBeInTheDocument();
  });

  it('clicking CRI and then PIS leaves "CRI PIS" in the field', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: /CRI\s*Crimen/ }));
    fireEvent.click(screen.getByRole('button', { name: /PIS\s*Pista/ }));
    expect(field()).toHaveValue('CRI PIS');
  });

  it('typing CRI XYZ REV marks XYZ as unknown, and only XYZ', () => {
    render(<Harness />);
    fireEvent.change(field(), { target: { value: 'CRI XYZ REV' } });
    const marked = screen
      .getAllByRole('listitem')
      .filter((item) => item.hasAttribute('data-unknown'))
      .map((item) => item.textContent);
    expect(marked).toEqual(['XYZ']);
    expect(screen.getByRole('alert')).toHaveTextContent('No son etiquetas de este género: XYZ.');
  });

  it('an example loads its story', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'A1' }));
    expect(field()).toHaveValue('CRI SOS PIS INT REV');
  });

  it('Analizar and Ctrl+Enter ask for the analysis', () => {
    const onAnalyze = vi.fn();
    render(<Harness onAnalyze={onAnalyze} />);
    fireEvent.click(screen.getByRole('button', { name: 'Analizar' }));
    fireEvent.keyDown(field(), { key: 'Enter', ctrlKey: true });
    expect(onAnalyze).toHaveBeenCalledTimes(2);
  });

  it('Limpiar empties the field, and is disabled when there is nothing to clear', () => {
    render(<Harness />);
    const clear = screen.getByRole('button', { name: 'Limpiar' });
    expect(clear).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'A1' }));
    expect(clear).toBeEnabled();
    fireEvent.click(clear);
    expect(field()).toHaveValue('');
    expect(clear).toBeDisabled();
  });

  it('splitTags: any run of spaces or line breaks separates', () => {
    expect(splitTags('  CRI  PIS\nREV ')).toEqual(['CRI', 'PIS', 'REV']);
  });
});
