// Fixture for the runner end-to-end thread test. Imports from src so the test
// exercises current source (not built dist). One new service → the diff yields a
// create change, which drives plan → preview → apply through the runner.
import { defineRailway, github, project, service } from "../../../../src/iac/index.js";

export default defineRailway(() =>
  project("e2e-thread", {
    resources: [service("web", { source: github("acme/web") })],
  }),
);
