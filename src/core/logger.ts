/**
 * Opt-in verbose logging. A no-op unless enabled, so call sites stay
 * branch-free: `config.log(...)` does nothing when verbose is off.
 */
export type Logger = (message: string) => void;

const NOOP: Logger = () => {};

/**
 * Returns a logger that writes `[railway] <message>` lines to stderr, or a
 * no-op when `verbose` is false. `console.error` exists in Node, browsers, and
 * edge runtimes, so this is safe to call anywhere.
 */
export function createLogger(verbose: boolean): Logger {
  if (!verbose) return NOOP;
  return message => console.error(`[railway] ${message}`);
}
