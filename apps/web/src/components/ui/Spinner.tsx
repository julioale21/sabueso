/** A small spinning circle for a busy button; still when the system asks for less motion. */
export function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin"
    />
  );
}
