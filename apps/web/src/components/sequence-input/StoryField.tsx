/** The free text field of the story; Ctrl+Enter (or ⌘+Enter) asks for the analysis. */
import type { KeyboardEvent } from 'react';

export function StoryField({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (input: string) => void;
  onSubmit: () => void;
}) {
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      onSubmit();
    }
  };
  return (
    <label className="block">
      {/* The panel already says "Relato": the label stays for screen readers only. */}
      <span className="sr-only">Relato (etiquetas separadas por espacios)</span>
      <textarea
        value={value}
        rows={2}
        placeholder="Etiquetas separadas por espacios, por ejemplo: CRI SOS PIS INT REV"
        spellCheck={false}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        onKeyDown={handleKeyDown}
        className="w-full rounded border border-slate-300 bg-white p-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
      />
    </label>
  );
}
