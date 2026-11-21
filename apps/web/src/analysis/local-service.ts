/**
 * The AnalysisService that runs the core in the browser, in the same thread (SPEC 03,
 * section 3.2). The grammars of the catalog are read as text and parsed once, when the service
 * is created. Each operation is one call to the public API of the core: no logic of its own.
 */
import {
  analyzeGrammar,
  buildPushdownAutomaton,
  compareLanguages,
  findAmbiguityWitness,
  genres,
  parse,
  parseGrammarText,
  recognizeCockeYoungerKasami,
  simulatePushdownAutomaton,
  toChomskyNormalForm,
  tokenizeSequence,
  type Grammar,
} from '@sabueso/core';
import type { AnalysisService, GrammarId, LoadedGrammar } from './service';

/** How many trees analyze builds: the core default (SPEC 03, section 3.4). */
const TREES_TO_SHOW = 3;

/** The .grammar files of the genres, as text: 'detective/g1' ↦ its source. */
const GENRE_GRAMMAR_FILES = import.meta.glob<string>(
  '../../../../packages/core/grammars/genres/*/*.grammar',
  { query: '?raw', import: 'default', eager: true },
);

/**
 * Runs the work after the current task and returns its result as a promise; an error becomes
 * a rejection. The local service computes synchronously, but answers like a remote one would.
 */
function later<T>(work: () => T): Promise<T> {
  return Promise.resolve().then(work);
}

/** '…/grammars/genres/detective/g1.grammar' → 'detective/g1'. */
function grammarIdOf(path: string): GrammarId {
  return path.replace(/^.*\/genres\//, '').replace(/\.grammar$/, '');
}

/** The ids the catalog uses: the official and the alternative grammar of each genre. */
function catalogGrammarIds(): GrammarId[] {
  return genres.flatMap((genre) =>
    genre.alternativeGrammar === undefined
      ? [genre.officialGrammar]
      : [genre.officialGrammar, genre.alternativeGrammar],
  );
}

/** Parses one grammar and keeps what the views show about it. */
function loadGrammar({ id, text }: { id: GrammarId; text: string }): {
  loaded: LoadedGrammar;
  grammar: Grammar;
} {
  const grammar = parseGrammarText({ text, name: id });
  return {
    grammar,
    loaded: { id, text, alphabet: [...grammar.terminals], analysis: analyzeGrammar(grammar) },
  };
}

export function createLocalAnalysisService(): AnalysisService {
  const texts = new Map(
    Object.entries(GENRE_GRAMMAR_FILES).map(([path, text]) => [grammarIdOf(path), text]),
  );
  const grammars = new Map(
    catalogGrammarIds().map((id) => {
      const text = texts.get(id);
      if (text === undefined) {
        throw new Error(`The catalog names the grammar "${id}", but its .grammar file is missing`);
      }
      return [id, loadGrammar({ id, text })];
    }),
  );
  const grammarOf = (id: GrammarId): Grammar => {
    const entry = grammars.get(id);
    if (entry === undefined) {
      throw new Error(`Unknown grammar "${id}"`);
    }
    return entry.grammar;
  };

  return {
    grammars: () =>
      later(() => ({ genres, grammars: [...grammars.values()].map((entry) => entry.loaded) })),
    analyze: (id, input) =>
      later(() => parse({ grammar: grammarOf(id), input, options: { maxTrees: TREES_TO_SHOW } })),
    trace: (id, input) =>
      later(() => parse({ grammar: grammarOf(id), input, options: { maxTrees: 1, trace: true } })),
    normalFormAndCyk: (id, input) =>
      later(() => {
        const normalForm = toChomskyNormalForm(grammarOf(id));
        const cyk = recognizeCockeYoungerKasami({
          grammar: normalForm.grammar,
          tokens: tokenizeSequence(input),
        });
        return { normalForm, cyk };
      }),
    pushdown: (id, input) =>
      later(() => {
        const grammar = grammarOf(id);
        return {
          automaton: buildPushdownAutomaton(grammar),
          run: simulatePushdownAutomaton({ grammar, tokens: tokenizeSequence(input) }),
        };
      }),
    ambiguity: (id, maxLength) =>
      later(() => findAmbiguityWitness({ grammar: grammarOf(id), maxLength })),
    compare: (firstId, secondId, maxLength) =>
      later(() =>
        compareLanguages({ first: grammarOf(firstId), second: grammarOf(secondId), maxLength }),
      ),
  };
}
