// The shared state of the page and its reducer (SPEC 03, step 4).
import { describe, expect, it } from 'vitest';
import { appReducer, createInitialState, DEFAULT_GRAMMAR } from '../src/state/app-state';

describe('createInitialState', () => {
  it('opens on Análisis with G1 and an empty story ', () => {
    expect(createInitialState()).toEqual({
      activeTab: 'analysis',
      genreId: 'detective',
      grammarId: 'detective/g1',
      input: '',
      analyzedInput: null,
      selectedTree: 0,
      collapseEpsilon: false,
      analysisRequest: 0,
    });
  });
});

describe('appReducer', () => {
  const state = { ...createInitialState(), selectedTree: 2 };

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

  it('analyze keeps the typed story as the analyzed one; clear empties both', () => {
    const typed = { ...state, input: 'CRI PIS REV' };
    expect(appReducer(typed, { type: 'analyze' }).analyzedInput).toBe('CRI PIS REV');
    expect(appReducer({ ...typed, analyzedInput: 'CRI PIS REV' }, { type: 'clear' })).toMatchObject(
      { input: '', analyzedInput: null, selectedTree: 0 },
    );
  });

  it('select-tree picks a tree, never below 0', () => {
    expect(appReducer(state, { type: 'select-tree', index: 1 }).selectedTree).toBe(1);
    expect(appReducer(state, { type: 'select-tree', index: -1 }).selectedTree).toBe(0);
  });

  it('analyze counts the request, so the same story can be analyzed again', () => {
    const once = appReducer({ ...state, input: 'CRI PIS REV' }, { type: 'analyze' });
    const twice = appReducer(once, { type: 'analyze' });
    expect([once.analysisRequest, twice.analysisRequest]).toEqual([1, 2]);
    expect(twice.analyzedInput).toBe('CRI PIS REV');
  });

  it('toggle-collapse-epsilon flips the option', () => {
    expect(appReducer(state, { type: 'toggle-collapse-epsilon' }).collapseEpsilon).toBe(true);
  });

  it('reset goes back to the initial state, whatever changed', () => {
    const changed = {
      ...state,
      activeTab: 'll1' as const,
      grammarId: 'detective/g0',
      input: 'CRI SOS PIS INT REV',
      collapseEpsilon: false,
    };
    expect(appReducer(changed, { type: 'reset' })).toEqual(createInitialState());
  });

  it('does not change the state it receives', () => {
    const before = createInitialState();
    appReducer(before, { type: 'set-input', input: 'CRI' });
    expect(before).toEqual(createInitialState());
    expect(DEFAULT_GRAMMAR.grammarId).toBe('detective/g1');
  });
});
