#!/usr/bin/env node
// Entry point of the `sabueso` executable. The only file of the package that imports
// node:* modules: it builds the real environment and hands control to runCommandLine.
import { readFile } from 'node:fs/promises';
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
  readFile: (path) => readFile(path, 'utf8'),
};

// exitCode instead of process.exit(): lets pending output reach a pipe before exiting.
process.exitCode = await runCommandLine(process.argv.slice(2), environment);
