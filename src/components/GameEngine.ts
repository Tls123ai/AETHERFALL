import type { SaveData, RunResult } from "@/lib/types";
import {
  CLASSES,
  WEAPONS,
  SKILLS,
  getMap,
  computeStats,
  xpToNext,
  type PlayerStats,
  type ClassDef,
} from "@/lib/game-data";
import { sfx } from "@/lib/sfx";

type EnemyType = "grunt" | "shooter" | "elite" | "mini";
type ProjKind = "arrow" | "bolt" | "orb" | "boss";

interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  facing: number;
  attackTimer: number;
  dodgeCd: number;
  dodgeTime: number;
  invuln: number;
  slowTime: number;
  slowFactor: number;
  skillCd: [number, number, number];
  hitFlash: number;
  walkPhase: number;
}

interface Enemy {
  id: number;
  type: EnemyType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  damage: number;
  radius: number;
  speed: number;
  attackTimer: number;
  shootTimer: number;
  burnTime: number;
  burnDps: number;
  poisonTime: number;
  poisonDps: number;
  slowTime: number;
  slowFactor: number;
  hitFlash: number;
  gold: number;
  res: number;
  xp: number;
  phase: number;
}

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  from: "player" | "enemy";
  life: number;
  color: string;
  pierce: number;
  hitIds: Set<number>;
  kind: ProjKind;
  burn: boolean;
  poison: boolean;
  slow: boolean;
  angle: number;
}

interface Pickup {
  x: number;
  y: number;
  kind: "health";
  value: number;
  vy: number;
  t: number;
}

interface DmgNum {
  x: number;
  y: number;
  vy: number;
  life: number;
  text: string;
  color: string;
  size: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface Aoe {
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
  damage: number;
  tick: number;
  color: string;
  slow: boolean;
  slowFactor: number;
}

interface Chest {
  x: number;
  y: number;
  opened: boolean;
  t: number;
  rich?: boolean;
}

interface Boss {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  radius: number;
  phase: number;
  attackTimer: number;
  chargeTimer: number;
  charging: number;
  chargeVx: number;
  chargeVy: number;
  hitFlash: number;
  name: string;
  color: string;
  id: string;
  state: "idle" | "telegraph";
  pattern: string;
  attackT: number;
  spiral: { t: number; rot: number; step: number } | null;
  data: { x: number; y: number }[];
  _touch?: number;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Gate {
  x: number;
  y: number;
  open: boolean;
}

interface Crate {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
}

interface Decor {
  x: number;
  y: number;
  kind: string;
  seed: number;
}

interface Zone {
  x: number;
  y: number;
  r: number;
  life: number;
  maxLife: number;
  damage: number;
  dealt: boolean;
  color: string;
}

interface Ring {
  x: number;
  y: number;
  r: number;
  vr: number;
  life: number;
  damage: number;
  hit: boolean;
  color: string;
}

interface Beam {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  life: number;
  maxLife: number;
  color: string;
}

interface BossPatternDef {
  id: string;
  minPhase: number;
  cd: number;
  tele: number;
}

/** Per-boss attack rotations — gives each boss a distinct identity. */
const BOSS_PATTERNS: Record<string, BossPatternDef[]> = {
  gloomfang: [
    { id: "radial", minPhase: 1, cd: 2.7, tele: 0.4 },
    { id: "spit", minPhase: 1, cd: 3.2, tele: 0.5 },
    { id: "split", minPhase: 2, cd: 9, tele: 0.8 },
  ],
  magmalord: [
    { id: "meteor", minPhase: 1, cd: 4.6, tele: 1.1 },
    { id: "radial", minPhase: 1, cd: 3.2, tele: 0.4 },
    { id: "charge", minPhase: 2, cd: 5.2, tele: 0.55 },
  ],
  frostqueen: [
    { id: "frost_ring", minPhase: 1, cd: 4.4, tele: 0.45 },
    { id: "shards", minPhase: 1, cd: 3.4, tele: 0.5 },
    { id: "summon", minPhase: 2, cd: 9.5, tele: 0.9 },
  ],
  voidemperor: [
    { id: "spiral", minPhase: 1, cd: 5.2, tele: 0.5 },
    { id: "blink", minPhase: 1, cd: 4.6, tele: 0.6 },
    { id: "beam", minPhase: 2, cd: 6, tele: 0.85 },
  ],
};

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const randInt = (a: number, b: number) => Math.floor(rand(a, b + 1));
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const dist = (ax: number, ay: number, bx: number, by: number) =>
  Math.hypot(ax - bx, ay - by);
const distToSegment = (
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
) => {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return dist(px, py, ax, ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / l2;
  t = clamp(t, 0, 1);
  return dist(px, py, ax + t * dx, ay + t * dy);
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface EngineOpts {
  canvas: HTMLCanvasElement;
  container: HTMLDivElement;
  save: SaveData;
  mapIndex: number;
  onComplete: (r: RunResult) => void;
  onInteract?: (kind: "merchant" | "skill") => void;
  /** account-level permanent upgrade levels */
  perms?: Record<string, number>;
}

export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  container: HTMLDivElement;
  save: SaveData;
  mapIndex: number;
  onComplete: (r: RunResult) => void;
  onInteract?: (kind: "merchant" | "skill") => void;

  cls: ClassDef;
  stats: PlayerStats;

  VW = 480;
  VH = 320;
  scale = 1;
  worldW = 1900;
  worldH = 1300;
  cam = { x: 0, y: 0 };

  player!: Player;
  enemies: Enemy[] = [];
  projectiles: Projectile[] = [];
  pickups: Pickup[] = [];
  dmgnums: DmgNum[] = [];
  particles: Particle[] = [];
  aoes: Aoe[] = [];
  chests: Chest[] = [];
  obstacles: Rect[] = [];
  boss: Boss | null = null;
  bossSpawned = false;
  bossRequired = true;

  gate: Gate = { x: 0, y: 0, open: false };
  camp: { x: number; y: number } = { x: 0, y: 0 };
  crates: Crate[] = [];
  secretOpened = false;
  decor: Decor[] = [];
  zones: Zone[] = [];
  rings: Ring[] = [];
  beams: Beam[] = [];
  killsNeeded = 0;
  kills = 0;
  shake = 0;
  paused = false;
  perms: Record<string, number> = {};

  keys = new Set<string>();
  mx = 0;
  my = 0;
  mdown = false;
  aimX = 0;
  aimY = 0;

  run = {
    gold: 0,
    res: 0,
    xp: 0,
    level: 1,
    weaponRewards: [] as string[],
    bossDefeated: false,
  };
  banner = { text: "", time: 0 };
  finished = false;
  started = false;
  raf = 0;
  last = 0;
  idc = 1;
  victoryTimer = 0;
  deathTimer = 0;
  lastHitSfx = 0;
  time = 0;

  keyDownHandler = (e: KeyboardEvent) => this.onKeyDown(e);
  keyUpHandler = (e: KeyboardEvent) => this.onKeyUp(e);
  mouseDownHandler = (e: MouseEvent) => this.onMouseDown(e);
  mouseUpHandler = () => (this.mdown = false);
  mouseMoveHandler = (e: MouseEvent) => this.onMouseMove(e);
  resizeHandler = () => this.resize();
  blurHandler = () => this.keys.clear();

  constructor(opts: EngineOpts) {
    this.canvas = opts.canvas;
    this.container = opts.container;
    this.save = opts.save;
    this.mapIndex = opts.mapIndex;
    this.onComplete = opts.onComplete;
    this.onInteract = opts.onInteract;
    this.cls = CLASSES[opts.save.classId];
    this.stats = computeStats(opts.save, opts.perms ?? {});
    this.perms = { ...(opts.perms ?? {}) };
    this.ctx = this.canvas.getContext("2d")!;
    this.run.level = opts.save.level;
    this.run.xp = opts.save.xp;
    this.bossRequired = !opts.save.defeatedBosses.includes(opts.mapIndex);
  }

  attackDamage() {
    return this.stats.weapon.damage + (this.run.level - 1) * 4;
  }
  maxHp() {
    // stats.maxHp includes class base + save-level + Vitality;
    // add in-run level-ups earned since the run started
    return this.stats.maxHp + (this.run.level - this.save.level) * 18;
  }

  start() {
    if (this.started) return;
    this.started = true;
    window.addEventListener("keydown", this.keyDownHandler);
    window.addEventListener("keyup", this.keyUpHandler);
    this.canvas.addEventListener("mousedown", this.mouseDownHandler);
    window.addEventListener("mouseup", this.mouseUpHandler);
    window.addEventListener("mousemove", this.mouseMoveHandler);
    window.addEventListener("resize", this.resizeHandler);
    window.addEventListener("blur", this.blurHandler);
    this.resize();
    this.spawnWorld();
    this.last = performance.now();
    this.raf = requestAnimationFrame((t) => this.loop(t));
  }

  stop() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener("keydown", this.keyDownHandler);
    window.removeEventListener("keyup", this.keyUpHandler);
    this.canvas.removeEventListener("mousedown", this.mouseDownHandler);
    window.removeEventListener("mouseup", this.mouseUpHandler);
    window.removeEventListener("mousemove", this.mouseMoveHandler);
    window.removeEventListener("resize", this.resizeHandler);
    window.removeEventListener("blur", this.blurHandler);
  }

  setPaused(p: boolean) {
    this.paused = p;
  }

  /** Live-update save after in-map purchases/upgrades. */
  setSave(next: SaveData) {
    this.save = next;
    this.stats = computeStats(next, this.perms);
    if (this.player)
      this.player.hp = Math.min(this.player.hp, this.maxHp());
  }

  /** Live-update permanent upgrade levels (account level). */
  setPerms(perms: Record<string, number>) {
    this.perms = { ...perms };
    this.stats = computeStats(this.save, this.perms);
    if (this.player)
      this.player.hp = Math.min(this.player.hp, this.maxHp());
  }

  requestAbandon() {
    if (!this.finished && !this.paused) this.complete("abandon");
  }

  resize() {
    const w = this.container.clientWidth || 800;
    const h = this.container.clientHeight || 500;
    this.canvas.width = w;
    this.canvas.height = h;
    this.canvas.style.width = w + "px";
    this.canvas.style.height = h + "px";
    this.VH = 320;
    this.VW = Math.round((this.VH * w) / h);
    this.scale = w / this.VW;
  }

  // ---------- world ----------
  spawnWorld() {
    const map = getMap(this.mapIndex);
    this.worldW = 1700 + this.mapIndex * 120;
    this.worldH = 1150 + this.mapIndex * 80;
    this.player = {
      x: this.worldW / 2,
      y: this.worldH - 160,
      vx: 0,
      vy: 0,
      hp: this.maxHp(),
      facing: -Math.PI / 2,
      attackTimer: 0,
      dodgeCd: 0,
      dodgeTime: 0,
      invuln: 0,
      slowTime: 0,
      slowFactor: 1,
      skillCd: [0, 0, 0],
      hitFlash: 0,
      walkPhase: 0,
    };
    this.cam.x = clamp(this.player.x - this.VW / 2, 0, this.worldW - this.VW);
    this.cam.y = clamp(this.player.y - this.VH / 2, 0, this.worldH - this.VH);

    // boss gate (far corner) + mid-map camp
    this.gate = { x: this.worldW - 170, y: 170, open: !this.bossRequired };
    this.camp = { x: this.worldW * 0.52, y: this.worldH * 0.45 };

    const avoid = (x: number, y: number, r: number) =>
      dist(x, y, this.player.x, this.player.y) < r ||
      dist(x, y, this.gate.x, this.gate.y) < r + 60 ||
      dist(x, y, this.camp.x, this.camp.y) < r + 70;

    // obstacles (rock clusters)
    const clusters = 5 + this.mapIndex;
    for (let i = 0; i < clusters; i++) {
      const ox = rand(120, this.worldW - 180);
      const oy = rand(120, this.worldH - 180);
      if (avoid(ox, oy, 160)) continue;
      const n = randInt(2, 4);
      for (let j = 0; j < n; j++) {
        this.obstacles.push({
          x: ox + rand(-40, 40),
          y: oy + rand(-40, 40),
          w: rand(34, 60),
          h: rand(34, 60),
        });
      }
    }

    // themed decorations (visual only)
    const rng = mulberry32(this.mapIndex * 7919 + 13);
    const decorCount = 26 + this.mapIndex * 4;
    for (let i = 0; i < decorCount; i++) {
      const x = 60 + rng() * (this.worldW - 120);
      const y = 60 + rng() * (this.worldH - 120);
      if (avoid(x, y, 90)) continue;
      this.decor.push({
        x,
        y,
        kind: map.decor[Math.floor(rng() * map.decor.length)],
        seed: rng() * 1000,
      });
    }

    // secret crates (breakable wall hiding a treasure)
    const sx = rand(150, 380);
    const sy = rand(150, this.worldH - 200);
    for (let i = 0; i < 3; i++) {
      this.crates.push({ x: sx + (i - 1) * 30, y: sy, hp: 3, maxHp: 3 });
    }

    // enemies
    for (let i = 0; i < map.enemyCount; i++) this.spawnEnemy("grunt");
    for (let i = 0; i < Math.ceil(map.enemyCount / 4); i++)
      this.spawnEnemy("shooter");
    for (let i = 0; i < map.eliteCount; i++) this.spawnEnemy("elite");
    const total =
      map.enemyCount + Math.ceil(map.enemyCount / 4) + map.eliteCount;
    this.killsNeeded = Math.ceil(total * map.killQuota);

    // chests (some secret, in corners)
    const spots = [
      [100, 100],
      [this.worldW - 100, 100],
      [100, this.worldH - 100],
      [this.worldW / 2, 120],
      [this.worldW / 2, this.worldH - 80],
    ];
    spots.forEach((s, i) => {
      if (i < 3 + this.mapIndex)
        this.chests.push({ x: s[0], y: s[1], opened: false, t: 0 });
    });

    this.banner = {
      text: this.bossRequired ? map.name : `${map.name}  —  CLEARED`,
      time: 2.4,
    };
  }

  spawnEnemy(type: EnemyType, px?: number, py?: number) {
    const map = getMap(this.mapIndex);
    let x = px ?? 0;
    let y = py ?? 0;
    if (px === undefined) {
      for (let tries = 0; tries < 30; tries++) {
        x = rand(80, this.worldW - 80);
        y = rand(80, this.worldH - 80);
        const far =
          dist(x, y, this.player.x, this.player.y) > 260 &&
          dist(x, y, this.gate.x, this.gate.y) > 170 &&
          dist(x, y, this.camp.x, this.camp.y) > 130;
        if (far) break;
      }
    }
    let hp = map.enemyHp;
    let dmg = map.enemyDamage;
    let radius = 9;
    let speed = rand(55, 80);
    let gold = 8;
    let res = 0;
    let xp = Math.round(hp / 3);
    if (type === "shooter") {
      hp = Math.round(hp * 0.8);
      speed = rand(40, 60);
      gold = 10;
      res = 1;
    } else if (type === "elite") {
      hp = Math.round(hp * 3);
      dmg = Math.round(dmg * 1.7);
      radius = 15;
      speed = rand(60, 78);
      gold = 45;
      res = 4;
      xp = Math.round(hp / 3);
    } else if (type === "mini") {
      hp = Math.round(hp * 0.6);
      dmg = Math.round(dmg * 0.8);
      radius = 11;
      speed = rand(80, 100);
      gold = 12;
      res = 1;
      xp = Math.round(hp / 3);
    }
    this.enemies.push({
      id: this.idc++,
      type,
      x,
      y,
      vx: 0,
      vy: 0,
      hp,
      maxHp: hp,
      damage: dmg,
      radius,
      speed,
      attackTimer: 0,
      shootTimer: rand(0.5, 2),
      burnTime: 0,
      burnDps: 0,
      poisonTime: 0,
      poisonDps: 0,
      slowTime: 0,
      slowFactor: 1,
      hitFlash: 0,
      gold,
      res,
      xp,
      phase: 0,
    });
  }

  // ---------- input ----------
  onKeyDown(e: KeyboardEvent) {
    sfx.unlock();
    const k = e.key.toLowerCase();
    this.keys.add(k);
    if (this.paused) return;
    if (k === "q") this.useSkill(0);
    else if (k === "e") this.useSkill(1);
    else if (k === "r") this.useSkill(2);
    else if (k === " ") this.mdown = true;
    else if (k === "f") this.tryInteract();
    else if (k === "m") {
      sfx.setMuted(!sfx.muted);
      this.dmgnums.push({
        x: this.player.x,
        y: this.player.y - 20,
        vy: -20,
        life: 1,
        text: sfx.muted ? "SOUND OFF" : "SOUND ON",
        color: "#94a3b8",
        size: 7,
      });
    } else if (k === "escape") this.requestAbandon();
    if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k))
      e.preventDefault();
  }
  onKeyUp(e: KeyboardEvent) {
    const k = e.key.toLowerCase();
    this.keys.delete(k);
    if (k === " ") this.mdown = false;
  }
  onMouseDown(e: MouseEvent) {
    sfx.unlock();
    if (e.button === 0) this.mdown = true;
  }
  onMouseMove(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    this.mx = e.clientX - rect.left;
    this.my = e.clientY - rect.top;
  }

