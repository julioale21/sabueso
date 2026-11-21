/** What the current event did: the operation, the item added and why (cards 13 to 16). */
import type { TraceEvent } from '@sabueso/core';
import { OPERATION_NAMES } from '../../domain/earley-events';

const causeLabel: Record<TraceEvent['op'], string> = {
  predict: 'lo predijo',
  scan: 'leyó',
  complete: 'se completó',
  nullable: 'anulable',
};

export function EventDescription({
  event,
  start,
}: {
  event: TraceEvent | undefined;
  start: string;
}) {
  if (event === undefined) {
    return (
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Paso 0: el chart empieza con el ítem inicial <code>$S → • {start}, 0</code> en S0.
      </p>
    );
  }
  return (
    <p className="text-sm text-slate-700 dark:text-slate-300">
      <strong>{OPERATION_NAMES[event.op]}</strong> en S{event.set}: agrega <code>{event.item}</code>{' '}
      <span className="text-slate-500">
        ({causeLabel[event.op]}: <code>{event.cause}</code>)
      </span>
    </p>
  );
}
