/**
 * The story as a sequence of tags (SPEC 03, section 3.7): a free text field, with the valid
 * tags always visible as a palette and the unknown words marked while typing. Concept: the
 * alphabet Σ and a string over it (card 01).
 */
import type { TagInfo } from '@sabueso/core';
import type { Example } from '../../domain/examples';
import { splitTags } from '../../domain/tags';
import { AnalyzeActions } from './AnalyzeActions';
import { ExampleButtons } from './ExampleButtons';
import { StoryField } from './StoryField';
import { TagPalette } from './TagPalette';
import { TagSequence } from './TagSequence';
import { UnknownTagsAlert } from './UnknownTagsAlert';

export function SequenceInput({
  tags,
  value,
  examples,
  onChange,
  onAnalyze,
  onClear,
}: {
  /** Σ of the active grammar, with the meaning of each tag. */
  tags: readonly TagInfo[];
  value: string;
  examples: readonly Example[];
  onChange: (input: string) => void;
  onAnalyze: () => void;
  /** Resets the story and its result. */
  onClear: () => void;
}) {
  const alphabet = new Set(tags.map((tag) => tag.tag));
  const words = splitTags(value);

  return (
    <div className="space-y-3">
      <TagPalette
        tags={tags}
        onPick={(tag) => {
          onChange([...words, tag].join(' '));
        }}
      />
      <StoryField value={value} onChange={onChange} onSubmit={onAnalyze} />
      <TagSequence words={words} alphabet={alphabet} />
      <UnknownTagsAlert unknown={words.filter((word) => !alphabet.has(word))} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <AnalyzeActions canClear={value !== ''} onAnalyze={onAnalyze} onClear={onClear} />
        <ExampleButtons examples={examples} onPick={onChange} />
      </div>
    </div>
  );
}
