import type {
  ClassId,
  WeaponDef,
  SkillDef,
  MapDef,
  SaveData,
} from "./types";

export interface ClassDef {
  id: ClassId;
  name: string;
  tagline: string;
  description: string;
  color: string;
  accent: string;
  // base stats at level 1
  maxHp: number;
  damage: number;
  attackSpeed: number;
  moveSpeed: number;
  critChance: number;
  defense: number; // 0..1 damage reduction
  starterWeapon: string;
  skillIds: string[];
  /** map index whose boss must be defeated (by any class) to unlock */
  unlockBoss: number | null;
}

export const CLASSES: Record<ClassId, ClassDef> = {
  swordsman: {
    id: "swordsman",
    name: "Swordsman",
    tagline: "Melee bruiser",
    description:
      "High close-range damage and solid defense. Wields swords and blades with deadly melee combos and a repositioning dash.",
    color: "#e2e8f0",
    accent: "#f87171",
    maxHp: 140,
    damage: 14,
    attackSpeed: 1.6,
    moveSpeed: 205,
    critChance: 0.05,
    defense: 0.18,
    starterWeapon: "iron_sword",
    skillIds: ["sword_slash", "dash_strike", "whirlwind"],
    unlockBoss: null,
  },
  mage: {
    id: "mage",
    name: "Mage",
    tagline: "Ranged spellcaster",
    description:
      "Powerful elemental and area-of-effect spells. Strong ranged burst but fragile — keep your distance and control the battlefield.",
    color: "#c4b5fd",
    accent: "#a855f7",
    maxHp: 85,
    damage: 18,
    attackSpeed: 1.2,
    moveSpeed: 185,
    critChance: 0.05,
    defense: 0.06,
    starterWeapon: "fire_staff",
    skillIds: ["fireball", "ice_nova", "lightning_bolt"],
    unlockBoss: 1,
  },
  archer: {
    id: "archer",
    name: "Archer",
    tagline: "Agile marksman",
    description:
      "Specializes in rapid ranged attacks, critical hits and mobility. Lands consecutive arrows and rains death from afar.",
    color: "#bbf7d0",
    accent: "#22c55e",
    maxHp: 95,
    damage: 12,
    attackSpeed: 2.2,
    moveSpeed: 225,
    critChance: 0.12,
    defense: 0.08,
    starterWeapon: "longbow",
    skillIds: ["multi_shot", "piercing_arrow", "rain_of_arrows"],
    unlockBoss: 2,
  },
};

export const CLASS_LIST: ClassDef[] = Object.values(CLASSES);

