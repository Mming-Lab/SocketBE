/**
 * Type of agent action reported in the header of an `action:agent` response frame.
 *
 * Introduced in Minecraft Bedrock 1.18.30, which moved agent commands from the
 * `commandRequest` channel to a dedicated `action:agent` channel:
 *
 * > Agent-based commands in websockets moved to new "action:agent" format, and all
 * > commands are now queued and include unique ids to correlate responses
 *
 * Reference: {@link https://github.com/mcpews/mcpews} `src/lib/protocol.ts`
 */
export enum AgentActionType {
  Attack = 1,
  Collect,
  Destroy,
  DetectRedstone,
  /** @deprecated Superseded by {@link AgentActionType.DetectRedstone} handling. */
  DetectObstacle,
  Drop,
  DropAll,
  Inspect,
  InspectData,
  InspectItemCount,
  InspectItemDetail,
  InspectItemSpace,
  Interact,
  Move,
  PlaceBlock,
  Till,
  TransferItemTo,
  Turn,
}
