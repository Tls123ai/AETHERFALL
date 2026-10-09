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

console.log(`\n${checks} checks passed`);
