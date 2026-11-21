/** Under the chips: what each tag of the story means, one line per tag (or per sentence). */
import type { StoryMeaning } from '../../domain/story-meaning';

/** Longer stories are not listed: their meaning would fill the page. */
const MAX_LINES = 40;

export function StoryMeaningList({ meaning }: { meaning: StoryMeaning }) {
  if (meaning.lines.length > MAX_LINES) {
    return null;
  }
  return (
    <section
      aria-label={meaning.title}
      className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900"
    >
      <h3 className="mb-2 text-xs font-semibold text-slate-500">{meaning.title}</h3>
      <ol className="space-y-1">
        {meaning.lines.map((line, index) => (
          <li key={`${index}-${line.tags}`} className="flex gap-3">
            <span className="w-20 shrink-0 font-mono text-xs leading-5 text-indigo-700 dark:text-indigo-300">
              {line.tags}
            </span>
            <span className="text-slate-700 dark:text-slate-300">{line.text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
