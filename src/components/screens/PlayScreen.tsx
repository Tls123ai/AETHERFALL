"use client";

import { useState } from "react";
import { useGame } from "../GameProvider";
import GameCanvas from "../GameCanvas";
import CampModal from "../CampModal";
import type { RunResult } from "@/lib/types";
import { WEAPONS, getMap } from "@/lib/game-data";

export default function PlayScreen() {
  const {
    save,
    playMap,
    progress,
    applyRunResult,
    goHub,
    buyWeapon,
    upgradeSkill,
    equipWeapon,
    notice,
  } = useGame();
  const [result, setResult] = useState<RunResult | null>(null);
  const [runKey, setRunKey] = useState(0);
  const [camp, setCamp] = useState<"merchant" | "skill" | null>(null);

  if (!save) {
    goHub();
    return null;
  }
  const map = getMap(playMap);

  function handleComplete(r: RunResult) {
    setResult(r);
    void applyRunResult(r);
  }

  const title =
    result?.outcome === "victory"
      ? "VICTORY!"
      : result?.outcome === "death"
        ? "YOU DIED"
        : "RETREAT";

  const titleColor =
    result?.outcome === "victory"
      ? "text-amber-300"
      : result?.outcome === "death"
        ? "text-red-400"
        : "text-slate-200";

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <GameCanvas
        key={runKey}
        save={save}
        mapIndex={playMap}
        onComplete={handleComplete}
        onInteract={(k) => setCamp(k)}
        paused={camp !== null && !result}
        perms={progress.permLevels}
      />

      {camp && !result && (
        <CampModal
          kind={camp}
          save={save}
          onClose={() => setCamp(null)}
          onBuy={(id) => void buyWeapon(id)}
          onUpgrade={(id) => void upgradeSkill(id)}
          onEquip={(id) => void equipWeapon(id)}
          notice={notice}
        />
      )}

      {result && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70">
          <div className="pixel-panel w-[92%] max-w-md rounded-2xl p-7 text-center">
            <h2 className={`font-pixel text-xl ${titleColor}`}>{title}</h2>
            <p className="font-retro mt-2 text-lg text-slate-300">{map.name}</p>

            <div className="my-4 space-y-1 font-retro text-xl">
              <div className="text-amber-300">+ {result.goldEarned} gold</div>
              <div className="text-violet-300">
                + {result.resourcesEarned} resources
              </div>
              <div className="text-sky-300">
                Reached Level {result.level}
              </div>
              {result.bossDefeated && (
                <div className="text-emerald-300">
                  Boss defeated — next map unlocked!
                </div>
              )}
              {result.weaponRewards.map((w) => (
                <div key={w} className="text-emerald-200">
                  Looted: {WEAPONS[w]?.name ?? w}
                </div>
              ))}
              {result.outcome === "death" && (
                <div className="pt-1 text-slate-400">
                  Your account progress is safe — return and prepare again.
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-col gap-3">
              <button
                onClick={goHub}
                className="pixel-btn rounded-md bg-amber-500 py-3 text-black"
              >
                RETURN TO HUB
              </button>
              <button
                onClick={() => {
                  setResult(null);
                  setRunKey((k) => k + 1);
                }}
                className="pixel-btn rounded-md bg-slate-700 py-3 text-slate-100"
              >
                RETRY MAP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
