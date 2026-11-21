/** Ready-made stories as cards: a click loads one into the field. */
import type { Example } from '../../domain/examples';
import { ExampleCard } from './ExampleCard';

export function ExampleButtons({
  examples,
  onPick,
}: {
  examples: readonly Example[];
  onPick: (input: string) => void;
}) {
  return (
    <ul aria-label="Ejemplos" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {examples.map((example) => (
        <ExampleCard key={example.id} example={example} onPick={onPick} />
      ))}
    </ul>
  );
}
