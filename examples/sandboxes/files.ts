import { Sandbox } from "../../src/index.ts";
import { runExample } from "./helpers.ts";

// Files: push and pull sandbox files over the streaming files API. Small
// payloads are one-liners; large ones stream both ways with bounded memory.
await runExample(async () => {
  await using sandbox = await Sandbox.create();

  // Write text, read it back, and inspect it.
  await sandbox.files.write("/app/config.json", JSON.stringify({ ok: true }));
  console.log("read:", await sandbox.files.read("/app/config.json"));
  console.log("stat:", await sandbox.files.stat("/app/config.json"));

  // Files are created 0644; chmod via exec to make one executable.
  await sandbox.files.write("/app/run.sh", "#!/bin/sh\necho from-script\n");
  await sandbox.exec("chmod +x /app/run.sh");
  console.log("exec:", (await sandbox.exec("/app/run.sh")).stdout.trim());

  // Push a large payload from an async iterable — nothing is buffered, so
  // this works for files far bigger than memory.
  const chunk = new Uint8Array(1024 * 1024).fill(7);
  async function* source() {
    for (let i = 0; i < 16; i++) yield chunk;
  }
  console.time("push 16MB");
  await sandbox.files.write("/data/large.bin", source());
  console.timeEnd("push 16MB");

  // Pull it back as a stream and count the bytes.
  const stream = await sandbox.files.read("/data/large.bin", {
    format: "stream",
  });
  let bytes = 0;
  console.time("pull 16MB");
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.length;
  }
  console.timeEnd("pull 16MB");
  console.log(`pulled ${bytes} bytes`);

  // Tail the end of a file without downloading the rest.
  await sandbox.exec("seq 1 100000 > /data/big.log");
  const tail = await sandbox.files.read("/data/big.log", {
    length: 24,
    fromEnd: true,
  });
  console.log("tail:", JSON.stringify(tail));

  // Directory management.
  const entries = await sandbox.files.list("/data");
  console.log("ls /data:", entries.map(e => e.name).join(", "));
  await sandbox.files.rename("/data/large.bin", "/data/renamed.bin");
  await sandbox.files.remove("/data/renamed.bin");
  console.log("exists after rm:", await sandbox.files.exists("/data/renamed.bin"));
});
