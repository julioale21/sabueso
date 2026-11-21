/**
 * Accessible tabs (WAI-ARIA tablist), drawn as a side bar: click a tab, or move between tabs
 * with the arrow keys, Home and End. On small screens the bar becomes a drawer that opens from
 * a button with the current view. Only the active panel is rendered.
 * Reference: SPEC 03, section 3.1.
 */
import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { TabButton } from './TabButton';
import { TabGroup } from './TabGroup';
import { TabDrawer } from './TabDrawer';
import { TabMenuButton } from './TabMenuButton';
import { TabPanel } from './TabPanel';

export interface TabItem<Id extends string> {
  id: Id;
  label: string;
  panel: ReactNode;
  /** Why the tab cannot be opened yet; undefined when it can. */
  disabledReason?: string | undefined;
  /** The title of the group the tab belongs to; consecutive tabs with the same one go together. */
  group?: string | undefined;
}

/** The tabs split into runs of the same group, in order, keeping each tab's index. */
function groupsOf<Id extends string>(
  items: readonly TabItem<Id>[],
): { title: string | undefined; items: TabItem<Id>[] }[] {
  const groups: { title: string | undefined; items: TabItem<Id>[] }[] = [];
  for (const item of items) {
    const last = groups.at(-1);
    if (last !== undefined && last.title === item.group) {
      last.items.push(item);
    } else {
      groups.push({ title: item.group, items: [item] });
    }
  }
  return groups;
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
    ArrowDown: () => walk(active, 1),
    ArrowUp: () => walk(active, -1),
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
  // On small screens the list is a drawer that opens from a bar with the current view.
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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

  const select = (id: Id) => {
    onChange(id);
    setIsMenuOpen(false);
  };

  return (
    <div className="md:flex md:items-start md:gap-6">
      <nav className="md:sticky md:top-4 md:h-[calc(100dvh-2rem)] md:w-52 md:shrink-0">
        <TabMenuButton
          label={activeItem?.label ?? ''}
          isOpen={isMenuOpen}
          controls="view-list"
          onToggle={() => {
            setIsMenuOpen((open) => !open);
          }}
        />
        <TabDrawer
          id="view-list"
          isOpen={isMenuOpen}
          onClose={() => {
            setIsMenuOpen(false);
          }}
        >
          <div role="tablist" aria-label={label} aria-orientation="vertical" className="space-y-4">
            {groupsOf(items).map((group, index) => (
              <TabGroup key={group.title ?? index} title={group.title}>
                {group.items.map((item) => (
                  <TabButton
                    key={item.id}
                    id={item.id}
                    label={item.label}
                    isActive={item.id === activeItem?.id}
                    disabledReason={item.disabledReason}
                    buttonRef={registerButton(item.id)}
                    onSelect={() => {
                      select(item.id);
                    }}
                    onKeyDown={handleKeyDown}
                  />
                ))}
              </TabGroup>
            ))}
          </div>
        </TabDrawer>
      </nav>
      {activeItem !== undefined && <TabPanel id={activeItem.id}>{activeItem.panel}</TabPanel>}
    </div>
  );
}
