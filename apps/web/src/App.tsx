/** The page: the header and one tab per view (SPEC 03, section 3.1). */
import { useReducer } from 'react';
import { AnalysisServiceProvider } from './analysis/context';
import { createLocalAnalysisService } from './analysis/local-service';
import { AppHeader } from './components/AppHeader';
import { Tabs } from './components/ui/Tabs';
import { appReducer, createInitialState } from './state/app-state';
import { viewTabs } from './views/view-tabs';

/** The only place that chooses how the core runs: here, in the browser (SPEC 03, section 3.2). */
const analysisService = createLocalAnalysisService();

export function App() {
  // Saved grammar and story are connected in step 15 (SPEC 03); until then, the defaults.
  const [state, dispatch] = useReducer(appReducer, null, createInitialState);
  return (
    <AnalysisServiceProvider value={analysisService}>
      <div className="mx-auto max-w-7xl px-4 py-6">
        <AppHeader />
        <main>
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
