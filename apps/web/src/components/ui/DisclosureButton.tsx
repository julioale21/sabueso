/** A link-like button that shows or hides a folded part of the page ("Ver…" / "Ocultar…"). */
export function DisclosureButton({
  isOpen,
  showLabel,
  hideLabel,
  onToggle,
}: {
  isOpen: boolean;
  showLabel: string;
  hideLabel: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-expanded={isOpen}
      onClick={onToggle}
      className="text-sm text-indigo-700 hover:underline dark:text-indigo-300"
    >
      {isOpen ? hideLabel : showLabel}
    </button>
  );
}
