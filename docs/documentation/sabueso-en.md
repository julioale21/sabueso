---
title: 'Sabueso'
subtitle: 'Core documentation: architecture, components and how they connect'
date: 'Fundamentos Teóricos de Informática · UNPSJB · 2026'
lang: en
---

# 1. Introduction

Sabueso decides whether a story follows the structure of a narrative genre. The reference genre is the **classic whodunit**: a crime, an investigation with clues and suspicions, and the reveal of the culprit.

Each event of the story is summarized with a **tag** (`CRI` is the crime, `PIS` a clue, `REV` the reveal), and the story is the sequence of its tags, for example `CRI PIS REV`. The tags form the alphabet Σ, and a context-free grammar G describes the well-formed stories. So "is this story a whodunit?" becomes a question from the course: **w ∈ L(G)?**

To answer it, Sabueso implements the **Earley** algorithm (Earley, 1970) from scratch, for three reasons:

- **it works for any CFG**, even an ambiguous or left-recursive one: the grammar is data written by the author;
- **it gives the parse trees**, which show the structure of the story;
- **it locates the error** when the story is not in the language.

The project includes two grammars for the whodunit. **G0**, the one from the project proposal, is natural but **ambiguous**. **G1**, the official one, is **LL(1)** and therefore unambiguous. Comparing them with the same tools is one of the main themes of the project.

This document describes the complete core (SPEC 02). Each section explains what a component does, its key functions and how it connects with the others. The details of each component (the code line by line and the theory) are in the study guides (`docs/guides/`) and in the concept cards (`docs/concepts/`); each section ends with the reference. The study guides and concept cards are written in Spanish.

# 2. Architecture

## 2.1 Packages and design principle

| Folder          | Package         | What it contains                                                                      |
| --------------- | --------------- | ------------------------------------------------------------------------------------- |
| `packages/core` | `@sabueso/core` | the engine: grammars, `.grammar` reader, analysis, Earley, trees, CNF and the console |
| `apps/web`      | `@sabueso/web`  | the web interface (Vite and React), which uses the public API of the core             |
| `specs/`        | —               | the project specs, one per stage                                                      |

**The engine is a pure library.** Its functions take data and return data: they do not read files, do not write to the terminal and do not take callbacks to report what they do. Traces, the rounds of a fixed point and the events of an automaton come back as part of the result. The console and the web app only **display** those results.

## 2.2 The complete pipeline

Each stage transforms the output of the previous one, and each one matches a concept from the course:

| Stage              | Input                 | Output                                  | Concept                    | Module                                 | Section |
| ------------------ | --------------------- | --------------------------------------- | -------------------------- | -------------------------------------- | ------- |
| Lexer              | text of a `.grammar`  | tokens                                  | DFA, regular language      | `automata/`, `grammar-format/lexer.ts` | 4       |
| Parser             | tokens                | rules and directives                    | LL(1) top-down parsing     | `grammar-format/parser.ts`             | 4       |
| Construction       | rules                 | G = (N, Σ, P, S)                        | context-free grammar       | `grammar/`                             | 3       |
| Analysis           | G                     | nullable, useless, FIRST, FOLLOW…       | least fixed point, LL(1)   | `analysis/`                            | 6       |
| Story tokenizer    | text of the story     | tags, or "symbol not in Σ"              | alphabet and string        | `input/`                               | 5       |
| Earley             | G and the tags        | chart, verdict, located error           | membership in a CFG        | `earley/`                              | 7       |
| Trees              | the chart             | trees, their number, the derivation     | parse trees, ambiguity     | `trees/`                               | 8       |
| Public API         | G and the story       | a complete result                       | (chains the stages)        | `parse.ts`, `index.ts`                 | 9       |
| CNF                | G                     | an equivalent grammar, step by step     | normal forms               | `chomsky-normal-form/`                 | 10      |
| CYK                | CNF(G) and the story  | yes or no, the table and a CNF tree     | dynamic programming        | `cocke-younger-kasami/`                | 10      |
| Pushdown automaton | G and the story       | yes, no or unknown, and the path of IDs | CFG ↔ PDA (Hopcroft 6.3.1) | `pushdown-automaton/`                  | 10      |
| Bounded searches   | G (and H), a length k | sentences, a witness, a difference      | semidecision               | `bounded/`                             | 10      |

The modules are in `packages/core/src/`. There are also `genres/` (the genre catalog) and `command-line/` (the console, section 11).

