import { table } from './format.js';
import { EXIT_CODES, type CliCommand, type CliIo } from './types.js';

export interface CliOptions {
  /** Executable name, used in the usage line, e.g. 'sabueso'. */
  program: string;
  /** Package version, shown in the help header. */
  version: string;
  commands: CliCommand[];
}

/**
 * Builds a command-line program from a list of commands. A `help` command is added
 * automatically, and running without arguments shows the help.
 */
export function createCli(options: CliOptions): (argv: string[], io: CliIo) => Promise<number> {
  const { program, version } = options;

  const help: CliCommand = {
    name: 'help',
    description: 'List the available commands',
    usage: `${program} help`,
    run(_args, io) {
      io.stdout(`${program} ${version}\n\nUsage: ${program} <command> [arguments]\n\n`);
      io.stdout(`${commandList()}\n`);
      return Promise.resolve(EXIT_CODES.ok);
    },
  };

  const commands = [...options.commands, help];

  function commandList(): string {
    return table(
      ['Command', 'Description', 'Usage'],
      commands.map((command) => [command.name, command.description, command.usage]),
    );
  }

  return async (argv, io) => {
    const [name, ...args] = argv;
    if (name === undefined) {
      return help.run([], io);
    }

    const command = commands.find((candidate) => candidate.name === name);
    if (command === undefined) {
      io.stderr(`Unknown command: ${name}\n\n${commandList()}\n`);
      return EXIT_CODES.usage;
    }

    try {
      return await command.run(args, io);
    } catch (error) {
      // An unexpected failure is reported as a user error instead of a stack trace.
      const message = error instanceof Error ? error.message : String(error);
      io.stderr(`Error: ${message}\n`);
      return EXIT_CODES.rejected;
    }
  };
}
