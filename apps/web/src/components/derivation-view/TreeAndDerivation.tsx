/**
 * The tree, full width, and its leftmost derivation below, in sync (card 20). A player walks the
 * derivation: at step k the tree shows the root and the children of expansions 0 … k − 1, so it
 * grows in preorder, and the node of expansion k − 1 is highlighted (SPEC 03, step 18). A short
 * derivation builds itself once when it arrives; selecting a step moves the same player.
 */
import type { DerivationStep, ParseTree } from '@sabueso/core';
import { useState } from 'react';
import { MAX_ANIMATED_STEPS, stepInterval } from '../../domain/tree-animation';
import { usePlayer } from '../../player/use-player';
import { usePrefersReducedMotion } from '../../utils/use-prefers-reduced-motion';
import { PlayerControls } from '../player/PlayerControls';
import { Button } from '../ui/Button';
import { TreeView } from '../tree-view/TreeView';
import { DerivationView } from './DerivationView';

export function TreeAndDerivation({
  tree,
  derivation,
  alphabet,
  collapseEpsilon,
  autoplay = false,
}: {
  tree: ParseTree;
  derivation: readonly DerivationStep[];
  alphabet: ReadonlySet<string>;
  collapseEpsilon: boolean;
  /** Build the tree step by step when it appears (short derivations, motion allowed). */
  autoplay?: boolean;
}) {
  const last = derivation.length - 1;
  const reducedMotion = usePrefersReducedMotion();
  const animates = autoplay && !reducedMotion && last <= MAX_ANIMATED_STEPS;
  const player = usePlayer({
    last,
    initialInterval: stepInterval(last),
    initialStep: animates ? 0 : last,
    autoplay: animates,
  });
  // At the end the whole tree shows without a highlight, unless a step was chosen by hand.
  const [isChosen, setIsChosen] = useState(false);
  const showsStep = player.step < last || isChosen;
  const highlightedExpansion = showsStep && player.step > 0 ? player.step - 1 : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <PlayerControls player={player} unit="paso" />
        <Button
          size="sm"
          variant="ghost"
          disabled={player.step === last && !player.isPlaying}
          onClick={() => {
            player.pause();
            player.goTo(last);
            setIsChosen(false);
          }}
        >
          Ver completo
        </Button>
      </div>
      <TreeView
        tree={tree}
        collapseEpsilon={collapseEpsilon}
        highlightedExpansion={highlightedExpansion}
        step={player.step}
      />
      <div>
        <h3 className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
          Derivación más a la izquierda ({last} pasos)
        </h3>
        <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
          Elige un paso: el árbol se muestra hasta ese paso y se resalta el nodo que se expandió.
        </p>
        <DerivationView
          derivation={derivation}
          alphabet={alphabet}
          selectedStep={showsStep ? player.step : null}
          onSelectStep={(step) => {
            player.pause();
            player.goTo(step);
            setIsChosen(true);
          }}
        />
      </div>
    </div>
  );
}
