/** Names the words that are not tags of the genre, once each. */
export function UnknownTagsAlert({ unknown }: { unknown: readonly string[] }) {
  if (unknown.length === 0) {
    return null;
  }
  return (
    <p role="alert" className="text-sm text-red-700 dark:text-red-400">
      No son etiquetas de este género: {[...new Set(unknown)].join(', ')}.
    </p>
  );
}
