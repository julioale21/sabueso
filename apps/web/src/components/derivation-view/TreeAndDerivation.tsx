/**
 * The tree, full width, and its leftmost derivation below, in sync: selecting step k highlights the
 * node of expansion k − 1 (preorder = order of the leftmost derivation, card 20).
 */
import type { DerivationStep, ParseTree } from '@sabueso/core';
import { useState } from 'react';
import { TreeView } from '../tree-view/TreeView';
import { DerivationView } from './DerivationView';

export function TreeAndDerivation({
  tree,
  derivation,
  alphabet,
  collapseEpsilon,
}: {
  tree: ParseTree;
  derivation: readonly DerivationStep[];
  alphabet: ReadonlySet<string>;
  collapseEpsilon: boolean;
}) {
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  const highlightedExpansion =
    selectedStep === null || selectedStep === 0 ? null : selectedStep - 1;
  return (
    <div className="space-y-4">
      <TreeView
        tree={tree}
        collapseEpsilon={collapseEpsilon}
        highlightedExpansion={highlightedExpansion}
      />
      <div>
        <h3 className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
          Derivación más a la izquierda ({derivation.length - 1} pasos)
        </h3>
        <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
          Elige un paso: se resaltan el no terminal que reemplaza y su nodo en el árbol.
        </p>
        <DerivationView
          derivation={derivation}
          alphabet={alphabet}
          selectedStep={selectedStep}
          onSelectStep={setSelectedStep}
        />
      </div>
    </div>
  );
}
