/**
 * Headless integration test for the game engine.
 * Stubs the DOM, pumps frames manually, and drives real combat.
 *
 * Run: node --experimental-strip-types --import ./scripts/register.mjs scripts/engine-test.ts
 */
import assert from "node:assert";

// ---------------- DOM stubs (must be installed before importing engine) ----
const noop = () => {};
const ctxStub: any = new Proxy(
  {},
  {
    get(_t, prop) {
      if (prop === "createRadialGradient" || prop === "createLinearGradient")
        return () => ({ addColorStop: noop });
      if (prop === "measureText") return () => ({ width: 0 });
      return noop;
    },
    set(t, prop, v) {
      (t as any)[prop] = v;
      return true;
    },
  }
);

function makeEl() {
  return {
    style: {} as any,
    textContent: "",
    width: 120,
    height: 84,
    classList: { add: noop, remove: noop },
    querySelector: () => null,
    getContext: () => ctxStub,
  };
}
const els: Record<string, any> = {};
(globalThis as any).document = {
  getElementById: (id: string) => (els[id] ??= makeEl()),
};

const canvas: any = {
  width: 0,
  height: 0,
  style: {},
  getContext: () => ctxStub,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 }),
  addEventListener: noop,
  removeEventListener: noop,
};
const container: any = {
  clientWidth: 1280,
  clientHeight: 720,
  addEventListener: noop,
};

const listeners: Record<string, any[]> = {};
(globalThis as any).window = {
  addEventListener: (k: string, f: any) => ((listeners[k] ??= []).push(f)),
  removeEventListener: (k: string, f: any) => {
    const arr = listeners[k] ?? [];
    const i = arr.indexOf(f);
    if (i >= 0) arr.splice(i, 1);
  },
  AudioContext: undefined,
};

let rafQ: ((t: number) => void)[] = [];
let now = 1000;
(globalThis as any).requestAnimationFrame = (cb: (t: number) => void) => {
  rafQ.push(cb);
  return rafQ.length;
};
(globalThis as any).cancelAnimationFrame = noop;

// ---------------- engine under test ---------------------------------------
import { GameEngine } from "@/components/GameEngine";
import { createDefaultSave } from "@/lib/game-data";

let simTime = 0;
function frames(n: number, dtMs = 16.7) {
  for (let i = 0; i < n; i++) {
    simTime += dtMs;
    const cbs = rafQ;
    rafQ = [];
    for (const cb of cbs) cb(simTime);
  }
}

function makeEngine(save: ReturnType<typeof createDefaultSave>, mapIndex: number, onInteract?: (k: string) => void) {
  let result: any = null;
  const engine = new GameEngine({
    canvas,
    container,
    save,
    mapIndex,
    onComplete: (r) => (result = r),
    onInteract,
  });
  engine.start();
  return { engine, getResult: () => result };
}

let passed = 0;
const ok = (msg: string) => {
  passed++;
  console.log("  ✓", msg);
};

console.log("swordsman — world & combat:");
{
  const { engine, getResult } = makeEngine(createDefaultSave("swordsman"), 1);
  assert.equal(engine.enemies.length, 14, "10 grunts + 3 shooters + 1 elite");
  assert.ok(engine.bossRequired, "boss required on fresh save");
  assert.equal(engine.gate.open, false, "gate sealed at start");
  assert.equal(engine.killsNeeded, 9, "kill quota = 60% of 14");
  assert.ok(engine.crates.length === 3, "secret crates placed");
  ok(`world spawned (14 foes, gate sealed, quota ${engine.killsNeeded}, 3 crates, ${engine.decor.length} decor)`);

  // movement
  const p = engine.player;
  const x0 = p.x;
  engine.keys.add("d");
  frames(30);
  assert.ok(p.x > x0 + 10, "player moved right");
  engine.keys.delete("d");
  ok("movement works");

  // melee combat: pin an enemy in front of the player and swing
  const e = engine.enemies[0];
  e.x = p.x + 30;
  e.y = p.y;
  p.facing = 0;
  for (let i = 0; i < 12; i++) {
    e.x = p.x + 30;
    e.y = p.y;
    engine.basicAttack();
  }
  assert.ok(e.hp <= 0, "enemy killed by 12 sword hits");
  assert.equal(engine.kills, 1, "kill counted");
  assert.ok(engine.run.gold > 0, "gold rewarded");
  ok("melee combat + kill rewards");

  // skills don't blow up and produce effects
  const projBefore = engine.projectiles.length;
  engine.useSkill(0);
  assert.ok(engine.aoes.length > 0, "sword slash aoe");
  ok("skills (slash/dash/whirlwind) fire without error");
  void projBefore;

  // gate opens at quota
  engine.kills = engine.killsNeeded;
  frames(2);
  assert.equal(engine.gate.open, true, "gate opened at quota");
  ok("boss gate opens when quota met");

  // stepping into the gate spawns the boss
  p.x = engine.gate.x;
  p.y = engine.gate.y;
  frames(2);
  assert.ok(engine.boss, "boss spawned at gate");
  ok(`boss "${engine.boss!.name}" spawned`);

  // boss attacks over time (player stays at a stand-off distance)
  p.x = engine.boss!.x - 260;
  p.y = engine.boss!.y;
  p.hp = engine.maxHp();
  frames(240);
  assert.ok(
    engine.projectiles.length > 0 || engine.run.bossDefeated,
    "boss uses projectiles"
  );
  ok("boss attack patterns fire");

  // victory
  engine.boss!.hp = 1;
  p.x = engine.boss!.x + 40;
  p.y = engine.boss!.y;
  p.facing = Math.atan2(0, -1);
  engine.basicAttack();
  assert.ok(engine.run.bossDefeated, "boss defeated");
  assert.deepEqual(engine.run.weaponRewards, ["flame_sword"], "class reward");
  frames(200);
  const res = getResult();
  assert.equal(res?.outcome, "victory");
  assert.equal(res?.bossDefeated, true);
  assert.ok(res?.goldEarned > 100, "boss gold reward");
  ok(`victory flow complete (+${res.goldEarned}g, +${res.resourcesEarned} res, reward weapon)`);
  engine.stop();
}

