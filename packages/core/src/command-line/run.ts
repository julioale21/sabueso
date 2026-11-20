import { formatTable } from './format.js';
import { EXIT_CODES, type Command, type CommandLineEnvironment } from './types.js';

export interface CommandLineProgramOptions {
  /** Executable name, used in the usage line, e.g. 'sabueso'. */
  program: string;
  commands: Command[];
  /** Extra text shown by help after the list of commands, e.g. the available grammars. */
  helpFooter?: string;
}

/**
 * Builds a command-line program from a list of commands. A `help` command is added
 * automatically, and running without arguments shows the help.
 */
export function createCommandLineProgram(
  options: CommandLineProgramOptions,
): (commandLineArguments: string[], environment: CommandLineEnvironment) => Promise<number> {
  const { program } = options;

  const help: Command = {
    name: 'help',
    description: 'List the available commands',
    usage: `${program} help`,
    run(_commandArguments, environment) {
      environment.writeOutput(`Usage: ${program} <command> [arguments]\n\n`);
      environment.writeOutput(`${commandList()}\n`);
      if (options.helpFooter !== undefined) {
        environment.writeOutput(`\n${options.helpFooter}\n`);
      }
      return Promise.resolve(EXIT_CODES.ok);
    },
  };

  const commands = [...options.commands, help];

  /** The table of commands shown by help and after an unknown command. */
  function commandList(): string {
    return formatTable(
      ['Command', 'Description', 'Usage'],
      commands.map((command) => [command.name, command.description, command.usage]),
    );
  }

  // The program is a pure function of (arguments, environment) → exit code.
  // The environment (writing, reading files) is injected, so tests run in memory.
  return async (commandLineArguments, environment) => {
    const [name, ...commandArguments] = commandLineArguments;
    if (name === undefined) {
      return help.run([], environment);
    }

    const command = commands.find((candidate) => candidate.name === name);
    if (command === undefined) {
      environment.writeError(`Unknown command: ${name}\n\n${commandList()}\n`);
      return EXIT_CODES.usage;
    }

    try {
      return await command.run(commandArguments, environment);
    } catch (error) {
      // An unexpected failure is reported as a user error instead of a stack trace.
      const message = error instanceof Error ? error.message : String(error);
      environment.writeError(`Error: ${message}\n`);
      return EXIT_CODES.rejected;
    }
  };
}
