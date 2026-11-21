/**
 * FNC y CYK (SPEC 03, section 3.4): the six steps that bring the grammar to Chomsky normal form,
 * the triangular CYK table of the analyzed story, and the CYK tree next to the Earley tree.
 * Concepts: Chomsky normal form and CYK (cards 22 and 23). Everything comes from the core.
 */
import { useEffect, useState } from 'react';
import { useAnalysisService } from '../analysis/context';
import type { AnalysisService, StoryAnalysis } from '../analysis/service';
import { CykPlayer } from '../components/cnf-cyk/CykPlayer';
import { CykVerdict } from '../components/cnf-cyk/CykVerdict';
import { NormalFormSteps } from '../components/cnf-cyk/NormalFormSteps';
import { TreeComparison } from '../components/cnf-cyk/TreeComparison';
import { MutedText } from '../components/ui/MutedText';
import { Panel } from '../components/ui/Panel';
import type { ViewProps } from '../state/app-state';

type NormalFormAndCyk = Awaited<ReturnType<AnalysisService['normalFormAndCyk']>>;

interface CnfCykData {
  conversion: NormalFormAndCyk;
  earley: StoryAnalysis;
}

export function CnfCykView({ state }: ViewProps) {
  const service = useAnalysisService();
  // The story of the latest Analizar (the tab is disabled before it).
  const input = state.analyzedInput ?? '';
  const [data, setData] = useState<CnfCykData | null>(null);

  useEffect(() => {
    let current = true;
    void Promise.all([
      service.normalFormAndCyk(state.grammarId, input),
      service.analyze(state.grammarId, input),
    ]).then(([conversion, earley]) => {
      if (current) {
        setData({ conversion, earley });
      }
    });
    return () => {
      current = false;
    };
  }, [service, state.grammarId, input]);

  if (data === null) {
    return <MutedText>Convirtiendo la gramática…</MutedText>;
  }
  const { original, normalForm, cyk } = data.conversion;
  const tokens = data.earley.tokens;
  const earleyTree = data.earley.accepted ? data.earley.trees[0] : undefined;
  return (
    <div className="space-y-4">
      <Panel
        title={`Forma normal de Chomsky · de ${original.productions.length} a ${normalForm.grammar.productions.length} producciones`}
      >
        <NormalFormSteps original={original} normalForm={normalForm} />
      </Panel>
      <Panel title={`CYK · ${input.trim() === '' ? 'ε (relato vacío)' : input}`}>
        <div className="space-y-3">
          <CykVerdict
            accepted={cyk.accepted}
            start={normalForm.grammar.start}
            length={tokens.length}
          />
          {tokens.length === 0 ? (
            <MutedText>Con el relato vacío la tabla no tiene celdas: decide S → ε.</MutedText>
          ) : (
            <CykPlayer table={cyk.table} tokens={tokens} />
          )}
        </div>
      </Panel>
      {cyk.tree !== null && earleyTree !== undefined && (
        <Panel title="El mismo relato, dos árboles">
          <TreeComparison
            cykTree={cyk.tree}
            earleyTree={earleyTree}
            collapseEpsilon={state.collapseEpsilon}
          />
        </Panel>
      )}
    </div>
  );
}
