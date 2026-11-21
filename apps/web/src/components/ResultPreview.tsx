/**
 * The result of the analysis, for now: the tree and its derivation when the story is accepted.
 * The verdict, the trees to browse and the diagnosis arrive in step 9 (SPEC 03).
 */
import type { ParseResult } from '@sabueso/core';
import { TreeAndDerivation } from './derivation-view/TreeAndDerivation';
import { MutedText } from './ui/MutedText';

export function ResultPreview({
  result,
  alphabet,
  collapseEpsilon,
}: {
  result: ParseResult | null;
  alphabet: ReadonlySet<string>;
  collapseEpsilon: boolean;
}) {
  if (result === null) {
    return <MutedText>Escribe un relato y aprieta Analizar.</MutedText>;
  }
  if (!result.accepted) {
    return <MutedText>Rechazado. El diagnóstico llega en el paso 9 del SPEC 03.</MutedText>;
  }
  const [tree] = result.trees;
  if (tree === undefined) {
    return null;
  }
  return (
    <TreeAndDerivation
      tree={tree}
      derivation={result.derivation}
      alphabet={alphabet}
      collapseEpsilon={collapseEpsilon}
    />
  );
}
