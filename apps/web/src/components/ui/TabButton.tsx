/** One tab of the side bar: selected or not, and reachable by keyboard only when selected. */
import type { KeyboardEvent, Ref } from 'react';
import { cx } from '../../utils/cx';

const tabStyles = {
  base: 'w-full rounded-r border-l-2 px-3 py-1.5 text-left text-sm font-medium',
  active:
    'border-indigo-600 bg-white text-indigo-700 shadow-sm dark:border-indigo-400 dark:bg-slate-950 dark:text-indigo-300',
  inactive:
    'border-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100',
  disabled: 'cursor-not-allowed border-transparent text-slate-400 dark:text-slate-600',
};

export function TabButton({
  id,
  label,
  isActive,
  disabledReason,
  buttonRef,
  onSelect,
  onKeyDown,
}: {
  id: string;
  label: string;
  isActive: boolean;
  /** Why the tab is disabled, shown on hover; undefined when enabled. */
  disabledReason?: string | undefined;
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
      disabled={disabledReason !== undefined}
      aria-disabled={disabledReason !== undefined || undefined}
      title={disabledReason}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      className={cx(
        tabStyles.base,
        disabledReason !== undefined
          ? tabStyles.disabled
          : isActive
            ? tabStyles.active
            : tabStyles.inactive,
      )}
    >
      {label}
      {disabledReason !== undefined && (
        // A touch screen has no hover for the title: the reason is written under the label.
        <span aria-hidden="true" className="block text-[11px] font-normal md:hidden">
          {disabledReason}
        </span>
      )}
    </button>
  );
}
