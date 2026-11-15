/**
 * Concept: building G = (N, Σ, P, S) from its rules, with the .glc terminal convention.
 * Reference: Hopcroft 5.1; Augusto 2.4.
 * Card: docs/concepts/02-context-free-grammar.md
 */
import type { Grammar, Production, SymbolName } from './types.js';

/**
 * A symbol on the right-hand side of a rule. A plain identifier is a nonterminal if it is
 * the left-hand side of some rule, and a terminal otherwise. A literal ('+' in .glc) is
 * always a terminal, named by its content without quotes.
 */
export type RightSideSymbol = SymbolName | { literal: string };

/** One production as written: left side → right side. An empty right side is an ε-production. */
export interface GrammarRule {
  leftSide: SymbolName;
  rightSide: readonly RightSideSymbol[];
}

/** A grammar that cannot be built: its message names the offending symbol or production. */
export class GrammarBuildError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GrammarBuildError';
  }
}

/** What is known about the symbols before reading the right-hand sides. */
interface SymbolTable {
  nonterminals: ReadonlySet<SymbolName>;
  /** The %terminals declaration, if the grammar has one. */
  declaredTerminals: ReadonlySet<SymbolName> | undefined;
  /** Σ, filled while the right-hand sides are resolved. */
  terminals: Set<SymbolName>;
}

/**
 * Builds a grammar from its rules:
 *
 * 1. N is the set of left-hand sides.
 * 2. Every other symbol goes to Σ. With %terminals, an undeclared identifier is an error,
 *    so a misspelled nonterminal cannot silently become a terminal.
 * 3. P is numbered in order, without repeated productions.
 * 4. S defaults to the left-hand side of the first rule, and must be a nonterminal.
 */
export function buildGrammar(
  name: string,
  rules: readonly GrammarRule[],
  start?: SymbolName,
  declaredTerminals?: Iterable<SymbolName>,
): Grammar {
  const firstRule = requireAtLeastOneRule(name, rules);
  const symbols = createSymbolTable(rules, declaredTerminals);
  const productions = createProductions(rules, symbols);
  rejectDuplicateProductions(productions);

  return {
    name,
    start: requireNonterminalStart(start ?? firstRule.leftSide, symbols.nonterminals),
    nonterminals: symbols.nonterminals,
    terminals: symbols.terminals,
    productions,
    productionsByLeftSide: groupByLeftSide(symbols.nonterminals, productions),
  };
}

/** Renders a production as in the theory: 'E → E + T', or 'A → ε' for an empty right side. */
export function formatProduction(production: Production): string {
  const rightSide = production.rightSide.length === 0 ? 'ε' : production.rightSide.join(' ');
  return `${production.leftSide} → ${rightSide}`;
}

function requireAtLeastOneRule(name: string, rules: readonly GrammarRule[]): GrammarRule {
  const firstRule = rules[0];
  if (firstRule === undefined) {
    throw new GrammarBuildError(`Grammar "${name}" has no rules`);
  }
  return firstRule;
}

function createSymbolTable(
  rules: readonly GrammarRule[],
  declaredTerminals: Iterable<SymbolName> | undefined,
): SymbolTable {
  const nonterminals = collectNonterminals(rules);
  const declared = declaredTerminals === undefined ? undefined : new Set(declaredTerminals);
  declared?.forEach((terminal) => checkDeclaredTerminal(terminal, nonterminals));
  return { nonterminals, declaredTerminals: declared, terminals: new Set(declared) };
}

/** N: a symbol is a nonterminal exactly when it is the left-hand side of some rule. */
function collectNonterminals(rules: readonly GrammarRule[]): Set<SymbolName> {
  const nonterminals = new Set<SymbolName>();
  for (const rule of rules) {
    rejectReservedName(rule.leftSide);
    nonterminals.add(rule.leftSide);
  }
  return nonterminals;
}

function checkDeclaredTerminal(terminal: SymbolName, nonterminals: ReadonlySet<SymbolName>): void {
  rejectReservedName(terminal);
  if (nonterminals.has(terminal)) {
    throw new GrammarBuildError(
      `"${terminal}" is declared as a terminal but is the left-hand side of a rule`,
    );
  }
}

function createProductions(rules: readonly GrammarRule[], symbols: SymbolTable): Production[] {
  return rules.map((rule, index) => ({
    id: index,
    leftSide: rule.leftSide,
    rightSide: rule.rightSide.map((symbol) => resolveRightSideSymbol(symbol, symbols)),
  }));
}

/** Returns the name of a right-hand-side symbol, adding it to Σ when it is a terminal. */
function resolveRightSideSymbol(symbol: RightSideSymbol, symbols: SymbolTable): SymbolName {
  const name =
    typeof symbol === 'string'
      ? resolveIdentifier(symbol, symbols)
      : resolveLiteral(symbol.literal, symbols);
  if (!symbols.nonterminals.has(name)) {
    symbols.terminals.add(name);
  }
  return name;
}

function resolveIdentifier(identifier: SymbolName, symbols: SymbolTable): SymbolName {
  rejectReservedName(identifier);
  const isTerminal = !symbols.nonterminals.has(identifier);
  const isUndeclared =
    symbols.declaredTerminals !== undefined && !symbols.declaredTerminals.has(identifier);
  if (isTerminal && isUndeclared) {
    throw new GrammarBuildError(
      `Undeclared symbol "${identifier}": it is not the left-hand side of any rule and is not listed in %terminals`,
    );
  }
  return identifier;
}

function resolveLiteral(literal: string, symbols: SymbolTable): SymbolName {
  if (literal === '') {
    throw new GrammarBuildError('Empty literal: write ε for the empty string');
  }
  rejectReservedName(literal);
  if (symbols.nonterminals.has(literal)) {
    throw new GrammarBuildError(`Literal '${literal}' has the same name as a nonterminal`);
  }
  return literal;
}

function rejectDuplicateProductions(productions: readonly Production[]): void {
  const seen = new Set<string>();
  for (const production of productions) {
    const key = JSON.stringify([production.leftSide, ...production.rightSide]);
    if (seen.has(key)) {
      throw new GrammarBuildError(`Duplicate production: ${formatProduction(production)}`);
    }
    seen.add(key);
  }
}

/** S must be a nonterminal, or nothing could be derived from it. */
function requireNonterminalStart(
  start: SymbolName,
  nonterminals: ReadonlySet<SymbolName>,
): SymbolName {
  if (!nonterminals.has(start)) {
    throw new GrammarBuildError(`Start symbol "${start}" is not the left-hand side of any rule`);
  }
  return start;
}

function groupByLeftSide(
  nonterminals: ReadonlySet<SymbolName>,
  productions: readonly Production[],
): Map<SymbolName, Production[]> {
  const productionsByLeftSide = new Map<SymbolName, Production[]>();
  for (const nonterminal of nonterminals) {
    productionsByLeftSide.set(nonterminal, []);
  }
  for (const production of productions) {
    productionsByLeftSide.get(production.leftSide)?.push(production);
  }
  return productionsByLeftSide;
}

/** '$' is reserved for the end marker of FOLLOW and for the augmented start symbol $S. */
function rejectReservedName(symbol: SymbolName): void {
  if (symbol.includes('$')) {
    throw new GrammarBuildError(`"${symbol}" contains '$', which is reserved`);
  }
}
