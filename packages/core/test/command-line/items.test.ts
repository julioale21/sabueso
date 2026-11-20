import { describe, expect, it } from 'vitest';
import { runCommandLine } from '../../src/command-line/program.js';
import { createEnvironmentWithBuiltInGrammars } from './memory-environment.js';

describe('sabueso items', () => {
  it('parentheses: lists the 6 dotted rules and what Earley does with each', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    expect(await runCommandLine(['items', '--grammar', 'parentheses'], environment)).toBe(0);
    expect(output()).toMatch(/^0\s+S → \( • S \) S\s+Predictor: expect S$/m);
    expect(output()).toMatch(/^0\s+S → • \( S \) S\s+Scanner: read the token \($/m);
    expect(output()).toMatch(/^1\s+S → •\s+Completer: S is recognized$/m);
    expect(output()).toContain('6 dotted rules.');
    expect(output()).toContain('which is why Earley always ends');
  });

  it.each([[['items']], [['items', '--grammar', 'g1', 'x']]])(
    'wrong usage %j exits with 2',
    async (commandArguments) => {
      const { environment } = createEnvironmentWithBuiltInGrammars();
      expect(await runCommandLine(commandArguments, environment)).toBe(2);
    },
  );
});
