import type { SaveData, RunResult, ClassId } from "@/lib/types";
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

type EnemyType = "grunt" | "shooter" | "elite";
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
  _touch?: number;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const randInt = (a: number, b: number) => Math.floor(rand(a, b + 1));
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const dist = (ax: number, ay: number, bx: number, by: number) =>
  Math.hypot(ax - bx, ay - by);

export interface EngineOpts {
  canvas: HTMLCanvasElement;
  container: HTMLDivElement;
  save: SaveData;
  mapIndex: number;
  onComplete: (r: RunResult) => void;
}

export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  container: HTMLDivElement;
  save: SaveData;
  mapIndex: number;
  onComplete: (r: RunResult) => void;

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

  keys = new Set<string>();
  mx = 0;
  my = 0;
  mdown = false;
  aimX = 0;
  aimY = 0;

  run = { gold: 0, res: 0, xp: 0, level: 1, weaponRewards: [] as string[], bossDefeated: false };
  banner = { text: "", time: 0 };
  finished = false;
  started = false;
  raf = 0;
  last = 0;
  idc = 1;
  victoryTimer = 0;
  deathTimer = 0;

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
    this.cls = CLASSES[opts.save.classId];
    this.stats = computeStats(opts.save);
    this.ctx = this.canvas.getContext("2d")!;
    this.run.level = opts.save.level;
    this.run.xp = opts.save.xp;
  }

  attackDamage() {
    return this.stats.weapon.damage + (this.run.level - 1) * 4;
  }
  maxHp() {
    return this.cls.maxHp + (this.run.level - 1) * 18;
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

  requestAbandon() {
    if (!this.finished) this.complete("abandon");
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
      y: this.worldH / 2 + 200,
      vx: 0,
      vy: 0,
      hp: this.maxHp(),
      facing: -Math.PI / 2,
      attackTimer: 0,
      dodgeCd: 0,
      dodgeTime: 0,
      invuln: 0,
      skillCd: [0, 0, 0],
      hitFlash: 0,
      walkPhase: 0,
    };
    this.cam.x = clamp(this.player.x - this.VW / 2, 0, this.worldW - this.VW);
    this.cam.y = clamp(this.player.y - this.VH / 2, 0, this.worldH - this.VH);

    // obstacles (rock clusters)
    const clusters = 5 + this.mapIndex;
    for (let i = 0; i < clusters; i++) {
      const ox = rand(120, this.worldW - 180);
      const oy = rand(120, this.worldH - 180);
      if (dist(ox, oy, this.player.x, this.player.y) < 180) continue;
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

    // enemies
    for (let i = 0; i < map.enemyCount; i++) this.spawnEnemy("grunt");
    for (let i = 0; i < Math.ceil(map.enemyCount / 4); i++) this.spawnEnemy("shooter");
    for (let i = 0; i < map.eliteCount; i++) this.spawnEnemy("elite");

    // chests (some secret, in corners)
    const spots = [
      [100, 100],
      [this.worldW - 100, 100],
      [100, this.worldH - 100],
      [this.worldW - 100, this.worldH - 100],
      [this.worldW / 2, 120],
    ];
    spots.forEach((s, i) => {
      if (i < 3 + this.mapIndex)
        this.chests.push({ x: s[0], y: s[1], opened: false, t: 0 });
    });

    this.banner = { text: `${map.name}`, time: 2.4 };
  }

  spawnEnemy(type: EnemyType) {
    const map = getMap(this.mapIndex);
    let x = 0;
    let y = 0;
    for (let tries = 0; tries < 30; tries++) {
      x = rand(80, this.worldW - 80);
      y = rand(80, this.worldH - 80);
      if (dist(x, y, this.player.x, this.player.y) > 260) break;
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
    const k = e.key.toLowerCase();
    this.keys.add(k);
    if (k === "q") this.useSkill(0);
    else if (k === "e") this.useSkill(1);
    else if (k === "r") this.useSkill(2);
    else if (k === " ") this.mdown = true;
    else if (k === "escape") this.requestAbandon();
    if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k))
      e.preventDefault();
  }
  onKeyUp(e: KeyboardEvent) {
    const k = e.key.toLowerCase();
    this.keys.delete(k);
    if (k === " ") this.mdown = false;
  }
  onMouseDown(e: MouseEvent) {
    if (e.button === 0) this.mdown = true;
  }
  onMouseMove(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    this.mx = e.clientX - rect.left;
    this.my = e.clientY - rect.top;
  }

  // ---------- main loop ----------
  loop(ts: number) {
    if (this.finished) return;
    let dt = (ts - this.last) / 1000;
    this.last = ts;
    dt = Math.min(0.05, dt);
    this.update(dt);
    this.render();
    this.updateHud();
    this.raf = requestAnimationFrame((t) => this.loop(t));
  }

  update(dt: number) {
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

    // boss spawn check
    if (
      !this.bossSpawned &&
      !this.run.bossDefeated &&
      this.enemies.length === 0
    ) {
      this.spawnBoss();
    }
  }

  updatePlayer(dt: number) {
    const p = this.player;
    p.attackTimer = Math.max(0, p.attackTimer - dt);
    p.dodgeCd = Math.max(0, p.dodgeCd - dt);
    p.dodgeTime = Math.max(0, p.dodgeTime - dt);
    p.invuln = Math.max(0, p.invuln - dt);
    p.hitFlash = Math.max(0, p.hitFlash - dt);
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
    }

    if (p.dodgeTime <= 0) {
      p.vx = dx * this.stats.moveSpeed;
      p.vy = dy * this.stats.moveSpeed;
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
      if (hit) this.spawnHitSpark(p.x + Math.cos(p.facing) * 30, p.y + Math.sin(p.facing) * 30, w.color);
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
    p.skillCd[slot] = skill.baseCooldown;

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
            if (dist(tx, ty, e.x, e.y) < 26 + e.radius) this.dealToEnemy(e, dmg * 0.5, p.facing);
          }
          if (this.boss && dist(tx, ty, this.boss.x, this.boss.y) < 26 + this.boss.radius)
            this.dealToBoss(dmg * 0.5);
        }
        this.spawnHitSpark(p.x + Math.cos(p.facing) * range, p.y + Math.sin(p.facing) * range, this.stats.weapon.color);
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
        // explosion handled on impact via life? simpler: spawn AoE at target after travel
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
    if (this.stats.lifesteal > 0) {
      this.player.hp = Math.min(this.maxHp(), this.player.hp + dmg * this.stats.lifesteal);
    }
    if (this.stats.weapon.passive === "burn" || this.stats.weapon.passive === "poison") {
      // handled by projectile flags; basic attacks also apply if weapon passive
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
    this.run.gold += e.gold;
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
    if (Math.random() < 0.28) {
      this.pickups.push({ x: e.x, y: e.y, kind: "health", value: Math.round(this.maxHp() * 0.14), vy: 0, t: 0 });
    }
  }

  killBoss() {
    this.run.bossDefeated = true;
    const map = getMap(this.mapIndex);
    this.run.gold += map.rewardGold;
    this.run.res += map.rewardResources;
    if (!this.run.weaponRewards.includes(map.rewardWeapon))
      this.run.weaponRewards.push(map.rewardWeapon);
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
    this.banner = { text: "BOSS DEFEATED!", time: 2.6 };
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
    this.dmgnums.push({
      x: e.x + rand(-4, 4),
      y: e.y - e.radius,
      vy: -22,
      life: 0.5,
      text: String(Math.round(amount)),
      color,
      size: 6,
    });
    if (e.hp <= 0) this.killEnemy(e);
  }

  spawnEnemyProj(x: number, y: number, ang: number, dmg: number) {
    const map = getMap(this.mapIndex);
    this.projectiles.push({
      x,
      y,
      vx: Math.cos(ang) * 190,
      vy: Math.sin(ang) * 190,
      radius: 5,
      damage: dmg,
      from: "enemy",
      life: 3,
      color: "#fca5a5",
      pierce: 0,
      hitIds: new Set(),
      kind: "bolt",
      burn: false,
      poison: false,
      slow: false,
      angle: ang,
    });
  }

  // ---------- boss ----------
  spawnBoss() {
    const map = getMap(this.mapIndex);
    this.bossSpawned = true;
    const bx = this.worldW / 2;
    const by = 160;
    this.boss = {
      x: bx,
      y: by,
      vx: 0,
      vy: 0,
      hp: map.boss.maxHp,
      maxHp: map.boss.maxHp,
      radius: 26,
      phase: 1,
      attackTimer: 2,
      chargeTimer: 4,
      charging: 0,
      chargeVx: 0,
      chargeVy: 0,
      hitFlash: 0,
      name: map.boss.name,
      color: map.boss.color,
      id: map.boss.id,
    };
    this.banner = { text: `${map.boss.name} appears!`, time: 2.8 };
  }

  updateBoss(dt: number) {
    const b = this.boss;
    if (!b) return;
    b.hitFlash = Math.max(0, b.hitFlash - dt);
    const p = this.player;
    const d = dist(b.x, b.y, p.x, p.y);
    const ang = Math.atan2(p.y - b.y, p.x - b.x);

    // phase transitions
    const frac = b.hp / b.maxHp;
    if (frac <= 0.33) b.phase = 3;
    else if (frac <= 0.66) b.phase = 2;
    else b.phase = 1;
    const speedMul = b.phase === 3 ? 1.5 : b.phase === 2 ? 1.2 : 1;

    if (b.charging > 0) {
      b.charging -= dt;
      b.x += b.chargeVx * dt;
      b.y += b.chargeVy * dt;
      this.clampBounds(b, b.radius);
      if (d < b.radius + 14) this.damagePlayer(Math.round(getMap(this.mapIndex).enemyDamage * 1.4), b.x, b.y);
      return;
    }

    // movement: drift toward player slowly
    b.x += Math.cos(ang) * 38 * speedMul * dt;
    b.y += Math.sin(ang) * 38 * speedMul * dt;
    this.clampBounds(b, b.radius);

    b.attackTimer -= dt;
    b.chargeTimer -= dt;

    if (b.attackTimer <= 0) {
      b.attackTimer = b.phase === 3 ? 1.6 : b.phase === 2 ? 2.2 : 2.8;
      // radial volley
      const n = b.phase === 3 ? 14 : b.phase === 2 ? 10 : 8;
      const base = b.phase === 3 ? 0 : 0;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + base;
        this.projectiles.push({
          x: b.x,
          y: b.y,
          vx: Math.cos(a) * 150,
          vy: Math.sin(a) * 150,
          radius: 7,
          damage: Math.round(getMap(this.mapIndex).enemyDamage * 1.2),
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
    }

    if (b.chargeTimer <= 0 && b.phase >= 2) {
      b.chargeTimer = b.phase === 3 ? 3.5 : 5;
      b.charging = 0.6;
      b.chargeVx = Math.cos(ang) * 360;
      b.chargeVy = Math.sin(ang) * 360;
    }

    // contact
    if (d < b.radius + 10 && b.attackTimer > 0.5) {
      // gentle contact handled by charge; light touch damage
    }
    if (d < b.radius + 10) {
      // periodic contact damage
      if (!b._touch || b._touch <= 0) {
        b._touch = 0.6;
        this.damagePlayer(Math.round(getMap(this.mapIndex).enemyDamage * 0.8), b.x, b.y);
      }
    }
    b._touch = Math.max(0, (b._touch ?? 0) - dt);
  }

  damagePlayer(amount: number, fromX: number, fromY: number) {
    const p = this.player;
    if (p.invuln > 0) return;
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
    if (p.hp <= 0 && !this.finished && this.deathTimer <= 0) {
      p.hp = 0;
      this.deathTimer = 1.2;
      this.banner = { text: "YOU DIED", time: 1.5 };
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
            if (pr.burn) {
              /* boss resist */
            }
            pr.hitIds.add(-1);
            if (pr.pierce <= 0) consumed = true;
            else pr.pierce -= 1;
          }
        }
      } else {
        if (dist(pr.x, pr.y, this.player.x, this.player.y) < pr.radius + 8) {
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
            if (dist(a.x, a.y, e.x, e.y) < a.radius + e.radius) this.dealToEnemy(e, a.damage, 0);
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
        const gold = randInt(30, 70) + this.mapIndex * 10;
        const res = randInt(1, 3);
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
    return "#86efac";
  }

  // ---------- completion ----------
  complete(outcome: RunResult["outcome"]) {
    if (this.finished) return;
    this.finished = true;
    cancelAnimationFrame(this.raf);
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

    ctx.save();
    ctx.scale(this.scale, this.scale);
    ctx.translate(-this.cam.x, -this.cam.y);

    this.drawGround();
    this.drawObstacles();
    this.drawChests();
    this.drawAoes();
    this.drawPickups();
    this.drawProjectiles();
    this.drawEnemies();
    if (this.boss) this.drawBoss();
    this.drawPlayer();
    this.drawParticles();
    this.drawDmgNums();

    ctx.restore();
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
        const h = (Math.sin(tx * 12.9898 + ty * 78.233) * 43758.5453) % 1;
        if (h > 0.82) {
          ctx.fillStyle = "rgba(255,255,255,0.05)";
          ctx.fillRect(x + 6, y + 6, 4, 4);
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
      ctx.fillStyle = "#7c5a2e";
      ctx.fillRect(c.x - 10, c.y - 8, 20, 14);
      ctx.fillStyle = "#caa45a";
      ctx.fillRect(c.x - 10, c.y - 2, 20, 4);
      ctx.fillStyle = "#ffe08a";
      ctx.fillRect(c.x - 2, c.y - 6, 4, 4);
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
    const col = b.hitFlash > 0 ? "#ffffff" : b.color;
    // body
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
    // crown / horns
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(b.x - b.radius, b.y - b.radius - 8, 6, 10);
    ctx.fillRect(b.x + b.radius - 6, b.y - b.radius - 8, 6, 10);
    ctx.fillStyle = "#fde047";
    ctx.fillRect(b.x - 3, b.y - b.radius - 12, 6, 6);
    // eyes
    ctx.fillStyle = "#111";
    ctx.fillRect(b.x - 10, b.y - 4, 4, 4);
    ctx.fillRect(b.x + 6, b.y - 4, 4, 4);
    // mouth
    ctx.fillStyle = "#111";
    ctx.fillRect(b.x - 8, b.y + 8, 16, 3);
    if (b.phase >= 2) {
      ctx.fillStyle = "#ffffff55";
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius + 3, 0, Math.PI * 2);
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
    // hat
    ctx.fillStyle = accent;
    ctx.fillRect(x - 5, y - 14 + bob, 10, 3);
    // weapon
    ctx.save();
    ctx.translate(x, y - 2 + bob);
    ctx.rotate(p.facing);
    ctx.fillStyle = this.stats.weapon.color;
    ctx.fillRect(6, -2, 14, 4);
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
    if (xp) xp.style.width = clamp((this.run.xp / xpToNext(this.run.level)) * 100, 0, 100) + "%";
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
        if (bf) bf.style.width = clamp((this.boss.hp / this.boss.maxHp) * 100, 0, 100) + "%";
        const bn = g("g-boss-name");
        if (bn) bn.textContent = `${this.boss.name}  —  Phase ${this.boss.phase}`;
      } else {
        bossWrap.classList.add("hidden");
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
    for (const e of this.enemies) ctx.fillRect(e.x * sx - 1, e.y * sy - 1, 2, 2);
    if (this.boss) {
      ctx.fillStyle = "#fde047";
      ctx.fillRect(this.boss.x * sx - 2, this.boss.y * sy - 2, 4, 4);
    }
    ctx.fillStyle = "#4ade80";
    ctx.fillRect(this.player.x * sx - 1.5, this.player.y * sy - 1.5, 3, 3);
    // viewport
    ctx.strokeStyle = "#ffffff55";
    ctx.strokeRect(this.cam.x * sx, this.cam.y * sy, this.VW * sx, this.VH * sy);
  }
}
