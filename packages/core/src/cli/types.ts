// Everything a command may touch outside its own arguments. Injected so commands run
// the same in Node, in the browser and in tests (in memory, without spawning processes).
export interface CliIo {
  /** Normal output. Text is written as is: callers add their own line breaks. */
  stdout(text: string): void;
  /** Error output. */
  stderr(text: string): void;
  /** The only gateway to the file system. */
  readFile(path: string): Promise<string>;
}

export interface CliCommand {
  /** Name typed on the command line, e.g. 'version'. */
  name: string;
  /** One line, shown by help. */
  description: string;
  /** Example invocation, e.g. 'sabueso version'. */
  usage: string;
  /** Runs the command and resolves to its exit code (see EXIT_CODES). */
  run(args: string[], io: CliIo): Promise<number>;
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