  tryInteract() {
    if (!this.onInteract) return;
    const p = this.player;
    const dTent = dist(p.x, p.y, this.camp.x, this.camp.y);
    const dCrystal = dist(
      p.x,
      p.y,
      this.camp.x + 64,
      this.camp.y + 6
    );
    if (dTent < 56) {
      sfx.play("ui");
      this.paused = true;
      this.onInteract("merchant");
    } else if (dCrystal < 48) {
      sfx.play("ui");
      this.paused = true;
      this.onInteract("skill");
    }
  }

  // ---------- main loop ----------
  loop(ts: number) {
    if (this.finished) return;
    let dt = (ts - this.last) / 1000;
    this.last = ts;
    dt = Math.min(0.05, dt);
    if (!this.paused) this.update(dt);
    this.render();
    this.updateHud();
    this.raf = requestAnimationFrame((t) => this.loop(t));
  }

  update(dt: number) {
    this.time += dt;
    this.shake = Math.max(0, this.shake - dt * 26);
    // aim
    const rect = this.canvas.getBoundingClientRect();
    const vx = (this.mx / Math.max(1, rect.width)) * this.VW;
    const vy = (this.my / Math.max(1, rect.height)) * this.VH;
    this.aimX = this.cam.x + vx;
    this.aimY = this.cam.y + vy;

    this.updatePlayer(dt);
    this.updateEnemies(dt);
    this.updateBoss(dt);
    this.updateProjectiles(dt);
    this.updateAoes(dt);
    this.updatePickups(dt);
    this.updateParticles(dt);
    this.updateDmgNums(dt);
    this.updateChests(dt);
    this.updateZones(dt);
    this.updateRings(dt);
    this.updateBeams(dt);

    // boss gate: opens once the kill quota is met
    if (
      this.bossRequired &&
      !this.gate.open &&
      this.kills >= this.killsNeeded
    ) {
      this.gate.open = true;
      this.banner = { text: "THE BOSS GATE HAS OPENED!", time: 2.6 };
      this.shake = 4;
      sfx.play("gate");
    }

    // boss spawn: step into the open gate
    if (
      this.bossRequired &&
      this.gate.open &&
      !this.bossSpawned &&
      !this.run.bossDefeated &&
      dist(this.player.x, this.player.y, this.gate.x, this.gate.y) < 54
    ) {
      this.spawnBoss();
    }

    // camera
    const tcx = clamp(this.player.x - this.VW / 2, 0, this.worldW - this.VW);
    const tcy = clamp(this.player.y - this.VH / 2, 0, this.worldH - this.VH);
    this.cam.x += (tcx - this.cam.x) * Math.min(1, dt * 8);
    this.cam.y += (tcy - this.cam.y) * Math.min(1, dt * 8);

    if (this.banner.time > 0) this.banner.time -= dt;

    // victory / death handling
    if (this.victoryTimer > 0) {
      this.victoryTimer -= dt;
      if (this.victoryTimer <= 0) this.complete("victory");
    }
    if (this.deathTimer > 0) {
      this.deathTimer -= dt;
      if (this.deathTimer <= 0) this.complete("death");
    }
  }

