/**
 * The state shared by every view: the active tab, the grammar, the story being analyzed and
 * what the user picked in the result (SPEC 03, section 4). One reducer, so every change has a
 * name and a test.
 */
import type { Dispatch } from 'react';
import type { GrammarId } from '../analysis/service';

/** The views of the page (SPEC 03, section 3.4). */
export type TabId = 'analysis' | 'earley' | 'll1' | 'cnf-cyk' | 'pda' | 'compare';

export interface AppState {
  activeTab: TabId;
  /** The genre of the catalog, e.g. 'detective'. */
  genreId: string;
  /** One of the grammars of that genre, e.g. 'detective/g1'. */
  grammarId: GrammarId;
  /** The story as typed: tags separated by spaces. */
  input: string;
  /**
   * The story of the latest Analizar, or null before any. The tabs that depend on the story
   * (Earley, FNC y CYK, autómata de pila) are enabled only when there is one, and use it.
   */
  analyzedInput: string | null;
  /** Which of the trees built is shown (0, 1 or 2). */
  selectedTree: number;
  /** Draw the subtrees that only derive ε as one dimmed node (SPEC 03, section 3.3). */
  collapseEpsilon: boolean;
}

export type AppAction =
  | { type: 'select-tab'; tab: TabId }
  | { type: 'select-grammar'; genreId: string; grammarId: GrammarId }
  | { type: 'set-input'; input: string }
  | { type: 'analyze' }
  | { type: 'clear' }
  | { type: 'select-tree'; index: number }
  | { type: 'toggle-collapse-epsilon' }
  | { type: 'reset' };

/** What every view receives: the shared state and the way to change it. */
export interface ViewProps {
  state: AppState;
  dispatch: Dispatch<AppAction>;
}

/** The official grammar of the detective story: what the page shows first. */
export const DEFAULT_GRAMMAR = { genreId: 'detective', grammarId: 'detective/g1' } as const;

/** The state when the page opens: the default grammar, or what was saved last time. */
export function createInitialState(
  saved: Pick<AppState, 'genreId' | 'grammarId' | 'input'> | null,
): AppState {
  return {
    activeTab: 'analysis',
    genreId: saved?.genreId ?? DEFAULT_GRAMMAR.genreId,
    grammarId: saved?.grammarId ?? DEFAULT_GRAMMAR.grammarId,
    input: saved?.input ?? '',
    analyzedInput: null,
    selectedTree: 0,
    collapseEpsilon: true,
  };
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'select-tab':
      return { ...state, activeTab: action.tab };
    case 'select-grammar':
      // Another grammar gives other trees: back to the first one.
      return { ...state, genreId: action.genreId, grammarId: action.grammarId, selectedTree: 0 };
    case 'set-input':
      return { ...state, input: action.input, selectedTree: 0 };
    case 'analyze':
      return { ...state, analyzedInput: state.input, selectedTree: 0 };
    case 'clear':
      return { ...state, input: '', analyzedInput: null, selectedTree: 0 };
    case 'select-tree':
      return { ...state, selectedTree: Math.max(0, action.index) };
    case 'toggle-collapse-epsilon':
      return { ...state, collapseEpsilon: !state.collapseEpsilon };
    case 'reset':
      // Back to how the page opens the first time, ignoring anything saved.
      return createInitialState(null);
  }
}
