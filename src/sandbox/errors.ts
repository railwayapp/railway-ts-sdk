import { RailwayError } from "../core/errors.js";

export class SandboxNotFoundError extends RailwayError {
  readonly id: string;
  readonly environmentId: string;

  constructor(args: { id: string; environmentId: string }) {
    super(
      `Sandbox "${args.id}" was not found in environment "${args.environmentId}".`,
    );
    this.id = args.id;
    this.environmentId = args.environmentId;
  }
}
