/** The .grammar file as written, read-only: what the story is analyzed against. */
export function GrammarText({ text }: { text: string }) {
  return (
    <pre
      aria-label="Gramática activa"
      className="max-h-72 overflow-auto rounded bg-slate-50 p-3 text-xs leading-relaxed dark:bg-slate-900"
    >
      {text}
    </pre>
  );
}
