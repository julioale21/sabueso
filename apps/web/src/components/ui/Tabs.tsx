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
}

/** Where each key moves the selection, from the active index. */
function keyTarget({ key, active, count }: { key: string; active: number; count: number }) {
  const targets: Record<string, number> = {
    ArrowRight: active + 1,
    ArrowLeft: active - 1,
    Home: 0,
    End: count - 1,
  };
  const target = targets[key];
  return target === undefined ? undefined : (target + count) % count;
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
    const target = keyTarget({ key: event.key, active: activeIndex, count: items.length });
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
