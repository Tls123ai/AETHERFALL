"use client";

import { useState } from "react";
import { useGame } from "../GameProvider";
import VillageCanvas from "../VillageCanvas";
import {
  CLASSES,
  WEAPONS,
  SKILLS,
  MAPS,
  PERM_UPGRADES,
  permCost,
  computeStats,
  type PlayerStats,
  type PermUpgradeDef,
} from "@/lib/game-data";
import { RARITY_COLORS } from "@/lib/types";
import { WeaponCard, SkillCard, PASSIVE_LABEL } from "../cards";

type Tab = "character" | "weapons" | "skills" | "maps" | "forge";

/** NPC who runs each hub service. */
const TAB_META: Record<Tab, { icon: string; npc: string; title: string }> = {
  character: { icon: "🛡", npc: "Your Hero", title: "CHARACTER" },
  weapons: { icon: "⚒", npc: "Branda, Bladesmith", title: "WEAPON SHOP" },
  skills: { icon: "✦", npc: "Master Oryn", title: "SKILL STATION" },
  maps: { icon: "🗺", npc: "Warden Pell", title: "DUNGEON GATE" },
  forge: { icon: "🔥", npc: "Forgemaster Koda", title: "THE FORGE" },
};

function StatBar({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-white/5 py-1">
      <span className="font-retro text-base text-slate-400">{label}</span>
      <span className="font-retro text-lg text-white">{value}</span>
    </div>
  );
}

