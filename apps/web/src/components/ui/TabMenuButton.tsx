/**
 * On small screens, the bar at the top that opens the drawer of views: a menu icon, the group
 * of the current view and its name (the drawer design of the navigation prototype).
 */
export function TabMenuButton({
  label,
  groupTitle,
  isOpen,
  controls,
  onToggle,
}: {
  label: string;
  groupTitle: string | undefined;
  isOpen: boolean;
  /** The id of the drawer it opens. */
  controls: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-expanded={isOpen}
      aria-controls={controls}
      onClick={onToggle}
      className="flex w-full items-center gap-3 border-b border-slate-200 py-2 text-left md:hidden dark:border-slate-800"
    >
      <span
        aria-hidden="true"
        className="rounded-md p-1.5 text-slate-700 ring-1 ring-slate-300 dark:text-slate-200 dark:ring-slate-700"
      >
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </span>
      <span className="min-w-0">
        {groupTitle !== undefined && (
          <span
            aria-hidden="true"
            className="block text-[11px] font-semibold tracking-wide text-slate-400 uppercase"
          >
            {groupTitle}
          </span>
        )}
        <span className="block truncate font-semibold">
          <span className="sr-only">Vista:</span> {label}
        </span>
      </span>
    </button>
  );
}
