/**
 * Earley step by step (SPEC 03, section 3.4): the sets S0 … Sn fill up event by event, with the
 * operation and the cause of each item. Concepts: items, sets, Predictor, Scanner, Completer and
 * the ε fix (cards 11 to 16). The trace comes from the core.
 */
import type { ParseResult } from '@sabueso/core';
import { useEffect, useState } from 'react';
import { useAnalysisService } from '../analysis/context';
import { useGrammars } from '../analysis/use-grammars';
import { EarleySetColumn } from '../components/earley-player/EarleySetColumn';
import { EventDescription } from '../components/earley-player/EventDescription';
import { TraceSource } from '../components/earley-player/TraceSource';
import { PlayerControls } from '../components/player/PlayerControls';
import { MutedText } from '../components/ui/MutedText';
import { Panel } from '../components/ui/Panel';
import { chartAfter } from '../domain/earley-events';
import { grammarOptionsOf } from '../domain/grammar-options';
import { splitTags } from '../domain/tags';
import { usePlayer } from '../player/use-player';
import type { ViewProps } from '../state/app-state';

/** With more columns the chart can no longer be read (SPEC 03, section 3.4). */
export const MAX_PLAYER_TOKENS = 15;

export function EarleyPlayerView({ state }: ViewProps) {
  const service = useAnalysisService();
  const catalog = useGrammars();
  const tokens = splitTags(state.input);
  const tooLong = tokens.length > MAX_PLAYER_TOKENS;
  const [result, setResult] = useState<ParseResult | null>(null);

  useEffect(() => {
    if (tooLong) {
      return undefined;
    }
    let current = true;
    void service.trace(state.grammarId, state.input).then((answer) => {
      if (current) {
        setResult(answer);
      }
    });
    return () => {
      current = false;
    };
  }, [service, state.grammarId, state.input, tooLong]);

  const events = result?.trace ?? [];
  const player = usePlayer({ last: events.length });
  const start = catalog?.grammars.find((each) => each.id === state.grammarId)?.start ?? '';
  const genre = catalog?.genres.find((each) => each.id === state.genreId);
  const grammarLabel =
    (genre && grammarOptionsOf(genre).find((option) => option.id === state.grammarId)?.label) ??
    state.grammarId;

  if (tooLong) {
    return (
      <MutedText>
        El relato de la pestaña Análisis tiene {tokens.length} etiquetas: acorta la entrada a{' '}
        {MAX_PLAYER_TOKENS} o menos para la vista paso a paso.
      </MutedText>
    );
  }
  if (result === null) {
    return <MutedText>Preparando la traza…</MutedText>;
  }
  const sets = chartAfter({ events, step: player.step, setCount: result.tokens.length + 1, start });
  const currentEvent = player.step - 1;
  const current = events[currentEvent];
  return (
    <Panel
      title={`Earley paso a paso · ${state.input.trim() === '' ? 'ε (relato vacío)' : state.input}`}
    >
      <div className="space-y-3">
        <TraceSource input={state.input} grammarLabel={grammarLabel} />
        <PlayerControls player={player} unit="evento" />
        <EventDescription event={current} start={start} />
        <div className="flex gap-2 overflow-x-auto pb-2">
          {sets.map((entries, index) => (
            <EarleySetColumn
              key={index}
              index={index}
              token={index === 0 ? null : (result.tokens[index - 1] ?? null)}
              entries={entries}
              currentEvent={currentEvent}
              isActive={current === undefined ? index === 0 : current.set === index}
            />
          ))}
        </div>
        {player.step === player.last && (
          <p role="status" className="text-sm font-medium">
            {result.accepted
              ? `✓ Aceptado: $S → ${start} • está en S${result.tokens.length}.`
              : `✗ Rechazado: $S → ${start} • no está en S${result.tokens.length}.`}
          </p>
        )}
      </div>
    </Panel>
  );
}
