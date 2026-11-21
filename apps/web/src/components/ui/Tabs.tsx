/**
 * Accessible tabs (WAI-ARIA tablist): click a tab, or move between tabs with the arrow keys,
 * Home and End. Only the active panel is rendered.
 * Reference: SPEC 03, section 3.1.
 */
import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { TabButton } from './TabButton';
import { TabPanel } from './TabPanel';

export interface TabItem<Id extends string> {
  id: Id;
  label: string;
  panel: ReactNode;
  /** Why the tab cannot be opened yet; undefined when it can. */
  disabledReason?: string | undefined;
}

/**
 * Where each key moves the selection, from the active index, skipping the disabled tabs:
 * the arrows walk in their direction (wrapping around), Home and End go to the ends.
 */
function keyTarget({
  key,
  active,
  enabled,
}: {
  key: string;
  active: number;
  /** For each tab, whether it can be selected. */
  enabled: readonly boolean[];
}): number | undefined {
  const count = enabled.length;
  const walk = (from: number, direction: number): number | undefined => {
    for (let offset = 1; offset <= count; offset++) {
      const index = (((from + direction * offset) % count) + count) % count;
      if (enabled[index] === true) {
        return index;
      }
    }
    return undefined;
  };
  const moves: Record<string, () => number | undefined> = {
    ArrowRight: () => walk(active, 1),
    ArrowLeft: () => walk(active, -1),
    Home: () => walk(-1, 1),
    End: () => walk(count, -1),
  };
  return moves[key]?.();
}

export function Tabs<Id extends string>({
  label,
  items,
  activeId,
  onChange,
}: {
  /** What the tab list is about, for screen readers. */
  label: string;
  items: readonly TabItem<Id>[];
  activeId: Id;
  onChange: (id: Id) => void;
}) {
  const buttons = useRef(new Map<Id, HTMLButtonElement>());
  const activeIndex = Math.max(
    items.findIndex((item) => item.id === activeId),
    0,
  );
  const activeItem = items[activeIndex];

  /** Keeps a reference to each tab button, to move the focus with the keyboard. */
  const registerButton = (id: Id) => (element: HTMLButtonElement | null) => {
    if (element === null) {
      buttons.current.delete(id);
    } else {
      buttons.current.set(id, element);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const target = keyTarget({
      key: event.key,
      active: activeIndex,
      enabled: items.map((item) => item.disabledReason === undefined),
    });
    const item = target === undefined ? undefined : items[target];
    if (item !== undefined) {
      event.preventDefault();
      onChange(item.id);
      buttons.current.get(item.id)?.focus();
    }
  };

  return (
    <div>
      <div
        role="tablist"
        aria-label={label}
        className="flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-800"
      >
        {items.map((item) => (
          <TabButton
            key={item.id}
            id={item.id}
            label={item.label}
            isActive={item.id === activeItem?.id}
            disabledReason={item.disabledReason}
            buttonRef={registerButton(item.id)}
            onSelect={() => {
              onChange(item.id);
            }}
            onKeyDown={handleKeyDown}
          />
        ))}
      </div>
      {activeItem !== undefined && <TabPanel id={activeItem.id}>{activeItem.panel}</TabPanel>}
    </div>
  );
}
