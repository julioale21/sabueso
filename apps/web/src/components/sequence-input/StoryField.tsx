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
      <span className="mb-1 block text-sm text-slate-600 dark:text-slate-400">
        Relato (etiquetas separadas por espacios)
      </span>
      <textarea
        value={value}
        rows={2}
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
