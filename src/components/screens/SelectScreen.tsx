"use client";

import { useGame } from "../GameProvider";
import { CLASS_LIST } from "@/lib/game-data";
import type { ClassId } from "@/lib/types";

const ICONS: Record<ClassId, string> = {
  swordsman: "⚔️",
  mage: "🔮",
  archer: "🏹",
};

export default function SelectScreen() {
  const { user, savesList, chooseClass, logout } = useGame();

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-pixel text-xl text-amber-300">CHOOSE YOUR HERO</h1>
          <p className="font-retro text-lg text-slate-400">
            Welcome back, <span className="text-emerald-300">{user?.username}</span>
          </p>
        </div>
        <button
          onClick={logout}
          className="pixel-btn rounded-md bg-slate-700 px-4 py-3 text-slate-200"
        >
          LOGOUT
        </button>
      </header>

      <div className="grid gap-5 md:grid-cols-3">
        {CLASS_LIST.map((cls) => {
          const existing = savesList.find((s) => s.classId === cls.id);
          const cleared = existing?.defeatedBosses.length ?? 0;
          return (
            <div
              key={cls.id}
              className="pixel-panel flex flex-col rounded-2xl p-5"
              style={{ borderColor: cls.accent + "66" }}
            >
              <div className="mb-3 flex items-center gap-3">
                <div
                  className="grid h-14 w-14 place-items-center rounded-xl text-3xl animate-floaty"
                  style={{ background: cls.accent + "22", border: `2px solid ${cls.accent}` }}
                >
                  {ICONS[cls.id]}
                </div>
                <div>
                  <h2 className="font-pixel text-sm" style={{ color: cls.accent }}>
                    {cls.name}
                  </h2>
                  <p className="font-retro text-base text-slate-400">{cls.tagline}</p>
                </div>
              </div>

              <p className="font-retro mb-4 min-h-[3.5rem] text-lg leading-snug text-slate-300">
                {cls.description}
              </p>

              {existing ? (
                <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 font-retro text-base text-emerald-200">
                  <div>Level {existing.level}</div>
                  <div>
                    {cleared} boss{cleared === 1 ? "" : "es"} defeated · Map{" "}
                    {existing.unlockedMaps} unlocked
                  </div>
                </div>
              ) : (
                <div className="mb-4 rounded-lg border border-slate-600/40 bg-slate-700/20 px-3 py-2 font-retro text-base text-slate-400">
                  New adventure — start at Level 1
                </div>
              )}

              <button
                onClick={() => chooseClass(cls.id)}
                className="pixel-btn mt-auto rounded-md bg-amber-500 py-3 text-black hover:bg-amber-400"
              >
                {existing ? "CONTINUE" : "BEGIN"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
