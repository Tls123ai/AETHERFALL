# AETHERFALL — Pixel Action RPG

A 2D pixel-art action RPG with exploration, class-based combat, equipment
upgrades, unique multi-phase bosses, and **account-based progression**
(Next.js + React + TypeScript, canvas engine, PostgreSQL).

![stack](https://img.shields.io/badge/stack-Next.js_16_%E2%80%A2_React_19_%E2%80%A2_PostgreSQL-38bdf8)

## Gameplay

- **Accounts** — create an account / log in. All progression is saved
  server-side per class: level & XP, skills & upgrades, weapons & equipment,
  gold & resources, map unlocks, defeated bosses.
- **Three classes**, each with a unique playstyle, weapon line and 3 skills:
  - ⚔️ **Swordsman** — melee arcs, Sword Slash / Dash Strike / Whirlwind
  - 🔮 **Mage** — elemental AoE, Fireball / Ice Nova / Lightning Bolt
  - 🏹 **Archer** — ranged crits & mobility, Multi-Shot / Piercing Arrow / Rain of Arrows
- **Aetherfall Village (hub)** — your safe haven: character stats,
  specialty weapon shop, skill upgrade station and the dungeon gate.
- **4 hand-themed maps** with increasing difficulty: Whispering Woods →
  Cinder Caverns → Frostspire Peaks → Shadow Abyss.
- **Exploration** — monsters, elites, gold, chests (that can hide equipment),
  a breakable **secret area**, and a mid-map **camp** with a wandering
  merchant + skill crystal (press `F`).
- **Boss gate** — each map's boss is sealed behind a gate that opens once
  you have felled enough foes. Step through it to start the fight.
- **Unique bosses** — each has its own look, attack patterns (meteors,
  frost rings, void spirals, blinks, beams…), telegraphs and 3 phases.
- **Death is not the end** — you return to the village with all account
  progress intact; defeated bosses stay defeated (cleared maps become
  farming grounds).

### Controls

| Key | Action |
| --- | --- |
| WASD / Arrows | Move |
| Mouse | Aim |
| Click / Space | Basic attack |
| Q / E / R | Skills 1–3 |
| Shift / X | Dodge (i-frames) |
| F | Interact (camp merchant / skill crystal) |
| Esc | Abandon run |

## Local development

The app needs PostgreSQL. An **embedded Postgres** (no system install
required) is bundled as a dev dependency and managed by `scripts/db.mjs`:

```bash
npm install

# terminal 1 — starts Postgres 18 in .pgdata, creates db + schema
node scripts/db.mjs

# terminal 2 — the game (http://localhost:3000)
npm run dev
```

Connection details live in `.env` (copy from `.env.example`).

### Scripts & checks

```bash
npm run typecheck            # tsc --noEmit
npm run lint                 # eslint
node scripts/check-data.mjs  # game-data consistency (node --experimental-strip-types)
node --experimental-strip-types --import ./scripts/register.mjs scripts/engine-test.ts
```

`engine-test.ts` runs the real game engine headlessly (DOM-stubbed): world
spawn, movement, melee/ranged combat, skill execution, boss gate → boss
fight → victory rewards, cleared-map farming, secret crates, camp
interact + pause, death flow, and live save refresh.

## Architecture

```
src/
  app/
    api/auth/{register,login,me,logout}   # account system (scrypt + session cookies)
    api/saves/[classId]                    # per-class save get/put (sanitized)
    api/shop/buy                           # weapon purchase
    api/skills/upgrade                     # skill upgrades
    api/health                             # db health probe
  db/                                      # drizzle schema (users, sessions, saves)
  lib/
    game-data.ts                           # classes, weapons, skills, maps, bosses
    save.ts                                # save (de)serialization + sanitizing
    sfx.ts                                 # WebAudio 8-bit sound synth
  components/
    GameProvider.tsx                       # account state machine
    GameEngine.ts                          # canvas action engine (combat, AI, bosses)
    GameCanvas.tsx / CampModal.tsx         # HUD, in-map shop & skill station
    VillageCanvas.tsx                      # animated hub village scene
    screens/                               # login, select, hub, play
scripts/
  db.mjs                                   # embedded postgres launcher + schema
  check-data.mjs / engine-test.ts          # data + headless engine tests
```
