/** Analizar (also Ctrl+Enter), busy while analyzing, and Limpiar, which resets the story and its result. */
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';

export function AnalyzeActions({
  canClear,
  isAnalyzing,
  onAnalyze,
  onClear,
}: {
  /** False when there is nothing to clear. */
  canClear: boolean;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="primary" disabled={isAnalyzing} aria-busy={isAnalyzing} onClick={onAnalyze}>
        {isAnalyzing ? (
          <span className="flex items-center gap-2">
            <Spinner /> Analizando…
          </span>
        ) : (
          'Analizar'
        )}
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
