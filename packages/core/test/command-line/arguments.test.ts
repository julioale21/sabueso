import { describe, expect, it } from 'vitest';
import { parseArguments } from '../../src/command-line/arguments.js';

const rules = { flags: ['--states'], valueOptions: ['--grammar-file'] };

describe('parseArguments', () => {
  it('separates positionals, flags and options with a value, in any order', () => {
    expect(
      parseArguments(['--states', 'arithmetic', '--grammar-file', 'a.grammar'], rules),
    ).toEqual({
      positionals: ['arithmetic'],
      flags: new Set(['--states']),
      values: new Map([['--grammar-file', 'a.grammar']]),
    });
  });

  it('accepts no arguments at all', () => {
    expect(parseArguments([], rules)).toEqual({
      positionals: [],
      flags: new Set(),
      values: new Map(),
    });
  });

  it('rejects an option the command does not declare', () => {
    expect(parseArguments(['--verbose'], rules)).toBe('Unknown option: --verbose');
  });

  it('rejects an option with a value at the end, or followed by another option', () => {
    expect(parseArguments(['--grammar-file'], rules)).toBe('Missing value for --grammar-file');
    expect(parseArguments(['--grammar-file', '--states'], rules)).toBe(
      'Missing value for --grammar-file',
    );
  });
});
