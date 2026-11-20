import { readFileSync } from 'node:fs';
import {
  builtInGrammarPath,
  listBuiltInGrammars,
} from '../../src/command-line/built-in-grammars.js';
import type { CommandLineEnvironment } from '../../src/command-line/types.js';

/** An in-memory CommandLineEnvironment that records everything the program writes. */
export function createMemoryEnvironment(files: Record<string, string> = {}) {
  const writtenOutput: string[] = [];
  const writtenErrors: string[] = [];
  const environment: CommandLineEnvironment = {
    writeOutput: (text) => {
      writtenOutput.push(text);
    },
    writeError: (text) => {
      writtenErrors.push(text);
    },
    readFile: (path) => {
      const content = files[path];
      return content === undefined
        ? Promise.reject(new Error(`File not found: ${path}`))
        : Promise.resolve(content);
    },
  };
  return {
    environment,
    output: () => writtenOutput.join(''),
    errors: () => writtenErrors.join(''),
  };
}

/** A memory environment holding every built-in grammar at its real path, plus extra files. */
export function createEnvironmentWithBuiltInGrammars(files: Record<string, string> = {}) {
  const grammarFiles: Record<string, string> = {};
  for (const grammar of listBuiltInGrammars()) {
    const path = builtInGrammarPath(grammar);
    grammarFiles[path] = readFileSync(path, 'utf8');
  }
  return createMemoryEnvironment({ ...grammarFiles, ...files });
}
