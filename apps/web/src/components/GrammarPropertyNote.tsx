/** Says that a view shows a property of the grammar, the same for every story. */
export function GrammarPropertyNote({ grammarLabel }: { grammarLabel: string }) {
  return (
    <p className="text-sm text-slate-600 dark:text-slate-400">
      Propiedad de la gramática <strong>{grammarLabel}</strong>: no depende del relato.
    </p>
  );
}
