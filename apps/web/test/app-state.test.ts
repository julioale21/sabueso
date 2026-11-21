// The shared state of the page and its reducer (SPEC 03, step 4).
import { describe, expect, it } from 'vitest';
import { appReducer, createInitialState, DEFAULT_GRAMMAR } from '../src/state/app-state';

describe('createInitialState', () => {
  it('opens on Análisis with G1 and an empty story when nothing was saved', () => {
    expect(createInitialState(null)).toEqual({
      activeTab: 'analysis',
      genreId: 'detective',
      grammarId: 'detective/g1',
      input: '',
      selectedTree: 0,
      collapseEpsilon: true,
    });
  });

  it('starts from what was saved', () => {
    const state = createInitialState({
      genreId: 'detective',
      grammarId: 'detective/g0',
      input: 'CRI SOS PIS INT REV',
    });
    expect(state.grammarId).toBe('detective/g0');
    expect(state.input).toBe('CRI SOS PIS INT REV');
  });
});

describe('appReducer', () => {
  const state = { ...createInitialState(null), selectedTree: 2 };

  it('select-tab changes the view and keeps the story', () => {
    const next = appReducer({ ...state, input: 'CRI PIS REV' }, { type: 'select-tab', tab: 'll1' });
    expect(next.activeTab).toBe('ll1');
    expect(next.input).toBe('CRI PIS REV');
  });

  it('select-grammar and set-input go back to the first tree', () => {
    expect(
      appReducer(state, {
        type: 'select-grammar',
        genreId: 'detective',
        grammarId: 'detective/g0',
      }),
    ).toMatchObject({ grammarId: 'detective/g0', selectedTree: 0 });
    expect(appReducer(state, { type: 'set-input', input: 'CRI REV' })).toMatchObject({
      input: 'CRI REV',
      selectedTree: 0,
    });
  });

  it('select-tree picks a tree, never below 0', () => {
    expect(appReducer(state, { type: 'select-tree', index: 1 }).selectedTree).toBe(1);
    expect(appReducer(state, { type: 'select-tree', index: -1 }).selectedTree).toBe(0);
  });

  it('toggle-collapse-epsilon flips the option', () => {
    expect(appReducer(state, { type: 'toggle-collapse-epsilon' }).collapseEpsilon).toBe(false);
  });

  it('does not change the state it receives', () => {
    const before = createInitialState(null);
    appReducer(before, { type: 'set-input', input: 'CRI' });
    expect(before).toEqual(createInitialState(null));
    expect(DEFAULT_GRAMMAR.grammarId).toBe('detective/g1');
  });
});