# 3. Grammars

**What it does:** represents a grammar as the 4-tuple from the theory and builds it validated, either from code or from a `.grammar` file.

**Connects with:** receives the rules from the parser (section 4) and passes G to all the following components.

## 3.1 The model and its construction

A grammar is a `Grammar` object with `nonterminals` (N), `terminals` (Σ), `productions` (P, each one `{ id, leftSide, rightSide }`) and `start` (S), plus `productionsByLeftSide`, the productions grouped by left side, to expand a nonterminal without going through P. An ε-production is one with an empty `rightSide`.

`buildGrammar({ name, rules, start?, declaredTerminals? })` builds the 4-tuple in a fixed order: N is the set of left sides; once N is known, each symbol of a right side is a nonterminal or a terminal; Σ is the terminals of P plus the declared ones; S is the one from `%start` or the first left side. If something is wrong (S without productions, a repeated production, an undeclared symbol, N ∩ Σ ≠ ∅, a symbol with `$`), it throws a `GrammarBuildError` that names the culprit.

Earley works on the **augmented** grammar, with `$S → S` (`AUGMENTED_START`). Since `$` is reserved, no grammar written by the author can use that symbol.

## 3.2 The `.grammar` format

Grammars are **data**: text files with one rule per line and alternatives separated by `|`.

```text
E -> E '+' T | T
T -> T '*' F | F
F -> '(' E ')' | 'id'
```

An identifier that is not the left side of any rule is a terminal; a quoted literal is always a terminal; `ε` is the empty string; `#` starts a comment. `%start` sets the start symbol and `%terminals` declares Σ, so that a misspelled symbol is an error. The format has its own grammar, written in the same format: `packages/core/grammars/meta.grammar`.

## 3.3 The included grammars and the catalog

The grammars are in `packages/core/grammars/`:

- **for the genres:** `g1` (official) and `g0` (from the project proposal), for the whodunit;
- **for development:** `meta`, `arithmetic`, `arithmetic-ambiguous`, `parentheses`, and test cases for each analysis: `epsilon-trap` (ε), `test-useless`, `test-empty` and `test-cyclic`.

G0 and G1 share the alphabet of 14 tags and the skeleton `Relato → Planteo Investigacion Desenlace`. They differ in the investigation:

| Aspect         | G0 (10 nonterminals, 28 productions)                    | G1 (21 nonterminals, 40 productions)                          |
| -------------- | ------------------------------------------------------- | ------------------------------------------------------------- |
| Steps          | `Pasos → Paso \| Pasos Pasos`                           | lists by right recursion                                      |
| Suspicions     | `Linea → SOS \| SOS Pasos`: it is unclear where it ends | a line goes from one `SOS` to the next one or to the solution |
| Optional parts | repeated alternatives                                   | nullable nonterminals (`MarcoOpc → Marco \| ε`)               |
| Result         | ambiguous                                               | LL(1), hence unambiguous                                      |

The catalog (`genres`) is data with each genre, its grammars and the meaning of each tag (`TagInfo`). The engine does not depend on it: adding a genre means adding its grammars and an entry in the catalog.

**Detail:** guides 02 and 05 · cards 02 and 21.

# 4. Reading the `.grammar` format

**What it does:** turns the text of a `.grammar` file into a `Grammar`.

**Connects with:** `parseGrammarText({ text, name })` chains `tokenizeGrammar(text)` → `parseGrammarFile(tokens)` → `buildGrammar`.

Reading the format is a problem on two levels, and each one uses the right tool: the "words" (names, arrows, literals) form a **regular** language, recognized by a DFA; the structure (rules, alternatives, directives) is **context-free**, and an LL(1) parser recognizes it. Errors on both levels are `GrammarSyntaxError`, with line and column.

## 4.1 The lexer: a DFA

`runDeterministicAutomaton({ automaton, text })` runs any DFA M = (Q, Σ, δ, q0, F) described as data (`DeterministicAutomatonDefinition`). It knows nothing about the format: SPEC 04 reuses it.

- **The alphabet is character classes** (`classifyCharacter`): letter, digit, quote, `%`… This way δ has 13 columns instead of one per character, and the full table can be drawn.
- **One token per run:** since a DFA only accepts or rejects, the runner starts it from q0 once per token, and moves forward while δ has a transition (the **longest match** rule, Aho et al. 3.3). If it stops in a state of F, it emits the token of that state; otherwise, it throws `AutomatonStoppedError`.
- **Returns `{ tokens, events }`:** the tokens and every transition taken. The events are what `lex --states` shows.

