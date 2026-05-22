import pc from "picocolors";

const FIELD_WIDTH = 14;

export function demoTitle(title: string): void {
  console.log(pc.bold(pc.cyan(title)));
}

export function section(title: string): void {
  console.log(`\n${pc.bold(pc.magenta(title))}`);
}

export function field(label: string, value: unknown): void {
  console.log(`${column(label)}  ${value}`);
}

export function action(label: string, value: string): void {
  console.log(`${pc.green("✓")} ${column(label)}  ${value}`);
}

export function detail(label: string, value: string): void {
  if (label.length === 0) {
    console.log(`${pc.dim("  ")}${value}`);
    return;
  }

  console.log(`${"  " + column(label)}  ${value}`);
}

export function path(value: string): string {
  return pc.cyan(value);
}

export function code(value: string): string {
  return pc.yellow(value);
}

export function muted(value: string): string {
  return pc.gray(value);
}

function column(label: string): string {
  return label.padEnd(Math.max(FIELD_WIDTH, label.length));
}