export const WEAPONS: Record<string, WeaponDef> = {
  // ----- Swordsman -----
  iron_sword: {
    id: "iron_sword",
    name: "Iron Sword",
    classId: "swordsman",
    rarity: "common",
    price: 0,
    damage: 16,
    attackSpeed: 1.6,
    critChance: 0.05,
    description: "A reliable forged blade. Balanced damage and speed.",
    color: "#cbd5e1",
    starter: true,
  },
  flame_sword: {
    id: "flame_sword",
    name: "Flame Sword",
    classId: "swordsman",
    rarity: "rare",
    price: 260,
    damage: 26,
    attackSpeed: 1.7,
    critChance: 0.08,
    description: "Wreathed in fire. Burns enemies on hit.",
    passive: "burn",
    color: "#f97316",
  },
  poison_blade: {
    id: "poison_blade",
    name: "Poison Blade",
    classId: "swordsman",
    rarity: "rare",
    price: 300,
    damage: 22,
    attackSpeed: 1.9,
    critChance: 0.1,
    description: "Venom-coated edge. Poisons struck foes.",
    passive: "poison",
    color: "#84cc16",
  },
  critical_sword: {
    id: "critical_sword",
    name: "Critical Sword",
    classId: "swordsman",
    rarity: "epic",
    price: 460,
    damage: 24,
    attackSpeed: 1.8,
    critChance: 0.32,
    description: "Honed for lethality. Enormous critical chance.",
    passive: "crit",
    color: "#facc15",
  },
  heavy_greatsword: {
    id: "heavy_greatsword",
    name: "Heavy Greatsword",
    classId: "swordsman",
    rarity: "epic",
    price: 520,
    damage: 44,
    attackSpeed: 1.0,
    critChance: 0.06,
    description: "Slow but devastating. Crushes armor.",
    passive: "heavy",
    color: "#64748b",
  },
  lifesteal_sword: {
    id: "lifesteal_sword",
    name: "Lifesteal Sword",
    classId: "swordsman",
    rarity: "legendary",
    price: 720,
    damage: 28,
    attackSpeed: 1.6,
    critChance: 0.1,
    description: "Drinks the blood of foes. Heals on hit.",
    passive: "lifesteal",
    color: "#ef4444",
  },

  // ----- Mage -----
  fire_staff: {
    id: "fire_staff",
    name: "Fire Staff",
    classId: "mage",
    rarity: "common",
    price: 0,
    damage: 20,
    attackSpeed: 1.2,
    critChance: 0.05,
    description: "Flings bolts of fire. Burns on impact.",
    passive: "burn",
    color: "#ef4444",
    starter: true,
  },
  ice_staff: {
    id: "ice_staff",
    name: "Ice Staff",
    classId: "mage",
    rarity: "rare",
    price: 280,
    damage: 22,
    attackSpeed: 1.1,
    critChance: 0.05,
    description: "Chills enemies, slowing their movement.",
    passive: "slow",
    color: "#38bdf8",
  },
  lightning_staff: {
    id: "lightning_staff",
    name: "Lightning Staff",
    classId: "mage",
    rarity: "epic",
    price: 430,
    damage: 25,
    attackSpeed: 1.4,
    critChance: 0.06,
    description: "Crackling energy. Fast, erratic strikes.",
    color: "#c084fc",
  },
  arcane_staff: {
    id: "arcane_staff",
    name: "Arcane Staff",
    classId: "mage",
    rarity: "legendary",
    price: 690,
    damage: 31,
    attackSpeed: 1.3,
    critChance: 0.08,
    description: "Pure arcane power. Siphons life from hits.",
    passive: "lifesteal",
    color: "#e879f9",
  },
  storm_staff: {
    id: "storm_staff",
    name: "Storm Staff",
    classId: "mage",
    rarity: "legendary",
    price: 0,
    damage: 36,
    attackSpeed: 1.4,
    critChance: 0.1,
    description:
      "Fell from the Void Emperor's grasp. Every bolt crackles with searing charge.",
    passive: "burn",
    color: "#a78bfa",
    bossOnly: true,
  },

  // ----- Archer -----
  longbow: {
    id: "longbow",
    name: "Longbow",
    classId: "archer",
    rarity: "common",
    price: 0,
    damage: 13,
    attackSpeed: 2.2,
    critChance: 0.12,
    description: "A sturdy hunter's bow. Quick and steady.",
    color: "#a16207",
    starter: true,
  },
  flame_bow: {
    id: "flame_bow",
    name: "Flame Bow",
    classId: "archer",
    rarity: "rare",
    price: 270,
    damage: 17,
    attackSpeed: 2.2,
    critChance: 0.14,
    description: "Arrows trail fire. Ignites targets.",
    passive: "burn",
    color: "#f97316",
  },
  poison_bow: {
    id: "poison_bow",
    name: "Poison Bow",
    classId: "archer",
    rarity: "rare",
    price: 320,
    damage: 15,
    attackSpeed: 2.3,
    critChance: 0.16,
    description: "Toxic arrows. Poisons everything they touch.",
    passive: "poison",
    color: "#84cc16",
  },
  rapid_bow: {
    id: "rapid_bow",
    name: "Rapid Bow",
    classId: "archer",
    rarity: "epic",
    price: 450,
    damage: 14,
    attackSpeed: 3.2,
    critChance: 0.14,
    description: "A blur of arrows. Unmatched fire rate.",
    color: "#facc15",
  },
  piercing_bow: {
    id: "piercing_bow",
    name: "Piercing Bow",
    classId: "archer",
    rarity: "legendary",
    price: 670,
    damage: 19,
    attackSpeed: 2.0,
    critChance: 0.18,
    description: "Arrows punch through multiple foes.",
    passive: "pierce",
    color: "#38bdf8",
  },
};