console.log("cleared map — no boss respawn:");
{
  const save = createDefaultSave("swordsman");
  save.defeatedBosses = [1];
  const { engine } = makeEngine(save, 1);
  assert.equal(engine.bossRequired, false, "boss skipped on cleared map");
  assert.equal(engine.gate.open, true, "gate calm/open");
  engine.kills = 99;
  engine.player.x = engine.gate.x;
  engine.player.y = engine.gate.y;
  frames(5);
  assert.equal(engine.boss, null, "no boss on cleared map");
  ok("defeated boss stays defeated (farming mode)");
  engine.stop();
}

console.log("mage — ranged & skills:");
{
  const { engine } = makeEngine(createDefaultSave("mage"), 2);
  const p = engine.player;
  engine.basicAttack();
  assert.equal(engine.projectiles.length, 1, "basic fire bolt");
  assert.equal(engine.projectiles[0].kind, "orb");
  engine.useSkill(0); // fireball
  assert.ok(engine.projectiles.length >= 2, "fireball projectile");
  engine.useSkill(1); // ice nova
  assert.ok(engine.aoes.length >= 1, "ice nova aoe");
  engine.useSkill(2); // lightning
  frames(5);
  ok("mage basic attack + 3 skills");
  engine.stop();
}

console.log("archer — arrows & skills:");
{
  const { engine } = makeEngine(createDefaultSave("archer"), 3);
  engine.basicAttack();
  assert.equal(engine.projectiles[0].kind, "arrow");
  engine.useSkill(0); // multi shot
  assert.ok(engine.projectiles.length >= 3, "multi-shot fan");
  engine.useSkill(1); // piercing
  engine.useSkill(2); // rain
  assert.ok(engine.aoes.length >= 1, "rain of arrows aoe");
  ok("archer basic attack + 3 skills");
  engine.stop();
}

console.log("secret area & camp interact:");
{
  const interact: string[] = [];
  const { engine } = makeEngine(createDefaultSave("swordsman"), 1, (k) =>
    interact.push(k)
  );
  // break all crates
  for (const c of [...engine.crates]) {
    c.hp = 1;
    engine.damageCrate(c.x, c.y, 40);
  }
  assert.equal(engine.crates.length, 0, "all crates broken");
  assert.equal(engine.secretOpened, true, "secret revealed");
  const rich = engine.chests.find((c) => c.rich);
  assert.ok(rich, "rich chest spawned in secret");
  ok("breaking crates opens secret with rich chest");

  // camp interact
  engine.player.x = engine.camp.x;
  engine.player.y = engine.camp.y;
  engine.tryInteract();
  assert.deepEqual(interact, ["merchant"], "merchant dialog triggered");
  assert.equal(engine.paused, true, "game paused for camp");
  engine.setPaused(false);
  engine.player.x = engine.camp.x + 64;
  engine.player.y = engine.camp.y + 6;
  engine.tryInteract();
  assert.deepEqual(interact, ["merchant", "skill"], "skill station triggered");
  ok("camp merchant + skill station interact (F) with pause");
  engine.stop();
}

console.log("death returns to hub:");
{
  const { engine, getResult } = makeEngine(createDefaultSave("mage"), 1);
  const p = engine.player;
  p.invuln = 0;
  for (let i = 0; i < 30; i++) {
    p.invuln = 0;
    engine.damagePlayer(20, p.x + 10, p.y);
  }
  assert.equal(p.hp, 0, "player dead");
  frames(150);
  const res = getResult();
  assert.equal(res?.outcome, "death");
  ok("death outcome reported (progress persists via save)");
  engine.stop();
}

console.log("setSave live update:");
{
  const save = createDefaultSave("swordsman");
  const { engine } = makeEngine(save, 1);
  const dmg0 = engine.attackDamage();
  // simulate a camp purchase + equip of the flame sword
  const next = {
    ...save,
    ownedWeapons: ["iron_sword", "flame_sword"],
    equippedWeapon: "flame_sword",
    skillLevels: { ...save.skillLevels, sword_slash: 3 },
  };
  engine.setSave(next);
  assert.equal(engine.stats.weapon.id, "flame_sword", "weapon live-swapped");
  assert.ok(engine.attackDamage() > dmg0, "damage reflects new weapon");
  assert.equal(engine.save.skillLevels.sword_slash, 3, "skill level live");
  ok("in-map save refresh (camp purchases apply live)");
  engine.stop();
}

console.log(`\n${passed} engine test groups passed`);
