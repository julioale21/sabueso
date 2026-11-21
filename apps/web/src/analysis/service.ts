/**
 * The only door from the web to the core (SPEC 03, section 3.2). Views know this interface and
 * pass grammar ids, never grammars. It is asynchronous although the local implementation is
 * not, so that a future web API or Worker can replace it without changing any view.
 */
import type {
  AmbiguityWitness,
  ChomskyNormalFormResult,
  CockeYoungerKasamiResult,
  Genre,
  GrammarAnalysis,
  LanguageComparison,
  ParseResult,
  PushdownAutomaton,
  PushdownRun,
} from '@sabueso/core';

/** A built-in grammar of a genre: 'detective/g1', 'detective/g0'. */
export type GrammarId = string;

/** What a view needs to show a grammar: its text, its alphabet and its analysis. */
export interface LoadedGrammar {
  id: GrammarId;
  /** The .grammar file as written, for the read-only panel. */
  text: string;
  /** Σ, to mark unknown tags while the user types. */
  alphabet: string[];
  analysis: GrammarAnalysis;
}

export interface AnalysisService {
  /** The genres of the catalog and their grammars. */
  grammars(): Promise<{ genres: readonly Genre[]; grammars: LoadedGrammar[] }>;
  /** Verdict, diagnosis, tree count, the first trees and the derivation; no trace. */
  analyze(id: GrammarId, input: string): Promise<ParseResult>;
  /** The same, with every step of Earley, for the step-by-step player. */
  trace(id: GrammarId, input: string): Promise<ParseResult>;
  /** The grammar in Chomsky normal form, step by step, and CYK on the input. */
  normalFormAndCyk(
    id: GrammarId,
    input: string,
  ): Promise<{ normalForm: ChomskyNormalFormResult; cyk: CockeYoungerKasamiResult }>;
  /** The pushdown automaton of the grammar and its run on the input. */
  pushdown(
    id: GrammarId,
    input: string,
  ): Promise<{ automaton: PushdownAutomaton; run: PushdownRun }>;
  /** The shortest sentence with two or more trees, up to maxLength. */
  ambiguity(id: GrammarId, maxLength: number): Promise<AmbiguityWitness | null>;
  /** The sentences up to maxLength that only one of the two grammars generates. */
  compare(firstId: GrammarId, secondId: GrammarId, maxLength: number): Promise<LanguageComparison>;
}
