export function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

// Login shell: VM exec sessions get no PATH from the image env, so the
// profile chain is what makes mise shims and /root/.local/bin resolvable.
export function loginShellCommand(command: string): string {
  return `bash -lc ${shellQuote(command)}`;
}
