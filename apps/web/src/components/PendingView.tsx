/** A placeholder for a view that a later step of SPEC 03 builds. */
import { MutedText } from './ui/MutedText';

export function PendingView({ concept, step }: { concept: string; step: number }) {
  return (
    <MutedText>
      {concept}: llega en el paso {step} del SPEC 03.
    </MutedText>
  );
}