export const SKILLS: Record<string, SkillDef> = {
  // Swordsman
  sword_slash: {
    id: "sword_slash",
    name: "Sword Slash",
    classId: "swordsman",
    key: "Q",
    description: "A wide melee arc that shreds nearby foes.",
    effect: "+28% damage per level",
    maxLevel: 5,
    baseCooldown: 1.2,
    upgradeCost: 3,
  },
  dash_strike: {
    id: "dash_strike",
    name: "Dash Strike",
    classId: "swordsman",
    key: "E",
    description: "Lunge forward, damaging everything in your path.",
    effect: "+range & +22% damage per level",
    maxLevel: 5,
    baseCooldown: 3,
    upgradeCost: 4,
  },
  whirlwind: {
    id: "whirlwind",
    name: "Whirlwind",
    classId: "swordsman",
    key: "R",
    description: "Spin a storm of steel around you.",
    effect: "+radius & +22% damage per level",
    maxLevel: 5,
    baseCooldown: 6,
    upgradeCost: 5,
  },
  // Mage
  fireball: {
    id: "fireball",
    name: "Fireball",
    classId: "mage",
    key: "Q",
    description: "Hurl an exploding orb of flame.",
    effect: "+30% damage & radius per level",
    maxLevel: 5,
    baseCooldown: 1.5,
    upgradeCost: 3,
  },
  ice_nova: {
    id: "ice_nova",
    name: "Ice Nova",
    classId: "mage",
    key: "E",
    description: "Burst of frost that slows all nearby enemies.",
    effect: "+radius & stronger slow per level",
    maxLevel: 5,
    baseCooldown: 4,
    upgradeCost: 4,
  },
  lightning_bolt: {
    id: "lightning_bolt",
    name: "Lightning Bolt",
    classId: "mage",
    key: "R",
    description: "Chain lightning that arcs between enemies.",
    effect: "+1 target & +18% damage per level",
    maxLevel: 5,
    baseCooldown: 5,
    upgradeCost: 5,
  },
  // Archer
  multi_shot: {
    id: "multi_shot",
    name: "Multi-Shot",
    classId: "archer",
    key: "Q",
    description: "Fire a fan of arrows at once.",
    effect: "+1 arrow per level",
    maxLevel: 5,
    baseCooldown: 1.8,
    upgradeCost: 3,
  },
  piercing_arrow: {
    id: "piercing_arrow",
    name: "Piercing Arrow",
    classId: "archer",
    key: "E",
    description: "A single arrow that punches through foes.",
    effect: "+1 pierce & +18% damage per level",
    maxLevel: 5,
    baseCooldown: 3,
    upgradeCost: 4,
  },
  rain_of_arrows: {
    id: "rain_of_arrows",
    name: "Rain of Arrows",
    classId: "archer",
    key: "R",
    description: "Call down a barrage on a target area.",
    effect: "+area & +20% damage per level",
    maxLevel: 5,
    baseCooldown: 6,
    upgradeCost: 5,
  },
};

