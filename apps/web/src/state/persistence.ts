/**
 * Remembers the grammar and the story between visits, in localStorage under 'sabueso:v1'
 * (SPEC 03, section 4). Results are not saved: they are recomputed. If the storage is blocked
 * or full, the page works the same, without saving and without showing errors.
 */
import type { GrammarId } from '../analysis/service';
import type { AppState } from './app-state';

export const STORAGE_KEY = 'sabueso:v1';

export interface PersistedState {
  version: 1;
  genreId: string;
  grammarId: GrammarId;
  input: string;
}

/** How to reach the storage; accessing localStorage itself can throw (private mode). */
type StorageAccess = () => Pick<Storage, 'getItem' | 'setItem'>;

const browserStorage: StorageAccess = () => window.localStorage;

/**
 * The saved grammar and story, or null when there is nothing valid: no entry, another
 * version, a broken value, a grammar that no longer exists, or a storage that throws.
 */
export function loadPersistedState({
  knownGrammarIds,
  storage = browserStorage,
}: {
  /** The grammars the page can show; a saved one that is not here is ignored. */
  knownGrammarIds: readonly GrammarId[];
  storage?: StorageAccess | undefined;
}): PersistedState | null {
  try {
    const text = storage().getItem(STORAGE_KEY);
    if (text === null) {
      return null;
    }
    const value: unknown = JSON.parse(text);
    return isPersistedState(value) && knownGrammarIds.includes(value.grammarId) ? value : null;
  } catch {
    return null;
  }
}

/** Saves the grammar and the story; a storage that throws is ignored. */
export function savePersistedState({
  state,
  storage = browserStorage,
}: {
  state: Pick<AppState, 'genreId' | 'grammarId' | 'input'>;
  storage?: StorageAccess | undefined;
}): void {
  const persisted: PersistedState = {
    version: 1,
    genreId: state.genreId,
    grammarId: state.grammarId,
    input: state.input,
  };
  try {
    storage().setItem(STORAGE_KEY, JSON.stringify(persisted));
  } catch {
    // Blocked or full: the page goes on without remembering.
  }
}

/** Whether a parsed value has exactly the saved shape, version 1. */
function isPersistedState(value: unknown): value is PersistedState {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    record.version === 1 &&
    typeof record.genreId === 'string' &&
    typeof record.grammarId === 'string' &&
    typeof record.input === 'string'
  );
}
