/** Analizar (also Ctrl+Enter) and Limpiar, which resets the story and its result. */
import { Button } from '../ui/Button';

export function AnalyzeActions({
  canClear,
  onAnalyze,
  onClear,
}: {
  /** False when there is nothing to clear. */
  canClear: boolean;
  onAnalyze: () => void;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="primary" onClick={onAnalyze}>
        Analizar
      </Button>
      <Button
        variant="ghost"
        disabled={!canClear}
        title="Borra el relato y el resultado"
        onClick={onClear}
      >
        Limpiar
      </Button>
      <span className="text-xs text-slate-500">o Ctrl+Enter</span>
    </div>
  );
}