  updatePlayer(dt: number) {
    const p = this.player;
    p.attackTimer = Math.max(0, p.attackTimer - dt);
    p.dodgeCd = Math.max(0, p.dodgeCd - dt);
    p.dodgeTime = Math.max(0, p.dodgeTime - dt);
    p.invuln = Math.max(0, p.invuln - dt);
    p.hitFlash = Math.max(0, p.hitFlash - dt);
    p.slowTime = Math.max(0, p.slowTime - dt);
    for (let i = 0; i < 3; i++) p.skillCd[i] = Math.max(0, p.skillCd[i] - dt);

    let dx = 0;
    let dy = 0;
    if (this.keys.has("a") || this.keys.has("arrowleft")) dx -= 1;
    if (this.keys.has("d") || this.keys.has("arrowright")) dx += 1;
    if (this.keys.has("w") || this.keys.has("arrowup")) dy -= 1;
    if (this.keys.has("s") || this.keys.has("arrowdown")) dy += 1;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;

    // aim facing
    p.facing = Math.atan2(this.aimY - p.y, this.aimX - p.x);

    // dodge
    if (
      (this.keys.has("shift") || this.keys.has("x")) &&
      p.dodgeCd <= 0 &&
      (dx !== 0 || dy !== 0)
    ) {
      p.dodgeTime = 0.22;
      p.dodgeCd = 1.1;
      p.invuln = 0.32;
      p.vx = dx * this.stats.moveSpeed * 2.4;
      p.vy = dy * this.stats.moveSpeed * 2.4;
      sfx.play("dodge");
    }

    const slowMul = p.slowTime > 0 ? p.slowFactor : 1;
    if (p.dodgeTime <= 0) {
      p.vx = dx * this.stats.moveSpeed * slowMul;
      p.vy = dy * this.stats.moveSpeed * slowMul;
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;
    this.collideWorld(p, 8);
    if (dx !== 0 || dy !== 0) p.walkPhase += dt * 12;

    // attack
    if (this.mdown && p.attackTimer <= 0) this.basicAttack();
  }

  collideWorld(o: { x: number; y: number }, r: number) {
    o.x = clamp(o.x, r, this.worldW - r);
    o.y = clamp(o.y, r, this.worldH - r);
    for (const rect of this.obstacles) {
      const nx = clamp(o.x, rect.x, rect.x + rect.w);
      const ny = clamp(o.y, rect.y, rect.y + rect.h);
      const ddx = o.x - nx;
      const ddy = o.y - ny;
      const d2 = ddx * ddx + ddy * ddy;
      if (d2 < r * r) {
        const d = Math.sqrt(d2) || 0.001;
        o.x = nx + (ddx / d) * r;
        o.y = ny + (ddy / d) * r;
      }
    }
  }

  /** Bounds-only clamp (enemies/boss ignore obstacles so they never get stuck). */
  clampBounds(o: { x: number; y: number }, r: number) {
    o.x = clamp(o.x, r, this.worldW - r);
    o.y = clamp(o.y, r, this.worldH - r);
  }

  damageCrate(x: number, y: number, range: number) {
    let best: Crate | null = null;
    let bd = Infinity;
    for (const c of this.crates) {
      if (c.hp <= 0) continue;
      const d = dist(x, y, c.x, c.y);
      if (d < range && d < bd) {
        bd = d;
        best = c;
      }
    }
    if (best) {
      best.hp -= 1;
      this.spawnHitSpark(best.x, best.y, "#b45309");
      sfx.play("crack");
      if (best.hp <= 0) {
        this.crates = this.crates.filter((c) => c !== best);
        this.spawnHitSpark(best.x, best.y, "#92400e");
        if (this.crates.length === 0 && !this.secretOpened) {
          this.secretOpened = true;
          this.banner = { text: "SECRET FOUND!", time: 2.4 };
          sfx.play("secret");
          this.chests.push({
            x: best.x,
            y: best.y + 26,
            opened: false,
            t: 0,
            rich: true,
          });
          this.pickups.push({
            x: best.x,
            y: best.y - 20,
            kind: "health",
            value: Math.round(this.maxHp() * 0.2),
            vy: 0,
            t: 0,
          });
        }
      }
    }
  }

  basicAttack() {
    const p = this.player;
    p.attackTimer = 1 / this.stats.attackSpeed;
    const base = this.attackDamage();
    const w = this.stats.weapon;
    if (this.cls.id === "swordsman") {
      // melee cone
      const range = 46;
      const dmg = base;
      let hit = false;
      const hitList = [...this.enemies];
      for (const e of hitList) {
        const d = dist(p.x, p.y, e.x, e.y);
        if (d > range + e.radius) continue;
        const ang = Math.atan2(e.y - p.y, e.x - p.x);
        let diff = Math.abs(ang - p.facing);
        if (diff > Math.PI) diff = Math.PI * 2 - diff;
        if (diff < 1.0) {
          this.dealToEnemy(e, dmg, p.facing);
          hit = true;
        }
      }
      if (this.boss && dist(p.x, p.y, this.boss.x, this.boss.y) < range + this.boss.radius) {
        const ang = Math.atan2(this.boss.y - p.y, this.boss.x - p.x);
        let diff = Math.abs(ang - p.facing);
        if (diff > Math.PI) diff = Math.PI * 2 - diff;
        if (diff < 1.1) {
          this.dealToBoss(dmg);
          hit = true;
        }
      }
      this.damageCrate(p.x, p.y, range + 14);
      // slash visual
      this.particles.push({
        x: p.x + Math.cos(p.facing) * 20,
        y: p.y + Math.sin(p.facing) * 20,
        vx: 0,
        vy: 0,
        life: 0.18,
        maxLife: 0.18,
        color: w.color,
        size: 30,
      });
      sfx.play("swing");
      if (hit)
        this.spawnHitSpark(
          p.x + Math.cos(p.facing) * 30,
          p.y + Math.sin(p.facing) * 30,
          w.color
        );
    } else {
      // ranged
      const kind: ProjKind = this.cls.id === "mage" ? "orb" : "arrow";
      const spd = this.cls.id === "mage" ? 340 : 400;
      const pierce = this.stats.pierce;
      this.projectiles.push({
        x: p.x + Math.cos(p.facing) * 10,
        y: p.y + Math.sin(p.facing) * 10,
        vx: Math.cos(p.facing) * spd,
        vy: Math.sin(p.facing) * spd,
        radius: 4,
        damage: base,
        from: "player",
        life: 1.3,
        color: w.color,
        pierce,
        hitIds: new Set(),
        kind,
        burn: w.passive === "burn",
        poison: w.passive === "poison",
        slow: w.passive === "slow",
        angle: p.facing,
      });
      sfx.play(this.cls.id === "mage" ? "orb" : "arrow");
    }
  }

  useSkill(slot: number) {
    if (this.finished) return;
    const p = this.player;
    if (p.skillCd[slot] > 0) return;
    const skillId = this.cls.skillIds[slot];
    const skill = SKILLS[skillId];
    const lvl = this.save.skillLevels[skillId] ?? 1;
    const base = this.attackDamage();
    p.skillCd[slot] = skill.baseCooldown * this.stats.cdMult;
    sfx.play("skill");

    if (this.cls.id === "swordsman") {
      if (skillId === "sword_slash") {
        const range = 78;
        const dmg = base * (1 + 0.28 * (lvl - 1)) * 2.3;
        const list = [...this.enemies];
        for (const e of list) {
          if (dist(p.x, p.y, e.x, e.y) < range + e.radius) {
            const ang = Math.atan2(e.y - p.y, e.x - p.x);
            let diff = Math.abs(ang - p.facing);
            if (diff > Math.PI) diff = Math.PI * 2 - diff;
            if (diff < 1.3) this.dealToEnemy(e, dmg, p.facing);
          }
        }
        if (this.boss && dist(p.x, p.y, this.boss.x, this.boss.y) < range + this.boss.radius) {
          const ang = Math.atan2(this.boss.y - p.y, this.boss.x - p.x);
          let diff = Math.abs(ang - p.facing);
          if (diff > Math.PI) diff = Math.PI * 2 - diff;
          if (diff < 1.4) this.dealToBoss(dmg);
        }
        this.damageCrate(p.x, p.y, range + 10);
        this.aoes.push({
          x: p.x,
          y: p.y,
          radius: range,
          life: 0.25,
          maxLife: 0.25,
          damage: 0,
          tick: 0,
          color: this.stats.weapon.color,
          slow: false,
          slowFactor: 1,
        });
      } else if (skillId === "dash_strike") {
        const range = 150 + 42 * (lvl - 1);
        const dmg = base * (1 + 0.22 * (lvl - 1)) * 2.6;
        p.invuln = Math.max(p.invuln, 0.25);
        p.dodgeTime = 0.18;
        p.vx = Math.cos(p.facing) * range * 5;
        p.vy = Math.sin(p.facing) * range * 5;
        // damage along the dash
        for (let step = 0; step < 6; step++) {
          const tx = p.x + Math.cos(p.facing) * (step * range) / 6;
          const ty = p.y + Math.sin(p.facing) * (step * range) / 6;
          const list = [...this.enemies];
          for (const e of list) {
            if (dist(tx, ty, e.x, e.y) < 26 + e.radius)
              this.dealToEnemy(e, dmg * 0.5, p.facing);
          }
          if (this.boss && dist(tx, ty, this.boss.x, this.boss.y) < 26 + this.boss.radius)
            this.dealToBoss(dmg * 0.5);
          this.damageCrate(tx, ty, 26);
        }
        this.spawnHitSpark(
          p.x + Math.cos(p.facing) * range,
          p.y + Math.sin(p.facing) * range,
          this.stats.weapon.color
        );
      } else if (skillId === "whirlwind") {
        const radius = 96 + 26 * (lvl - 1);
        const dmg = base * (1 + 0.22 * (lvl - 1)) * 1.1;
        this.aoes.push({
          x: p.x,
          y: p.y,
          radius,
          life: 0.85,
          maxLife: 0.85,
          damage: dmg,
          tick: 0,
          color: this.stats.weapon.color,
          slow: false,
          slowFactor: 1,
        });
      }
    } else if (this.cls.id === "mage") {
      if (skillId === "fireball") {
        const radius = 34 + 14 * (lvl - 1);
        const dmg = base * (1 + 0.3 * (lvl - 1)) * 2.0;
        this.projectiles.push({
          x: p.x,
          y: p.y,
          vx: Math.cos(p.facing) * 360,
          vy: Math.sin(p.facing) * 360,
          radius: 7,
          damage: dmg,
          from: "player",
          life: 1.4,
          color: "#f97316",
          pierce: 0,
          hitIds: new Set(),
          kind: "orb",
          burn: true,
          poison: false,
          slow: false,
          angle: p.facing,
        });
        // explosion at target after travel
        const tx = p.x + Math.cos(p.facing) * 240;
        const ty = p.y + Math.sin(p.facing) * 240;
        this.aoes.push({
          x: tx,
          y: ty,
          radius,
          life: 0.4,
          maxLife: 0.4,
          damage: dmg,
          tick: 0.4,
          color: "#fb923c",
          slow: false,
          slowFactor: 1,
        });
        this.spawnHitSpark(tx, ty, "#fb923c");
      } else if (skillId === "ice_nova") {
        const radius = 130 + 26 * (lvl - 1);
        const dmg = base * (1 + 0.15 * (lvl - 1)) * 1.2;
        const list = [...this.enemies];
        for (const e of list) {
          if (dist(p.x, p.y, e.x, e.y) < radius + e.radius) {
            this.dealToEnemy(e, dmg, p.facing);
            e.slowTime = 2.6;
            e.slowFactor = Math.max(0.3, 0.55 - 0.04 * lvl);
          }
        }
        if (this.boss && dist(p.x, p.y, this.boss.x, this.boss.y) < radius + this.boss.radius) {
          this.dealToBoss(dmg);
        }
        this.aoes.push({
          x: p.x,
          y: p.y,
          radius,
          life: 0.35,
          maxLife: 0.35,
          damage: 0,
          tick: 0,
          color: "#7dd3fc",
          slow: false,
          slowFactor: 1,
        });
      } else if (skillId === "lightning_bolt") {
        const targets = 2 + (lvl - 1);
        const dmg = base * (1 + 0.18 * (lvl - 1)) * 1.5;
        let cx = p.x;
        let cy = p.y;
        const hit = new Set<number>();
        for (let t = 0; t < targets; t++) {
          let best: Enemy | null = null;
          let bd = 1e9;
          for (const e of this.enemies) {
            if (hit.has(e.id)) continue;
            const d = dist(cx, cy, e.x, e.y);
            if (d < bd) {
              bd = d;
              best = e;
            }
          }
          if (!best) break;
          this.particles.push({
            x: cx,
            y: cy,
            vx: 0,
            vy: 0,
            life: 0.16,
            maxLife: 0.16,
            color: "#c084fc",
            size: 0,
          });
          this.dealToEnemy(best, dmg, p.facing);
          hit.add(best.id);
          cx = best.x;
          cy = best.y;
          this.spawnHitSpark(best.x, best.y, "#c084fc");
        }
        if (this.boss) this.dealToBoss(dmg);
      }
    } else {
      // archer
      if (skillId === "multi_shot") {
        const arrows = 2 + (lvl - 1);
        const dmg = base * (1 + 0.1 * (lvl - 1)) * 1.1;
        for (let i = 0; i < arrows; i++) {
          const off = (i - (arrows - 1) / 2) * 0.22;
          const a = p.facing + off;
          this.projectiles.push({
            x: p.x,
            y: p.y,
            vx: Math.cos(a) * 420,
            vy: Math.sin(a) * 420,
            radius: 4,
            damage: dmg,
            from: "player",
            life: 1.1,
            color: this.stats.weapon.color,
            pierce: this.stats.pierce,
            hitIds: new Set(),
            kind: "arrow",
            burn: this.stats.weapon.passive === "burn",
            poison: this.stats.weapon.passive === "poison",
            slow: false,
            angle: a,
          });
        }
      } else if (skillId === "piercing_arrow") {
        const pierce = 2 + (lvl - 1);
        const dmg = base * (1 + 0.18 * (lvl - 1)) * 1.9;
        this.projectiles.push({
          x: p.x,
          y: p.y,
          vx: Math.cos(p.facing) * 460,
          vy: Math.sin(p.facing) * 460,
          radius: 5,
          damage: dmg,
          from: "player",
          life: 1.4,
          color: this.stats.weapon.color,
          pierce,
          hitIds: new Set(),
          kind: "arrow",
          burn: this.stats.weapon.passive === "burn",
          poison: this.stats.weapon.passive === "poison",
          slow: false,
          angle: p.facing,
        });
      } else if (skillId === "rain_of_arrows") {
        const radius = 100 + 22 * (lvl - 1);
        const dmg = base * (1 + 0.2 * (lvl - 1)) * 2.0;
        this.aoes.push({
          x: this.aimX,
          y: this.aimY,
          radius,
          life: 1.0,
          maxLife: 1.0,
          damage: dmg,
          tick: 1.0,
          color: "#fde047",
          slow: false,
          slowFactor: 1,
        });
        for (let i = 0; i < 14; i++) {
          this.particles.push({
            x: this.aimX + rand(-radius, radius),
            y: this.aimY + rand(-radius, radius) - 60,
            vx: 0,
            vy: rand(180, 260),
            life: 0.4,
            maxLife: 0.4,
            color: "#facc15",
            size: 3,
          });
        }
      }
    }
  }

  dealToEnemy(e: Enemy, amount: number, _fromAngle: number) {
    const crit = Math.random() < this.stats.critChance;
    const dmg = Math.round(amount * (crit ? 2 : 1));
    e.hp -= dmg;
    e.hitFlash = 0.1;
    this.dmgnums.push({
      x: e.x,
      y: e.y - e.radius,
      vy: -28,
      life: 0.7,
      text: String(dmg),
      color: crit ? "#fde047" : "#ffffff",
      size: crit ? 9 : 7,
    });
    const now = performance.now();
    if (now - this.lastHitSfx > 90) {
      this.lastHitSfx = now;
      sfx.play(crit ? "crit" : "hit");
    }
    if (this.stats.lifesteal > 0) {
      this.player.hp = Math.min(this.maxHp(), this.player.hp + dmg * this.stats.lifesteal);
    }
    const w = this.stats.weapon;
    if (w.passive === "burn") {
      e.burnTime = 3;
      e.burnDps = Math.max(e.burnDps, dmg * 0.12);
    } else if (w.passive === "poison") {
      e.poisonTime = 4;
      e.poisonDps = Math.max(e.poisonDps, dmg * 0.08);
    } else if (w.passive === "slow") {
      e.slowTime = 2;
      e.slowFactor = Math.min(e.slowFactor || 1, 0.6);
    }
    // knockback
    const a = Math.atan2(e.y - this.player.y, e.x - this.player.x);
    e.x += Math.cos(a) * 4;
    e.y += Math.sin(a) * 4;
    if (e.hp <= 0) this.killEnemy(e);
  }

  dealToBoss(amount: number) {
    if (!this.boss) return;
    const crit = Math.random() < this.stats.critChance;
    const dmg = Math.round(amount * (crit ? 2 : 1));
    this.boss.hp -= dmg;
    this.boss.hitFlash = 0.1;
    this.dmgnums.push({
      x: this.boss.x,
      y: this.boss.y - this.boss.radius,
      vy: -30,
      life: 0.7,
      text: String(dmg),
      color: crit ? "#fde047" : "#ffffff",
      size: crit ? 10 : 8,
    });
    const now = performance.now();
    if (now - this.lastHitSfx > 90) {
      this.lastHitSfx = now;
      sfx.play(crit ? "crit" : "hit");
    }
    if (this.stats.lifesteal > 0) {
      this.player.hp = Math.min(this.maxHp(), this.player.hp + dmg * this.stats.lifesteal);
    }
    const w = this.stats.weapon;
    if (w.passive === "burn") {
      this.boss.hp -= 0; // bosses resist dots lightly; ignore
    }
    if (this.boss.hp <= 0 && !this.run.bossDefeated) this.killBoss();
  }

  killEnemy(e: Enemy) {
    this.enemies = this.enemies.filter((x) => x.id !== e.id);
    this.kills += 1;
    this.run.gold += Math.round(e.gold * this.stats.goldMult);
    this.run.res += e.res;
    this.addXp(e.xp);
    this.dmgnums.push({
      x: e.x,
      y: e.y,
      vy: -20,
      life: 0.8,
      text: `+${e.gold}g`,
      color: "#fbbf24",
      size: 7,
    });
    this.spawnHitSpark(e.x, e.y, this.enemyColor(e.type));
    sfx.play("coin");
    if (Math.random() < 0.28) {
      this.pickups.push({
        x: e.x,
        y: e.y,
        kind: "health",
        value: Math.round(this.maxHp() * 0.14),
        vy: 0,
        t: 0,
      });
    }
  }

  killBoss() {
    this.run.bossDefeated = true;
    const map = getMap(this.mapIndex);
    this.run.gold += Math.round(map.rewardGold * this.stats.goldMult);
    this.run.res += map.rewardResources;
    const reward = map.rewardWeapons[this.cls.id];
    if (reward && !this.run.weaponRewards.includes(reward))
      this.run.weaponRewards.push(reward);
    this.addXp(Math.round(map.boss.maxHp / 4));
    this.spawnHitSpark(this.boss!.x, this.boss!.y, this.boss!.color);
    this.particles.push({
      x: this.boss!.x,
      y: this.boss!.y,
      vx: 0,
      vy: 0,
      life: 0.5,
      maxLife: 0.5,
      color: this.boss!.color,
      size: 80,
    });
    this.boss = null;
    this.shake = 8;
    this.banner = { text: "BOSS DEFEATED!", time: 2.6 };
    sfx.play("victory");
    this.victoryTimer = 2.2;
  }

  addXp(amount: number) {
    this.run.xp += amount;
    while (this.run.xp >= xpToNext(this.run.level)) {
      this.run.xp -= xpToNext(this.run.level);
      this.run.level += 1;
      const newMax = this.maxHp();
      this.player.hp = Math.min(newMax, this.player.hp + 40);
      this.spawnHitSpark(this.player.x, this.player.y, "#fde047");
      this.dmgnums.push({
        x: this.player.x,
        y: this.player.y - 16,
        vy: -24,
        life: 1,
        text: "LEVEL UP!",
        color: "#fde047",
        size: 8,
      });
      this.shake = Math.max(this.shake, 3);
      sfx.play("levelup");
    }
  }

  // ---------- enemy AI ----------
  updateEnemies(dt: number) {
    const p = this.player;
    for (const e of this.enemies) {
      e.hitFlash = Math.max(0, e.hitFlash - dt);
      // status
      if (e.burnTime > 0) {
        e.burnTime -= dt;
        this.dealStatus(e, e.burnDps * dt, "#f97316");
      }
      if (e.poisonTime > 0) {
        e.poisonTime -= dt;
        this.dealStatus(e, e.poisonDps * dt, "#84cc16");
      }
      let slow = 1;
      if (e.slowTime > 0) {
        e.slowTime -= dt;
        slow = e.slowFactor;
      }
      if (e.hp <= 0) continue;
      e.attackTimer = Math.max(0, e.attackTimer - dt);
      const ang = Math.atan2(p.y - e.y, p.x - e.x);
      const d = dist(e.x, e.y, p.x, p.y);
      if (e.type === "shooter") {
        // keep distance
        const desired = 230;
        let move = 0;
        if (d > desired + 30) move = 1;
        else if (d < desired - 30) move = -1;
        e.x += Math.cos(ang) * e.speed * slow * move * dt;
        e.y += Math.sin(ang) * e.speed * slow * move * dt;
        e.shootTimer -= dt;
        if (e.shootTimer <= 0 && d < 420) {
          e.shootTimer = rand(1.4, 2.4);
          this.spawnEnemyProj(e.x, e.y, ang, e.damage);
        }
      } else {
        e.x += Math.cos(ang) * e.speed * slow * dt;
        e.y += Math.sin(ang) * e.speed * slow * dt;
        if (d < e.radius + 12 && e.attackTimer <= 0) {
          e.attackTimer = 0.7;
          this.damagePlayer(e.damage, e.x, e.y);
        }
      }
      this.clampBounds(e, e.radius);
    }
  }

  dealStatus(e: Enemy, amount: number, color: string) {
    e.hp -= amount;
    if (amount >= 1) {
      this.dmgnums.push({
        x: e.x + rand(-4, 4),
        y: e.y - e.radius,
        vy: -22,
        life: 0.5,
        text: String(Math.round(amount)),
        color,
        size: 6,
      });
    }
    if (e.hp <= 0) this.killEnemy(e);
  }

  spawnEnemyProj(x: number, y: number, ang: number, dmg: number, opts?: { color?: string; slow?: boolean; speed?: number }) {
    this.projectiles.push({
      x,
      y,
      vx: Math.cos(ang) * (opts?.speed ?? 190),
      vy: Math.sin(ang) * (opts?.speed ?? 190),
      radius: 5,
      damage: dmg,
      from: "enemy",
      life: 3,
      color: opts?.color ?? "#fca5a5",
      pierce: 0,
      hitIds: new Set(),
      kind: "bolt",
      burn: false,
      poison: false,
      slow: !!opts?.slow,
      angle: ang,
    });
  }

  // ---------- boss ----------
  spawnBoss() {
    const map = getMap(this.mapIndex);
    this.bossSpawned = true;
    this.boss = {
      x: this.gate.x,
      y: this.gate.y,
      vx: 0,
      vy: 0,
      hp: map.boss.maxHp,
      maxHp: map.boss.maxHp,
      radius: 26,
      phase: 1,
      attackTimer: 2.2,
      chargeTimer: 4,
      charging: 0,
      chargeVx: 0,
      chargeVy: 0,
      hitFlash: 0,
      name: map.boss.name,
      color: map.boss.color,
      id: map.boss.id,
      state: "idle",
      pattern: "radial",
      attackT: 0,
      spiral: null,
      data: [],
    };
    this.banner = { text: `${map.boss.name} appears!`, time: 2.8 };
    this.shake = 6;
    sfx.play("boss");
  }

  updateBoss(dt: number) {
    const b = this.boss;
    if (!b) return;
    b.hitFlash = Math.max(0, b.hitFlash - dt);
    const p = this.player;
    const d = dist(b.x, b.y, p.x, p.y);
    const ang = Math.atan2(p.y - b.y, p.x - b.x);
    const map = getMap(this.mapIndex);

    // phase transitions
    const frac = b.hp / b.maxHp;
    const newPhase = frac <= 0.33 ? 3 : frac <= 0.66 ? 2 : 1;
    if (newPhase > b.phase) {
      b.phase = newPhase;
      this.banner = { text: "THE BOSS GROWS FURIOUS!", time: 1.6 };
      this.shake = Math.max(this.shake, 5);
      sfx.play("phase");
      this.spawnHitSpark(b.x, b.y, b.color);
    }
    const speedMul = b.phase === 3 ? 1.5 : b.phase === 2 ? 1.2 : 1;

    // rotating spiral attack
    if (b.spiral) {
      b.spiral.t -= dt;
      b.spiral.step -= dt;
      if (b.spiral.step <= 0) {
        b.spiral.step = 0.11;
        b.spiral.rot += 0.5;
        for (const off of [0, Math.PI]) {
          const a = b.spiral.rot + off;
          this.projectiles.push({
            x: b.x,
            y: b.y,
            vx: Math.cos(a) * 170,
            vy: Math.sin(a) * 170,
            radius: 6,
            damage: Math.round(map.enemyDamage * 1.0),
            from: "enemy",
            life: 3.4,
            color: "#c084fc",
            pierce: 0,
            hitIds: new Set(),
            kind: "boss",
            burn: false,
            poison: false,
            slow: false,
            angle: a,
          });
        }
      }
      if (b.spiral.t <= 0) b.spiral = null;
    }

    if (b.charging > 0) {
      b.charging -= dt;
      b.x += b.chargeVx * dt;
      b.y += b.chargeVy * dt;
      this.clampBounds(b, b.radius);
      if (d < b.radius + 14)
        this.damagePlayer(Math.round(map.enemyDamage * 1.4), b.x, b.y);
      return;
    }

    // movement: drift toward player slowly
    b.x += Math.cos(ang) * 38 * speedMul * dt;
    b.y += Math.sin(ang) * 38 * speedMul * dt;
    this.clampBounds(b, b.radius);

    // attack state machine
    if (b.state === "idle") {
      b.attackTimer -= dt;
      if (b.attackTimer <= 0) {
        const pool = BOSS_PATTERNS[b.id] ?? [
          { id: "radial", minPhase: 1, cd: 2.8, tele: 0.4 },
        ];
        const usable = pool.filter((x) => x.minPhase <= b.phase);
        const pat = usable[Math.floor(Math.random() * usable.length)];
        b.pattern = pat.id;
        b.state = "telegraph";
        b.attackT = pat.tele;
        b.data = this.prepareBossAttack(b, pat.id, ang);
      }
    } else {
      b.attackT -= dt;
      if (b.attackT <= 0) {
        this.executeBossAttack(b, ang);
        b.state = "idle";
        const pool = BOSS_PATTERNS[b.id] ?? [];
        const pat = pool.find((x) => x.id === b.pattern);
        b.attackTimer = (pat?.cd ?? 2.8) * (b.phase === 3 ? 0.72 : 1);
      }
    }

    // periodic contact damage
    if (d < b.radius + 10) {
      if (!b._touch || b._touch <= 0) {
        b._touch = 0.6;
        this.damagePlayer(Math.round(map.enemyDamage * 0.8), b.x, b.y);
      }
    }
    b._touch = Math.max(0, (b._touch ?? 0) - dt);
  }

  prepareBossAttack(b: Boss, id: string, ang: number) {
    const p = this.player;
    if (id === "meteor") {
      return [0, 1, 2].map((i) => ({
        x: clamp(p.x + rand(-150, 150), 40, this.worldW - 40),
        y: clamp(p.y + rand(-150, 150), 40, this.worldH - 40),
      }));
    }
    if (id === "beam") {
      const ex = p.x + Math.cos(ang + Math.PI) * 700;
      const ey = p.y + Math.sin(ang + Math.PI) * 700;
      return [{ x: ex, y: ey }];
    }
    return [];
  }

  executeBossAttack(b: Boss, ang: number) {
    const map = getMap(this.mapIndex);
    const p = this.player;
    const dmgBase = map.enemyDamage;

    switch (b.pattern) {
      case "radial": {
        const n = b.phase === 3 ? 14 : b.phase === 2 ? 10 : 8;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          this.projectiles.push({
            x: b.x,
            y: b.y,
            vx: Math.cos(a) * 150,
            vy: Math.sin(a) * 150,
            radius: 7,
            damage: Math.round(dmgBase * 1.2),
            from: "enemy",
            life: 4,
            color: b.color,
            pierce: 0,
            hitIds: new Set(),
            kind: "boss",
            burn: false,
            poison: false,
            slow: false,
            angle: a,
          });
        }
        break;
      }
      case "spit": {
        for (let i = -1; i <= 1; i++) {
          this.spawnEnemyProj(
            b.x,
            b.y,
            ang + i * 0.22,
            Math.round(dmgBase * 1.15),
            { color: "#a3e635", speed: 210 }
          );
        }
        break;
      }
      case "split": {
        if (this.enemies.length < 12) {
          for (let i = 0; i < 2; i++) {
            this.spawnEnemy(
              "mini",
              b.x + rand(-60, 60),
              b.y + rand(-60, 60)
            );
          }
          this.banner = { text: "THE SLIME KING SPLITS!", time: 1.4 };
        } else {
          this.executeBossAttack({ ...b, pattern: "radial" } as Boss, ang);
        }
        break;
      }
      case "meteor": {
        for (const s of b.data) {
          this.zones.push({
            x: s.x,
            y: s.y,
            r: 36,
            life: 0.55,
            maxLife: 0.55,
            damage: Math.round(dmgBase * 1.3),
            dealt: false,
            color: "#fb923c",
          });
          this.spawnHitSpark(s.x, s.y, "#f97316");
        }
        this.shake = Math.max(this.shake, 3);
        sfx.play("crack");
        break;
      }
      case "charge": {
        b.charging = 0.6;
        b.chargeVx = Math.cos(ang) * 380;
        b.chargeVy = Math.sin(ang) * 380;
        this.shake = Math.max(this.shake, 4);
        break;
      }
      case "frost_ring": {
        this.rings.push({
          x: b.x,
          y: b.y,
          r: 14,
          vr: 175,
          life: 1.5,
          damage: Math.round(dmgBase * 1.1),
          hit: false,
          color: "#7dd3fc",
        });
        break;
      }
      case "shards": {
        for (let i = -2; i <= 2; i++) {
          this.spawnEnemyProj(
            b.x,
            b.y,
            ang + i * 0.26,
            Math.round(dmgBase * 1.0),
            { color: "#7dd3fc", slow: true, speed: 195 }
          );
        }
        break;
      }
      case "summon": {
        if (this.enemies.length < 10) {
          for (let i = 0; i < 2; i++) {
            this.spawnEnemy(
              "mini",
              b.x + rand(-70, 70),
              b.y + rand(-70, 70)
            );
          }
          this.spawnHitSpark(b.x, b.y, "#7dd3fc");
          this.banner = { text: "FROST MINIONS RISE!", time: 1.4 };
        }
        break;
      }
      case "spiral": {
        b.spiral = { t: 1.35, rot: rand(0, 6.28), step: 0.1 };
        break;
      }
      case "blink": {
        const oldX = b.x;
        const oldY = b.y;
        const a2 = rand(0, Math.PI * 2);
        const d2 = rand(130, 180);
        b.x = clamp(p.x + Math.cos(a2) * d2, 60, this.worldW - 60);
        b.y = clamp(p.y + Math.sin(a2) * d2, 60, this.worldH - 60);
        this.spawnHitSpark(oldX, oldY, "#a855f7");
        this.spawnHitSpark(b.x, b.y, "#a855f7");
        this.shake = Math.max(this.shake, 2);
        const n = 12;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          this.projectiles.push({
            x: b.x,
            y: b.y,
            vx: Math.cos(a) * 160,
            vy: Math.sin(a) * 160,
            radius: 6,
            damage: Math.round(dmgBase * 1.1),
            from: "enemy",
            life: 3.4,
            color: "#a855f7",
            pierce: 0,
            hitIds: new Set(),
            kind: "boss",
            burn: false,
            poison: false,
            slow: false,
            angle: a,
          });
        }
        break;
      }
      case "beam": {
        if (b.data.length > 0) {
          const { x: bx, y: by } = b.data[0];
          this.beams.push({
            ax: b.x,
            ay: b.y,
            bx,
            by,
            life: 0.35,
            maxLife: 0.35,
            color: "#a855f7",
          });
          if (distToSegment(p.x, p.y, b.x, b.y, bx, by) < 18) {
            this.damagePlayer(Math.round(dmgBase * 1.4), b.x, b.y);
          }
          sfx.play("crack");
        }
        break;
      }
    }
  }

  // ---------- zones / rings / beams ----------
  updateZones(dt: number) {
    const keep: Zone[] = [];
    for (const z of this.zones) {
      z.life -= dt;
      if (
        !z.dealt &&
        dist(this.player.x, this.player.y, z.x, z.y) < z.r
      ) {
        z.dealt = true;
        this.damagePlayer(z.damage, z.x, z.y);
      }
      if (z.life > 0) keep.push(z);
    }
    this.zones = keep;
  }

  updateRings(dt: number) {
    const keep: Ring[] = [];
    for (const r of this.rings) {
      r.life -= dt;
      r.r += r.vr * dt;
      const d = dist(this.player.x, this.player.y, r.x, r.y);
      if (!r.hit && Math.abs(d - r.r) < 14) {
        r.hit = true;
        this.damagePlayer(r.damage, r.x, r.y);
      }
      if (r.life > 0 && r.r < 420) keep.push(r);
    }
    this.rings = keep;
  }

  updateBeams(dt: number) {
    this.beams = this.beams.filter((b) => {
      b.life -= dt;
      return b.life > 0;
    });
  }

  damagePlayer(amount: number, fromX: number, fromY: number) {
    const p = this.player;
    if (p.hp <= 0 || p.invuln > 0) return;
    const reduced = Math.round(amount * (1 - this.stats.defense));
    p.hp -= reduced;
    p.invuln = 0.45;
    p.hitFlash = 0.18;
    // knockback
    const a = Math.atan2(p.y - fromY, p.x - fromX);
    p.x += Math.cos(a) * 8;
    p.y += Math.sin(a) * 8;
    this.collideWorld(p, 8);
    this.dmgnums.push({
      x: p.x,
      y: p.y - 14,
      vy: -22,
      life: 0.6,
      text: String(reduced),
      color: "#f87171",
      size: 8,
    });
    sfx.play("hurt");
    if (p.hp <= 0 && !this.finished && this.deathTimer <= 0) {
      p.hp = 0;
      this.deathTimer = 1.2;
      this.banner = { text: "YOU DIED", time: 1.5 };
      sfx.play("death");
    }
  }

  // ---------- projectiles ----------
  updateProjectiles(dt: number) {
    const keep: Projectile[] = [];
    for (const pr of this.projectiles) {
      pr.life -= dt;
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      if (pr.life <= 0) continue;
      if (pr.x < -40 || pr.y < -40 || pr.x > this.worldW + 40 || pr.y > this.worldH + 40)
        continue;
      let consumed = false;
      if (pr.from === "player") {
        for (const e of [...this.enemies]) {
          if (pr.hitIds.has(e.id)) continue;
          if (dist(pr.x, pr.y, e.x, e.y) < pr.radius + e.radius) {
            this.dealToEnemy(e, pr.damage, pr.angle);
            if (pr.burn) {
              e.burnTime = 3;
              e.burnDps = Math.max(e.burnDps, pr.damage * 0.12);
            }
            if (pr.poison) {
              e.poisonTime = 4;
              e.poisonDps = Math.max(e.poisonDps, pr.damage * 0.08);
            }
            pr.hitIds.add(e.id);
            if (pr.pierce <= 0) {
              consumed = true;
              break;
            } else {
              pr.pierce -= 1;
            }
          }
        }
        if (!consumed && this.boss && !pr.hitIds.has(-1)) {
          if (dist(pr.x, pr.y, this.boss.x, this.boss.y) < pr.radius + this.boss.radius) {
            this.dealToBoss(pr.damage);
            pr.hitIds.add(-1);
            if (pr.pierce <= 0) consumed = true;
            else pr.pierce -= 1;
          }
        }
        // crates block projectiles
        if (!consumed) {
          for (const c of this.crates) {
            if (c.hp > 0 && dist(pr.x, pr.y, c.x, c.y) < 12 + pr.radius) {
              c.hp -= 1;
              this.spawnHitSpark(c.x, c.y, "#b45309");
              sfx.play("crack");
              if (c.hp <= 0) {
                this.crates = this.crates.filter((x) => x !== c);
                if (this.crates.length === 0 && !this.secretOpened) {
                  this.secretOpened = true;
                  this.banner = { text: "SECRET FOUND!", time: 2.4 };
                  sfx.play("secret");
                  this.chests.push({
                    x: c.x,
                    y: c.y + 26,
                    opened: false,
                    t: 0,
                    rich: true,
                  });
                }
              }
              consumed = true;
              break;
            }
          }
        }
      } else {
        if (dist(pr.x, pr.y, this.player.x, this.player.y) < pr.radius + 8) {
          if (pr.slow) {
            this.player.slowTime = 1.1;
            this.player.slowFactor = 0.65;
          }
          this.damagePlayer(pr.damage, pr.x, pr.y);
          consumed = true;
        }
      }
      if (!consumed) keep.push(pr);
    }
    this.projectiles = keep;
  }

  // ---------- aoe ----------
  updateAoes(dt: number) {
    const keep: Aoe[] = [];
    for (const a of this.aoes) {
      a.life -= dt;
      if (a.tick > 0) {
        a.tick -= dt;
        if (a.tick <= 0) {
          a.tick = 0.35;
          for (const e of [...this.enemies]) {
            if (dist(a.x, a.y, e.x, e.y) < a.radius + e.radius)
              this.dealToEnemy(e, a.damage, 0);
          }
          if (this.boss && dist(a.x, a.y, this.boss.x, this.boss.y) < a.radius + this.boss.radius)
            this.dealToBoss(a.damage);
        }
      }
      if (a.life > 0) keep.push(a);
    }
    this.aoes = keep;
  }

  updatePickups(dt: number) {
    const keep: Pickup[] = [];
    for (const pk of this.pickups) {
      pk.t += dt;
      if (dist(pk.x, pk.y, this.player.x, this.player.y) < 16) {
        this.player.hp = Math.min(this.maxHp(), this.player.hp + pk.value);
        this.dmgnums.push({
          x: this.player.x,
          y: this.player.y - 16,
          vy: -20,
          life: 0.7,
          text: `+${pk.value} HP`,
          color: "#4ade80",
          size: 7,
        });
        sfx.play("pickup");
        continue;
      }
      keep.push(pk);
    }
    this.pickups = keep;
  }

  updateChests(dt: number) {
    for (const c of this.chests) {
      if (c.opened) {
        c.t += dt;
        continue;
      }
      if (dist(c.x, c.y, this.player.x, this.player.y) < 28) {
        c.opened = true;
        c.t = 0;
        const mult = c.rich ? 1.8 : 1;
        const gold = Math.round(
          (randInt(30, 70) + this.mapIndex * 10) * mult * this.stats.goldMult
        );
        const res = randInt(1, 3) + (c.rich ? 2 : 0);
        this.run.gold += gold;
        this.run.res += res;
        this.dmgnums.push({
          x: c.x,
          y: c.y - 10,
          vy: -20,
          life: 1,
          text: `Chest! +${gold}g +${res}⚡`,
          color: "#fbbf24",
          size: 7,
        });
        // chance to find equipment in the chest
        const clsWeapons = Object.values(WEAPONS).filter(
          (w) =>
            w.classId === this.cls.id &&
            !w.starter &&
            !w.bossOnly &&
            !this.save.ownedWeapons.includes(w.id)
        );
        if (
          clsWeapons.length > 0 &&
          Math.random() < (c.rich ? 0.3 : 0.15)
        ) {
          const w = clsWeapons[randInt(0, clsWeapons.length - 1)];
          this.run.weaponRewards.push(w.id);
          this.dmgnums.push({
            x: c.x,
            y: c.y - 26,
            vy: -16,
            life: 1.6,
            text: `Found ${w.name}!`,
            color: "#67e8f9",
            size: 7,
          });
        }
        sfx.play("chest");
        for (let i = 0; i < 10; i++)
          this.particles.push({
            x: c.x,
            y: c.y,
            vx: rand(-60, 60),
            vy: rand(-90, -20),
            life: 0.6,
            maxLife: 0.6,
            color: "#fbbf24",
            size: 3,
          });
      }
    }
  }

  updateParticles(dt: number) {
    const keep: Particle[] = [];
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.life > 0) keep.push(p);
    }
    this.particles = keep;
  }

  updateDmgNums(dt: number) {
    const keep: DmgNum[] = [];
    for (const d of this.dmgnums) {
      d.life -= dt;
      d.y += d.vy * dt;
      d.vy *= 0.92;
      if (d.life > 0) keep.push(d);
    }
    this.dmgnums = keep;
  }

  spawnHitSpark(x: number, y: number, color: string) {
    for (let i = 0; i < 8; i++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(40, 140);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: rand(0.2, 0.5),
        maxLife: 0.5,
        color,
        size: rand(2, 4),
      });
    }
  }

  enemyColor(type: EnemyType) {
    if (type === "shooter") return "#60a5fa";
    if (type === "elite") return "#c084fc";
    if (type === "mini") return "#a3e635";
    return "#86efac";
  }

  // ---------- completion ----------
  complete(outcome: RunResult["outcome"]) {
    if (this.finished) return;
    this.finished = true;
    cancelAnimationFrame(this.raf);
    if (outcome === "victory") sfx.play("victory");
    this.onComplete({
      outcome,
      goldEarned: this.run.gold,
      resourcesEarned: this.run.res,
      xpEarned: this.run.xp,
      level: this.run.level,
      xp: this.run.xp,
      bossDefeated: this.run.bossDefeated,
      weaponRewards: this.run.weaponRewards,
    });
  }

  // ---------- render ----------
  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#05060a";
    ctx.fillRect(0, 0, w, h);

    const shx = this.shake > 0 ? rand(-this.shake, this.shake) : 0;
    const shy = this.shake > 0 ? rand(-this.shake, this.shake) : 0;

    ctx.save();
    ctx.scale(this.scale, this.scale);
    ctx.translate(-this.cam.x - shx, -this.cam.y - shy);

    this.drawGround();
    this.drawDecor();
    this.drawZones();
    this.drawObstacles();
    this.drawCrates();
    this.drawChests();
    this.drawCamp();
    this.drawGate();
    this.drawAoes();
    this.drawRings();
    this.drawBeams();
    this.drawPickups();
    this.drawProjectiles();
    this.drawEnemies();
    if (this.boss) this.drawBoss();
    this.drawPlayer();
    this.drawParticles();
    this.drawDmgNums();

    ctx.restore();

    // low HP vignette
    if (
      this.player &&
      !this.finished &&
      this.player.hp > 0 &&
      this.player.hp < this.maxHp() * 0.3
    ) {
      const a = 0.16 + 0.1 * Math.sin(performance.now() / 180);
      const g = ctx.createRadialGradient(
        w / 2,
        h / 2,
        h * 0.32,
        w / 2,
        h / 2,
        h * 0.75
      );
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, `rgba(190,18,18,${a.toFixed(3)})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
  }

  drawGround() {
    const ctx = this.ctx;
    const map = getMap(this.mapIndex);
    ctx.fillStyle = map.bg;
    ctx.fillRect(this.cam.x, this.cam.y, this.VW, this.VH);
    const tile = 32;
    const sx = Math.floor(this.cam.x / tile) * tile;
    const sy = Math.floor(this.cam.y / tile) * tile;
    for (let x = sx; x < this.cam.x + this.VW + tile; x += tile) {
      for (let y = sy; y < this.cam.y + this.VH + tile; y += tile) {
        const tx = x / tile;
        const ty = y / tile;
        const shade = ((tx + ty) % 2 === 0);
        ctx.fillStyle = shade ? map.ground : map.bg;
        ctx.fillRect(x, y, tile, tile);
        // pebble
        const hsh = (Math.sin(tx * 12.9898 + ty * 78.233) * 43758.5453) % 1;
        if (hsh > 0.82) {
          ctx.fillStyle = "rgba(255,255,255,0.05)";
          ctx.fillRect(x + 6, y + 6, 4, 4);
        }
      }
    }
  }

  drawDecor() {
    const ctx = this.ctx;
    const t = this.time;
    for (const d of this.decor) {
      const { x, y } = d;
      switch (d.kind) {
        case "tree":
          ctx.fillStyle = "#5b4423";
          ctx.fillRect(x - 3, y - 4, 6, 12);
          ctx.fillStyle = "#1f7a3d";
          ctx.fillRect(x - 12, y - 22, 24, 12);
          ctx.fillStyle = "#2c9e52";
          ctx.fillRect(x - 8, y - 28, 16, 8);
          break;
        case "pine":
          ctx.fillStyle = "#5b4423";
          ctx.fillRect(x - 2, y, 4, 8);
          ctx.fillStyle = "#2b6e8f";
          ctx.beginPath();
          ctx.moveTo(x, y - 22);
          ctx.lineTo(x + 10, y + 2);
          ctx.lineTo(x - 10, y + 2);
          ctx.fill();
          break;
        case "bush":
          ctx.fillStyle = "#2f7d43";
          ctx.fillRect(x - 9, y - 4, 18, 8);
          ctx.fillStyle = "#3f9e58";
          ctx.fillRect(x - 6, y - 7, 12, 5);
          break;
        case "mushroom":
          ctx.fillStyle = "#e7d8b0";
          ctx.fillRect(x - 2, y - 4, 4, 6);
          ctx.fillStyle = "#d94f3d";
          ctx.fillRect(x - 6, y - 8, 12, 5);
          ctx.fillStyle = "#ffe9e2";
          ctx.fillRect(x - 3, y - 7, 2, 2);
          ctx.fillRect(x + 2, y - 6, 2, 2);
          break;
        case "stump":
          ctx.fillStyle = "#6b4e2a";
          ctx.fillRect(x - 7, y - 4, 14, 10);
          ctx.fillStyle = "#8a6636";
          ctx.fillRect(x - 5, y - 6, 10, 4);
          break;
        case "stalag":
        case "spike": {
          const c = d.kind === "spike" ? "#9bd7f2" : "#6b7280";
          ctx.fillStyle = c;
          ctx.beginPath();
          ctx.moveTo(x, y - 16);
          ctx.lineTo(x + 7, y + 4);
          ctx.lineTo(x - 7, y + 4);
          ctx.fill();
          break;
        }
        case "crystal": {
          const c = "#22d3ee";
          ctx.fillStyle = c;
          ctx.beginPath();
          ctx.moveTo(x, y - 14);
          ctx.lineTo(x + 6, y - 2);
          ctx.lineTo(x, y + 4);
          ctx.lineTo(x - 6, y - 2);
          ctx.fill();
          ctx.fillStyle = "rgba(103,232,249,0.35)";
          ctx.fillRect(x - 8, y + 2, 16, 3);
          break;
        }
        case "ice": {
          const c = "#bae6fd";
          ctx.fillStyle = c;
          ctx.beginPath();
          ctx.moveTo(x, y - 12);
          ctx.lineTo(x + 5, y - 1);
          ctx.lineTo(x, y + 5);
          ctx.lineTo(x - 5, y - 1);
          ctx.fill();
          ctx.fillStyle = "#e0f2fe";
          ctx.fillRect(x - 1, y - 10, 2, 8);
          break;
        }
        case "snow":
          ctx.fillStyle = "rgba(241,245,249,0.5)";
          ctx.beginPath();
          ctx.ellipse(x, y, 12, 5, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        case "rock":
          ctx.fillStyle = "#4b5563";
          ctx.fillRect(x - 9, y - 6, 18, 12);
          ctx.fillStyle = "#6b7280";
          ctx.fillRect(x - 6, y - 9, 12, 5);
          break;
        case "ember": {
          const flick = 0.5 + 0.5 * Math.sin(t * 6 + d.seed);
          ctx.fillStyle = `rgba(251,146,60,${(0.35 + 0.5 * flick).toFixed(2)})`;
          ctx.beginPath();
          ctx.arc(x, y, 3 + flick * 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#fde68a";
          ctx.fillRect(x - 1, y - 1, 2, 2);
          break;
        }
        case "obelisk":
          ctx.fillStyle = "#3b2d5e";
          ctx.fillRect(x - 5, y - 22, 10, 26);
          ctx.fillStyle = "#a855f7";
          const gl = 0.4 + 0.4 * Math.sin(t * 2 + d.seed);
          ctx.fillStyle = `rgba(168,85,247,${gl.toFixed(2)})`;
          ctx.fillRect(x - 2, y - 16, 4, 3);
          ctx.fillRect(x - 2, y - 9, 4, 3);
          break;
        case "fog": {
          const drift = Math.sin(t * 0.4 + d.seed) * 8;
          ctx.fillStyle = "rgba(203,213,225,0.08)";
          ctx.beginPath();
          ctx.ellipse(x + drift, y, 26, 8, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case "bones":
          ctx.fillStyle = "#d6d3d1";
          ctx.fillRect(x - 8, y - 1, 10, 3);
          ctx.fillRect(x + 1, y + 2, 8, 3);
          ctx.fillStyle = "#a8a29e";
          ctx.fillRect(x - 6, y - 3, 3, 3);
          break;
        case "rune": {
          const gl = 0.35 + 0.35 * Math.sin(t * 3 + d.seed);
          ctx.strokeStyle = `rgba(192,132,252,${gl.toFixed(2)})`;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x - 4, y - 4, 8, 8);
          break;
        }
      }
    }
  }

  drawObstacles() {
    const ctx = this.ctx;
    for (const r of this.obstacles) {
      ctx.fillStyle = "#3f3a33";
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = "#56504533";
      ctx.fillRect(r.x + 3, r.y + 3, r.w - 6, 5);
      ctx.fillStyle = "#2a2620";
      ctx.fillRect(r.x, r.y + r.h - 4, r.w, 4);
    }
  }

  drawCrates() {
    const ctx = this.ctx;
    for (const c of this.crates) {
      ctx.fillStyle = "#7c5a2e";
      ctx.fillRect(c.x - 11, c.y - 11, 22, 22);
      ctx.fillStyle = "#5b4636";
      ctx.fillRect(c.x - 11, c.y - 11, 22, 3);
      ctx.fillRect(c.x - 11, c.y + 8, 22, 3);
      ctx.fillStyle = "#9a7440";
      ctx.fillRect(c.x - 8, c.y - 7, 16, 14);
      ctx.strokeStyle = "#5b4636";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(c.x - 11, c.y - 11);
      ctx.lineTo(c.x + 11, c.y + 11);
      ctx.stroke();
      if (c.hp < c.maxHp) {
        ctx.strokeStyle = "#2a2620";
        ctx.beginPath();
        ctx.moveTo(c.x - 4, c.y - 8);
        ctx.lineTo(c.x + 2, c.y);
        ctx.lineTo(c.x - 3, c.y + 7);
        ctx.stroke();
      }
    }
  }

  drawZones() {
    const ctx = this.ctx;
    for (const z of this.zones) {
      const t = z.life / z.maxLife;
      ctx.globalAlpha = 0.28 + 0.4 * t;
      ctx.fillStyle = z.color;
      ctx.beginPath();
      ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = "#fde68a";
      ctx.beginPath();
      ctx.arc(z.x, z.y, z.r * 0.4 * t, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  drawRings() {
    const ctx = this.ctx;
    for (const r of this.rings) {
      const a = clamp(r.life / 1.5, 0, 1);
      ctx.globalAlpha = 0.7 * a;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.25 * a;
      ctx.fillStyle = r.color;
      ctx.beginPath();
      ctx.arc(r.x, r.y, Math.max(1, r.r - 6), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  drawBeams() {
    const ctx = this.ctx;
    for (const b of this.beams) {
      const a = b.life / b.maxLife;
      ctx.globalAlpha = 0.75 * a;
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 12 * a + 2;
      ctx.beginPath();
      ctx.moveTo(b.ax, b.ay);
      ctx.lineTo(b.bx, b.by);
      ctx.stroke();
      ctx.globalAlpha = a;
      ctx.strokeStyle = "#f5f3ff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(b.ax, b.ay);
      ctx.lineTo(b.bx, b.by);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  drawChests() {
    const ctx = this.ctx;
    for (const c of this.chests) {
      if (c.opened) {
        ctx.fillStyle = "#5b4636";
        ctx.fillRect(c.x - 9, c.y - 4, 18, 9);
        ctx.fillStyle = "#00000033";
        ctx.fillRect(c.x - 9, c.y - 10, 18, 6);
        continue;
      }
      const glow = c.rich
        ? 0.5 + 0.4 * Math.sin(performance.now() / 200)
        : 0;
      if (glow > 0) {
        ctx.fillStyle = `rgba(251,191,36,${(glow * 0.3).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(c.x, c.y, 18, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#7c5a2e";
      ctx.fillRect(c.x - 10, c.y - 8, 20, 14);
      ctx.fillStyle = c.rich ? "#f59e0b" : "#caa45a";
      ctx.fillRect(c.x - 10, c.y - 2, 20, 4);
      ctx.fillStyle = "#ffe08a";
      ctx.fillRect(c.x - 2, c.y - 6, 4, 4);
    }
  }

  drawCamp() {
    const ctx = this.ctx;
    const { x, y } = this.camp;
    // merchant tent
    ctx.fillStyle = "#7c2d12";
    ctx.fillRect(x - 22, y - 6, 44, 12);
    ctx.fillStyle = "#b45309";
    ctx.fillRect(x - 24, y - 18, 48, 12);
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 === 0 ? "#f5f5f4" : "#b91c1c";
      ctx.fillRect(x - 24 + i * 12, y - 18, 12, 12);
    }
    ctx.fillStyle = "#78350f";
    ctx.fillRect(x - 20, y - 18, 3, 24);
    ctx.fillRect(x + 17, y - 18, 3, 24);
    ctx.fillStyle = "#92400e";
    ctx.fillRect(x - 14, y + 2, 28, 8);
    ctx.fillStyle = "#b45309";
    ctx.fillRect(x - 14, y + 2, 28, 3);
    // coin on counter
    ctx.fillStyle = "#fbbf24";
    ctx.fillRect(x - 4, y - 1, 5, 4);
    // skill crystal
    const cx = x + 64;
    const cy = y + 6;
    const bob = Math.sin(this.time * 2.4) * 3;
    ctx.fillStyle = "#44403c";
    ctx.fillRect(cx - 8, cy + 8, 16, 5);
    const c = "#a855f7";
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 12 + bob);
    ctx.lineTo(cx + 7, cy + bob);
    ctx.lineTo(cx, cy + 10 + bob);
    ctx.lineTo(cx - 7, cy + bob);
    ctx.fill();
    ctx.fillStyle = "#e9d5ff";
    ctx.fillRect(cx - 2, cy - 8 + bob, 3, 10);
    const gl = 0.25 + 0.2 * Math.sin(this.time * 3);
    ctx.fillStyle = `rgba(168,85,247,${gl.toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(cx, cy + bob, 14, 0, Math.PI * 2);
    ctx.fill();
    // prompts
    const p = this.player;
    const dTent = dist(p.x, p.y, x, y);
    const dCry = dist(p.x, p.y, cx, cy);
    ctx.textAlign = "center";
    ctx.font = "bold 8px monospace";
    if (dTent < 56) {
      ctx.fillStyle = "#000";
      ctx.fillText("F — MERCHANT", x + 1, y - 26);
      ctx.fillStyle = "#fde68a";
      ctx.fillText("F — MERCHANT", x, y - 27);
    }
    if (dCry < 48) {
      ctx.fillStyle = "#000";
      ctx.fillText("F — SKILL STATION", cx + 1, cy - 22);
      ctx.fillStyle = "#d8b4fe";
      ctx.fillText("F — SKILL STATION", cx, cy - 23);
    }
  }

  drawGate() {
    const ctx = this.ctx;
    const g = this.gate;
    const t = this.time;
    // pillars
    ctx.fillStyle = "#3b3f4a";
    ctx.fillRect(g.x - 36, g.y - 30, 11, 60);
    ctx.fillRect(g.x + 25, g.y - 30, 11, 60);
    ctx.fillStyle = "#2b2f38";
    ctx.fillRect(g.x - 40, g.y - 40, 80, 11);
    ctx.fillStyle = "#4b5563";
    ctx.fillRect(g.x - 40, g.y - 40, 80, 3);
    if (this.bossRequired && !g.open) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 4);
      ctx.fillStyle = `rgba(248,113,113,${(0.3 + 0.25 * pulse).toFixed(2)})`;
      ctx.fillRect(g.x - 25, g.y - 29, 50, 58);
      ctx.strokeStyle = "#f87171";
      ctx.lineWidth = 2;
      ctx.strokeRect(g.x - 25, g.y - 29, 50, 58);
      ctx.fillStyle = "#fecaca";
      ctx.fillRect(g.x - 16, g.y - 18, 5, 5);
      ctx.fillRect(g.x + 11, g.y - 18, 5, 5);
      ctx.fillRect(g.x - 16, g.y + 13, 5, 5);
      ctx.fillRect(g.x + 11, g.y + 13, 5, 5);
      ctx.textAlign = "center";
      ctx.font = "bold 8px monospace";
      ctx.fillStyle = "#000";
      ctx.fillText("SEALED", g.x + 1, g.y - 44);
      ctx.fillStyle = "#fca5a5";
      ctx.fillText("SEALED", g.x, g.y - 45);
    } else if (this.bossRequired && g.open && !this.bossSpawned) {
      // swirling amber portal
      for (let i = 0; i < 3; i++) {
        const a = t * 2.4 + (i * Math.PI * 2) / 3;
        ctx.strokeStyle = i === 0 ? "#fbbf24" : "#f59e0b";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(g.x, g.y, 10 + i * 5, a, a + Math.PI * 1.2);
        ctx.stroke();
      }
      ctx.fillStyle = `rgba(251,191,36,${(0.15 + 0.1 * Math.sin(t * 5)).toFixed(2)})`;
      ctx.fillRect(g.x - 25, g.y - 29, 50, 58);
      ctx.textAlign = "center";
      ctx.font = "bold 8px monospace";
      ctx.fillStyle = "#000";
      ctx.fillText("BOSS GATE", g.x + 1, g.y - 44);
      ctx.fillStyle = "#fde68a";
      ctx.fillText("BOSS GATE", g.x, g.y - 45);
    } else {
      // cleared region: calm open gate
      ctx.fillStyle = "rgba(74,222,128,0.18)";
      ctx.fillRect(g.x - 25, g.y - 29, 50, 58);
    }
  }

  drawAoes() {
    const ctx = this.ctx;
    for (const a of this.aoes) {
      const t = a.life / a.maxLife;
      ctx.globalAlpha = clamp(t * 0.5, 0, 0.5);
      ctx.fillStyle = a.color;
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.radius * (a.maxLife > 0.4 && a.tick > 0 ? t : 1), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  drawPickups() {
    const ctx = this.ctx;
    for (const pk of this.pickups) {
      const bob = Math.sin(pk.t * 6) * 2;
      ctx.fillStyle = "#dc2626";
      ctx.fillRect(pk.x - 4, pk.y - 4 + bob, 8, 8);
      ctx.fillStyle = "#fca5a5";
      ctx.fillRect(pk.x - 2, pk.y - 2 + bob, 4, 4);
    }
  }

  drawProjectiles() {
    const ctx = this.ctx;
    for (const pr of this.projectiles) {
      if (pr.kind === "arrow") {
        ctx.save();
        ctx.translate(pr.x, pr.y);
        ctx.rotate(pr.angle);
        ctx.fillStyle = pr.color;
        ctx.fillRect(-6, -1.5, 12, 3);
        ctx.fillStyle = "#fff";
        ctx.fillRect(4, -2, 3, 4);
        ctx.restore();
      } else if (pr.kind === "orb") {
        ctx.fillStyle = pr.color;
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, pr.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff7";
        ctx.beginPath();
        ctx.arc(pr.x - 2, pr.y - 2, pr.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = pr.color;
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, pr.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#0003";
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, pr.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  drawEnemies() {
    const ctx = this.ctx;
    for (const e of this.enemies) {
      const col = e.hitFlash > 0 ? "#ffffff" : this.enemyColor(e.type);
      const r = e.radius;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
      ctx.fill();
      // eyes
      ctx.fillStyle = "#111";
      ctx.fillRect(e.x - r * 0.5, e.y - r * 0.3, 2.2, 2.2);
      ctx.fillRect(e.x + r * 0.2, e.y - r * 0.3, 2.2, 2.2);
      if (e.type === "elite") {
        // elite crown marker
        ctx.fillStyle = "#fde047";
        ctx.fillRect(e.x - 5, e.y - r - 7, 10, 3);
        ctx.fillRect(e.x - 5, e.y - r - 9, 3, 2);
        ctx.fillRect(e.x + 2, e.y - r - 9, 3, 2);
      }
      if (e.slowTime > 0) {
        ctx.fillStyle = "#7dd3fc55";
        ctx.beginPath();
        ctx.arc(e.x, e.y, r + 2, 0, Math.PI * 2);
        ctx.fill();
      }
      if (e.burnTime > 0) {
        ctx.fillStyle = "#f97316";
        ctx.fillRect(e.x - 1, e.y - r - 4, 2, 3);
      }
      // hp bar
      if (e.hp < e.maxHp) {
        const bw = r * 2;
        ctx.fillStyle = "#000a";
        ctx.fillRect(e.x - r, e.y - r - 6, bw, 3);
        ctx.fillStyle = "#f87171";
        ctx.fillRect(e.x - r, e.y - r - 6, bw * (e.hp / e.maxHp), 3);
      }
    }
  }

  drawBoss() {
    const ctx = this.ctx;
    const b = this.boss!;
    const flash = b.hitFlash > 0;
    const t = this.time;
    switch (b.id) {
      case "gloomfang": {
        // wobbly gelatinous king
        const wob = Math.sin(t * 3) * 3;
        ctx.fillStyle = flash ? "#fff" : "#4d7c0f";
        ctx.beginPath();
        ctx.ellipse(b.x, b.y + 4, b.radius + 4, b.radius * 0.75 + wob, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = flash ? "#fff" : "#65a30d";
        ctx.beginPath();
        ctx.ellipse(b.x, b.y - 4, b.radius - 2, b.radius * 0.8 - wob * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#bef264";
        ctx.beginPath();
        ctx.ellipse(b.x - 8, b.y - 10, 7, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        // drips
        ctx.fillStyle = flash ? "#fff" : "#4d7c0f";
        ctx.fillRect(b.x - 14, b.y + 12, 5, 6 + Math.sin(t * 5) * 2);
        ctx.fillRect(b.x + 9, b.y + 13, 5, 5 + Math.cos(t * 5) * 2);
        // crown
        ctx.fillStyle = flash ? "#eee" : "#fde047";
        ctx.fillRect(b.x - 12, b.y - b.radius - 10, 24, 6);
        ctx.fillRect(b.x - 12, b.y - b.radius - 14, 5, 4);
        ctx.fillRect(b.x - 2, b.y - b.radius - 16, 5, 6);
        ctx.fillRect(b.x + 7, b.y - b.radius - 14, 5, 4);
        // angry eyes
        ctx.fillStyle = "#1a2e05";
        ctx.fillRect(b.x - 10, b.y - 6, 6, 5);
        ctx.fillRect(b.x + 4, b.y - 6, 6, 5);
        ctx.fillStyle = "#fde047";
        ctx.fillRect(b.x - 9, b.y - 5, 2, 2);
        ctx.fillRect(b.x + 5, b.y - 5, 2, 2);
        break;
      }
      case "magmalord": {
        // molten rock titan
        ctx.fillStyle = flash ? "#fff" : "#44403c";
        ctx.beginPath();
        ctx.ellipse(b.x, b.y, b.radius + 2, b.radius - 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = flash ? "#eee" : "#57534e";
        ctx.beginPath();
        ctx.ellipse(b.x, b.y - 8, b.radius * 0.7, b.radius * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        // lava cracks (pulsing)
        const gl = 0.5 + 0.5 * Math.sin(t * 4);
        ctx.strokeStyle = `rgba(249,115,22,${(0.5 + 0.5 * gl).toFixed(2)})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(b.x - 16, b.y + 2);
        ctx.lineTo(b.x - 4, b.y + 8);
        ctx.lineTo(b.x + 6, b.y);
        ctx.lineTo(b.x + 16, b.y + 6);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(b.x - 6, b.y - 14);
        ctx.lineTo(b.x + 2, b.y - 6);
        ctx.stroke();
        // magma droplets
        ctx.fillStyle = "#fb923c";
        const drip = (t * 30) % 20;
        ctx.fillRect(b.x - 20, b.y + 14 + drip * 0.4, 4, 4);
        ctx.fillRect(b.x + 18, b.y + 12 + ((drip + 9) % 16) * 0.5, 4, 4);
        // glowing eyes
        ctx.fillStyle = flash ? "#fff" : "#fde047";
        ctx.fillRect(b.x - 11, b.y - 10, 5, 4);
        ctx.fillRect(b.x + 6, b.y - 10, 5, 4);
        // shoulder rocks
        ctx.fillStyle = flash ? "#ddd" : "#292524";
        ctx.fillRect(b.x - b.radius - 6, b.y - 6, 8, 12);
        ctx.fillRect(b.x + b.radius - 2, b.y - 6, 8, 12);
        break;
      }
      case "frostqueen": {
        // crystalline sovereign
        const shimmer = 0.5 + 0.5 * Math.sin(t * 2.4);
        ctx.fillStyle = flash ? "#fff" : `rgba(125,211,252,${(0.55 + 0.25 * shimmer).toFixed(2)})`;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y - b.radius - 6);
        ctx.lineTo(b.x + b.radius * 0.8, b.y);
        ctx.lineTo(b.x, b.y + b.radius + 4);
        ctx.lineTo(b.x - b.radius * 0.8, b.y);
        ctx.fill();
        ctx.fillStyle = flash ? "#fff" : "#bae6fd";
        ctx.beginPath();
        ctx.moveTo(b.x, b.y - b.radius - 12);
        ctx.lineTo(b.x + 8, b.y - b.radius + 6);
        ctx.lineTo(b.x, b.y - b.radius + 14);
        ctx.lineTo(b.x - 8, b.y - b.radius + 6);
        ctx.fill();
        // inner glow
        ctx.fillStyle = `rgba(224,242,254,${(0.3 + 0.3 * shimmer).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 9, 0, Math.PI * 2);
        ctx.fill();
        // ice crown spikes
        ctx.fillStyle = flash ? "#fff" : "#e0f2fe";
        for (let i = -2; i <= 2; i++) {
          const sx = b.x + i * 9;
          const h = i === 0 ? 16 : 10 - Math.abs(i) * 2;
          ctx.beginPath();
          ctx.moveTo(sx, b.y - b.radius - 4);
          ctx.lineTo(sx + 4, b.y - b.radius - 4 - h);
          ctx.lineTo(sx + 8, b.y - b.radius - 4);
          ctx.fill();
        }
        // serene eyes
        ctx.fillStyle = "#0c4a6e";
        ctx.fillRect(b.x - 9, b.y - 4, 5, 3);
        ctx.fillRect(b.x + 4, b.y - 4, 5, 3);
        // orbiting shards
        for (let i = 0; i < 3; i++) {
          const a = t * 1.6 + (i * Math.PI * 2) / 3;
          ctx.fillStyle = "#7dd3fc";
          ctx.fillRect(
            b.x + Math.cos(a) * (b.radius + 12) - 2,
            b.y + Math.sin(a) * (b.radius + 6) - 2,
            4,
            4
          );
        }
        break;
      }
      case "voidemperor": {
        // dark robed void sovereign
        ctx.fillStyle = flash ? "#fff" : "#1e1033";
        ctx.beginPath();
        ctx.moveTo(b.x, b.y - b.radius - 8);
        ctx.lineTo(b.x + b.radius, b.y + b.radius);
        ctx.lineTo(b.x - b.radius, b.y + b.radius);
        ctx.fill();
        ctx.fillStyle = flash ? "#eee" : "#312e81";
        ctx.beginPath();
        ctx.arc(b.x, b.y - 6, 12, 0, Math.PI * 2);
        ctx.fill();
        // hood shadow + eyes
        ctx.fillStyle = flash ? "#fff" : "#0a0118";
        ctx.beginPath();
        ctx.arc(b.x, b.y - 6, 9, 0, Math.PI * 2);
        ctx.fill();
        const eye = 0.6 + 0.4 * Math.sin(t * 5);
        ctx.fillStyle = `rgba(216,180,254,${eye.toFixed(2)})`;
        ctx.fillRect(b.x - 6, b.y - 8, 4, 3);
        ctx.fillRect(b.x + 2, b.y - 8, 4, 3);
        // void halo (rotating dashes)
        for (let i = 0; i < 6; i++) {
          const a = t * 2 + (i * Math.PI * 2) / 6;
          const gl2 = 0.4 + 0.4 * Math.sin(t * 3 + i);
          ctx.strokeStyle = `rgba(168,85,247,${gl2.toFixed(2)})`;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(
            b.x,
            b.y - 6,
            b.radius + 10,
            a,
            a + 0.5
          );
          ctx.stroke();
        }
        // floating tatters
        ctx.fillStyle = flash ? "#ddd" : "#1e1033";
        const fl = Math.sin(t * 4) * 3;
        ctx.fillRect(b.x - b.radius - 4, b.y + 8 + fl * 0.4, 6, 10);
        ctx.fillRect(b.x + b.radius - 2, b.y + 8 - fl * 0.4, 6, 10);
        break;
      }
      default: {
        ctx.fillStyle = flash ? "#fff" : b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // telegraph indicator
    if (b.state === "telegraph") {
      const pulse = 0.4 + 0.4 * Math.sin(performance.now() / 90);
      ctx.strokeStyle = `rgba(255,255,255,${pulse.toFixed(2)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius + 8 + pulse * 4, 0, Math.PI * 2);
      ctx.stroke();
      // meteor previews
      if (b.pattern === "meteor") {
        for (const s of b.data) {
          ctx.strokeStyle = `rgba(251,146,60,${pulse.toFixed(2)})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(s.x, s.y, 36, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = `rgba(251,146,60,0.12)`;
          ctx.beginPath();
          ctx.arc(s.x, s.y, 36, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (b.pattern === "beam" && b.data.length > 0) {
        ctx.strokeStyle = `rgba(168,85,247,${pulse.toFixed(2)})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.data[0].x, b.data[0].y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (b.pattern === "charge") {
        ctx.fillStyle = `rgba(248,113,113,${pulse.toFixed(2)})`;
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText("!", b.x, b.y - b.radius - 14);
      }
    }
    // phase aura
    if (b.phase >= 2) {
      ctx.fillStyle = `rgba(255,255,255,${(0.06 + 0.04 * Math.sin(t * 6)).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius + 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawPlayer() {
    const ctx = this.ctx;
    const p = this.player;
    if (p.invuln > 0 && Math.floor(performance.now() / 60) % 2 === 0) return;
    const x = p.x;
    const y = p.y;
    const bob = Math.sin(p.walkPhase) * 1.2;
    const body = this.cls.color;
    const accent = this.cls.accent;
    // legs
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(x - 4, y + 4, 3, 6);
    ctx.fillRect(x + 1, y + 4, 3, 6);
    // body
    ctx.fillStyle = body;
    ctx.fillRect(x - 5, y - 4 + bob, 10, 9);
    ctx.fillStyle = accent;
    ctx.fillRect(x - 5, y - 4 + bob, 10, 2);
    // head
    ctx.fillStyle = "#f1c27d";
    ctx.fillRect(x - 4, y - 12 + bob, 8, 8);
    // hat / class marker
    ctx.fillStyle = accent;
    ctx.fillRect(x - 5, y - 14 + bob, 10, 3);
    if (this.cls.id === "mage") {
      // pointy hat tip
      ctx.fillRect(x - 2, y - 18 + bob, 4, 4);
    }
    // weapon
    ctx.save();
    ctx.translate(x, y - 2 + bob);
    ctx.rotate(p.facing);
    ctx.fillStyle = this.stats.weapon.color;
    if (this.cls.id === "swordsman") ctx.fillRect(6, -2, 14, 4);
    else if (this.cls.id === "mage") ctx.fillRect(5, -1.5, 13, 3);
    else ctx.fillRect(6, -1.5, 11, 3);
    ctx.fillStyle = "#d4af37";
    ctx.fillRect(4, -3, 3, 6);
    ctx.restore();
    if (p.hitFlash > 0) {
      ctx.fillStyle = "#ffffff66";
      ctx.fillRect(x - 6, y - 14, 12, 22);
    }
  }

  drawParticles() {
    const ctx = this.ctx;
    for (const p of this.particles) {
      const a = clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = a;
      if (p.size > 20) {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
    }
    ctx.globalAlpha = 1;
  }

  drawDmgNums() {
    const ctx = this.ctx;
    ctx.textAlign = "center";
    for (const d of this.dmgnums) {
      ctx.globalAlpha = clamp(d.life / 0.7, 0, 1);
      ctx.font = `bold ${d.size}px monospace`;
      ctx.fillStyle = "#000";
      ctx.fillText(d.text, d.x + 1, d.y + 1);
      ctx.fillStyle = d.color;
      ctx.fillText(d.text, d.x, d.y);
    }
    ctx.globalAlpha = 1;
  }

  // ---------- HUD ----------
  updateHud() {
    const g = (id: string) => document.getElementById(id);
    const p = this.player;
    const hpPct = clamp((p.hp / this.maxHp()) * 100, 0, 100);
    const hp = g("g-hp-fill");
    if (hp) hp.style.width = hpPct + "%";
    const ht = g("g-hp-text");
    if (ht) ht.textContent = `${Math.max(0, Math.ceil(p.hp))} / ${this.maxHp()}`;
    const lvl = g("g-level");
    if (lvl) lvl.textContent = `Lv ${this.run.level}`;
    const xp = g("g-xp-fill");
    if (xp)
      xp.style.width =
        clamp((this.run.xp / xpToNext(this.run.level)) * 100, 0, 100) + "%";
    const gold = g("g-gold");
    if (gold) gold.textContent = `${this.run.gold}`;
    const res = g("g-res");
    if (res) res.textContent = `${this.run.res}`;

    for (let i = 0; i < 3; i++) {
      const el = g(`g-skill-${i}`);
      if (!el) continue;
      const cd = this.player.skillCd[i];
      const skillId = this.cls.skillIds[i];
      const max = SKILLS[skillId].baseCooldown;
      const pct = clamp((cd / max) * 100, 0, 100);
      const overlay = el.querySelector(".cd") as HTMLElement | null;
      if (overlay) {
        overlay.style.height = pct + "%";
        overlay.style.opacity = pct > 1 ? "0.7" : "0";
      }
    }

    const bossWrap = g("g-boss");
    if (bossWrap) {
      if (this.boss) {
        bossWrap.classList.remove("hidden");
        const bf = g("g-boss-fill");
        if (bf)
          bf.style.width =
            clamp((this.boss.hp / this.boss.maxHp) * 100, 0, 100) + "%";
        const bn = g("g-boss-name");
        if (bn)
          bn.textContent = `${this.boss.name}  —  Phase ${this.boss.phase}`;
      } else {
        bossWrap.classList.add("hidden");
      }
    }

    const gateEl = g("g-gate");
    if (gateEl) {
      if (!this.bossRequired) {
        gateEl.textContent = "REGION CLEARED — farm freely";
        gateEl.style.opacity = "0.75";
      } else if (!this.gate.open) {
        const left = Math.max(0, this.killsNeeded - this.kills);
        gateEl.textContent = `GATE SEALED — ${left} more foe${left === 1 ? "" : "s"} to fell`;
        gateEl.style.opacity = "1";
      } else if (!this.bossSpawned) {
        gateEl.textContent = "GATE OPEN — seek the boss (top-right)";
        gateEl.style.opacity = "1";
      } else {
        gateEl.style.opacity = "0";
      }
    }

    const banner = g("g-banner");
    if (banner) {
      if (this.banner.time > 0) {
        banner.textContent = this.banner.text;
        banner.style.opacity = "1";
      } else {
        banner.style.opacity = "0";
      }
    }

    this.drawMinimap();
  }

  drawMinimap() {
    const cv = document.getElementById("g-minimap") as HTMLCanvasElement | null;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const W = cv.width;
    const H = cv.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#000a";
    ctx.fillRect(0, 0, W, H);
    const sx = W / this.worldW;
    const sy = H / this.worldH;
    ctx.fillStyle = "#f87171";
    for (const e of this.enemies)
      ctx.fillRect(e.x * sx - 1, e.y * sy - 1, 2, 2);
    if (this.boss) {
      ctx.fillStyle = "#fde047";
      ctx.fillRect(this.boss.x * sx - 2, this.boss.y * sy - 2, 4, 4);
    }
    // gate marker
    if (this.bossRequired) {
      ctx.fillStyle = this.gate.open ? "#fbbf24" : "#f87171";
      ctx.fillRect(this.gate.x * sx - 2, this.gate.y * sy - 2, 4, 4);
    }
    // camp
    ctx.fillStyle = "#4ade80";
    ctx.fillRect(this.camp.x * sx - 1, this.camp.y * sy - 1, 3, 3);
    // secret crates
    for (const c of this.crates)
      ctx.fillRect(c.x * sx - 1, c.y * sy - 1, 2, 2);
    ctx.fillStyle = "#4ade80";
    ctx.fillRect(
      this.player.x * sx - 1.5,
      this.player.y * sy - 1.5,
      3,
      3
    );
    // viewport
    ctx.strokeStyle = "#ffffff55";
    ctx.strokeRect(
      this.cam.x * sx,
      this.cam.y * sy,
      this.VW * sx,
      this.VH * sy
    );
  }
}
