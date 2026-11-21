/** The sentences only one grammar generates: the first ones, and how many more. */
import { SENTENCES_SHOWN, sentenceText } from '../../domain/bounded';

export function SentenceList({
  title,
  sentences,
}: {
  title: string;
  sentences: readonly (readonly string[])[];
}) {
  const hidden = sentences.length - SENTENCES_SHOWN;
  return (
    <section aria-label={title} className="space-y-1 text-sm">
      <h3 className="font-semibold">
        {title} ({sentences.length})
      </h3>
      {sentences.length === 0 ? (
        <p className="text-slate-500">ninguno</p>
      ) : (
        <ul className="space-y-0.5 font-mono text-xs">
          {sentences.slice(0, SENTENCES_SHOWN).map((sentence) => (
            <li key={sentenceText(sentence)}>{sentenceText(sentence)}</li>
          ))}
          {hidden > 0 && <li className="font-sans text-slate-500">y {hidden} más</li>}
        </ul>
      )}
    </section>
  );
}
