import type { AgentActionType } from '../../enums';
import type { CommandResult } from './command-result';

/**
 * Result of an agent command sent over the `action:agent` message purpose.
 *
 * Minecraft answers a single `action:agent` request with **two** frames that share the
 * same `requestId`: a regular `commandResponse` carrying only the status, followed by an
 * `action:agent` frame carrying the actual payload. Both are surfaced here.
 *
 * @remarks
 * The field names inside {@link AgentActionResult.body} are **not documented** by Mojang
 * and are not asserted by this library. Read `body` directly, or supply a type argument
 * once you have confirmed the shape against a live client. The Code Connection API
 * documentation describes `inspect` as returning a block name, but the exact key has not
 * been verified against a current build.
 */
export interface AgentActionResult<T extends Record<string, unknown> = Record<string, unknown>> {
  /** Numeric action discriminator from the response header. */
  action: AgentActionType;

  /** Human-readable action name from the response header, e.g. `"inspect"`. */
  actionName: string;

  /** Raw body of the `action:agent` frame, passed through without interpretation. */
  body: T;

  /**
   * The `commandResponse` frame Minecraft sends alongside the `action:agent` frame.
   *
   * Undefined when the `action:agent` frame arrived first and no paired
   * `commandResponse` had been observed by the time the request completed.
   */
  commandResponse?: CommandResult<Record<string, unknown>>;
}
