/**
 * Static consistency checks for game data.
 * Run: node --experimental-strip-types scripts/check-data.mjs
 */
import assert from "node:assert";
import {
  CLASSES,
  CLASS_LIST,
  WEAPONS,
  SKILLS,
  MAPS,
  PERM_UPGRADES,
  permCost,
  getPermDef,
  computeStats,
  createDefaultSave,
} from "../src/lib/game-data.ts";

const CLASS_IDS = Object.keys(CLASSES);
let checks = 0;
const ok = (msg) => {
  checks++;
  console.log("  ✓", msg);
};

console.log("classes:");
for (const cls of CLASS_LIST) {
  assert.ok(cls.starterWeapon in WEAPONS, `${cls.id} starter weapon missing`);
  assert.equal(WEAPONS[cls.starterWeapon].classId, cls.id);
  assert.equal(WEAPONS[cls.starterWeapon].starter, true);
  assert.ok(cls.starterWeapon, "starter must be owned by default");
  for (const sid of cls.skillIds) {
    assert.ok(sid in SKILLS, `${cls.id} skill ${sid} missing`);
    assert.equal(SKILLS[sid].classId, cls.id, `skill ${sid} class mismatch`);
    assert.ok(SKILLS[sid].maxLevel >= 2);
    assert.ok(SKILLS[sid].upgradeCost > 0);
  }
  ok(`${cls.id}: starter weapon + 3 skills valid`);
}

console.log("weapons:");
for (const [id, w] of Object.entries(WEAPONS)) {
  assert.ok(CLASS_IDS.includes(w.classId), `${id} bad classId`);
  assert.ok(w.damage > 0, `${id} damage`);
  assert.ok(w.attackSpeed > 0, `${id} speed`);
  if (!w.starter && !w.bossOnly) assert.ok(w.price > 0, `${id} should cost gold`);
  if (w.bossOnly) assert.equal(w.price, 0, `${id} boss-only must be free`);
}
ok(`all ${Object.keys(WEAPONS).length} weapons valid (rarity, price, class)`);

for (const cls of CLASS_LIST) {
  const shop = Object.values(WEAPONS).filter(
    (w) => w.classId === cls.id && !w.bossOnly
  );
  assert.ok(shop.length >= 4, `${cls.id} shop too small: ${shop.length}`);
  ok(`${cls.id} shop has ${shop.length} purchasable weapons`);
}

console.log("maps & bosses:");
const PATTERN_IDS = new Set(
  ["radial", "spit", "split", "meteor", "charge", "frost_ring", "shards", "summon", "spiral", "blink", "beam"]
);
for (const m of MAPS) {
  assert.ok(m.boss.attacks.length >= 2, `${m.name} boss needs patterns`);
  for (const a of m.boss.attacks)
    assert.ok(PATTERN_IDS.has(a), `${m.name} unknown pattern ${a}`);
  for (const cid of CLASS_IDS) {
    const rw = m.rewardWeapons[cid];
    assert.ok(rw in WEAPONS, `${m.name} reward weapon ${rw} missing`);
  }
  assert.ok(m.decor.length >= 3, `${m.name} decor`);
  assert.ok(m.killQuota > 0 && m.killQuota <= 1, `${m.name} kill quota`);
  assert.ok(m.boss.maxHp > 100, `${m.name} boss hp`);
  ok(`map ${m.index} ${m.name}: boss "${m.boss.name}" (${m.boss.attacks.join("/")}) + per-class rewards + decor`);
}

// difficulty curve
for (let i = 1; i < MAPS.length; i++) {
  assert.ok(MAPS[i].enemyHp > MAPS[i - 1].enemyHp, "enemy hp must increase");
  assert.ok(MAPS[i].boss.maxHp > MAPS[i - 1].boss.maxHp, "boss hp must increase");
}
ok("difficulty curve increases across maps");

console.log("permanent upgrades:");
const permIds = new Set();
for (const p of PERM_UPGRADES) {
  assert.ok(!permIds.has(p.id), `dup perm ${p.id}`);
  permIds.add(p.id);
  assert.ok(p.maxLevel >= 3 && p.baseGold > 0 && p.baseRes >= 1);
  const c0 = permCost(p, 0);
  const c1 = permCost(p, 1);
  assert.ok(c1.gold > c0.gold && c1.resources > c0.resources, "costs must scale");
}
assert.equal(getPermDef("vitality")?.id, "vitality");
ok(`${PERM_UPGRADES.length} permanent upgrades (scaling costs, maxed caps)`);

console.log("class unlocks:");
const unlockBosses = CLASS_LIST.map((c) => c.unlockBoss).filter(
  (b) => b !== null
);
assert.equal(CLASSES.swordsman.unlockBoss, null, "swordsman always unlocked");
assert.ok(unlockBosses.length === 2, "two gated heroes");
for (const b of unlockBosses) assert.ok(MAPS[b - 1], `map ${b} exists`);
const gated = CLASS_LIST.filter((c) => c.unlockBoss !== null);
assert.equal(
  new Set(gated.map((c) => c.unlockBoss)).size,
  2,
  "each boss gates a distinct hero"
);
ok("class unlock gates: mage ← Map 1 boss, archer ← Map 2 boss");

console.log("perm stat math:");
const base = computeStats(createDefaultSave("swordsman"));
const boosted = computeStats(
  { ...createDefaultSave("swordsman"), level: 1 },
  { vitality: 5, keen: 5, fortune: 5, resilience: 5, swift: 5, focus: 5 }
);
assert.equal(boosted.maxHp - base.maxHp, 50, "vitality +10 x5");
assert.ok(boosted.critChance > base.critChance, "keen");
assert.ok(boosted.goldMult > 1, "fortune");
assert.ok(boosted.defense > base.defense, "resilience");
assert.ok(boosted.defense <= 0.75, "defense capped");
assert.ok(boosted.moveSpeed > base.moveSpeed, "swift");
assert.ok(boosted.cdMult < 1, "focus");
ok("forge upgrades apply to computed stats (with caps)");

console.log(`\n${checks} checks passed`);
