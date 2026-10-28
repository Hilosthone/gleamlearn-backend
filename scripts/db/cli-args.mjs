// scripts/db/cli-args.mjs — strict command-line parsing for scripts/db/migrate.mjs.
//
// Only the documented forms are accepted. Anything else is a usage error (exit 2) BEFORE configuration is read or a
// database is contacted: unknown flags, misspellings (--dryrun), values on switches (--dry-run=true), missing values,
// repeated flags, stray positionals, and --dry-run combined with --confirm-target.

export class UsageError extends Error {}

const VALUE = 'value';
const SWITCH = 'switch';
const COMMON = { 'target-env-file': VALUE, dir: VALUE, 'strict-target': SWITCH };
export const COMMANDS = {
  status: { flags: { ...COMMON }, positionals: [0, 0] },
  run: { flags: { ...COMMON, 'dry-run': SWITCH, 'confirm-target': VALUE, 'lock-timeout-ms': VALUE, 'statement-timeout-ms': VALUE }, positionals: [0, 0] },
  baseline: { flags: { ...COMMON, 'dry-run': SWITCH, 'confirm-target': VALUE, 'lock-timeout-ms': VALUE }, positionals: [1, 1] },
  create: { flags: { dir: VALUE }, positionals: [1, Infinity] },
};

export const USAGE = `Usage:
  node scripts/db/migrate.mjs status   [--target-env-file=<path>] [--strict-target]
  node scripts/db/migrate.mjs run      --dry-run [--target-env-file=<path>] [--strict-target]
  node scripts/db/migrate.mjs run      --confirm-target=<database>@<host>:<port> [--target-env-file=<path>] [--strict-target]
  node scripts/db/migrate.mjs baseline <version> --dry-run [--target-env-file=<path>] [--strict-target]
  node scripts/db/migrate.mjs baseline <version> --confirm-target=<database>@<host>:<port> [--target-env-file=<path>] [--strict-target]
  node scripts/db/migrate.mjs create   <name>
Also: --dir=<migrations dir>, --lock-timeout-ms=<ms> (run, baseline), --statement-timeout-ms=<ms> (run).`;

/** { command, positionals, options, write } or throws UsageError. `write` = this invocation may change the database. */
export function parseCli(argv) {
  const [command, ...rest] = argv;
  if (!command) throw new UsageError('No command given.');
  const spec = COMMANDS[command];
  if (!spec) throw new UsageError(`Unknown command "${command}".`);
  const options = {};
  const positionals = [];
  for (const arg of rest) {
    if (arg === '--' || /^-[^-]/.test(arg) || arg === '-') throw new UsageError(`Unexpected argument "${arg}".`);
    if (!arg.startsWith('--')) {
      positionals.push(arg);
      continue;
    }
    const eq = arg.indexOf('=');
    const name = eq === -1 ? arg.slice(2) : arg.slice(2, eq);
    const kind = spec.flags[name];
    if (!kind) throw new UsageError(`Unknown option "--${name}" for "${command}".`);
    if (name in options) throw new UsageError(`Option "--${name}" given more than once.`);
    if (kind === SWITCH) {
      if (eq !== -1) throw new UsageError(`"--${name}" takes no value (write exactly --${name}).`);
      options[name] = true;
    } else {
      const value = eq === -1 ? '' : arg.slice(eq + 1);
      if (!value.trim()) throw new UsageError(`"--${name}" needs a value: --${name}=<value>.`);
      options[name] = value;
    }
  }
  const [min, max] = spec.positionals;
  if (positionals.length < min) throw new UsageError(`"${command}" needs ${min === 1 ? 'an argument' : `${min} arguments`}.`);
  if (positionals.length > max) throw new UsageError(`Unexpected argument "${positionals[max]}" for "${command}".`);
  if (options['dry-run'] && options['confirm-target']) throw new UsageError('--dry-run cannot be combined with --confirm-target (a dry run never writes; a write needs the confirmation).');
  for (const name of ['lock-timeout-ms', 'statement-timeout-ms']) {
    if (name in options && !/^\d{1,9}$/.test(options[name])) throw new UsageError(`--${name} must be a whole number of milliseconds.`);
  }
  const write = (command === 'run' || command === 'baseline') && !options['dry-run'];
  if (write && !options['confirm-target']) {
    throw new UsageError(`"${command}" changes the database and needs --confirm-target=<database>@<host>:<port> (any database, local or remote). Use --dry-run to only inspect.`);
  }
  return { command, positionals, options, write };
}