export const MAPS: MapDef[] = [
  {
    index: 1,
    name: "Whispering Woods",
    subtitle: "A calm forest hiding restless spirits.",
    bg: "#0f2417",
    ground: "#1c3d27",
    enemyCount: 10,
    enemyHp: 30,
    enemyDamage: 6,
    eliteCount: 1,
    rewardGold: 200,
    rewardResources: 6,
    rewardWeapons: {
      swordsman: "flame_sword",
      mage: "ice_staff",
      archer: "flame_bow",
    },
    boss: {
      id: "gloomfang",
      name: "Gloomfang, Slime King",
      maxHp: 420,
      color: "#65a30d",
      description: "A gelatinous monarch that splits and splatters.",
      attacks: ["radial", "spit", "split"],
    },
    decor: ["tree", "bush", "mushroom", "stump"],
    killQuota: 0.6,
  },
  {
    index: 2,
    name: "Cinder Caverns",
    subtitle: "Lava-lit tunnels crawling with embers.",
    bg: "#2a0f08",
    ground: "#411a0f",
    enemyCount: 12,
    enemyHp: 58,
    enemyDamage: 10,
    eliteCount: 2,
    rewardGold: 320,
    rewardResources: 9,
    rewardWeapons: {
      swordsman: "poison_blade",
      mage: "lightning_staff",
      archer: "poison_bow",
    },
    boss: {
      id: "magmalord",
      name: "Magmalord Ignus",
      maxHp: 820,
      color: "#ea580c",
      description: "A molten titan that rains fire from above.",
      attacks: ["meteor", "radial", "charge"],
    },
    decor: ["stalag", "crystal", "rock", "ember"],
    killQuota: 0.6,
  },
  {
    index: 3,
    name: "Frostspire Peaks",
    subtitle: "Frozen crags guarded by the winter court.",
    bg: "#0b1f33",
    ground: "#15304d",
    enemyCount: 14,
    enemyHp: 92,
    enemyDamage: 15,
    eliteCount: 2,
    rewardGold: 460,
    rewardResources: 12,
    rewardWeapons: {
      swordsman: "critical_sword",
      mage: "arcane_staff",
      archer: "rapid_bow",
    },
    boss: {
      id: "frostqueen",
      name: "Frost Queen Vael",
      maxHp: 1380,
      color: "#38bdf8",
      description: "A glacial sovereign that freezes the ground.",
      attacks: ["frost_ring", "shards", "summon"],
    },
    decor: ["ice", "pine", "snow", "spike"],
    killQuota: 0.65,
  },
  {
    index: 4,
    name: "Shadow Abyss",
    subtitle: "The void's heart, where light goes to die.",
    bg: "#120a1f",
    ground: "#1e1030",
    enemyCount: 16,
    enemyHp: 140,
    enemyDamage: 22,
    eliteCount: 3,
    rewardGold: 680,
    rewardResources: 16,
    rewardWeapons: {
      swordsman: "lifesteal_sword",
      mage: "storm_staff",
      archer: "piercing_bow",
    },
    boss: {
      id: "voidemperor",
      name: "Void Emperor Nyx",
      maxHp: 2400,
      color: "#a855f7",
      description: "The devourer of worlds, master of the dark.",
      attacks: ["spiral", "blink", "beam"],
    },
    decor: ["obelisk", "fog", "bones", "rune"],
    killQuota: 0.7,
  },
];

export function getWeapon(id: string): WeaponDef {
  const w = WEAPONS[id];
  if (!w) throw new Error(`Unknown weapon ${id}`);
  return w;
}

export function getClassWeapons(classId: ClassId): WeaponDef[] {
  return Object.values(WEAPONS).filter((w) => w.classId === classId);
}

export function getSkill(id: string): SkillDef {
  const s = SKILLS[id];
  if (!s) throw new Error(`Unknown skill ${id}`);
  return s;
}

export function getMap(index: number): MapDef {
  const m = MAPS.find((x) => x.index === index);
  if (!m) throw new Error(`Unknown map ${index}`);
  return m;
}

export interface PermUpgradeDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  perLevel: string;
  maxLevel: number;
  /** gold cost for level n+1 = baseGold * (n+1) */
  baseGold: number;
  /** resource cost for level n+1 = baseRes * (n+1) */
  baseRes: number;
}

/**
 * Account-level permanent upgrades (The Forge). Shared across all
 * classes of an account; paid from the active hero's purse.
 */
