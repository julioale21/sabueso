/** Ready-made stories: a click loads one into the field. */
import type { Example } from '../../domain/examples';
import { Button } from '../ui/Button';

export function ExampleButtons({
  examples,
  onPick,
}: {
  examples: readonly Example[];
  onPick: (input: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="text-sm text-slate-600 dark:text-slate-400">Ejemplos:</span>
      {examples.map((example) => (
        <Button
          key={example.id}
          size="sm"
          variant="ghost"
          title={example.description}
          onClick={() => {
            onPick(example.input);
          }}
        >
          {example.id}
        </Button>
      ))}
    </div>
  );
}
