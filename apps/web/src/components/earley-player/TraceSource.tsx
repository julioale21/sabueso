/** Which story and grammar the trace is about; both are chosen in the Analysis tab. */
export function TraceSource({ input, grammarLabel }: { input: string; grammarLabel: string }) {
  return (
    <p className="text-sm text-slate-600 dark:text-slate-400">
      Relato: <code className="font-mono">{input.trim() === '' ? 'ε (relato vacío)' : input}</code>{' '}
      · Gramática: {grammarLabel}{' '}
      <span className="text-slate-500">(se cambian en la pestaña Análisis)</span>
    </p>
  );
}
