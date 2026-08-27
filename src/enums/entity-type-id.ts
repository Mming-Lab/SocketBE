/**
 * Numeric entity types, as reported by `PlayerDied.killer.type` and
 * `EntitySpawned.mob.type`.
 *
 * @remarks
 * Bedrock reports an entity by number in some events and by identifier string in others.
 * `MobKilled.victim.type` gives `"minecraft:zombie"`, while the two fields above give
 * `32`. This enum covers the numbers.
 *
 * Every member was measured: the entity was summoned by name and the number read off the
 * resulting `EntitySpawned` frame. Two of them cross-check against deaths that happened
 * unprompted, where a zombie reported `killer.type` 32 and a creeper reported 33 -
 * matching what `summon zombie` and `summon creeper` produce.
 *
 * It is still not the whole table, so both fields stay plain `number`s. Note also that
 * `EntitySpawned` fires only for mobs: summoning an arrow, a snowball, TNT, a boat or a
 * minecart each reported `wasSpawned: true` and raised no event, so non-mob entities
 * cannot be numbered from this route at all.
 */
export enum EntityTypeId {
  /**
   * Not an entity. `PlayerDied.killer` is filled in even for an environmental death, and
   * carries `{ color: 0, id: 1, type: 1, variant: -1 }` when nothing did the killing.
   */
  NoKiller = 1,
  Chicken = 10,
  Cow = 11,
  Pig = 12,
  Sheep = 13,
  Wolf = 14,
  Squid = 17,
  Rabbit = 18,
  Bat = 19,
  IronGolem = 20,
  SnowGolem = 21,
  Ocelot = 22,
  Horse = 23,
  Donkey = 24,
  Mule = 25,
  PolarBear = 28,
  Llama = 29,
  Parrot = 30,
  Dolphin = 31,
  Zombie = 32,
  Creeper = 33,
  Skeleton = 34,
  Spider = 35,
  ZombiePigman = 36,
  Slime = 37,
  Enderman = 38,
  Silverfish = 39,
  CaveSpider = 40,
  Ghast = 41,
  MagmaCube = 42,
  Blaze = 43,
  Witch = 45,
  Stray = 46,
  Husk = 47,
  WitherSkeleton = 48,
  Guardian = 49,
  Shulker = 54,
  Endermite = 55,
  Vindicator = 57,
  Phantom = 58,
  Ravager = 59,
  ArmorStand = 61,
  Turtle = 74,
  Cat = 75,
  Vex = 105,
  Pufferfish = 108,
  Salmon = 109,
  Drowned = 110,
  TropicalFish = 111,
  Cod = 112,
  Panda = 113,
  Pillager = 114,
  Villager = 115,
  WanderingTrader = 118,
  Fox = 121,
  Bee = 122,
  Piglin = 123,
  Hoglin = 124,
  Strider = 125,
  Goat = 128,
  GlowSquid = 129,
  Axolotl = 130,
  Warden = 131,
  Frog = 132,
  Allay = 134,
  Camel = 138,
  Sniffer = 139,
}
