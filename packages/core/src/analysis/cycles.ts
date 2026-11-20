/**
 * Concept: cycles A ⇒+ A, the grammars with infinitely many trees for some string.
 * Reference: SPEC 02, section 3.9.
 * Card: docs/concepts/09-cycles.md
 */
import type { Grammar, Production, SymbolName } from '../grammar/types.js';
import { computeNullable } from './nullable.js';

/**
 * The unit graph: an edge A → B for each production A → α B β where α and β are nullable.
 * Following an edge means "A can turn into B and nothing else", since α and β can vanish.
 */
export type UnitGraph = Map<SymbolName, SymbolName[]>;

/**
 * The cycles A ⇒+ A of the grammar, one for each back edge a depth-first search finds in
 * the unit graph. Each cycle lists its symbols in order: [S, A] means S ⇒+ A ⇒+ S.
 * An empty list means the grammar has no cycles.
 */
export function findCycles(grammar: Grammar): SymbolName[][] {
  // A cycle A ⇒+ A derives A again without producing anything else, so it can be repeated
  // as many times as wanted: some string then has infinitely many trees. The unit graph
  // keeps exactly the steps that produce nothing else, and a cycle in it is such a loop.
  const graph = buildUnitGraph(grammar, computeNullable(grammar));
  const search = new CycleSearch(graph);
  for (const symbol of grammar.nonterminals) {
    search.visit(symbol);
  }
  return search.cycles;
}

/** One edge A → B for each B in a right side whose other symbols are all nullable. */
export function buildUnitGraph(grammar: Grammar, nullable: ReadonlySet<SymbolName>): UnitGraph {
  const graph: UnitGraph = new Map();
  for (const nonterminal of grammar.nonterminals) {
    graph.set(nonterminal, []);
  }
  for (const production of grammar.productions) {
    for (const target of unitTargets(production, grammar, nullable)) {
      const edges = graph.get(production.leftSide) ?? [];
      if (!edges.includes(target)) {
        edges.push(target);
      }
    }
  }
  return graph;
}

/** The nonterminals B of A → α B β such that α and β are nullable: A can become just B. */
function unitTargets(
  production: Production,
  grammar: Grammar,
  nullable: ReadonlySet<SymbolName>,
): SymbolName[] {
  const symbols = production.rightSide;
  return symbols.filter(
    (symbol, position) =>
      grammar.nonterminals.has(symbol) &&
      symbols.every((other, index) => index === position || nullable.has(other)),
  );
}

/**
 * Depth-first search that records a cycle each time it reaches a symbol that is still on
 * the current path (a back edge).
 */
class CycleSearch {
  readonly cycles: SymbolName[][] = [];
  /** The symbols of the current path, from the first one visited. */
  private readonly path: SymbolName[] = [];
  /** Symbols whose search already finished: nothing new can be found from them. */
  private readonly finished = new Set<SymbolName>();

  constructor(private readonly graph: UnitGraph) {}

  /** Visits a symbol: follows each of its edges, then marks it as finished. */
  visit(symbol: SymbolName): void {
    if (this.finished.has(symbol)) {
      return;
    }
    const position = this.path.indexOf(symbol);
    if (position !== -1) {
      // Back edge: the path from that symbol to here, plus this edge, closes a cycle.
      this.cycles.push(this.path.slice(position));
      return;
    }
    this.path.push(symbol);
    for (const next of this.graph.get(symbol) ?? []) {
      this.visit(next);
    }
    this.path.pop();
    this.finished.add(symbol);
  }
}
