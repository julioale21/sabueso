/**
 * The trace of Earley read for the player (guide 13): which items each set has after k events.
 * The trace itself comes from the core; this only splits and groups its text.
 */
import type { TraceEvent, TraceOperation } from '@sabueso/core';

/** The item every chart starts with, before the first event: '$S → • Relato, 0'. */
export function initialItem(start: string): string {
  return `$S → • ${start}, 0`;
}

export interface ChartEntry {
  /** 'Hecho → CRI • HallazgoOpc'. */
  rule: string;
  /** j: where the recognition of the rule started. */
  origin: string;
  op: TraceOperation | 'initial';
  /** The index of the event that added it (−1 for the initial item). */
  event: number;
}

/** 'Hecho → CRI • HallazgoOpc, 0' → { rule: 'Hecho → CRI • HallazgoOpc', origin: '0' }. */
export function splitItem(item: string): { rule: string; origin: string } {
  const comma = item.lastIndexOf(', ');
  return comma === -1
    ? { rule: item, origin: '' }
    : { rule: item.slice(0, comma), origin: item.slice(comma + 2) };
}

/** The sets S0 … Sn after the first `step` events: the initial item, then each new item. */
export function chartAfter({
  events,
  step,
  setCount,
  start,
}: {
  events: readonly TraceEvent[];
  step: number;
  /** n + 1: one set per position of the input. */
  setCount: number;
  /** The start symbol of the grammar, e.g. 'Relato'. */
  start: string;
}): ChartEntry[][] {
  const sets: ChartEntry[][] = Array.from({ length: setCount }, () => []);
  sets[0]?.push({ ...splitItem(initialItem(start)), op: 'initial', event: -1 });
  events.slice(0, step).forEach((event, index) => {
    if (event.isNew) {
      sets[event.set]?.push({ ...splitItem(event.item), op: event.op, event: index });
    }
  });
  return sets;
}

/** The operations as the course names them. */
export const OPERATION_NAMES: Record<TraceOperation | 'initial', string> = {
  initial: 'inicial',
  predict: 'Predictor',
  scan: 'Scanner',
  complete: 'Completer',
  nullable: 'anulable (ε)',
};
