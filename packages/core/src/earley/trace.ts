/**
 * Concept: the trace of Earley, every item the algorithm adds, in order, with the operation
 * that added it and its cause. The same story as the chart, told as a sequence of events:
 * it is what the step-by-step player of the web shows.
 * Reference: SPEC 02, sections 3.12 to 3.16 and step 17.
 */

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
