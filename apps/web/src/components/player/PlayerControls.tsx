/** ⏮ ◀ ▶/⏸ ▶ ⏭, the speed and the position: the controls of any step-by-step player. */
import type { Player } from '../../player/use-player';
import { Button } from '../ui/Button';

export function PlayerControls({ player, unit }: { player: Player; unit: string }) {
  const { step, last, isPlaying } = player;
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-sm">
      <Button
        size="sm"
        aria-label="Al principio"
        disabled={step === 0}
        onClick={() => player.goTo(0)}
      >
        ⏮
      </Button>
      <Button
        size="sm"
        aria-label="Paso anterior"
        disabled={step === 0}
        onClick={() => player.move(-1)}
      >
        ◀
      </Button>
      <Button
        size="sm"
        variant="primary"
        disabled={last === 0}
        onClick={isPlaying ? player.pause : player.play}
      >
        {isPlaying ? '⏸ Pausa' : '▶ Reproducir'}
      </Button>
      <Button
        size="sm"
        aria-label="Paso siguiente"
        disabled={step >= last}
        onClick={() => player.move(1)}
      >
        ▶
      </Button>
      <Button
        size="sm"
        aria-label="Al final"
        disabled={step >= last}
        onClick={() => player.goTo(last)}
      >
        ⏭
      </Button>
      <label className="ml-3 flex items-center gap-2 text-slate-600 dark:text-slate-400">
        Velocidad
        <input
          type="range"
          min={100}
          max={1500}
          step={100}
          value={1600 - player.interval}
          onChange={(event) => player.setInterval(1600 - Number(event.target.value))}
          className="accent-indigo-600"
        />
      </label>
      <span className="ml-3 text-slate-500" aria-live="polite">
        {unit} {step}/{last}
      </span>
    </div>
  );
}
