/** The valid tags of the genre, shown on demand: the alphabet Σ (card 01). */
import type { TagInfo } from '@sabueso/core';
import { TagButton } from './TagButton';

export function TagPalette({
  tags,
  onPick,
}: {
  tags: readonly TagInfo[];
  onPick: (tag: string) => void;
}) {
  return (
    <div role="group" aria-label="Etiquetas válidas" className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <TagButton key={tag.tag} tag={tag} onPick={onPick} />
      ))}
    </div>
  );
}
