/**
 * The accepting path step by step (SPEC 03, step 13): the stack grows with each expand and
 * shrinks with each match, until it is empty at the end of the input. The table below has
 * every step, with the current one highlighted; clicking a row jumps to it.
 */
import type { PathStep, PushdownAutomaton } from '@sabueso/core';
import { pushedCount, stackChangeText } from '../../domain/pushdown';
import { usePlayer } from '../../player/use-player';
import { PlayerControls } from '../player/PlayerControls';
import { AcceptingPathTable } from './AcceptingPathTable';
import { InputTape } from './InputTape';
import { StackView } from './StackView';

export function PdaPlayer({
  path,
  tokens,
  automaton,
}: {
  path: readonly PathStep[];
  tokens: readonly string[];
  automaton: PushdownAutomaton;
}) {
  const player = usePlayer({ last: path.length - 1 });
  const current = path[player.step] ?? path[0];
  if (current === undefined) {
    return null;
  }
  return (
    <div className="space-y-3">
      <PlayerControls player={player} unit="paso" />
      <p className="text-sm">{stackChangeText(current.via)}</p>
      <div className="flex flex-wrap items-start gap-6">
        <StackView
          stack={current.id.stack}
          terminals={automaton.inputAlphabet}
          pushed={pushedCount(current.via)}
        />
        <InputTape tokens={tokens} position={current.id.position} />
      </div>
      <AcceptingPathTable
        path={path}
        tokens={tokens}
        automaton={automaton}
        currentStep={player.step}
        onSelectStep={player.goTo}
      />
    </div>
  );
}
