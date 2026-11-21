/**
 * A step-by-step player: the current step (0 to last), play and pause at a given speed, and
 * jumps. Shared by the Earley player (step 10) and the tree that builds itself (step 18).
 */
import { useCallback, useEffect, useState } from 'react';

export interface Player {
  step: number;
  last: number;
  isPlaying: boolean;
  /** Milliseconds between two steps while playing. */
  interval: number;
  goTo: (step: number) => void;
  /** One step forward (+1) or back (−1), from the latest step even after several quick clicks. */
  move: (delta: number) => void;
  play: () => void;
  pause: () => void;
  setInterval: (milliseconds: number) => void;
}

export function usePlayer({
  last,
  initialInterval = 1200,
  initialStep = 0,
  autoplay = false,
}: {
  last: number;
  initialInterval?: number;
  /** Where it starts: 0, or `last` to show the whole sequence at once. */
  initialStep?: number;
  /** Starts playing by itself, once. */
  autoplay?: boolean;
}): Player {
  const [step, setStep] = useState(initialStep);
  const [wantsToPlay, setWantsToPlay] = useState(autoplay);
  const [interval, setIntervalMs] = useState(initialInterval);
  const [sequenceLength, setSequenceLength] = useState(last);

  // A new sequence (another story or grammar) starts again from the beginning. Adjusting the
  // state while rendering, instead of in an effect, avoids a render with the old step.
  if (sequenceLength !== last) {
    setSequenceLength(last);
    setStep(0);
    setWantsToPlay(false);
  }

  // Playing stops by itself at the last step.
  const isPlaying = wantsToPlay && step < last;

  useEffect(() => {
    if (!isPlaying) {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      setStep((current) => Math.min(last, current + 1));
    }, interval);
    return () => {
      window.clearTimeout(timer);
    };
  }, [isPlaying, step, last, interval]);

  const goTo = useCallback(
    (target: number) => {
      setStep(Math.max(0, Math.min(last, target)));
    },
    [last],
  );

  const move = useCallback(
    (delta: number) => {
      setStep((current) => Math.max(0, Math.min(last, current + delta)));
    },
    [last],
  );

  return {
    step,
    last,
    isPlaying,
    interval,
    goTo,
    move,
    play: () => {
      if (step >= last) {
        setStep(0);
      }
      setWantsToPlay(true);
    },
    pause: () => {
      setWantsToPlay(false);
    },
    setInterval: setIntervalMs,
  };
}
