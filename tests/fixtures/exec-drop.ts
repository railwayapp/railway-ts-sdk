// Starts a command, then SIGKILLs this process so the exec socket drops without
// a detach. Used by the live exec suite.
// Usage: exec-drop.ts <sandboxId> <command> <durable|ephemeral>
import { Sandbox } from "../../src/index.js";

const [sandboxId, command, mode] = process.argv.slice(2);
if (!sandboxId || !command || (mode !== "durable" && mode !== "ephemeral")) {
  console.error("usage: exec-drop.ts <sandboxId> <command> <durable|ephemeral>");
  process.exit(2);
}

const sandbox = await Sandbox.connect(sandboxId);
const ephemeral = mode === "ephemeral";
const handle = sandbox.exec(`echo READY; exec ${command}`, {
  ephemeral,
  captureOutput: false,
  onStdout: chunk => {
    if (!chunk.includes("READY")) return;
    process.stdout.write("READY\n", () => process.kill(process.pid, "SIGKILL"));
  },
});
handle.catch(error => {
  console.error(`exec rejected before READY: ${String(error)}`);
  process.exit(3);
});
setTimeout(() => {
  console.error("never saw READY");
  process.exit(4);
}, 60_000);
