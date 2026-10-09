"use client";

import { useState } from "react";
import type { SaveData } from "@/lib/types";
import { CLASSES, WEAPONS, SKILLS } from "@/lib/game-data";
import { WeaponCard, SkillCard } from "./cards";

/**
 * In-map camp services: a wandering merchant (specialty weapons)
 * and a skill crystal (skill upgrade station). The game engine is
 * paused while this is open.
 */
export default function CampModal({
  kind,
  save,
  onClose,
  onBuy,
  onUpgrade,
  onEquip,
  notice,
}: {
  kind: "merchant" | "skill";
  save: SaveData;
  onClose: () => void;
  onBuy: (id: string) => void;
  onUpgrade: (id: string) => void;
  onEquip: (id: string) => void;
  notice: { text: string; kind: "ok" | "err" } | null;
}) {
  const [tab, setTab] = useState<"merchant" | "skill">(kind);
  const cls = CLASSES[save.classId];
  const weapons = Object.values(WEAPONS).filter(
    (w) => w.classId === save.classId && !w.bossOnly
  );
  const skills = cls.skillIds.map((id) => SKILLS[id]);

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60">
      <div className="pixel-panel flex max-h-[86vh] w-[94%] max-w-3xl flex-col rounded-2xl p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-pixel text-sm text-amber-300">
              {tab === "merchant" ? "WANDERING MERCHANT" : "SKILL CRYSTAL"}
            </h2>
            <p className="font-retro text-base text-slate-400">
              {tab === "merchant"
                ? "Specialty blades for the road. New weapons take effect when you return."
                : "Channel the crystal to empower your skills mid-journey."}
            </p>
          </div>
          <div className="flex gap-3 font-retro text-xl">
            <span className="rounded-md bg-amber-500/15 px-3 py-1 text-amber-300">
              ⛀ {save.gold}
            </span>
            <span className="rounded-md bg-violet-500/15 px-3 py-1 text-violet-300">
              ⚡ {save.resources}
            </span>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => setTab("merchant")}
            className={`pixel-btn rounded-md px-3 py-3 ${
              tab === "merchant" ? "bg-amber-500 text-black" : "bg-slate-800 text-slate-300"
            }`}
          >
            MERCHANT
          </button>
          <button
            onClick={() => setTab("skill")}
            className={`pixel-btn rounded-md px-3 py-3 ${
              tab === "skill" ? "bg-amber-500 text-black" : "bg-slate-800 text-slate-300"
            }`}
          >
            SKILL STATION
          </button>
        </div>

        {notice && (
          <div
            className={`mb-3 rounded-md border px-4 py-2 font-retro text-lg ${
              notice.kind === "ok"
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200"
                : "border-red-500/50 bg-red-500/10 text-red-300"
            }`}
          >
            {notice.text}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {tab === "merchant" ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {weapons.map((w) => (
                <WeaponCard
                  key={w.id}
                  w={w}
                  save={save}
                  compact
                  onBuy={() => onBuy(w.id)}
                  onEquip={() => onEquip(w.id)}
                />
              ))}
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              {skills.map((s) => (
                <SkillCard
                  key={s.id}
                  s={s}
                  save={save}
                  onUpgrade={() => onUpgrade(s.id)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="font-retro text-base text-slate-500">
            Esc closes · run resumes where it left off
          </span>
          <button
            onClick={onClose}
            className="pixel-btn rounded-md bg-emerald-600 px-5 py-3 text-white"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
