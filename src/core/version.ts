// Injected by tsup at build time from package.json; falls back when running
// unbundled (vitest/tsx).
declare const __RAILWAY_SDK_VERSION__: string | undefined;

const SDK_VERSION =
  typeof __RAILWAY_SDK_VERSION__ !== "undefined"
    ? __RAILWAY_SDK_VERSION__
    : "0.0.0-dev";

export const USER_AGENT = `railway-ts-sdk/${SDK_VERSION}`;
