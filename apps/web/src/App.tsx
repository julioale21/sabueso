/** The page: the header and one tab per view (SPEC 03, section 3.1). */
import { useEffect, useReducer, useState } from 'react';
import { AnalysisServiceProvider } from './analysis/context';
import { createLocalAnalysisService } from './analysis/local-service';
import { useAnalyze } from './analysis/use-analyze';
import { AppHeader } from './components/AppHeader';
import { Tabs } from './components/ui/Tabs';
import { appReducer, createInitialState } from './state/app-state';
import { viewTabs } from './views/view-tabs';

/** The only place that chooses how the core runs: here, in the browser (SPEC 03, section 3.2). */
const analysisService = createLocalAnalysisService();

export function App() {
  return (
    <AnalysisServiceProvider value={analysisService}>
      <Page />
    </AnalysisServiceProvider>
  );
}

/** The state of the page, the analysis of the story and the views (inside the provider). */
function Page() {
  // Nothing is saved between visits: the page always opens with G1 and an empty story.
  const [state, dispatch] = useReducer(appReducer, undefined, createInitialState);
  // The analysis lives here, not in the Análisis view: changing tabs unmounts the view, and
  // its result must still be there when the user comes back (SPEC 06, W2).
  const analysis = useAnalyze();
  const { analyze } = analysis;

  // Analyze when the user presses Analizar (analysisRequest) and when the grammar changes
  // with a story already analyzed. Nothing else triggers it: coming back to a tab does not.
  useEffect(() => {
    if (state.analyzedInput !== null) {
      analyze(state.grammarId, state.analyzedInput);
    }
  }, [analyze, state.grammarId, state.analyzedInput, state.analysisRequest]);

  // Each reset mounts the views again, so their own state (selected steps, players) goes too.
  const [resets, setResets] = useState(0);
  const reset = () => {
    dispatch({ type: 'reset' });
    analysis.reset();
    setResets((count) => count + 1);
  };
  return (
    <div className="px-4 py-6">
      <AppHeader onReset={reset} />
      <main key={resets}>
        <Tabs
          label="Vistas"
          items={viewTabs({ state, dispatch, analysis })}
          activeId={state.activeTab}
          onChange={(tab) => {
            dispatch({ type: 'select-tab', tab });
          }}
        />
      </main>
    </div>
  );
}