export const PERM_UPGRADES: PermUpgradeDef[] = [
  {
    id: "vitality",
    name: "Vitality",
    icon: "❤",
    description: "Reinforced flesh and spirit.",
    perLevel: "+10 Max HP",
    maxLevel: 5,
    baseGold: 150,
    baseRes: 1,
  },
  {
    id: "keen",
    name: "Keen Eye",
    icon: "👁",
    description: "You see the gaps in their armor.",
    perLevel: "+1% Crit chance",
    maxLevel: 5,
    baseGold: 200,
    baseRes: 2,
  },
  {
    id: "fortune",
    name: "Fortune",
    icon: "⛀",
    description: "Coin and fate favour you.",
    perLevel: "+5% Gold find",
    maxLevel: 5,
    baseGold: 250,
    baseRes: 2,
  },
  {
    id: "resilience",
    name: "Resilience",
    icon: "🛡",
    description: "Blisters become battle scars.",
    perLevel: "+4% Damage reduction",
    maxLevel: 5,
    baseGold: 200,
    baseRes: 2,
  },
  {
    id: "swift",
    name: "Swift",
    icon: "👟",
    description: "Feathers on your feet.",
    perLevel: "+3% Move speed",
    maxLevel: 5,
    baseGold: 180,
    baseRes: 1,
  },
  {
    id: "focus",
    name: "Focus",
    icon: "⏳",
    description: "Meditation between strikes.",
    perLevel: "-6% Skill cooldowns",
    maxLevel: 5,
    baseGold: 220,
    baseRes: 2,
  },
];

export function permCost(def: PermUpgradeDef, currentLevel: number) {
  return {
    gold: def.baseGold * (currentLevel + 1),
    resources: def.baseRes * (currentLevel + 1),
  };
}

export function getPermDef(id: string): PermUpgradeDef | undefined {
  return PERM_UPGRADES.find((p) => p.id === id);
}

export interface PlayerStats {
  maxHp: number;
  damage: number;
  attackSpeed: number;
  moveSpeed: number;
  critChance: number;
  defense: number;
  weapon: WeaponDef;
  lifesteal: number;
  pierce: number;
  /** multiplier applied to gold earned (Fortune) */
  goldMult: number;
  /** multiplier applied to skill cooldowns (Focus) */
  cdMult: number;
}

/**
 * Compute combat stats for a class save, optionally with
 * account-level permanent forge upgrades applied.
 */
export function computeStats(
  save: SaveData,
  permLevels: Record<string, number> = {}
): PlayerStats {
  const cls = CLASSES[save.classId];
  const weapon = WEAPONS[save.equippedWeapon] ?? WEAPONS[cls.starterWeapon];
  const level = Math.max(1, save.level);
  const p = (id: string) => Math.max(0, Math.min(5, Math.floor(permLevels[id] || 0)));

  const maxHp = cls.maxHp + (level - 1) * 18 + p("vitality") * 10;
  const damage = weapon.damage + (level - 1) * 4;
  const attackSpeed = weapon.attackSpeed;
  const moveSpeed = cls.moveSpeed * (1 + p("swift") * 0.03);
  const critChance = cls.critChance + weapon.critChance + p("keen") * 0.01;
  const defense = Math.min(0.75, cls.defense + p("resilience") * 0.04);
  let lifesteal = 0;
  let pierce = 0;
  if (weapon.passive === "lifesteal") lifesteal = 0.12;
  if (weapon.passive === "pierce") pierce = 2;
  const goldMult = 1 + p("fortune") * 0.05;
  const cdMult = Math.max(0.4, 1 - p("focus") * 0.06);
  return {
    maxHp,
    damage,
    attackSpeed,
    moveSpeed,
    critChance,
    defense,
    weapon,
    lifesteal,
    pierce,
    goldMult,
    cdMult,
  };
}

export function xpToNext(level: number): number {
  return 24 + level * 16;
}

export function createDefaultSave(classId: ClassId): SaveData {
  const cls = CLASSES[classId];
  const skillLevels: Record<string, number> = {};
  cls.skillIds.forEach((id) => (skillLevels[id] = 1));
  return {
    classId,
    level: 1,
    xp: 0,
    gold: 0,
    resources: 0,
    unlockedMaps: 1,
    defeatedBosses: [],
    equippedWeapon: cls.starterWeapon,
    ownedWeapons: [cls.starterWeapon],
    skillLevels,
  };
}
