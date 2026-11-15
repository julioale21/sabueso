import type { CliIo } from '../../src/index.js';

/** An in-memory CliIo that records everything the program writes. */
export function memoryIo(files: Record<string, string> = {}) {
  const out: string[] = [];
  const err: string[] = [];
  const io: CliIo = {
    stdout: (text) => {
      out.push(text);
    },
    stderr: (text) => {
      err.push(text);
    },
    readFile: (path) => {
      const content = files[path];
      return content === undefined
        ? Promise.reject(new Error(`File not found: ${path}`))
        : Promise.resolve(content);
    },
  };
  return { io, stdout: () => out.join(''), stderr: () => err.join('') };
}