The lexer of the format (`grammarLexerAutomaton`) recognizes the shape of a directive (`%` followed by letters), and then a table of reserved words decides whether it is `START` or `TERMINALS`: this is the usual technique compilers use for keywords. `tokenizeGrammar(text)` adds an `END_OF_FILE` at the end, which plays the role of `$` for the parser.

## 4.2 The LL(1) parser

`parseGrammarFile(tokens)` is a **predictive recursive-descent** parser (Aho et al. 4.4) for `meta.grammar`:

- it has **one method per nonterminal** (`parseFile`, `parseRule`, `parseSymbols`…);
- each method looks at **a single token** and chooses the only alternative that can start with it. To choose ε, it looks at FOLLOW: `Symbols → ε` is chosen only if the next token is `BAR` or `NEWLINE`;
- it works without backtracking because `meta.grammar` is LL(1). Sabueso itself checks this: `predictive-table --grammar meta` has no conflicts (section 6.2).

It returns the rules, the directives and `trace`, the list of the parser's decisions with their depth (`ParserTraceStep`), which `grammar --parser-trace` shows. The parser does not classify symbols: `buildGrammar` does that.

**Detail:** guides 03 and 04 · cards 03 and 04.

# 5. The story

**What it does:** turns the text of the story into a list of tags and checks that all of them are in Σ.

**Connects with:** its output is the input of Earley (section 7), together with the grammar.

- `tokenizeSequence(text)` splits the text on whitespace: `'CRI  PIS\nREV'` gives `['CRI', 'PIS', 'REV']`. It does not need an automaton, because its only separator is whitespace.
- `checkAlphabet({ tokens, grammar })` checks Σ **before** running Earley. It returns `null`, or a `ParseError` of type `'unknown-symbol'` with the position of the first unknown symbol.

Separating "w ∈ Σ\*?" from "w ∈ L(G)?" gives better messages: a tag that does not exist and a badly built sequence are different errors.

**Detail:** guide 06 · card 01.

# 6. Grammar analysis

**What it does:** studies the grammar on its own, without any story: which symbols can vanish, whether any symbol is unnecessary, whether the language is empty, whether there are cycles, whether one token is enough to decide.

**Connects with:** Earley uses the nullable symbols for the ε fix (7.4); so do the trees and the CNF. The analysis also **validates** the project grammars: it proves by computation that G1 is LL(1). `analyzeGrammar(grammar)` collects all the results in a `GrammarAnalysis`.

## 6.1 The common scheme: least fixed point by rounds

Almost every analysis starts from an initial set and applies a rule that adds symbols based on what is already known, until a round adds nothing: the **least fixed point** of the rule (Hopcroft 7.1). The loop is written only once:

```ts
export function repeatRuleUntilNoChange({ start, newSymbolsOfRound }): Set<SymbolName>[] {
  const rounds: Set<SymbolName>[] = [];
  let knownBefore = new Set(start);
  for (;;) {
    const knownAfter = new Set([...knownBefore, ...newSymbolsOfRound(knownBefore)]);
    rounds.push(knownAfter);
    if (knownAfter.size === knownBefore.size) {
      return rounds; // nothing new: fixed point
    }
    knownBefore = knownAfter;
  }
}
```

- `start` is the base case of the induction: ∅ for the nullable symbols, {S} for the reachable ones.
- `newSymbolsOfRound` is the rule of one round: always a call to a named function (`newNullableSymbols`, `newProductiveSymbols`…), which reads like the inductive definition in the book.
- `knownBefore` and `knownAfter` are different sets: what is found in one round is used in the next. So round i holds the symbols that need i applications of the rule.
- It returns **all the rounds**: the console shows them with `--steps`, and `lastRound(rounds)` takes the result.
- It **terminates** because the set only grows inside a finite set: at most |N| + 1 rounds.

FIRST and FOLLOW use the variant `repeatRuleOnSetsUntilNoChange`, with one set per nonterminal.

## 6.2 The analyses

