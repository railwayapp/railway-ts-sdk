// Source of the `hello` function in ../function.ts. Railway runs it with Bun
// on the function image; the file is base64-encoded into the start command.
export default {
  fetch: () => new Response("hello from a function"),
};
