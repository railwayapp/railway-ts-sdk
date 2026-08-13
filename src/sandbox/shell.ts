/** POSIX single-quote escaping: safe to embed in a single-quoted shell word. */
export function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

/**
 * Run a command through a login shell. VM exec sessions are non-login shells
 * whose PATH can be bare (the image env is not applied to them), so tools the
 * image or a template build installed — mise shims, /root/.local/bin — are
 * invisible without the profile chain.
 */
export function loginShellCommand(command: string): string {
  return `bash -lc ${shellQuote(command)}`;
}