| Analysis              | Key function                        | What it computes                                                                                        | In G1                           |
| --------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Nullable              | `computeNullable(grammar)`          | the A with A ⇒\* ε: A → X1…Xk with all Xi nullable                                                      | 10 of 21                        |
| Minimum yield         | `computeMinYield(grammar)`          | the length of the shortest string each A derives; minYield(S) is the shortest sentence of L(G)          | 3 (`CRI PIS REV`)               |
| Useless and emptiness | `analyzeUsefulSymbols(grammar)`     | productive, then reachable (in that order, Hopcroft 7.1.1); L(G) = ∅ if and only if S is not productive | none useless; L(G) ≠ ∅          |
| Cycles                | `findCycles(grammar)`               | the A ⇒+ A, with a unit graph (edges A → B where what surrounds B is nullable) and a depth-first search | none                            |
| FIRST and FOLLOW      | `computeFirstFollow(grammar)`       | which terminals each A starts with and which can come after it (Aho et al. 4.4.2)                       | FOLLOW(`Investigacion`) = {REV} |
| LL(1) table           | `buildPredictiveTable({ grammar })` | M[A, a] and its conflicts: cells with more than one production                                          | 0 conflicts                     |

Three results matter for the rest of the project:

- **The nullable symbols** feed Earley's ε fix, the ε trees, the cycle search and the DEL step of the CNF.
- **G1 has 0 conflicts, so it is LL(1), and every LL(1) grammar is unambiguous:** at each step of a leftmost derivation, the next token determines the production. G1's unambiguity is proved by a computation, not only checked with examples. G0 has 13 conflicts; since the implication only goes one way, its ambiguity is shown separately, by counting trees (section 8).
- **Ambiguous is not the same as cyclic:** G0 is ambiguous but has no cycles, so each story has a finite number of trees. A cyclic grammar (`test-cyclic`) has infinitely many.

**Detail:** guides 07 to 12 · cards 05 to 10.

# 7. The Earley recognizer

**What it does:** decides whether the tags of the story form a string of L(G), and leaves in the chart everything needed to explain the answer.

**Connects with:** receives G, its nullable symbols (section 6) and the checked tags (section 5). It returns a `Recognition` (verdict, chart with links and trace) that the diagnosis, the trees and the API use, without running Earley again.

## 7.1 Items and chart

An item is a tuple **(A → α • β, j)**: "I am recognizing an A; I already recognized α from position j and β is still missing". In the code it is an `EarleyItem` with the production, the dot position, the origin j and its links. `label(item)` writes it as `E → E + • T, 0`.

For n tags, the chart has n + 1 sets S0 … Sn: Sk holds the live possibilities after reading k tags. Each `EarleySet` has a list of items, which also works as a work queue, and a map by key to avoid repeating them. `addItem` is the only way to add an item: if it is already there, it only adds the new link to it. Since the possible items are finite, the algorithm always terminates.

## 7.2 The three operations and the main loop

Depending on the symbol after the dot, exactly one operation applies:

| Operation | When                    | What it does                                                          |
| --------- | ----------------------- | --------------------------------------------------------------------- |
| Predictor | a nonterminal B follows | adds (B → • γ, k) to Sk, for each B → γ                               |
| Scanner   | a terminal a follows    | if tag k is a, adds the item with the dot moved forward to Sk+1       |
| Completer | the dot is at the end   | (B → γ •, i) in Sk advances every item of Si that was waiting for a B |

```ts
addItem({ set: chart[0], production: startProduction, dot: 0, origin: 0 });
for (const set of chart) {
  for (let position = 0; position < set.items.length; position++) {
    processItem({ context, item: set.items[position] });
  }
}
const acceptingItem = chart[tokens.length].byKey.get(
  itemKey({ production: startProduction, dot: 1, origin: 0 }),
);
```

(Simplified excerpt of `recognize`.)

- S0 starts with ($S → • S, 0): "I want to recognize an S from position 0".
- The outer `for` goes through the sets in order. The Scanner only adds to the next set, so a finished set no longer changes.
- The inner `for` compares with `set.items.length` on every iteration: items added during the loop are also processed.
- `processItem` calls `predict`, `scan` or `complete` depending on the symbol after the dot.
- **Acceptance:** w ∈ L(G) if and only if ($S → S •, 0) ∈ Sn.

In theory, Earley costs O(n³) in the worst case and O(n²) with unambiguous grammars (Earley, 1970). With G1, a story of 200 tags is recognized and counted in about 16 ms.

## 7.3 The links

Every time the dot moves forward, the new item stores a link (`Link`) to its predecessor and the cause: the tag read (`scan`), the complete item (`complete`) or the skipped nullable symbol (`nullable`). An item with **several** links was reached in several ways: that is where the ambiguity is recorded. Section 8 follows these links backwards.

