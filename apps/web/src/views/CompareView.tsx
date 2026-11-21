/**
 * G0 vs G1 (SPEC 03, section 3.4): bounded searches over the two grammars of the genre, up to
 * the length k: an ambiguity witness for each, and the sentences only one of them generates.
 * Finding something proves; finding nothing up to k proves nothing (cards 21 and 25).
 */
import type { AmbiguityWitness, LanguageComparison } from '@sabueso/core';
import { useEffect, useState } from 'react';
import { useAnalysisService } from '../analysis/context';
import { useGrammars } from '../analysis/use-grammars';
import { AmbiguityCard } from '../components/compare/AmbiguityCard';
import { ComparisonVerdict } from '../components/compare/ComparisonVerdict';
import { LengthSelector } from '../components/compare/LengthSelector';
import { SentenceList } from '../components/compare/SentenceList';
import { MutedText } from '../components/ui/MutedText';
import { Panel } from '../components/ui/Panel';
import { DEFAULT_LENGTH } from '../domain/bounded';
import { grammarOptionsOf, type GrammarOption } from '../domain/grammar-options';
import type { ViewProps } from '../state/app-state';

interface Searches {
  maxLength: number;
  witnesses: [AmbiguityWitness | null, AmbiguityWitness | null];
  comparison: LanguageComparison;
}

/** 'G1 · oficial' → 'G1'. */
const shortLabel = (option: GrammarOption) => option.label.split(' ')[0] ?? option.id;

export function CompareView({ state }: ViewProps) {
  const service = useAnalysisService();
  const catalog = useGrammars();
  const [maxLength, setMaxLength] = useState(DEFAULT_LENGTH);
  const [searches, setSearches] = useState<Searches | null>(null);
  const genre = catalog?.genres.find((each) => each.id === state.genreId);
  // The alternative grammar first: G0 vs G1, as the course compares them.
  const [official, alternative] = genre === undefined ? [] : grammarOptionsOf(genre);

  // The ids, not the options: grammarOptionsOf builds new objects on every render, and an
  // effect that depended on them would search again after each result, without end.
  const officialId = official?.id;
  const alternativeId = alternative?.id;

  useEffect(() => {
    if (officialId === undefined || alternativeId === undefined) {
      return undefined;
    }
    let current = true;
    void Promise.all([
      service.ambiguity(alternativeId, maxLength),
      service.ambiguity(officialId, maxLength),
      service.compare(alternativeId, officialId, maxLength),
    ]).then(([first, second, comparison]) => {
      if (current) {
        setSearches({ maxLength, witnesses: [first, second], comparison });
      }
    });
    return () => {
      current = false;
    };
  }, [service, officialId, alternativeId, maxLength]);

  if (catalog === null) {
    return <MutedText>Cargando las gramáticas…</MutedText>;
  }
  if (official === undefined || alternative === undefined) {
    return <MutedText>Este género tiene una sola gramática: no hay nada que comparar.</MutedText>;
  }
  const [first, second] = [shortLabel(alternative), shortLabel(official)];
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Búsquedas acotadas sobre las dos gramáticas del género: prueban todas las oraciones hasta
        largo k. Encontrar algo demuestra; no encontrar nada hasta k no demuestra nada.
      </p>
      <LengthSelector value={maxLength} onChange={setMaxLength} />
      {searches === null ? (
        <MutedText>Buscando…</MutedText>
      ) : (
        <>
          <Panel title={`Testigo de ambigüedad hasta largo ${searches.maxLength}`}>
            <div className="grid gap-3 md:grid-cols-2">
              <AmbiguityCard
                grammarLabel={alternative.label}
                witness={searches.witnesses[0]}
                maxLength={searches.maxLength}
              />
              <AmbiguityCard
                grammarLabel={official.label}
                witness={searches.witnesses[1]}
                maxLength={searches.maxLength}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Que G1 no es ambigua sí está demostrado para todo largo: es LL(1) (pestaña LL(1)).
            </p>
          </Panel>
          <Panel title={`L(${first}) y L(${second}) hasta largo ${searches.maxLength}`}>
            <div className="space-y-3">
              <ComparisonVerdict
                first={first}
                second={second}
                differences={
                  searches.comparison.onlyInFirst.length + searches.comparison.onlyInSecond.length
                }
                maxLength={searches.maxLength}
              />
              <div className="grid gap-3 md:grid-cols-2">
                <SentenceList
                  title={`Relatos que solo genera ${first}`}
                  sentences={searches.comparison.onlyInFirst}
                />
                <SentenceList
                  title={`Relatos que solo genera ${second}`}
                  sentences={searches.comparison.onlyInSecond}
                />
              </div>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
