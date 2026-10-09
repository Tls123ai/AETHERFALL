"use client";

import type { SaveData, WeaponDef, SkillDef } from "@/lib/types";
import { RARITY_COLORS } from "@/lib/types";

export const PASSIVE_LABEL: Record<string, string> = {
  burn: "Burns enemies (DoT)",
  poison: "Poisons enemies (DoT)",
  lifesteal: "Heals on hit",
  slow: "Chills & slows",
  pierce: "Arrows pierce 2 foes",
  crit: "Huge crit chance",
  heavy: "Slow but crushing",
};

export function WeaponCard({
  w,
  save,
  onBuy,
  onEquip,
  compact,
}: {
  w: WeaponDef;
  save: SaveData | null;
  onBuy?: () => void;
  onEquip?: () => void;
  compact?: boolean;
}) {
  const owned = save?.ownedWeapons.includes(w.id);
  const equipped = save?.equippedWeapon === w.id;
  const afford = (save?.gold ?? 0) >= w.price;
  return (
    <div
      className="flex flex-col rounded-xl border-2 p-3"
      style={{
        borderColor: RARITY_COLORS[w.rarity] + "66",
        background: w.color + "10",
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="font-pixel text-[0.62rem]"
          style={{ color: RARITY_COLORS[w.rarity] }}
        >
          {w.name}
        </span>
        <span
          className="font-retro text-xs uppercase"
          style={{ color: RARITY_COLORS[w.rarity] }}
        >
          {w.rarity}
        </span>
      </div>
      {!compact && (
        <p className="font-retro mt-1 min-h-[2.6rem] text-base text-slate-300">
          {w.description}
        </p>
      )}
      <div className="font-retro mb-2 grid grid-cols-2 gap-1 text-base text-slate-200">
        <span>DMG {w.damage}</span>
        <span>SPD {w.attackSpeed.toFixed(1)}</span>
        <span>CRIT {(w.critChance * 100).toFixed(0)}%</span>
        {w.passive && (
          <span className="col-span-2 text-emerald-300">
            {PASSIVE_LABEL[w.passive]}
          </span>
        )}
      </div>
      {equipped ? (
        <span className="pixel-btn rounded-md bg-emerald-600 py-2 text-center text-white">
          EQUIPPED
        </span>
      ) : owned ? (
        <button
          onClick={onEquip}
          className="pixel-btn rounded-md bg-slate-600 py-2 text-white"
        >
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

export function SkillCard({
  s,
  save,
  onUpgrade,
}: {
  s: SkillDef;
  save: SaveData | null;
  onUpgrade?: () => void;
}) {
  const level = save?.skillLevels[s.id] ?? 1;
  const maxed = level >= s.maxLevel;
  const afford = (save?.resources ?? 0) >= s.upgradeCost;
  return (
    <div className="flex flex-col rounded-xl border-2 border-violet-500/40 bg-violet-500/5 p-4">
      <div className="flex items-center justify-between">
        <span className="font-pixel text-[0.62rem] text-violet-200">
          {s.name}
        </span>
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
