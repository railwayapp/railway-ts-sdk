import { createHash } from "node:crypto";

/** Deterministic percentage bucket in [0, 1) for rollout expressions. */
export function signalBucketRatio(salt: string, subject: string): number {
  const digest = createHash("sha256").update(`${salt}:${subject}`).digest();
  const n = digest.readUInt32BE(0) * 0x100000000 + digest.readUInt32BE(4);
  return n / 0x1_0000_0000_0000_0000;
}
