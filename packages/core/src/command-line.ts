#!/usr/bin/env node
// Entry point of the `sabueso` executable. The only file of the package that imports
// node:* modules: it builds the real environment and hands control to runCommandLine.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { runCommandLine } from './command-line/program.js';
import type { CommandLineEnvironment } from './command-line/types.js';

const environment: CommandLineEnvironment = {
  writeOutput: (text) => {
    process.stdout.write(text);
  },
  writeError: (text) => {
    process.stderr.write(text);
  },
  readFile: (path) => readFile(resolve(invocationDirectory(), path), 'utf8'),
};

/**
 * The directory the user ran the command from. `npm run` moves to the project root before
 * running the script, but keeps the original directory in INIT_CWD, so a relative
 * --grammar-file path means what the user expects.
 */
function invocationDirectory(): string {
  return process.env.INIT_CWD ?? process.cwd();
}

// exitCode instead of process.exit(): lets pending output reach a pipe before exiting.
process.exitCode = await runCommandLine({
  commandLineArguments: process.argv.slice(2),
  environment,
});
