/** The page: the header and one tab per view (SPEC 03, section 3.1). */
import { useReducer, useState } from 'react';
import { AnalysisServiceProvider } from './analysis/context';
import { createLocalAnalysisService } from './analysis/local-service';
import { AppHeader } from './components/AppHeader';
import { Tabs } from './components/ui/Tabs';
import { appReducer, createInitialState } from './state/app-state';
import { viewTabs } from './views/view-tabs';

/** The only place that chooses how the core runs: here, in the browser (SPEC 03, section 3.2). */
const analysisService = createLocalAnalysisService();

export function App() {
  // Nothing is saved between visits: the page always opens with G1 and an empty story.
  const [state, dispatch] = useReducer(appReducer, undefined, createInitialState);
  // Each reset mounts the views again, so their own state (results, selected steps) goes too.
  const [resets, setResets] = useState(0);
  const reset = () => {
    dispatch({ type: 'reset' });
    setResets((count) => count + 1);
  };
  return (
    <AnalysisServiceProvider value={analysisService}>
      <div className="px-4 py-6">
        <AppHeader onReset={reset} />
        <main key={resets}>
          <Tabs
            label="Vistas"
            items={viewTabs({ state, dispatch })}
            activeId={state.activeTab}
            onChange={(tab) => {
              dispatch({ type: 'select-tab', tab });
            }}
          />
        </main>
      </div>
    </AnalysisServiceProvider>
  );
}
