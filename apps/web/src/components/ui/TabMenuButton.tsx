/** On small screens, the bar that shows the current view and opens the drawer of views. */
export function TabMenuButton({
  label,
  isOpen,
  controls,
  onToggle,
}: {
  label: string;
  isOpen: boolean;
  /** The id of the list it opens. */
  controls: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-expanded={isOpen}
      aria-controls={controls}
      onClick={onToggle}
      className="flex w-full items-center rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-sm font-medium text-indigo-900 shadow-sm md:hidden dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-100"
    >
      <span>
        <span aria-hidden="true" className="mr-2 text-base">
          ☰
        </span>
        <span className="text-slate-500">Vista:</span> {label}
      </span>
    </button>
  );
}
