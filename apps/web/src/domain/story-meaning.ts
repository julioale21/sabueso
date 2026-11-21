/**
 * What the tags of the story mean, to read under them: the story told in words when it is one
 * of the examples, or else the narrative function of each tag (CRI · Crimen).
 */
import type { TagInfo } from '@sabueso/core';
import type { Example, NarrativeLine } from './examples';

export interface StoryMeaning {
  title: string;
  lines: readonly NarrativeLine[];
}

export function storyMeaning({
  words,
  tags,
  examples,
}: {
  words: readonly string[];
  tags: readonly TagInfo[];
  examples: readonly Example[];
}): StoryMeaning | null {
  if (words.length === 0) {
    return null;
  }
  const input = words.join(' ');
  const example = examples.find((each) => each.input === input);
  if (example !== undefined) {
    return { title: `El relato en palabras (${example.id})`, lines: example.narrative };
  }
  const functionOf = new Map(tags.map((tag) => [tag.tag, tag.narrativeFunction]));
  return {
    title: 'Qué significa cada etiqueta',
    lines: words.map((word) => ({
      tags: word,
      text: functionOf.get(word) ?? 'no es una etiqueta de este género',
    })),
  };
}
