/**
 * The CYK table filling by length (SPEC 03, step 18): step l fills row l, the substrings of l
 * tags, using only the shorter rows below; the last step reaches the top cell, T[0][n].
 */
import { usePlayer } from '../../player/use-player';
import { usePrefersReducedMotion } from '../../utils/use-prefers-reduced-motion';
import { PlayerControls } from '../player/PlayerControls';
import { CykTable } from './CykTable';

/** Milliseconds per row: slow enough to read each row. */
const ROW_INTERVAL = 1500;

/** What step l does, in words. */
function stepText({ step, n }: { step: number; n: number }): string {
  if (step === 0) {
    return 'La tabla vacía: todavía no se llenó ningún largo.';
  }
  if (step === 1) {
    return 'Largo 1: cada etiqueta sola, con las producciones A → a.';
  }
  const done = step === n ? ' Es la celda de arriba: decide.' : '';
  return `Largo ${step}: cada pedazo de ${step} etiquetas, partido en dos con A → B C, usando las filas de abajo.${done}`;
}

export function CykPlayer({
  table,
  tokens,
}: {
  table: readonly (readonly ReadonlySet<string>[])[];
  tokens: readonly string[];
}) {
  const n = tokens.length;
  const animates = !usePrefersReducedMotion();
  const player = usePlayer({
    last: n,
    initialInterval: ROW_INTERVAL,
    initialStep: animates ? 0 : n,
    autoplay: animates,
  });
  return (
    <div className="space-y-2">
      <PlayerControls player={player} unit="largo" />
      <p className="text-sm">{stepText({ step: player.step, n })}</p>
      <CykTable table={table} tokens={tokens} filled={player.step} />
    </div>
  );
}
