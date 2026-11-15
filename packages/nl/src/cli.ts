#!/usr/bin/env node
// Entry point of the `sabueso-nl` executable. The only file of the package that imports
// node:* modules: it builds the real io and runs the commands with the core's createCli.
import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { createCli, type CliIo } from '@sabueso/core';
import { versionCommand } from './cli/commands/version.js';
import { VERSION } from './index.js';

const runCli = createCli({
  program: 'sabueso-nl',
  version: VERSION,
  commands: [versionCommand],
});

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
