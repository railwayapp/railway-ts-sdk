/**
 * Internal-only symbol used to read a template's compiled `instructions` from
 * `Sandbox.create` and tests without exposing the compiled form as public API.
 * Never re-export this from a package barrel.
 */
export const COMPILE = Symbol("railway.sandbox.template.compile");
