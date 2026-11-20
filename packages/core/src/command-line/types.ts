// Everything a command may touch outside its own arguments. Injected so commands run
// the same in Node, in the browser and in tests (in memory, without spawning processes).
export interface CommandLineEnvironment {
  /** Normal output. Text is written as is: callers add their own line breaks. */
  writeOutput(text: string): void;
  /** Error output. */
  writeError(text: string): void;
  /** The only gateway to the file system. */
  readFile(path: string): Promise<string>;
}

export interface Command {
  /** Name typed on the command line, e.g. 'grammar'. */
  name: string;
  /** One line, shown by help. */
  description: string;
  /** Example invocation, e.g. 'sabueso grammar g1'. */
  usage: string;
  /** Runs the command and resolves to its exit code (see EXIT_CODES). */
  run(commandArguments: string[], environment: CommandLineEnvironment): Promise<number>;
}

/** Exit codes shared by every command of every package. */
export const EXIT_CODES = {
  /** Success, or input accepted. */
  ok: 0,
  /** Input rejected, or user error (e.g. an unknown symbol). */
  rejected: 1,
  /** Wrong usage: unknown command or missing options. */
  usage: 2,
} as const;

/** Writes a usage error (the message and a line break) and returns its exit code. */
export function reportUsageError(message: string, environment: CommandLineEnvironment): number {
  environment.writeError(`${message}\n`);
  return EXIT_CODES.usage;
}