## 7.4 The ε fix (Aycock and Horspool)

The classic algorithm rejects `x` with `epsilon-trap` (`S → A A x`, `A → ε`): after completing the first A, the Predictor does not add (A → •, 0) again because it is already in S0, and nothing advances the second A. The fix by Aycock and Horspool (2002) solves this in the Predictor: if the predicted symbol is **nullable**, it also moves the dot over it right away, with a `nullable` link. In exchange, the Completer skips the items that recognized ε, to avoid repeated advances. The `classicEpsilon` option turns the fix off, for comparison (`earley --no-epsilon-fix`).

## 7.5 Diagnosis and trace

- `diagnose({ grammar, chart, tokens, accepted })` reads the chart and returns a `ParseError`: `unexpected-token` if some set ended up empty (nothing could read that tag), or `unexpected-end` if the story ended too early. `expected` is the terminals that follow the dot in the last live set. For example, G0 rejects `CRI REV` at event 2 and expects, among others, `PIS` or `SOS`.
- `openItemsAt({ chart, error })` (SPEC 05) takes the set of the error and returns the items left open: the structures already started (something before the dot) and the predicted rules that would have read an expected tag. With I1 in G1: `Planteo → Marco • Hecho, 0`. `parse()` returns it in `openItems`, and the console and the web show it: it explains the rejection when there is no tree.
- With the `trace` option, the recognizer records every added item, in order, with its operation and its cause (`TraceEvent`). The cause is passed as data (`TraceCause`) and turned into text with `describeCause` only when there is a trace: without the option, it costs nothing.

**Detail:** guides 13 to 17 · cards 11 to 17.

# 8. Trees and ambiguity

**What it does:** builds, counts and writes as derivations the trees of an accepted story.

**Connects with:** works on Earley's `Recognition` (the links of the chart) and on the nullable symbols, without running Earley again. Its result is part of the API (section 9).

A tree is a `ParseTree` with terminal leaves, ε leaves and nonterminal nodes with the production used.

## 8.1 Building and counting

- **Building:** from ($S → S •, 0) in Sn, the links are followed backwards. Each complete item is a node, and its links give the children. An item with several links gives several trees. `parseTrees({ grammar, recognition, limit })` produces them one at a time (with a generator) and stops at the limit (50 by default).
- **ε trees:** a `nullable` link does not point to any item, so the empty subtrees are built from the grammar (`epsilonTrees`).
- **Counting:** `countTrees({ grammar, recognition })` goes through the same links adding and multiplying, without building any tree:

```ts
function countItem({ context, item }) {
  const remembered = context.known.get(item);
  if (remembered !== undefined) return remembered;
  if (item.dot === 0) return 1n;
  if (context.inProgress.has(item)) return 'infinite';
  context.inProgress.add(item);
  let total: TreeCount = 0n;
  for (const link of item.links) {
    const ways = multiplyCounts({
      first: countItem({ context, item: link.predecessor }),
      second: countCause({ context, link }),
    });
    total = addCounts({ first: total, second: ways });
  }
  context.inProgress.delete(item);
  context.known.set(item, total);
  return total;
}
```

- `context.known` stores the count of each item: each one is counted **once**. This is dynamic programming, and the work depends on the number of items, not on the number of trees.
- The links are **alternative** ways to reach the item: they are added.
- Within a link, the predecessor and the cause are **independent** choices: they are multiplied.
- Coming back to an item that is being counted (`inProgress`) means a cycle: infinitely many trees.
- `TreeCount` is `bigint | 'infinite'`, because `number` is only exact up to 2⁵³.

## 8.2 The leftmost derivation

`leftmostDerivation(tree)` goes through the tree in **preorder** and applies the productions in that order. It works because preorder expands each node and everything below it before its siblings on the right, just like a leftmost derivation (Hopcroft 5.2). `renderDerivation` writes it step by step.

## 8.3 G0 versus G1

| Story                     | Trees in G0                       | Trees in G1 |
| ------------------------- | --------------------------------- | ----------- |
| A1: `CRI SOS PIS INT REV` | 4                                 | 1           |
| L1: 200 tags (`l1.txt`)   | a number with 115 digits (238 ms) | 1 (16 ms)   |

G0 is ambiguous because `Pasos → Pasos Pasos` groups the steps in every possible way, and the number grows exponentially. A grammar is ambiguous if and only if some string has two different leftmost derivations: `derive --grammar g0 --tree 2` shows the second one for the same story. In G1 the count is always 1, as the LL(1) table predicts.

