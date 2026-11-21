/** One tab of a tablist: selected or not, and reachable by keyboard only when selected. */
import type { KeyboardEvent, Ref } from 'react';
import { cx } from '../../utils/cx';

const tabStyles = {
  base: '-mb-px border-b-2 px-3 py-2 text-sm font-medium',
  active: 'border-indigo-600 text-indigo-700 dark:border-indigo-400 dark:text-indigo-300',
  inactive:
    'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100',
};

export function TabButton({
  id,
  label,
  isActive,
  buttonRef,
  onSelect,
  onKeyDown,
}: {
  id: string;
  label: string;
  isActive: boolean;
  buttonRef: Ref<HTMLButtonElement>;
  onSelect: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      role="tab"
      id={`tab-${id}`}
      aria-selected={isActive}
      aria-controls={`panel-${id}`}
      tabIndex={isActive ? 0 : -1}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      className={cx(tabStyles.base, isActive ? tabStyles.active : tabStyles.inactive)}
    >
      {label}
    </button>
  );
}
