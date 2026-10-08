import type { SaveData, ClassId } from "./types";
import { CLASSES, WEAPONS, SKILLS, createDefaultSave } from "./game-data";

const VALID_CLASSES: ClassId[] = ["swordsman", "mage", "archer"];

export function isClassId(v: unknown): v is ClassId {
  return typeof v === "string" && (VALID_CLASSES as string[]).includes(v);
}

export function defaultSaveRow(userId: number, classId: ClassId) {
  const save = createDefaultSave(classId);
  return {
    userId,
    classId,
    level: save.level,
    xp: save.xp,
    gold: save.gold,
    resources: save.resources,
    unlockedMaps: save.unlockedMaps,
    defeatedBosses: save.defeatedBosses,
    equippedWeapon: save.equippedWeapon,
    ownedWeapons: save.ownedWeapons,
    skillLevels: save.skillLevels,
  };
}

export interface SaveRowLike {
  classId: string;
  level: number;
  xp: number;
  gold: number;
  resources: number;
  unlockedMaps: number;
  defeatedBosses: unknown;
  equippedWeapon: string;
  ownedWeapons: unknown;
  skillLevels: unknown;
}

export function rowToSave(row: SaveRowLike): SaveData {
  const classId = row.classId as ClassId;
  const cls = CLASSES[classId];
  const owned = Array.isArray(row.ownedWeapons)
    ? (row.ownedWeapons as string[]).filter(
        (w) => WEAPONS[w] && WEAPONS[w].classId === classId
      )
    : [cls.starterWeapon];
  if (!owned.includes(cls.starterWeapon)) owned.unshift(cls.starterWeapon);

  const equipped =
    owned.includes(row.equippedWeapon) && WEAPONS[row.equippedWeapon]
      ? row.equippedWeapon
      : cls.starterWeapon;

  const skillLevels: Record<string, number> = {};
  const rawSkills =
    row.skillLevels && typeof row.skillLevels === "object"
      ? (row.skillLevels as Record<string, unknown>)
      : {};
  cls.skillIds.forEach((id) => {
    const max = SKILLS[id].maxLevel;
    const v = Number(rawSkills[id]);
    skillLevels[id] = Number.isFinite(v)
      ? Math.min(max, Math.max(1, Math.floor(v)))
      : 1;
  });

  const defeated = Array.isArray(row.defeatedBosses)
    ? (row.defeatedBosses as number[]).filter((n) => Number.isFinite(n))
    : [];

  return {
    classId,
    level: Math.max(1, Math.floor(Number(row.level) || 1)),
    xp: Math.max(0, Math.floor(Number(row.xp) || 0)),
    gold: Math.max(0, Math.floor(Number(row.gold) || 0)),
    resources: Math.max(0, Math.floor(Number(row.resources) || 0)),
    unlockedMaps: Math.max(1, Math.floor(Number(row.unlockedMaps) || 1)),
    defeatedBosses: defeated,
    equippedWeapon: equipped,
    ownedWeapons: owned,
    skillLevels,
  };
}

/** Validate and clamp an incoming client save before persisting. */
export function sanitizeIncoming(input: unknown): SaveData | null {
  if (!input || typeof input !== "object") return null;
  const s = input as Record<string, unknown>;
  if (!isClassId(s.classId)) return null;
  const cls = CLASSES[s.classId as ClassId];

  const owned = Array.isArray(s.ownedWeapons)
    ? (s.ownedWeapons as string[]).filter(
        (w) => WEAPONS[w] && WEAPONS[w].classId === cls.id
      )
    : [];
  if (!owned.includes(cls.starterWeapon)) owned.unshift(cls.starterWeapon);

  const equipped =
    owned.includes(s.equippedWeapon as string) &&
    WEAPONS[s.equippedWeapon as string]
      ? (s.equippedWeapon as string)
      : cls.starterWeapon;

  const skillLevels: Record<string, number> = {};
  const rawSkills =
    s.skillLevels && typeof s.skillLevels === "object"
      ? (s.skillLevels as Record<string, unknown>)
      : {};
  cls.skillIds.forEach((id) => {
    const max = SKILLS[id].maxLevel;
    const v = Number(rawSkills[id]);
    skillLevels[id] = Number.isFinite(v)
      ? Math.min(max, Math.max(1, Math.floor(v)))
      : 1;
  });

  const defeated = Array.isArray(s.defeatedBosses)
    ? (s.defeatedBosses as number[]).filter(
        (n) => Number.isFinite(n) && n >= 1
      )
    : [];

  return {
    classId: cls.id,
    level: Math.max(1, Math.min(200, Math.floor(Number(s.level) || 1))),
    xp: Math.max(0, Math.min(1000000, Math.floor(Number(s.xp) || 0))),
    gold: Math.max(0, Math.min(1000000, Math.floor(Number(s.gold) || 0))),
    resources: Math.max(0, Math.min(100000, Math.floor(Number(s.resources) || 0))),
    unlockedMaps: Math.max(1, Math.min(99, Math.floor(Number(s.unlockedMaps) || 1))),
    defeatedBosses: defeated,
    equippedWeapon: equipped,
    ownedWeapons: owned,
    skillLevels,
  };
}
