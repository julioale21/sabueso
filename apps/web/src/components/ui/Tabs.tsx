/**
 * Accessible tabs (WAI-ARIA tablist): click a tab, or move between tabs with the arrow keys,
 * Home and End. Only the active panel is rendered.
 * Reference: SPEC 03, section 3.1.
 */
import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cx } from './cx';

export interface TabItem<Id extends string> {
  id: Id;
  label: string;
  panel: ReactNode;
}

const tabStyles = {
  base: '-mb-px border-b-2 px-3 py-2 text-sm font-medium',
  active: 'border-indigo-600 text-indigo-700 dark:border-indigo-400 dark:text-indigo-300',
  inactive:
    'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100',
};

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
        {items.map((item) => {
          const isActive = item.id === activeItem?.id;
          return (
            <button
              key={item.id}
              ref={(element) => {
                if (element === null) {
                  buttons.current.delete(item.id);
                } else {
                  buttons.current.set(item.id, element);
                }
              }}
              type="button"
              role="tab"
              id={`tab-${item.id}`}
              aria-selected={isActive}
              aria-controls={`panel-${item.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => {
                onChange(item.id);
              }}
              onKeyDown={handleKeyDown}
              className={cx(tabStyles.base, isActive ? tabStyles.active : tabStyles.inactive)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {activeItem !== undefined && (
        <div
          role="tabpanel"
          id={`panel-${activeItem.id}`}
          aria-labelledby={`tab-${activeItem.id}`}
          className="py-4"
        >
          {activeItem.panel}
        </div>
      )}
    </div>
  );
}
