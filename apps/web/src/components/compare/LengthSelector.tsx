/** k, the longest sentence the searches try: one button per choice. */
import { LENGTH_CHOICES } from '../../domain/bounded';
import { Button } from '../ui/Button';

export function LengthSelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (k: number) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Largo máximo k"
      className="flex flex-wrap items-center gap-1.5 text-sm"
    >
      <span className="text-slate-600 dark:text-slate-400">Hasta largo k =</span>
      {LENGTH_CHOICES.map((k) => (
        <Button
          key={k}
          size="sm"
          variant={k === value ? 'primary' : 'secondary'}
          aria-pressed={k === value}
          onClick={() => {
            onChange(k);
          }}
        >
          {k}
        </Button>
      ))}
    </div>
  );
}
