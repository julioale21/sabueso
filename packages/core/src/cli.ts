#!/usr/bin/env node
// Entry point of the `sabueso` executable. The only file of the package that imports
// node:* modules: it builds the real io and hands control to runCli.
import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { runCli } from './cli/program.js';
import type { CliIo } from './cli/types.js';

const io: CliIo = {
  stdout: (text) => {
    process.stdout.write(text);
  },
  stderr: (text) => {
    process.stderr.write(text);
  },
  readFile: (path) => readFile(path, 'utf8'),
};

// exitCode instead of process.exit(): lets pending output reach a pipe before exiting.
process.exitCode = await runCli(process.argv.slice(2), io);
