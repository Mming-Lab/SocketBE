/**
 * Thrown when an agent command received its `commandResponse` frame but the paired
 * `action:agent` frame never arrived before the request timed out.
 *
 * The payload of an agent command lives entirely in the `action:agent` frame, so the
 * request cannot be satisfied from the `commandResponse` alone. Resolving with the
 * status-only frame would look like success while carrying no data, so this is reported
 * as a failure instead.
 */
export class MissingAgentActionError extends Error {
  /** Status code from the `commandResponse` frame that did arrive. */
  public readonly statusCode: number | undefined;

  /** Status message from the `commandResponse` frame that did arrive. */
  public readonly statusMessage: string | undefined;

  constructor(statusCode?: number, statusMessage?: string) {
    super(
      'Agent command received a commandResponse but no paired action:agent frame' +
        (statusMessage ? ` (status ${statusCode}: ${statusMessage})` : '')
    );
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.statusMessage = statusMessage;
  }
}
