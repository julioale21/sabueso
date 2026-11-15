import { EXIT_CODES, VERSION as CORE_VERSION, type CliCommand } from '@sabueso/core';
import { VERSION } from '../../index.js';

export const versionCommand: CliCommand = {
  name: 'version',
  description: 'Show the version of this package and of the core',
  usage: 'sabueso-nl version',
  run(_args, io) {
    io.stdout(`Sabueso nl ${VERSION} (core ${CORE_VERSION})\n`);
    return Promise.resolve(EXIT_CODES.ok);
  },
};
