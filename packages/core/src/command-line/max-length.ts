/**
 * Concept: the --max-length option of the bounded searches (step 27): k, the longest sentence
 * they look at.
 */
export const MAX_LENGTH_OPTION = '--max-length';

/** k as a whole number from 0 to 12, or undefined when the text is not one. */
export function parseMaxLength(text: string | undefined): number | undefined {
  // 12 keeps the searches within seconds: G0 already has tens of thousands of sentences
  // of length 7, and the count grows exponentially with k.
  const value = Number(text);
  return text !== undefined && Number.isInteger(value) && value >= 0 && value <= MAX_LENGTH_LIMIT
    ? value
    : undefined;
}

/** The largest k the commands accept. */
export const MAX_LENGTH_LIMIT = 12;

/** The usage error of a missing or invalid --max-length. */
export const MAX_LENGTH_MESSAGE = `${MAX_LENGTH_OPTION} needs a whole number from 0 to ${MAX_LENGTH_LIMIT}`;
