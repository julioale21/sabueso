import { VERSION } from '../../index.js';
import { EXIT_CODES, type CliCommand } from '../types.js';

export const versionCommand: CliCommand = {
  name: 'version',
  description: 'Show the version',
  usage: 'sabueso version',
  run(_args, io) {
    io.stdout(`Sabueso core ${VERSION}\n`);
    return Promise.resolve(EXIT_CODES.ok);
  },
};
