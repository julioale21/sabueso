/**
 * The CYK tree (over the grammar in FNC) next to the Earley tree (over the grammar as written),
 * and the nonterminals only one of them has (card 23): the FNC tree loses the categories of
 * the genre (unit and ε steps disappear) and gains the chain symbols of BIN.
 */
import type { ParseTree } from '@sabueso/core';
import { TreeView } from '../tree-view/TreeView';

/** The symbols of the inner nodes of a tree. */
function nonterminalsOf(tree: ParseTree): Set<string> {
  return tree.kind === 'nonterminal'
    ? new Set([tree.symbol, ...tree.children.flatMap((child) => [...nonterminalsOf(child)])])
    : new Set();
}

function OnlyIn({ title, symbols }: { title: string; symbols: readonly string[] }) {
  return (
    <p className="text-xs">
      <span className="font-semibold">{title}:</span>{' '}
      <span className="font-mono">{symbols.length === 0 ? 'ninguno' : symbols.join(', ')}</span>
    </p>
  );
}

export function TreeComparison({
  cykTree,
  earleyTree,
  collapseEpsilon,
}: {
  cykTree: ParseTree;
  earleyTree: ParseTree;
  /** The same choice as in Análisis: on by default. The CYK tree has no ε to collapse. */
  collapseEpsilon: boolean;
}) {
  const cykSymbols = nonterminalsOf(cykTree);
  const earleySymbols = nonterminalsOf(earleyTree);
  return (
    <div className="space-y-3">
      <div className="space-y-4">
        <section aria-label="Árbol de CYK">
          <h3 className="mb-1 text-xs font-semibold">CYK, sobre la gramática en FNC</h3>
          <TreeView tree={cykTree} collapseEpsilon={false} highlightedExpansion={null} />
        </section>
        <section aria-label="Árbol de Earley">
          <h3 className="mb-1 text-xs font-semibold">
            Earley, sobre la gramática tal como está escrita
          </h3>
          <TreeView
            tree={earleyTree}
            collapseEpsilon={collapseEpsilon}
            highlightedExpansion={null}
          />
        </section>
      </div>
      <OnlyIn
        title="Solo en el árbol de CYK"
        symbols={[...cykSymbols].filter((s) => !earleySymbols.has(s))}
      />
      <OnlyIn
        title="Solo en el árbol de Earley"
        symbols={[...earleySymbols].filter((s) => !cykSymbols.has(s))}
      />
    </div>
  );
}
