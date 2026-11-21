/** One tag of the palette: its name and narrative function; a click adds it to the story. */
import type { TagInfo } from '@sabueso/core';
import { Button } from '../ui/Button';

export function TagButton({ tag, onPick }: { tag: TagInfo; onPick: (tag: string) => void }) {
  return (
    <Button
      size="sm"
      title={`${tag.narrativeFunction}. Ejemplo: ${tag.example}`}
      onClick={() => {
        onPick(tag.tag);
      }}
      className="flex flex-col items-start leading-tight"
    >
      <span className="font-mono font-semibold">{tag.tag}</span>
      <span className="font-normal text-slate-500 dark:text-slate-400">
        {tag.narrativeFunction}
      </span>
    </Button>
  );
}
