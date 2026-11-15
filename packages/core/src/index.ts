// Core version, shown by the CLI and the web app.
export const VERSION = '0.1.0';

// CLI infrastructure, shared with @sabueso/nl.
export { set, table } from './cli/format.js';
export { createCli, type CliOptions } from './cli/run.js';
export { EXIT_CODES, type CliCommand, type CliIo } from './cli/types.js';
