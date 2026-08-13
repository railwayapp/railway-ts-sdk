import { defineConfig } from "vitest/config";
import { BaseSequencer, type TestSpecification } from "vitest/node";

const filePriority = [
  "sandbox-lifecycle.e2e.test.ts",
  "sandbox-files.e2e.test.ts",
  "sandbox-exec.e2e.test.ts",
  "sandbox-template.e2e.test.ts",
  "iac.e2e.test.ts",
];

class E2ESequencer extends BaseSequencer {
  async sort(files: TestSpecification[]): Promise<TestSpecification[]> {
    return [...files].sort((left, right) => {
      const leftPriority = priorityOf(left.moduleId);
      const rightPriority = priorityOf(right.moduleId);
      return (
        leftPriority - rightPriority || left.moduleId.localeCompare(right.moduleId)
      );
    });
  }
}

function priorityOf(moduleId: string): number {
  const index = filePriority.findIndex(name => moduleId.endsWith(`/${name}`));
  return index === -1 ? filePriority.length : index;
}

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/*.e2e.test.ts"],
    sequence: { sequencer: E2ESequencer },
  },
});
