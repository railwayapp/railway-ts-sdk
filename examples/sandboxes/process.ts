import { Sandbox } from "../../src/index.ts";
import { runExample } from "./helpers.ts";

// Process controls: feed a command over stdin, then cancel a long one.
await runExample(async () => {
  await using sandbox = await Sandbox.create();

  // Writable stdin: `sort` reads until EOF, so end() lets it finish.
  const sorter = sandbox.exec("sort", { stdin: true, ephemeral: true });
  await sorter.stdin.write("pear\napple\nfig\n");
  await sorter.stdin.end();
  console.log((await sorter).stdout);

  // Cancellation: abort sends TERM to the process group (KILL after 5s) and
  // rejects with the abort reason once the sandbox confirms the exit.
  const controller = new AbortController();
  const server = sandbox.exec("python3 -m http.server 8000", {
    signal: controller.signal,
    captureOutput: false,
    onStderr: chunk => process.stderr.write(chunk),
  });
  setTimeout(() => controller.abort(new Error("done serving")), 2_000);
  try {
    await server;
  } catch (error) {
    if (error !== controller.signal.reason) throw error;
    console.log("server stopped");
  }
});
