// Local baseline: N sequential 16MB one-shot stream pushes; record outcome + elapsed.
import { Sandbox } from "./src/index.ts";
import { config } from "dotenv";
config({ override: true });

const N = 8;
await using sandbox = await Sandbox.create();
console.log("target sandbox", sandbox.id);
const chunk = new Uint8Array(1024 * 1024).fill(7);
let deaths = 0;
for (let i = 1; i <= N; i++) {
  async function* source() {
    for (let j = 0; j < 16; j++) yield chunk;
  }
  const start = Date.now();
  try {
    await sandbox.files.write(`/tmp/p${i}.bin`, source());
    console.log(`local push ${i}: ok in ${((Date.now() - start) / 1000).toFixed(1)}s`);
  } catch (error) {
    deaths++;
    console.log(`local push ${i}: DIED at ${((Date.now() - start) / 1000).toFixed(1)}s: ${(error as Error).message.slice(0, 60)}`);
  }
  await sandbox.exec(`rm -f /tmp/p${i}.bin`);
}
console.log(`local result: ${deaths}/${N} died`);