**Detail:** guides 18 to 21 · cards 18 to 21.

# 9. The public API

**What it does:** defines in `packages/core/src/index.ts` what can be used from outside the core. It is the contract with the web interface (SPEC 03) and with controlled Spanish (SPEC 04): whatever is not exported is internal.

**Connects with:** chains all the previous components, without adding any algorithm.

`parse({ grammar, input, options })` does the complete analysis of a story:

| Step | Function                                         | If it fails                                     |
| ---- | ------------------------------------------------ | ----------------------------------------------- |
| 1    | `tokenizeSequence` (if `input` is text)          | —                                               |
| 2    | `checkAlphabet`                                  | returns `unknown-symbol` without running Earley |
| 3    | `recognize` (Earley)                             | —                                               |
| 4    | `diagnose`                                       | returns the error together with the chart       |
| 5    | `parseTrees`, `countTrees`, `leftmostDerivation` | —                                               |

`ParseResult` is a union discriminated by `accepted`: if it is `true`, it has `trees`, `treeCount` and `derivation`; if it is `false`, it has `error`. Both have `tokens`, `chart` and `trace`. TypeScript forces you to check `accepted` before reading the rest. The options (`ParseOptions`) are `maxTrees`, `trace`, `countTrees` and `classicEpsilon`.

The other exports, by area:

| Area                    | Exports                                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------------------------- |
| Grammars                | `buildGrammar`, `parseGrammarText`, `tokenizeGrammar`, `formatProduction` and the model types        |
| Finite automaton        | `runDeterministicAutomaton` and its types (for the SPEC 04 lexer)                                    |
| Analysis                | `analyzeGrammar` and `GrammarAnalysis`                                                               |
| Displaying results      | `label`, `dottedRule`, `renderTree`, `renderDerivation`                                              |
| CNF                     | `toChomskyNormalForm`, `isChomskyNormalForm` and each step separately (`addNewStart`, …, `binarize`) |
| CYK                     | `recognizeCockeYoungerKasami` and `CockeYoungerKasamiResult`                                         |
| Pushdown automaton      | `buildPushdownAutomaton`, `simulatePushdownAutomaton` and their types                                |
| Bounded searches        | `generateSentences`, `findAmbiguityWitness`, `compareLanguages` and their types                      |
| Testing and measurement | `allStrings`, `runDifferential`, `benchmark` and their types                                         |
| Catalog                 | `genres`                                                                                             |
| Console                 | `createCommandLineProgram`, `formatTable`, `formatSet` (to add the SPEC 04 commands)                 |

**Detail:** guide 22.

# 10. CNF, CYK, pushdown automaton and bounded searches

**What it does:** converts a grammar to CNF (each production is A → BC or A → a, and S → ε only if ε ∈ L(G) and S does not appear on a right side; Hopcroft 7.1), without changing its language.

**Connects with:** uses the nullable symbols and the fixed point from section 6. Its target is the CYK algorithm, which only works with grammars in CNF, to compare its trees with Earley's and to validate Earley against CYK.

The conversion has six transformations. Each one is a function that takes a grammar and returns another one with the same language, without modifying the original, so they can be chained and shown step by step. The first three **clean** the grammar and the last three give it its final **form**:

