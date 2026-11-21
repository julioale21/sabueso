// Remembering the grammar and the story in localStorage (SPEC 03, step 4).
import { describe, expect, it } from 'vitest';
import { loadPersistedState, savePersistedState, STORAGE_KEY } from '../src/state/persistence';

/** An in-memory storage, like localStorage. */
function memoryStorage(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      items.set(key, value);
    },
  };
}

const knownGrammarIds = ['detective/g1', 'detective/g0'];
const saved = { genreId: 'detective', grammarId: 'detective/g0', input: 'CRI SOS PIS INT REV' };

describe('persistence', () => {
  it('saves and recovers the grammar and the story, under sabueso:v1', () => {
    const storage = memoryStorage();
    savePersistedState({ state: saved, storage: () => storage });
    expect(JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}')).toEqual({ version: 1, ...saved });
    expect(loadPersistedState({ knownGrammarIds, storage: () => storage })).toEqual({
      version: 1,
      ...saved,
    });
  });

  it('returns null when nothing was saved', () => {
    expect(loadPersistedState({ knownGrammarIds, storage: () => memoryStorage() })).toBeNull();
  });

  it('a storage that throws (private mode, quota) breaks nothing', () => {
    const throwing = () => {
      throw new Error('blocked');
    };
    expect(() => {
      savePersistedState({ state: saved, storage: throwing });
    }).not.toThrow();
    expect(loadPersistedState({ knownGrammarIds, storage: throwing })).toBeNull();
  });

  it.each([
    ['another version', JSON.stringify({ version: 2, ...saved })],
    ['a broken value', '{not json'],
    ['a missing field', JSON.stringify({ version: 1, genreId: 'detective' })],
    [
      'a grammar that no longer exists',
      JSON.stringify({ version: 1, ...saved, grammarId: 'meta' }),
    ],
  ])('ignores %s', (_case, text) => {
    const storage = memoryStorage({ [STORAGE_KEY]: text });
    expect(loadPersistedState({ knownGrammarIds, storage: () => storage })).toBeNull();
  });
});
