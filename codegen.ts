import type { CodegenConfig } from "@graphql-codegen/cli";

const schema =
  process.env.RAILWAY_GRAPHQL_SCHEMA ??
  "https://backboard.railway.app/graphql/v2";

const config: CodegenConfig = {
  schema,
  documents: ["src/graphql/operations/**/*.graphql"],
  generates: {
    "src/generated/graphql.ts": {
      plugins: ["typescript", "typescript-operations", "typed-document-node"],
      config: {
        enumsAsTypes: true,
        scalars: {
          BigInt: "string",
          DateTime: "string",
          Decimal: "string",
          JSON: "unknown",
        },
      },
    },
  },
};

export default config;
