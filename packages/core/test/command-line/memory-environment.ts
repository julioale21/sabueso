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
