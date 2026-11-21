/**
 * The story as a sequence of tags (SPEC 03, section 3.7): a free text field with the unknown
 * words marked while typing. The palette of valid tags and the examples are folded, so the
 * first view shows only the story ("Foco en el relato"). Concept: the alphabet Σ and a string
 * over it (card 01).
 */
import type { TagInfo } from '@sabueso/core';
import { useState } from 'react';
import type { Example } from '../../domain/examples';
import { splitTags } from '../../domain/tags';
import { AnalyzeActions } from './AnalyzeActions';
import { ExampleButtons } from './ExampleButtons';
import { StoryField } from './StoryField';
import { TagPalette } from './TagPalette';
import { TagSequence } from './TagSequence';
import { UnknownTagsAlert } from './UnknownTagsAlert';
import { DisclosureButton } from '../ui/DisclosureButton';

export function SequenceInput({
  tags,
  value,
  examples,
  isAnalyzing,
  onChange,
  onAnalyze,
  onClear,
}: {
  /** Σ of the active grammar, with the meaning of each tag. */
  tags: readonly TagInfo[];
  value: string;
  examples: readonly Example[];
  isAnalyzing: boolean;
  onChange: (input: string) => void;
  onAnalyze: () => void;
  /** Resets the story and its result. */
  onClear: () => void;
}) {
  const alphabet = new Set(tags.map((tag) => tag.tag));
  const words = splitTags(value);
  const [showsTags, setShowsTags] = useState(false);
  const [showsExamples, setShowsExamples] = useState(false);
  // Analizar folds the palette and the examples, so the result gets the attention.
  const analyzeAndFold = () => {
    setShowsTags(false);
    setShowsExamples(false);
    onAnalyze();
  };

  return (
    <div className="space-y-3">
      <StoryField value={value} onChange={onChange} onSubmit={analyzeAndFold} />
      <TagSequence words={words} alphabet={alphabet} />
      <UnknownTagsAlert unknown={words.filter((word) => !alphabet.has(word))} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <AnalyzeActions
          canClear={value !== ''}
          isAnalyzing={isAnalyzing}
          onAnalyze={analyzeAndFold}
          onClear={onClear}
        />
        <DisclosureButton
          isOpen={showsTags}
          showLabel={`Ver las ${tags.length} etiquetas`}
          hideLabel="Ocultar las etiquetas"
          onToggle={() => {
            setShowsTags((open) => !open);
          }}
        />
        <DisclosureButton
          isOpen={showsExamples}
          showLabel="Probar un ejemplo"
          hideLabel="Ocultar los ejemplos"
          onToggle={() => {
            setShowsExamples((open) => !open);
          }}
        />
      </div>
      {showsTags && (
        <TagPalette
          tags={tags}
          onPick={(tag) => {
            onChange([...words, tag].join(' '));
          }}
        />
      )}
      {showsExamples && <ExampleButtons examples={examples} onPick={onChange} />}
    </div>
  );
}
