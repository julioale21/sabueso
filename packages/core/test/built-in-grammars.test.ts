// The grammar files of the project: they all parse, have the sizes of the spec, and agree
// with the catalog of genres and with the lexer.
import { describe, expect, it } from 'vitest';
import { findBuiltInGrammar, listBuiltInGrammars } from '../src/command-line/grammars.js';
import { formatProduction } from '../src/grammar/build.js';
import { genres } from '../src/genres/catalog.js';
import { tokenizeGrammar } from '../src/grammar-format/lexer.js';
import { loadBuiltInGrammar, readBuiltInGrammarText, readL1 } from './helpers/load.js';

const builtInIds = listBuiltInGrammars().map((grammar) => grammar.id);

describe('the built-in grammar files', () => {
  it('are the 10 of the spec: meta, 2 of the detective genre and 7 for development', () => {
    expect(builtInIds).toEqual([
      'detective/g1',
      'detective/g0',
      'meta',
      'arithmetic-ambiguous',
      'arithmetic',
      'parentheses',
      'epsilon-trap',
      'test-useless',
      'test-empty',
      'test-cyclic',
    ]);
  });

  it.each(builtInIds)('%s parses with the whole chain', (id) => {
    expect(() => loadBuiltInGrammar(id)).not.toThrow();
  });

  it.each([
    ['detective/g0', 10, 14, 28],
    ['detective/g1', 21, 14, 40],
    ['meta', 9, 9, 17],
    ['arithmetic-ambiguous', 1, 5, 4],
    ['arithmetic', 3, 5, 6],
    ['parentheses', 1, 2, 2],
    ['epsilon-trap', 2, 1, 2],
    ['test-useless', 3, 3, 4],
    ['test-empty', 1, 1, 1],
    ['test-cyclic', 2, 1, 3],
  ])('%s has |N| = %i, |Σ| = %i and |P| = %i', (id, nonterminals, terminals, productions) => {
    const grammar = loadBuiltInGrammar(id);
    expect(grammar.nonterminals.size).toBe(nonterminals);
    expect(grammar.terminals.size).toBe(terminals);
    expect(grammar.productions.length).toBe(productions);
  });

  it('g0 and g1 are aliases of the detective grammars', () => {
    expect(findBuiltInGrammar('g1')?.id).toBe('detective/g1');
    expect(findBuiltInGrammar('g0')?.id).toBe('detective/g0');
  });

  it('G0 keeps the two ambiguous rules of the project proposal', () => {
    const productions = loadBuiltInGrammar('g0').productions.map(formatProduction);
    expect(productions).toContain('Pasos → Pasos Pasos');
    expect(productions).toContain('Linea → SOS Pasos');
  });

  it('G1 starts at Relato and has the ε-productions of its optional parts', () => {
    const grammar = loadBuiltInGrammar('g1');
    const productions = grammar.productions.map(formatProduction);
    expect(grammar.start).toBe('Relato');
    expect(productions).toContain('MarcoOpc → ε');
    expect(productions).toContain('CuerpoLinea → ε');
    expect(productions.filter((production) => production.endsWith('→ ε'))).toHaveLength(10);
  });
});

describe('meta.grammar', () => {
  it('describes the format: its terminals are the 9 token kinds of the lexer', () => {
    // A text that uses every kind of token: START, TERMINALS, IDENTIFIER, ARROW, LITERAL,
    // BAR, EPSILON, NEWLINE and END_OF_FILE.
    const text = "%start S\n%terminals a\nS -> 'b' | ε\n";
    const tokenKinds = new Set(tokenizeGrammar(text).map((token) => token.kind));
    expect(tokenKinds.size).toBe(9);
    expect(new Set(loadBuiltInGrammar('meta').terminals)).toEqual(tokenKinds);
  });

  it('has the nonterminals of the parser: one function per nonterminal', () => {
    expect([...loadBuiltInGrammar('meta').nonterminals]).toEqual([
      'File',
      'Element',
      'Directive',
      'Rule',
      'Alternatives',
      'MoreAlternatives',
      'Sequence',
      'Symbols',
      'Symbol',
    ]);
  });

  it('is itself a valid .grammar file: the format can read its own grammar', () => {
    expect(readBuiltInGrammarText('meta')).toContain('%start File');
  });
});

describe('the catalog of genres', () => {
  it('has the detective genre, with G1 as official and G0 as alternative', () => {
    expect(genres.map((genre) => genre.id)).toEqual(['detective']);
    const [detective] = genres;
    expect(detective?.officialGrammar).toBe('detective/g1');
    expect(detective?.alternativeGrammar).toBe('detective/g0');
  });

  it.each(genres)('$id: its grammars are built-in grammars', (genre) => {
    expect(findBuiltInGrammar(genre.officialGrammar)?.group).toBe('Géneros');
    if (genre.alternativeGrammar !== undefined) {
      expect(findBuiltInGrammar(genre.alternativeGrammar)?.group).toBe('Géneros');
    }
  });

  it.each(genres)('$id: its tags are exactly Σ of its grammars', (genre) => {
    const tags = new Set(genre.tags.map((tag) => tag.tag));
    expect(tags.size).toBe(genre.tags.length);
    expect(new Set(loadBuiltInGrammar(genre.officialGrammar).terminals)).toEqual(tags);
    if (genre.alternativeGrammar !== undefined) {
      expect(new Set(loadBuiltInGrammar(genre.alternativeGrammar).terminals)).toEqual(tags);
    }
  });
});

describe('the fixture L1', () => {
  it('is CRI, 198 × PIS and REV: 200 events over Σ of G1', () => {
    const events = readL1();
    expect(events).toHaveLength(200);
    expect(events[0]).toBe('CRI');
    expect(events.at(-1)).toBe('REV');
    expect(events.slice(1, -1).every((event) => event === 'PIS')).toBe(true);
    const terminals = loadBuiltInGrammar('g1').terminals;
    expect(events.every((event) => terminals.has(event))).toBe(true);
  });
});
