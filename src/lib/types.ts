export type ClassId = "swordsman" | "mage" | "archer";

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export interface WeaponDef {
  id: string;
  name: string;
  classId: ClassId;
  rarity: Rarity;
  price: number;
  /** per-hit damage */
  damage: number;
  /** attacks per second */
  attackSpeed: number;
  /** base crit chance 0..1 */
  critChance: number;
  description: string;
  /** passive effect id */
  passive?: "burn" | "poison" | "lifesteal" | "slow" | "pierce" | "crit" | "heavy";
  color: string;
  starter?: boolean;
  /** granted only as a boss reward, never sold in shops */
  bossOnly?: boolean;
}

export interface SkillDef {
  id: string;
  name: string;
  classId: ClassId;
  /** "Q" | "E" | "R" */
  key: string;
  description: string;
  effect: string;
  maxLevel: number;
  baseCooldown: number;
  /** resources cost per upgrade level */
  upgradeCost: number;
}

export interface BossDef {
  id: string;
  name: string;
  maxHp: number;
  color: string;
  description: string;
  /** attack pattern ids the boss cycles through (see GameEngine) */
  attacks: string[];
}

export interface MapDef {
  index: number;
  name: string;
  subtitle: string;
  /** background base color */
  bg: string;
  /** ground tile color */
  ground: string;
  enemyCount: number;
  enemyHp: number;
  enemyDamage: number;
  eliteCount: number;
  boss: BossDef;
  rewardGold: number;
  rewardResources: number;
  /** weapon reward id granted on boss defeat, per class */
  rewardWeapons: Record<ClassId, string>;
  /** decorative props scattered on the ground (visual only) */
  decor: string[];
  /** fraction of foes that must fall before the boss gate opens */
  killQuota: number;
}

export interface SaveData {
  classId: ClassId;
  level: number;
  xp: number;
  gold: number;
  resources: number;
  unlockedMaps: number;
  defeatedBosses: number[];
  equippedWeapon: string;
  ownedWeapons: string[];
  skillLevels: Record<string, number>;
}

export interface RunResult {
  outcome: "victory" | "death" | "abandon";
  goldEarned: number;
  resourcesEarned: number;
  xpEarned: number;
  level: number;
  xp: number;
  bossDefeated: boolean;
  weaponRewards: string[];
}

export const RARITY_COLORS: Record<Rarity, string> = {
  common: "#9ca3af",
  uncommon: "#22c55e",
  rare: "#3b82f6",
  epic: "#a855f7",
  legendary: "#f59e0b",
};
