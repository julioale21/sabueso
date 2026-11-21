// Public API of the core: what other packages (the web app of SPEC 03, the controlled
// Spanish of SPEC 04) can import. Everything else is internal.

// Grammars: build them in code or read them from a .grammar text.
export { buildGrammar, formatProduction, GrammarBuildError } from './grammar/build.js';
export type { GrammarRule, RightSideSymbol } from './grammar/build.js';
export { AUGMENTED_START } from './grammar/types.js';
export type { Grammar, Production, SymbolName } from './grammar/types.js';
export { parseGrammarText } from './grammar-format/parser.js';
export type { ParserTraceStep } from './grammar-format/parser.js';
export { GrammarSyntaxError, tokenizeGrammar } from './grammar-format/lexer.js';
export type { Token, TokenKind } from './grammar-format/lexer.js';

// The generic DFA executor (reused by SPEC 04).
export {
  AutomatonStoppedError,
  runDeterministicAutomaton,
} from './automata/deterministic-finite-automaton.js';
export type {
  AutomatonEvent,
  AutomatonRun,
  AutomatonToken,
  DeterministicAutomatonDefinition,
} from './automata/deterministic-finite-automaton.js';

// The analysis of a grammar (steps 7 to 12).
export { analyzeGrammar } from './analysis/index.js';
export type { GrammarAnalysis } from './analysis/index.js';
export type { PredictiveTable, PredictiveTableConflict } from './analysis/predictive-table.js';

// A story: the whole analysis in one call (steps 6 and 13 to 21).
export { parse } from './parse.js';
export type { ParseOptions, ParseResult } from './parse.js';
export { checkAlphabet, tokenizeSequence } from './input/sequence.js';
export type { ParseError } from './earley/diagnostics.js';
export type { Chart, EarleySet } from './earley/chart.js';
export type { EarleyItem, Link } from './earley/item.js';
export { dottedRule, label } from './earley/item.js';
export type { TraceEvent, TraceOperation } from './earley/trace.js';
export type { ParseTree, TreeCount } from './trees/tree.js';
export type { DerivationStep } from './trees/derivation.js';
export { renderDerivation } from './trees/derivation.js';
export { renderTree } from './trees/render.js';

// The Chomsky normal form: the six steps one by one (steps 23 and 24) and the whole conversion.
export { addNewStart, NEW_START } from './chomsky-normal-form/add-new-start.js';
export { removeEpsilonProductions } from './chomsky-normal-form/remove-epsilon-productions.js';
export {
  computeUnitPairs,
  removeUnitProductions,
} from './chomsky-normal-form/remove-unit-productions.js';
export { removeUselessSymbols } from './chomsky-normal-form/remove-useless-symbols.js';
export { isolateTerminals, TERMINAL_PREFIX } from './chomsky-normal-form/isolate-terminals.js';
export { binarize, CHAIN_PREFIX } from './chomsky-normal-form/binarize.js';
export {
  CHOMSKY_NORMAL_FORM_STEPS,
  isChomskyNormalForm,
  productionsOutsideChomskyNormalForm,
  toChomskyNormalForm,
} from './chomsky-normal-form/index.js';
export type {
  ChomskyNormalFormResult,
  ChomskyNormalFormStep,
  ChomskyNormalFormStepName,
} from './chomsky-normal-form/index.js';

// CYK, on a grammar in Chomsky normal form (step 25).
export { recognizeCockeYoungerKasami } from './cocke-younger-kasami/recognizer.js';
export type { CockeYoungerKasamiResult } from './cocke-younger-kasami/recognizer.js';

// The pushdown automaton of a grammar, and its simulation (step 26).
export { buildPushdownAutomaton } from './pushdown-automaton/build.js';
export type { PushdownAutomaton, PushdownTransition } from './pushdown-automaton/build.js';
export { DEFAULT_MAX_STEPS, simulatePushdownAutomaton } from './pushdown-automaton/simulate.js';

// The bounded searches: semidecisions of undecidable problems (step 27).
export { compareSentences, DEFAULT_MAX_FORMS, generateSentences } from './bounded/generate.js';
export { findAmbiguityWitness } from './bounded/ambiguity.js';
export type { AmbiguityWitness } from './bounded/ambiguity.js';
export { compareLanguages } from './bounded/compare.js';
export type { LanguageComparison } from './bounded/compare.js';

// Differential testing of the three recognizers, and timing (step 28).
export { allStrings, runDifferential } from './differential/differential.js';
export type { DifferentialReport, Discrepancy } from './differential/differential.js';
export { benchmark } from './performance/benchmark.js';
export type { BenchmarkResult } from './performance/benchmark.js';
export type {
  InstantaneousDescription,
  PathStep,
  PushdownRun,
} from './pushdown-automaton/simulate.js';

// The catalog of genres.
export { genres } from './genres/catalog.js';
export type { Genre, TagInfo } from './genres/types.js';

// The command-line infrastructure (reused by SPEC 04 to add its commands).
export { createCommandLineProgram } from './command-line/run.js';
export type { CommandLineProgramOptions } from './command-line/run.js';
export { EXIT_CODES } from './command-line/types.js';
export type { Command, CommandLineEnvironment } from './command-line/types.js';
export { formatSet, formatTable } from './command-line/format.js';