| Step    | Function                            | What it does                                                                                                                                     | G1              |
| ------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------- |
| START   | `addNewStart(grammar)`              | adds `S0 → S` only if the start symbol appears on some right side                                                                                | 40 (not needed) |
| DEL     | `removeEpsilonProductions(grammar)` | replaces each production with its versions with and without its nullable symbols, and deletes the ε ones (except the start symbol's if ε ∈ L(G)) | 46              |
| UNIT    | `removeUnitProductions(grammar)`    | with the unit pairs (`computeUnitPairs`, the same fixed point), copies to each A the non-unit productions of each B                              | 69              |
| USELESS | `removeUselessSymbols(grammar)`     | with the analysis from section 6, deletes the nonterminals that are not productive or not reachable (in G1, `Descarte`)                          | 67              |
| TERM    | `isolateTerminals(grammar)`         | in right sides of length ≥ 2, replaces each terminal a with `T_a`, with `T_a → a`                                                                | 75              |
| BIN     | `binarize(grammar)`                 | splits each right side of length k ≥ 3 into a chain of k − 1 productions with `X1`, `X2`, …                                                      | 78              |

- **`toChomskyNormalForm(grammar)`** chains the six steps of `CHOMSKY_NORMAL_FORM_STEPS` and returns the final grammar, whether it keeps ε (`acceptsEmpty`) and the grammar after each step. **`isChomskyNormalForm(grammar)`** checks the result production by production.
- **The order matters:** DEL creates new unit productions (`Planteo → Hecho MarcoOpc` gives `Planteo → Hecho`), so UNIT comes after it. DEL and UNIT leave useless symbols, so USELESS comes after both. TERM comes before BIN so that BIN only sees nonterminals.
- **Each step builds the new grammar with `rewriteGrammar`, not with `buildGrammar`,** because it keeps N: a nonterminal left without productions (A in `epsilon-trap`) must not become a terminal.
- The tests check that the language is preserved after each step and that the 10 grammars end up in CNF.

## 10.1 CYK

**What it does:** `recognizeCockeYoungerKasami({ grammar, tokens })` decides w ∈ L(G) on a grammar **already** in CNF (Hopcroft 7.4.4). It fills the table T[i][l], the nonterminals that derive the l tags starting at position i: the cells of length 1 come from A → a, and those of length l ≥ 2 from A → B C, trying each split into two shorter parts. It accepts if the start symbol is in T[0][n]. It always costs O(n³·|G|).

**Connects with:** receives the output of `toChomskyNormalForm` and returns a `ParseTree`, the same type as Earley, rebuilt from the table. This way the `cocke-younger-kasami --compare` command draws both trees side by side: with `CRI PIS REV` and G1, the CYK tree has `X1` and loses ten categories of the genre (`Hecho`, `MarcoOpc`, `Pasos`…). This is the comparison that justifies using Earley. The tests check that CYK on CNF(G) and Earley on G accept exactly the same short strings.

**Detail:** guides 23, 24 and 25 · cards 22 and 23.

## 10.2 Pushdown automaton

**What it does:** `buildPushdownAutomaton(grammar)` builds the pushdown automaton of the grammar (Hopcroft 6.3.1): a single state, the stack starts with S, one **expand** transition per production (with A on top, it replaces it with its right side) and one **match** transition per terminal; it accepts by empty stack. `simulatePushdownAutomaton({ grammar, tokens, maxSteps })` runs it with a breadth-first search over the instantaneous descriptions (position, stack): it does not repeat configurations, prunes the stacks that need more tags than the ones left (minYield) and answers `'undetermined'` if it reaches the step limit. It returns the result, the explored configurations and the accepting path.

**Connects with:** uses minYield (section 6) to prune. Its accepting path checks a theorem in code: the expansions, in order, are the leftmost derivation (section 8); with A1 and G1, 18 against 18. It is a third recognizer, independent of Earley and CYK: the tests check that it accepts the same short strings as Earley. And it explains Earley: an item A → α • β, j is a piece of shared stack.

**Detail:** guide 26 · card 24.

## 10.3 Bounded searches

**What it does:** ambiguity and equivalence of CFGs are undecidable (Hopcroft 9.5), but they can be semidecided by looking for a witness among the sentences of length ≤ k. `generateSentences({ grammar, maxLength })` generates those sentences with a breadth-first search over leftmost sentential forms, pruning those that already need more than k tags (minYield). `findAmbiguityWitness` returns the first one with more than one tree, and `compareLanguages` the ones that only one of two grammars generates. A result proves the answer; "nothing up to k" proves nothing.

**Connects with:** uses minYield (section 6) to prune, and Earley with tree counting (sections 7 and 8) for the witness. With G0 it finds `CRI SOS ATQ REV` (2 trees); with G1, nothing up to length 7: what proves that G1 is unambiguous is the LL(1) table (section 6). `compare g0 g1` finds `CRI DSC REV` and `HAL DSC REV`: L(G0) ≠ L(G1).

**Detail:** guide 27 · cards 21 and 25.

# 11. The console

The `sabueso` console shows each component of the engine separately: each command calls the engine and formats the result, with no logic of its own. It runs with `npm run sabueso -- <comando>`, and the grammar is chosen with `--grammar <nombre>` or `--grammar-file <ruta>`.

| Command                                                                                    | What it shows                                                                                | Section |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | ------- |
| `genres`, `grammars`                                                                       | the catalog and the included grammars                                                        | 3       |
| `lex`, `grammar`                                                                           | the tokens and the DFA transitions; the grammar and the parser trace                         | 4       |
| `tokens`                                                                                   | a story split into tags and checked against Σ                                                | 5       |
| `nullable`, `min-yield`, `useful`, `cycles`, `first-follow`, `predictive-table`, `analyze` | each analysis; with `--steps`, the rounds of the fixed point                                 | 6       |
| `items`, `earley`, `trace`                                                                 | the dotted rules, the chart and each step of Earley                                          | 7       |
| `epsilon-trees`, `trees`, `count`, `derive`                                                | the trees, their number and the derivation                                                   | 8       |
| `parse`                                                                                    | the complete analysis of a story                                                             | 9       |
| `chomsky-normal-form`                                                                      | the grammar after each CNF step                                                              | 10      |
| `cocke-younger-kasami`                                                                     | the CYK table, the verdict and the CNF tree; with `--compare`, next to Earley                | 10.1    |
| `pushdown-automaton`                                                                       | the pushdown automaton, the result and the path of IDs; with `--transitions`, δ              | 10.2    |
| `generate`, `ambiguity`, `compare`                                                         | the sentences up to length k, the ambiguity witness and the difference between two languages | 10.3    |
| `differential`, `bench`                                                                    | the three recognizers on all strings up to length k; the time of each stage for one story    | 12      |

The complete walkthrough, with the output of each command, is in `docs/console-demo.md`. A test checks that every command in that document is still valid.

# 12. Testing and quality

**Detail:** guide 28 for the differential test and performance.

- **917 tests** (Vitest), organized like the code, plus an integration test of the public API.
- **Against hand computations:** the chart of `CRI PIS REV` with G1 matches the one in the spec item by item, and the derivation of A1 has the same 18 steps.
- **Language properties:** after each CNF step, the short sentences of G1 are still accepted, and G0 and G1 accept and reject the same strings up to length 3. CYK on CNF(G), the pushdown automaton and Earley accept the same strings.
- **Differential test** (`differential/differential.ts`, `runDifferential`): Earley on G, CYK on the CNF and the pushdown automaton of G run on **all** strings up to a length and must accept exactly the same ones. With G0 and G1 up to length 4 that is 41 371 strings each, with 0 discrepancies. Since the three recognizers are built in different ways, a bug in any of them shows up as a discrepancy.
- **Performance** (`performance/benchmark.ts`, `benchmark`): with L1 (200 events), G1 analyzes the complete story (recognition, tree, derivation and count) in about 24 ms, far below the one second the project proposal asks for; G0, in about 245 ms, half of it spent counting a 115-digit number of trees.
- **Edge cases:** grammars with ε, with useless symbols, with an empty language and with cycles.
- **Code quality:** strict TypeScript, ESLint and Prettier. The git hooks check formatting and lint before each commit and run the tests before each push. Continuous integration repeats everything on each push.

# 13. Limits of the model and decidability

**What it is:** two topics from the course without code of their own, which place what the core does within the theory.

- **Chomsky hierarchy:** the lexer recognizes a regular language (type 3) with a DFA; the project grammars are context-free (type 2) and their machine is the pushdown automaton (section 10.2). Some rules of the genre are outside every CFG: "there are as many suspicions as discards and as interrogations" (proved with the pumping lemma, intersecting with a regular language) and "the culprit appeared earlier", if the names are not bounded.
- **Decidability:** for a CFG, membership (Earley), emptiness (`isEmpty`) and "is LL(1)" (`buildPredictiveTable`) are decidable, and each one has a decider in the core. Ambiguity and equivalence are undecidable: the core only semidecides them with bounded searches (section 10.3). By the Church–Turing thesis, each function of the core is a Turing machine that always halts.

**Detail:** cards 26 and 27.

# 14. References

- Aho, A., Lam, M., Sethi, R. and Ullman, J., _Compiladores: principios, técnicas y herramientas_ (2nd ed.). Chapters 3 and 4.
- Augusto, course material for Fundamentos Teóricos de Informática, UNPSJB. Chapters 1 to 3.
- Aycock, J. and Horspool, R. N., "Practical Earley Parsing", _The Computer Journal_ 45(6), 2002.
- Earley, J., "An efficient context-free parsing algorithm", _Communications of the ACM_ 13(2), 1970.
- Hopcroft, J., Motwani, R. and Ullman, J., _Introducción a la teoría de autómatas, lenguajes y computación_. Chapters 2 and 5 to 9.
- Sipser, M., _Introducción a la teoría de la computación_. Chapter 2.
