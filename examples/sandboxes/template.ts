import { Sandbox } from "../../src/index.ts";
import { runExample } from "./helpers.ts";

await runExample(async () => {
  // A template is a pure, immutable recipe — no network until it is built/created.
  const base = Sandbox.template().withPackages("ffmpeg").workdir("/app");

  // Same call whether the template is cold (builds, then forks) or warm (just
  // forks). `await using` destroys the sandbox automatically on scope exit.
  await using sandbox = await Sandbox.create(base);

  console.log((await sandbox.exec("ffmpeg -version")).stdout);
  console.log((await sandbox.exec("pwd")).stdout); // /app

  // Optional explicit pre-warm — build once, stamp many instantly:
  //   await base.build();
  //   const a = await Sandbox.create(base); // already built → fast fork
  //   const b = await Sandbox.create(base);
});