export default function HubScreen() {
  const {
    save,
    user,
    progress,
    buyWeapon,
    upgradeSkill,
    upgradePerm,
    equipWeapon,
    enterMap,
    chooseClass,
    logout,
    notice,
  } = useGame();
  const [tab, setTab] = useState<Tab>("character");
  if (!save) return null;
  const cls = CLASSES[save.classId];
  const stats: PlayerStats = computeStats(save, progress.permLevels);
  const weapons = Object.values(WEAPONS).filter(
    (w) => w.classId === save.classId && !w.bossOnly
  );
  const skills = cls.skillIds.map((id) => SKILLS[id]);

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-6">
      <div className="mb-4 text-center">
        <h1 className="font-pixel text-lg text-amber-300">AETHERFALL VILLAGE</h1>
        <p className="font-retro text-lg text-slate-400">
          Your safe haven — prepare, trade and grow before descending.
        </p>
      </div>
      <VillageCanvas classId={save.classId} />
      {notice && (
        <div
          className={`mb-4 rounded-md border px-4 py-2 font-retro text-lg ${
            notice.kind === "ok"
              ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200"
              : "border-red-500/50 bg-red-500/10 text-red-300"
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* Header */}
      <header className="pixel-panel mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
        <div className="flex items-center gap-4">
          <div
            className="grid h-12 w-12 place-items-center rounded-xl text-2xl"
            style={{ background: cls.accent + "22", border: `2px solid ${cls.accent}` }}
          >
            {cls.name === "Swordsman" ? "⚔️" : cls.name === "Mage" ? "🔮" : "🏹"}
          </div>
          <div>
            <div className="font-pixel text-sm" style={{ color: cls.accent }}>
              {cls.name}
            </div>
            <div className="font-retro text-base text-slate-400">
              Level {save.level} · {user?.username}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 font-retro text-xl">
          <span className="rounded-md bg-amber-500/15 px-3 py-1 text-amber-300">
            ⛀ {save.gold}
          </span>
          <span className="rounded-md bg-violet-500/15 px-3 py-1 text-violet-300">
            ⚡ {save.resources}
          </span>
          <button
            onClick={() => chooseClass(save.classId)}
            className="pixel-btn rounded-md bg-slate-700 px-3 py-2 text-xs text-slate-200"
          >
            SWITCH
          </button>
          <button
            onClick={logout}
            className="pixel-btn rounded-md bg-slate-700 px-3 py-2 text-xs text-slate-200"
          >
            LOGOUT
          </button>
        </div>
      </header>

      {/* Tabs */}
      <nav className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {(["character", "weapons", "skills", "maps", "forge"] as Tab[]).map((t) => {
          const meta = TAB_META[t];
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pixel-btn rounded-md px-3 py-3 text-left ${
                tab === t ? "bg-amber-500 text-black" : "bg-slate-800 text-slate-300"
              }`}
            >
              <span className="block text-sm">
                {meta.icon} {meta.title}
              </span>
              <span
                className={`font-retro block text-xs font-normal ${
                  tab === t ? "text-black/70" : "text-slate-500"
                }`}
              >
                {meta.npc}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="pixel-panel rounded-2xl p-5">
        {tab === "character" && (
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="font-pixel mb-3 text-xs text-slate-300">STATS</h3>
              <StatBar label="Max HP" value={String(stats.maxHp)} />
              <StatBar label="Damage" value={String(Math.round(stats.damage))} />
              <StatBar label="Attack Speed" value={`${stats.attackSpeed.toFixed(1)}/s`} />
              <StatBar label="Crit Chance" value={`${(stats.critChance * 100).toFixed(0)}%`} />
              <StatBar label="Move Speed" value={String(stats.moveSpeed)} />
              <StatBar label="Defense" value={`${(stats.defense * 100).toFixed(0)}%`} />
              <StatBar label="Lifesteal" value={stats.lifesteal > 0 ? `${(stats.lifesteal * 100).toFixed(0)}%` : "—"} />
              <StatBar label="Pierce" value={stats.pierce > 0 ? String(stats.pierce) : "—"} />
            </div>
            <div>
              <h3 className="font-pixel mb-3 text-xs text-slate-300">EQUIPPED WEAPON</h3>
              <div
                className="rounded-xl border-2 p-4"
                style={{ borderColor: RARITY_COLORS[stats.weapon.rarity] + "88", background: stats.weapon.color + "14" }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-pixel text-sm" style={{ color: RARITY_COLORS[stats.weapon.rarity] }}>
                    {stats.weapon.name}
                  </span>
                  <span
                    className="font-retro text-xs uppercase"
                    style={{ color: RARITY_COLORS[stats.weapon.rarity] }}
                  >
                    {stats.weapon.rarity}
                  </span>
                </div>
                <p className="font-retro mt-2 text-base text-slate-300">{stats.weapon.description}</p>
                <div className="font-retro mt-3 grid grid-cols-2 gap-1 text-base text-slate-200">
                  <span>DMG {stats.weapon.damage}</span>
                  <span>SPD {stats.weapon.attackSpeed.toFixed(1)}</span>
                  <span>CRIT {(stats.weapon.critChance * 100).toFixed(0)}%</span>
                  {stats.weapon.passive && <span>{PASSIVE_LABEL[stats.weapon.passive]}</span>}
                </div>
              </div>
              <h3 className="font-pixel mb-2 mt-5 text-xs text-slate-300">ARMORY</h3>
              <div className="flex flex-wrap gap-2">
                {save.ownedWeapons.map((id) => {
                  const w = WEAPONS[id];
                  const eq = save.equippedWeapon === id;
                  return (
                    <button
                      key={id}
                      onClick={() => equipWeapon(id)}
                      className={`rounded-md border px-3 py-2 font-retro text-base ${
                        eq ? "border-amber-400 bg-amber-400/20 text-amber-200" : "border-slate-600 bg-slate-800/60 text-slate-200"
                      }`}
                    >
                      {w.name}
                      {eq && " ✓"}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {tab === "weapons" && (
          <div>
            <h3 className="font-pixel mb-1 text-xs text-slate-300">{cls.name.toUpperCase()} WEAPON SHOP</h3>
            <p className="font-retro mb-4 text-base text-slate-400">
              Specialty weapons for your class. Spend gold earned from battles.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {weapons.map((w) => (
                <WeaponCard key={w.id} w={w} save={save} onBuy={() => buyWeapon(w.id)} onEquip={() => equipWeapon(w.id)} />
              ))}
            </div>
          </div>
        )}

        {tab === "skills" && (
          <div>
            <h3 className="font-pixel mb-1 text-xs text-slate-300">SKILL UPGRADE STATION</h3>
            <p className="font-retro mb-4 text-base text-slate-400">
              Spend ⚡ resources to empower your abilities (cost shown per level).
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              {skills.map((s) => (
                <SkillCard key={s.id} s={s} save={save} onUpgrade={() => upgradeSkill(s.id)} />
              ))}
            </div>
          </div>
        )}

        {tab === "maps" && (
          <div>
            <h3 className="font-pixel mb-1 text-xs text-slate-300">DUNGEON ENTRANCE</h3>
            <p className="font-retro mb-4 text-base text-slate-400">
              Defeat each boss to unlock the next map. Cleared maps can be replayed to farm.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {MAPS.map((m) => {
                const unlocked = m.index <= save.unlockedMaps;
                const cleared = save.defeatedBosses.includes(m.index);
                return (
                  <div
                    key={m.index}
                    className={`rounded-xl border-2 p-4 ${
                      unlocked ? "border-emerald-500/40 bg-emerald-500/5" : "border-slate-700 bg-slate-900/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-pixel text-xs text-emerald-200">
                        MAP {m.index}
                      </span>
                      {cleared ? (
                        <span className="font-retro text-base text-emerald-300">✓ CLEARED</span>
                      ) : !unlocked ? (
                        <span className="font-retro text-base text-slate-500">🔒 LOCKED</span>
                      ) : null}
                    </div>
                    <h4 className="font-retro text-2xl text-white">{m.name}</h4>
                    <p className="font-retro text-base text-slate-400">{m.subtitle}</p>
                    <p className="font-retro mt-1 text-base text-red-300">Boss: {m.boss.name}</p>
                    <button
                      disabled={!unlocked}
                      onClick={() => enterMap(m.index)}
                      className="pixel-btn mt-3 w-full rounded-md bg-amber-500 py-3 text-black disabled:bg-slate-700 disabled:text-slate-400"
                    >
                      {unlocked ? (cleared ? "RE-ENTER" : "ENTER") : "LOCKED"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "forge" && (
          <div>
            <h3 className="font-pixel mb-1 text-xs text-orange-300">
              THE FORGE — PERMANENT UPGRADES
            </h3>
            <p className="font-retro mb-4 text-base text-slate-400">
              Forgemaster Koda shapes your <span className="text-orange-200">account</span>:
              these upgrades are shared by every hero of yours and never reset.
              Costs are paid from <span className="text-amber-200">{cls.name}&apos;s</span> purse.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {PERM_UPGRADES.map((p) => (
                <PermCard
                  key={p.id}
                  def={p}
                  level={progress.permLevels[p.id] ?? 0}
                  gold={save.gold}
                  resources={save.resources}
                  onUpgrade={() => upgradePerm(p.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PermCard({
  def,
  level,
  gold,
  resources,
  onUpgrade,
}: {
  def: PermUpgradeDef;
  level: number;
  gold: number;
  resources: number;
  onUpgrade: () => void;
}) {
  const maxed = level >= def.maxLevel;
  const cost = permCost(def, level);
  const afford = gold >= cost.gold && resources >= cost.resources;
  return (
    <div className="flex flex-col rounded-xl border-2 border-orange-500/40 bg-orange-500/5 p-4">
      <div className="flex items-center justify-between">
        <span className="font-pixel text-[0.62rem] text-orange-200">
          {def.icon} {def.name}
        </span>
        <span className="font-retro text-base text-amber-300">
          {level} / {def.maxLevel}
        </span>
      </div>
      <p className="font-retro mt-1 text-base text-slate-300">{def.description}</p>
      <p className="font-retro text-base text-emerald-300">{def.perLevel}</p>
      {/* level pips */}
      <div className="mt-2 flex gap-1">
        {Array.from({ length: def.maxLevel }).map((_, i) => (
          <span
            key={i}
            className={`h-2.5 w-5 rounded-sm ${
              i < level ? "bg-orange-400" : "bg-slate-700"
            }`}
          />
        ))}
      </div>
      <button
        onClick={onUpgrade}
        disabled={maxed || !afford}
        className="pixel-btn mt-3 rounded-md bg-orange-600 py-2 text-white"
      >
        {maxed
          ? "MAXED"
          : `FORGE  ⛀${cost.gold} + ⚡${cost.resources}`}
      </button>
    </div>
  );
}


