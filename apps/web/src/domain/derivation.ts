/** How the leftmost derivation is read on screen (guide 21). */

/** The position of the leftmost nonterminal of a form: the first symbol outside Σ, or null. */
export function leftmostNonterminal({
  form,
  alphabet,
}: {
  form: readonly string[];
  alphabet: ReadonlySet<string>;
}): number | null {
  const index = form.findIndex((symbol) => !alphabet.has(symbol));
  return index === -1 ? null : index;
}
