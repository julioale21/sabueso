/**
 * The analysis of the story (SPEC 03, sections 3.1 and 3.4): the verdict; if accepted, the
 * trees to browse with their derivations; if rejected, the diagnosis. Concepts: cards 17 to 21.
 */
import { useState } from 'react';
import type { StoryAnalysis } from '../../analysis/service';
import { DiagnosticPanel } from '../diagnostic-panel/DiagnosticPanel';
import { TreeAndDerivation } from '../derivation-view/TreeAndDerivation';
import { CheckboxField } from '../ui/CheckboxField';
import { MutedText } from '../ui/MutedText';
import { TreePager } from './TreePager';
import { VerdictBanner } from './VerdictBanner';

export function ResultPanel({
  result,
  isAnalyzing,
  alphabet,
  selectedTree,
  collapseEpsilon,
  onSelectTree,
  onToggleCollapseEpsilon,
}: {
  result: StoryAnalysis | null;
  isAnalyzing: boolean;
  alphabet: ReadonlySet<string>;
  selectedTree: number;
  collapseEpsilon: boolean;
  onSelectTree: (index: number) => void;
  onToggleCollapseEpsilon: () => void;
}) {
  // The tree builds itself only when the result arrives, not after browsing to another tree.
  const [hasBrowsed, setHasBrowsed] = useState(false);
  if (isAnalyzing) {
    return <MutedText>Analizando…</MutedText>;
  }
  if (result === null) {
    return <MutedText>Escribe un relato y aprieta Analizar.</MutedText>;
  }
  if (!result.accepted) {
    return (
      <div className="space-y-3">
        <VerdictBanner accepted={false} treeCount={0n} treesShown={0} />
        <DiagnosticPanel tokens={result.tokens} error={result.error} />
      </div>
    );
  }
  const index = Math.min(selectedTree, result.trees.length - 1);
  const tree = result.trees[index];
  const derivation = result.derivations[index];
  return (
    <div className="space-y-3">
      <VerdictBanner
        accepted
        treeCount={result.treeCount ?? BigInt(result.trees.length)}
        treesShown={result.trees.length}
      />
      <div className="flex flex-wrap items-center gap-4">
        <TreePager
          index={index}
          count={result.trees.length}
          onSelect={(next) => {
            setHasBrowsed(true);
            onSelectTree(next);
          }}
        />
        <CheckboxField
          label="Colapsar ε"
          checked={collapseEpsilon}
          onChange={onToggleCollapseEpsilon}
        />
      </div>
      {tree !== undefined && derivation !== undefined && (
        <TreeAndDerivation
          key={index}
          tree={tree}
          derivation={derivation}
          alphabet={alphabet}
          collapseEpsilon={collapseEpsilon}
          autoplay={!hasBrowsed}
        />
      )}
    </div>
  );
}
