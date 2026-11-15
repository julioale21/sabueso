// Public API of the core: what other packages (the web app) can import.
export { buildGrammar, formatProduction, GrammarBuildError } from './grammar/build.js';
export type { GrammarRule, RightSideSymbol } from './grammar/build.js';
export type { Grammar, Production, SymbolName } from './grammar/types.js';
