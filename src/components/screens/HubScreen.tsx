"use client";

import { useState } from "react";
import { useGame } from "../GameProvider";
import {
  CLASSES,
  WEAPONS,
  SKILLS,
  MAPS,
  computeStats,
  type PlayerStats,
} from "@/lib/game-data";
import { RARITY_COLORS, type WeaponDef, type SkillDef } from "@/lib/types";

type Tab = "character" | "weapons" | "skills" | "maps";

const PASSIVE_LABEL: Record<string, string> = {
  burn: "Burns enemies (DoT)",
  poison: "Poisons enemies (DoT)",
  lifesteal: "Heals on hit",
  slow: "Chills & slows",
  pierce: "Arrows pierce 2 foes",
  crit: "Huge crit chance",
  heavy: "Slow but crushing",
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
  const { save, user, buyWeapon, upgradeSkill, equipWeapon, enterMap, chooseClass, logout, notice } =
    useGame();
  const [tab, setTab] = useState<Tab>("character");
  if (!save) return null;
  const cls = CLASSES[save.classId];
  const stats: PlayerStats = computeStats(save);
  const weapons = Object.values(WEAPONS).filter((w) => w.classId === save.classId);
  const skills = cls.skillIds.map((id) => SKILLS[id]);

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-6">
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
      <nav className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(["character", "weapons", "skills", "maps"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pixel-btn rounded-md px-3 py-3 ${
              tab === t ? "bg-amber-500 text-black" : "bg-slate-800 text-slate-300"
            }`}
          >
            {t === "character" ? "CHARACTER" : t === "weapons" ? "WEAPON SHOP" : t === "skills" ? "SKILLS" : "MAPS"}
          </button>
        ))}
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
      </div>
    </div>
  );
}

function WeaponCard({
  w,
  save,
  onBuy,
  onEquip,
}: {
  w: WeaponDef;
  save: ReturnType<typeof useGame>["save"];
  onBuy: () => void;
  onEquip: () => void;
}) {
  const owned = save?.ownedWeapons.includes(w.id);
  const equipped = save?.equippedWeapon === w.id;
  const afford = (save?.gold ?? 0) >= w.price;
  return (
    <div
      className="flex flex-col rounded-xl border-2 p-3"
      style={{ borderColor: RARITY_COLORS[w.rarity] + "66", background: w.color + "10" }}
    >
      <div className="flex items-center justify-between">
        <span className="font-pixel text-[0.62rem]" style={{ color: RARITY_COLORS[w.rarity] }}>
          {w.name}
        </span>
        <span className="font-retro text-xs uppercase" style={{ color: RARITY_COLORS[w.rarity] }}>
          {w.rarity}
        </span>
      </div>
      <p className="font-retro mt-1 min-h-[2.6rem] text-base text-slate-300">{w.description}</p>
      <div className="font-retro mb-2 grid grid-cols-2 gap-1 text-base text-slate-200">
        <span>DMG {w.damage}</span>
        <span>SPD {w.attackSpeed.toFixed(1)}</span>
        <span>CRIT {(w.critChance * 100).toFixed(0)}%</span>
        {w.passive && <span className="col-span-2 text-emerald-300">{PASSIVE_LABEL[w.passive]}</span>}
      </div>
      {equipped ? (
        <span className="pixel-btn rounded-md bg-emerald-600 py-2 text-center text-white">EQUIPPED</span>
      ) : owned ? (
        <button onClick={onEquip} className="pixel-btn rounded-md bg-slate-600 py-2 text-white">
          EQUIP
        </button>
      ) : (
        <button
          onClick={onBuy}
          disabled={!afford}
          className="pixel-btn rounded-md bg-amber-500 py-2 text-black"
        >
          BUY ⛀ {w.price}
        </button>
      )}
    </div>
  );
}

function SkillCard({
  s,
  save,
  onUpgrade,
}: {
  s: SkillDef;
  save: ReturnType<typeof useGame>["save"];
  onUpgrade: () => void;
}) {
  const level = save?.skillLevels[s.id] ?? 1;
  const maxed = level >= s.maxLevel;
  const afford = (save?.resources ?? 0) >= s.upgradeCost;
  return (
    <div className="flex flex-col rounded-xl border-2 border-violet-500/40 bg-violet-500/5 p-4">
      <div className="flex items-center justify-between">
        <span className="font-pixel text-[0.62rem] text-violet-200">{s.name}</span>
        <span className="rounded bg-slate-800 px-2 py-0.5 font-retro text-sm text-amber-300">
          {s.key}
        </span>
      </div>
      <p className="font-retro mt-1 text-base text-slate-300">{s.description}</p>
      <p className="font-retro text-base text-emerald-300">{s.effect}</p>
      <div className="mt-2 font-retro text-lg text-white">
        Level {level} / {s.maxLevel}
      </div>
      <button
        onClick={onUpgrade}
        disabled={maxed || !afford}
        className="pixel-btn mt-2 rounded-md bg-violet-600 py-2 text-white"
      >
        {maxed ? "MAXED" : `UPGRADE ⚡${s.upgradeCost}`}
      </button>
    </div>
  );
}
