/** ◀ árbol k/n ▶: browse the trees that were built. */
import { Button } from '../ui/Button';

export function TreePager({
  index,
  count,
  onSelect,
}: {
  index: number;
  count: number;
  onSelect: (index: number) => void;
}) {
  if (count <= 1) {
    return null;
  }
  return (
    <div className="flex items-center gap-1 text-sm">
      <Button
        size="sm"
        aria-label="Árbol anterior"
        disabled={index === 0}
        onClick={() => {
          onSelect(index - 1);
        }}
      >
        ◀
      </Button>
      <span aria-live="polite">
        árbol {index + 1}/{count}
      </span>
      <Button
        size="sm"
        aria-label="Árbol siguiente"
        disabled={index >= count - 1}
        onClick={() => {
          onSelect(index + 1);
        }}
      >
        ▶
      </Button>
    </div>
  );
}
