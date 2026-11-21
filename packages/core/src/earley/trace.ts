/**
 * Concept: the trace of Earley, every item the algorithm adds, in order, with the operation
 * that added it and its cause. The same story as the chart, told as a sequence of events:
 * it is what the step-by-step player of the web shows.
 * Reference: SPEC 02, sections 3.12 to 3.16 and step 17.
 */

import type { SymbolName } from '../grammar/types.js';
import { label, type EarleyItem } from './item.js';

/** The operation that added an item; 'nullable' is the advance of the ε fix (step 15). */
export type TraceOperation = 'predict' | 'scan' | 'complete' | 'nullable';

export interface TraceEvent {
  /** The set the item was added to. */
  set: number;
  op: TraceOperation;
  /** The item, as 'Hecho → CRI • HallazgoOpc, 0'. */
  item: string;
  /** Why: the item that predicted, the token read, the item completed, or the ε symbol. */
  cause: string;
  /** False when the item was already there and only got one more link: another way to it. */
  isNew: boolean;
}

/**
 * Why an item was added, as data: the item that predicted it or was completed, the token read,
 * or the nullable symbol skipped. The trace turns it into text with describeCause.
 */
export type TraceCause =
  | { kind: 'item'; item: EarleyItem }
  | { kind: 'token'; tokenIndex: number; terminal: SymbolName }
  | { kind: 'nullable'; symbol: SymbolName };

/** The text of a cause, as the trace shows it: 'S → • ( S ) S, 0', 'token 0 CRI' or 'B ⇒* ε'. */
export function describeCause(cause: TraceCause): string {
  switch (cause.kind) {
    case 'item':
      return label(cause.item);
    case 'token':
      return `token ${cause.tokenIndex} ${cause.terminal}`;
    case 'nullable':
      return `${cause.symbol} ⇒* ε`;
  }
}

/**
 * Collects the events while the recognizer runs. The recognizer only builds events when it
 * has a recorder, so without the trace option there is no extra cost.
 */
export class TraceRecorder {
  readonly events: TraceEvent[] = [];

  /** Appends one event, in the order the recognizer reports it. */
  record(event: TraceEvent): void {
    this.events.push(event);
  }
}
