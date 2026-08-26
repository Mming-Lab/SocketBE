import type  { Vector3 } from '@minecraft/server';
import type { World } from '../world';
import type { AgentActionResult } from '../types';
import { CommandStatusCode, type AgentDirection } from '../enums';

/**
 * Implemented all agent commands listed on the Minecraft Wiki.  
 * Note that some commands may not work in the latest version. Commands that have been confirmed to work have comments.
 * 
 * Reference: {@link https://minecraft.fandom.com/wiki/Commands/agent}
 */
export class Agent {
  public readonly world: World;

  public constructor(world: World) {
    this.world = world;
  }

  public get isValid() {
    return this.world.isValid;
  }

  /**
   * Move the agent in the specified direction
   */
  public async move(direction: AgentDirection): Promise<void> {
    const res = await this.world.runCommand(`agent move ${direction}`);
    if (res.statusCode < CommandStatusCode.Success) throw new Error(res.statusMessage);
  }

  /**
   * Turn the agent in the specified direction
   */
  public async turn(turnDirection: AgentDirection.Left | AgentDirection.Right): Promise<void> {
    const res = await this.world.runCommand(`agent turn ${turnDirection}`);
    if (res.statusCode < CommandStatusCode.Success) throw new Error(res.statusMessage);
  }

  /**
   * Attack towards the specified direction
   */
  public async attack(direction: AgentDirection): Promise<void> {
    const res = await this.world.runCommand(`agent attack ${direction}`);
    if (res.statusCode < CommandStatusCode.Success) throw new Error(res.statusMessage);
  }
  
  /**
   * Destroy a block in the specified direction
   */
  public async destroyBlock(direction: AgentDirection): Promise<void> {
    const res = await this.world.runCommand(`agent destroy ${direction}`);
    if (res.statusCode < CommandStatusCode.Success) throw new Error(res.statusMessage);
  }

  /**
   * Drop an item in the specified direction
   * @param slot **one**-based index of the slot in the agent's inventory
   */
  public async dropItem(direction: AgentDirection, slot: number, amount: number = 1): Promise<void> {
    const res = await this.world.runCommand(`agent drop ${slot} ${amount} ${direction}`);
    if (res.statusCode < CommandStatusCode.Success) throw new Error(res.statusMessage);
  }

  /**
   * Drop all items in the specified direction
   */
  public async dropAllItems(direction: AgentDirection): Promise<void> {
    const res = await this.world.runCommand(`agent dropall ${direction}`);
    if (res.statusCode < CommandStatusCode.Success) throw new Error(res.statusMessage);
  }

  /**
   * Reports the block the agent is facing in the specified direction.
   *
   * @remarks
   * The payload lands in {@link AgentActionResult.body}. Its field names are not documented
   * by Mojang and are not asserted here; read `body` to discover them, or pass a type
   * argument once you have confirmed the shape against a live client.
   */
  public async inspect(direction: AgentDirection): Promise<AgentActionResult> {
    return await this.world.runAgentCommand(`agent inspect ${direction}`);
  }

  /**
   * Reports the block data value of the block the agent is facing.
   */
  public async inspectData(direction: AgentDirection): Promise<AgentActionResult> {
    return await this.world.runAgentCommand(`agent inspectdata ${direction}`);
  }

  /**
   * Reports whether a collidable block is present in the specified direction.
   */
  public async detect(direction: AgentDirection): Promise<AgentActionResult> {
    return await this.world.runAgentCommand(`agent detect ${direction}`);
  }

  /**
   * Reports whether a redstone signal is present in the specified direction.
   */
  public async detectRedstone(direction: AgentDirection): Promise<AgentActionResult> {
    return await this.world.runAgentCommand(`agent detectredstone ${direction}`);
  }

  /**
   * Transfer items from one slot to another
   * @param fromSlot **one**-based index of the slot in the agent's inventory
   * @param toSlot **one**-based index of the slot in the agent's inventory
   */
  public async moveItem(fromSlot: number, toSlot: number, amount: number = 1): Promise<void> {
    const res = await this.world.runCommand(`agent transfer ${fromSlot} ${amount} ${toSlot}`);
    if (res.statusCode < CommandStatusCode.Success) throw new Error(res.statusMessage);
  }

  /**
   * @param location If not provided, the agent will be teleported to the player's location
   */
  public async teleport(location?: Vector3): Promise<void> {
    const locationArg = location ? `${location.x} ${location.y} ${location.z}` : '';
    const res = await this.world.runCommand(`agent tp ${locationArg}`);
    if (res.statusCode < CommandStatusCode.Success) throw new Error(res.statusMessage);
  }

  /**
   * Collect an specified item around the agent
   */
  public async collect(itemId: string): Promise<void> {
    const res = await this.world.runCommand(`agent collect ${itemId}`);
    if (res.statusCode < CommandStatusCode.Success) throw new Error(res.statusMessage);
  }

  /**
   * Till the under block in the specified direction
   */
  public async till(direction: AgentDirection): Promise<void> {
    const res = await this.world.runCommand(`agent till ${direction}`);
    if (res.statusCode < CommandStatusCode.Success) throw new Error(res.statusMessage);
  }

  /**
   * Place a block in the specified direction
   * @param slot **one**-based index of the slot in the agent's inventory
   */
  public async placeBlock(direction: AgentDirection, slot: number): Promise<void> {
    const res = await this.world.runCommand(`agent place ${slot} ${direction}`);
    if (res.statusCode < CommandStatusCode.Success) throw new Error(res.statusMessage);
  }
  
  /**
   * Set an item in the specified slot
   * @param slot **one**-based index of the slot in the agent's inventory
   */
  public async setItem(slot: number, itemId: string, amount: number = 1, data: number = 0): Promise<void> {
    const res = await this.world.runCommand(`agent setitem ${slot} ${itemId} ${amount} ${data}`);
    if (res.statusCode < CommandStatusCode.Success) throw new Error(res.statusMessage);
  }

  /**
   * Reports the number of items in the specified slot.
   * @param slot **one**-based index of the slot in the agent's inventory
   */
  public async getItemCount(slot: number): Promise<AgentActionResult> {
    return await this.world.runAgentCommand(`agent getitemcount ${slot}`);
  }

  /**
   * Reports the remaining space in the specified slot.
   * @param slot **one**-based index of the slot in the agent's inventory
   */
  public async getItemSpace(slot: number): Promise<AgentActionResult> {
    return await this.world.runAgentCommand(`agent getitemspace ${slot}`);
  }

  /**
   * Reports the item held in the specified slot.
   * @param slot **one**-based index of the slot in the agent's inventory
   */
  public async getItemDetail(slot: number): Promise<AgentActionResult> {
    return await this.world.runAgentCommand(`agent getitemdetail ${slot}`);
  }

  /**
   * Get the agent's current location
   */
  public async getLocation(): Promise<Vector3> {
    const res = await this.world.runCommand<{ position: Vector3 }>('agent getposition');
    if (res.statusCode < CommandStatusCode.Success) throw new Error(res.statusMessage);
    return res.position;
  }
}