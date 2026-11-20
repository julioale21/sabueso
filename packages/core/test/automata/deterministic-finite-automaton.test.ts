// The generic DFA executor, tested with a toy automaton that knows nothing about grammars:
// integers (optionally negative) separated by spaces.
import { describe, expect, it } from 'vitest';
import {
  AutomatonStoppedError,
  runDeterministicAutomaton,
  type AutomatonEvent,
  type DeterministicAutomatonDefinition,
} from '../../src/automata/deterministic-finite-automaton.js';

type ToyState = 'start' | 'minus' | 'number' | 'spaces';
type ToyClass = 'digit' | 'minus' | 'space' | 'other';

/**
 * q0=start --digit--> number (INTEGER) --digit--> number
 * q0=start --minus--> minus (not accepting) --digit--> number
 * q0=start --space--> spaces (discarded) --space--> spaces
 */
const integers: DeterministicAutomatonDefinition<ToyState, ToyClass, 'INTEGER'> = {
  initialState: 'start',
  classifyCharacter: (character) => {
    if (/^[0-9]$/.test(character)) return 'digit';
    if (character === '-') return 'minus';
    if (character === ' ' || character === '\n') return 'space';
    return 'other';
  },
  transitions: {
    start: { digit: 'number', minus: 'minus', space: 'spaces' },
    minus: { digit: 'number' },
    number: { digit: 'number' },
    spaces: { space: 'spaces' },
  },
  acceptingStates: { number: 'INTEGER', spaces: null },
};

function run(text: string) {
  return runDeterministicAutomaton(integers, text);
}

function stoppedError(text: string): AutomatonStoppedError<ToyState> {
  try {
    run(text);
  } catch (error) {
    if (error instanceof AutomatonStoppedError) {
      return error as AutomatonStoppedError<ToyState>;
    }
    throw error;
  }
  throw new Error(`Expected "${text}" to be rejected`);
}

describe('runDeterministicAutomaton', () => {
  it('emits the tokens of the accepting states and discards the null ones', () => {
    expect(run('12 345')).toEqual([
      { kind: 'INTEGER', text: '12', line: 1, column: 1 },
      { kind: 'INTEGER', text: '345', line: 1, column: 4 },
    ]);
  });

  it('applies maximal munch: 12345 is one token, not five', () => {
    expect(run('12345').map((token) => token.text)).toEqual(['12345']);
  });

  it('crosses a non-accepting state when the token continues: -7', () => {
    expect(run('-7')).toEqual([{ kind: 'INTEGER', text: '-7', line: 1, column: 1 }]);
  });

  it('counts lines and columns across line breaks', () => {
    expect(run('1\n 23')).toEqual([
      { kind: 'INTEGER', text: '1', line: 1, column: 1 },
      { kind: 'INTEGER', text: '23', line: 2, column: 2 },
    ]);
  });

  it('returns no tokens for an empty text', () => {
    expect(run('')).toEqual([]);
  });

  it('stops in q0 on a character without transition', () => {
    const error = stoppedError('12a');
    expect(error.state).toBe('start');
    expect(error.character).toBe('a');
    expect([error.line, error.column]).toEqual([1, 3]);
  });

  it('stops in a non-accepting state when the text ends inside a token', () => {
    const error = stoppedError('3 -');
    expect(error.state).toBe('minus');
    expect(error.character).toBeUndefined();
    expect([error.tokenLine, error.tokenColumn]).toEqual([1, 3]);
  });

  it('reports every transition and every accepted lexeme to the observer', () => {
    const events: AutomatonEvent<ToyState, 'INTEGER'>[] = [];
    runDeterministicAutomaton(integers, '-4 ', (event) => events.push(event));
    expect(events).toEqual([
      { type: 'transition', from: 'start', character: '-', to: 'minus' },
      { type: 'transition', from: 'minus', character: '4', to: 'number' },
      { type: 'accept', state: 'number', text: '-4', kind: 'INTEGER' },
      { type: 'transition', from: 'start', character: ' ', to: 'spaces' },
      { type: 'accept', state: 'spaces', text: ' ', kind: null },
    ]);
  });
});
