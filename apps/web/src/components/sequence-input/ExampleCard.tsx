/** One ready-made story as a card: its name, what it shows and its tags; a click loads it. */
import { storyPreview, type Example } from '../../domain/examples';

export function ExampleCard({
  example,
  onPick,
}: {
  example: Example;
  onPick: (input: string) => void;
}) {
  return (
    <li className="flex flex-col rounded-lg border border-slate-200 hover:border-indigo-400 dark:border-slate-700">
      <button
        type="button"
        onClick={() => {
          onPick(example.input);
        }}
        className="flex w-full flex-1 flex-col items-start justify-start rounded-lg p-3 text-left hover:bg-indigo-50 dark:hover:bg-indigo-950"
      >
        <span className="flex items-baseline gap-2">
          <span className="font-mono text-xs text-slate-500">{example.id}</span>
          <span className="text-sm font-semibold">{example.title}</span>
        </span>
        <span className="mt-1 block text-xs text-slate-600 dark:text-slate-400">
          {example.description}
        </span>
        <span className="mt-2 block font-mono text-xs text-indigo-700 dark:text-indigo-300">
          {storyPreview(example.input)}
        </span>
      </button>
    </li>
  );
}
