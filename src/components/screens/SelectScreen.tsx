"use client";

import { useGame } from "../GameProvider";
import { CLASS_LIST, getMap } from "@/lib/game-data";
import { sfx } from "@/lib/sfx";
import type { ClassId } from "@/lib/types";

const ICONS: Record<ClassId, string> = {
  swordsman: "⚔️",
  mage: "🔮",
  archer: "🏹",
};

export default function SelectScreen() {
  const { user, savesList, progress, chooseClass, logout } = useGame();

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
          const unlocked = progress.unlockedClasses.includes(cls.id);
          const boss = cls.unlockBoss ? getMap(cls.unlockBoss).boss : null;
          return (
            <div
              key={cls.id}
              className={`pixel-panel relative flex flex-col rounded-2xl p-5 ${
                unlocked ? "" : "opacity-90"
              }`}
              style={{
                borderColor: unlocked ? cls.accent + "66" : "rgba(71,85,105,0.4)",
              }}
            >
              <div className="mb-3 flex items-center gap-3">
                <div
                  className="grid h-14 w-14 place-items-center rounded-xl text-3xl animate-floaty"
                  style={{
                    background: unlocked ? cls.accent + "22" : "#1e293b",
                    border: `2px solid ${unlocked ? cls.accent : "#475569"}`,
                    filter: unlocked ? undefined : "grayscale(0.8)",
                  }}
                >
                  {unlocked ? ICONS[cls.id] : "🔒"}
                </div>
                <div>
                  <h2
                    className="font-pixel text-sm"
                    style={{ color: unlocked ? cls.accent : "#94a3b8" }}
                  >
                    {cls.name}
                  </h2>
                  <p className="font-retro text-base text-slate-400">{cls.tagline}</p>
                </div>
              </div>

              <p className="font-retro mb-4 min-h-[3.5rem] text-lg leading-snug text-slate-300">
                {cls.description}
              </p>

              {existing && unlocked ? (
                <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 font-retro text-base text-emerald-200">
                  <div>Level {existing.level}</div>
                  <div>
                    {cleared} boss{cleared === 1 ? "" : "es"} defeated · Map{" "}
                    {existing.unlockedMaps} unlocked
                  </div>
                </div>
              ) : existing ? null : (
                <div className="mb-4 rounded-lg border border-slate-600/40 bg-slate-700/20 px-3 py-2 font-retro text-base text-slate-400">
                  New adventure — start at Level 1
                </div>
              )}

              {!unlocked && boss ? (
                <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 font-retro text-base text-amber-200">
                  <div className="font-bold">🔒 HERO LOCKED</div>
                  <div className="text-amber-100/80">
                    Defeat <span className="text-amber-300">{boss.name}</span> (Map{" "}
                    {cls.unlockBoss!} boss) with any hero to awaken {cls.name}.
                  </div>
                </div>
              ) : null}

              <button
                disabled={!unlocked}
                onClick={() => {
                  sfx.play("ui");
                  void chooseClass(cls.id);
                }}
                className="pixel-btn mt-auto rounded-md bg-amber-500 py-3 text-black hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-400"
              >
                {!unlocked
                  ? "LOCKED"
                  : existing
                    ? "CONTINUE"
                    : "BEGIN"}
              </button>
            </div>
          );
        })}
      </div>

      <p className="font-retro mt-8 text-center text-base text-slate-500">
        Hero unlocks and Forge upgrades are saved to your account and shared
        across all of your heroes.
      </p>
    </div>
  );
}
