/** The name of the program, the question it answers, and a way back to the initial state. */
import { Button } from './ui/Button';

export function AppHeader({ onReset }: { onReset: () => void }) {
  return (
    <header className="mb-4 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Sabueso</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          ¿El relato respeta la estructura del policial de enigma? Una gramática libre de contexto y
          el analizador de Earley lo deciden.
        </p>
      </div>
      <Button
        variant="secondary"
        title="Vuelve al estado inicial: G1, relato vacío y sin resultados"
        onClick={onReset}
      >
        Reiniciar
      </Button>
    </header>
  );
}
