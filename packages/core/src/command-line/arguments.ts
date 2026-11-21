// Splits the arguments of a command into positional values, flags (--states) and options
// with a value (--grammar-file prueba.grammar). Every command declares which ones it accepts.

export interface ArgumentRules {
  /** Options without a value, e.g. '--states'. */
  flags: readonly string[];
  /** Options followed by a value, e.g. '--grammar-file'. */
  valueOptions: readonly string[];
}

export interface ParsedArguments {
  positionals: string[];
  flags: Set<string>;
  values: Map<string, string>;
}

/** Returns the parsed arguments, or the message of a usage error. */
export function parseArguments({
  commandArguments,
  rules,
}: {
  commandArguments: readonly string[];
  rules: ArgumentRules;
}): ParsedArguments | string {
  const parsed: ParsedArguments = { positionals: [], flags: new Set(), values: new Map() };
  for (let index = 0; index < commandArguments.length; index++) {
    const argument = commandArguments[index] ?? '';
    if (!argument.startsWith('--')) {
      parsed.positionals.push(argument);
    } else if (rules.flags.includes(argument)) {
      parsed.flags.add(argument);
    } else if (rules.valueOptions.includes(argument)) {
      const value = commandArguments[index + 1];
      if (value === undefined || value.startsWith('--')) {
        return `Missing value for ${argument}`;
      }
      parsed.values.set(argument, value);
      index++;
    } else {
      return `Unknown option: ${argument}`;
    }
  }
  return parsed;
}
