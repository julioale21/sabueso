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
      className="flex w-full items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium md:hidden dark:border-slate-800"
    >
      <span>
        <span aria-hidden="true" className="mr-2">
          ☰
        </span>
        <span className="text-slate-500">Vista:</span> {label}
      </span>
    </button>
  );
}
