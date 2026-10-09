"use client";

import { useEffect, useRef } from "react";
import { GameEngine } from "./GameEngine";
import type { SaveData, RunResult } from "@/lib/types";
import { CLASSES, SKILLS } from "@/lib/game-data";

export default function GameCanvas({
  save,
  mapIndex,
  onComplete,
  onInteract,
  paused,
}: {
  save: SaveData;
  mapIndex: number;
  onComplete: (r: RunResult) => void;
  onInteract?: (kind: "merchant" | "skill") => void;
  paused?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const interactRef = useRef(onInteract);
  useEffect(() => {
    interactRef.current = onInteract;
  }, [onInteract]);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;
    const engine = new GameEngine({
      canvas: canvasRef.current,
      container: containerRef.current,
      save,
      mapIndex,
      onComplete,
      onInteract: (k) => interactRef.current?.(k),
    });
    engineRef.current = engine;
    engine.start();
    return () => {
      engine.stop();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // pause while a camp service modal is open
  useEffect(() => {
    engineRef.current?.setPaused(!!paused);
  }, [paused]);

  // live-save updates after in-map purchases / upgrades
  useEffect(() => {
    engineRef.current?.setSave(save);
  }, [save]);

  const cls = CLASSES[save.classId];

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-black"
      style={{ imageRendering: "pixelated" }}
    >
      <canvas ref={canvasRef} className="block h-full w-full cursor-crosshair" />

      {/* HUD */}
      <div className="pointer-events-none absolute inset-0 select-none font-mono text-white">
        {/* Boss bar */}
        <div
          id="g-boss"
          className="hidden absolute left-1/2 top-3 w-[70%] max-w-[640px] -translate-x-1/2"
        >
          <div id="g-boss-name" className="mb-1 text-center text-xs font-bold tracking-wider text-red-300 drop-shadow">
            Boss
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full border-2 border-red-900 bg-black/60">
            <div id="g-boss-fill" className="h-full w-full bg-gradient-to-r from-red-500 to-red-700" />
          </div>
        </div>

        {/* Boss gate status */}
        <div
          id="g-gate"
          className="absolute left-1/2 top-14 -translate-x-1/2 rounded border border-amber-500/40 bg-black/60 px-3 py-1 text-[11px] font-bold tracking-wide text-amber-200"
        />

        {/* Banner */}
        <div
          id="g-banner"
          className="absolute left-1/2 top-1/3 -translate-x-1/2 text-center text-2xl font-extrabold tracking-widest text-amber-300 opacity-0 drop-shadow-[0_2px_0_rgba(0,0,0,0.8)] transition-opacity duration-300"
        />

        {/* Bottom-left stats */}
        <div className="absolute bottom-3 left-3 w-64 space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-10 text-xs font-bold text-red-300">HP</span>
            <div className="relative h-4 flex-1 overflow-hidden rounded border border-red-900 bg-black/60">
              <div id="g-hp-fill" className="h-full w-full bg-gradient-to-r from-red-500 to-rose-400" />
              <span id="g-hp-text" className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
                0 / 0
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-10 text-xs font-bold text-sky-300">XP</span>
            <div className="relative h-2 flex-1 overflow-hidden rounded border border-sky-900 bg-black/60">
              <div id="g-xp-fill" className="h-full w-full bg-sky-400" />
            </div>
            <span id="g-level" className="text-xs font-bold text-sky-200">Lv 1</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-amber-300">⛀ <span id="g-gold">0</span></span>
            <span className="text-violet-300">⚡ <span id="g-res">0</span></span>
          </div>
        </div>

        {/* Skills */}
        <div className="absolute bottom-3 right-3 flex gap-2">
          {cls.skillIds.map((id, i) => {
            const skill = SKILLS[id];
            const lvl = save.skillLevels[id] ?? 1;
            return (
              <div
                key={id}
                id={`g-skill-${i}`}
                className="relative h-14 w-14 overflow-hidden rounded-lg border-2 border-white/30 bg-black/50"
              >
                <div className="cd absolute bottom-0 left-0 h-0 w-full bg-black/70" />
                <div className="relative z-10 flex h-full flex-col items-center justify-center text-center">
                  <span className="text-base font-extrabold text-amber-300">{skill.key}</span>
                  <span className="px-0.5 text-[8px] leading-tight text-white">{skill.name}</span>
                  <span className="text-[8px] text-emerald-300">Lv{lvl}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Minimap */}
        <canvas
          id="g-minimap"
          width={120}
          height={84}
          className="absolute right-3 top-3 rounded border border-white/20 bg-black/40"
        />

        {/* Controls hint */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-center text-[10px] text-white/50">
          WASD move · Mouse aim · Click/Space attack · Q/E/R skills · Shift dodge · F interact · Esc abandon
        </div>
      </div>

      {/* Abandon button (pointer enabled) */}
      <button
        onClick={() => engineRef.current?.requestAbandon()}
        className="absolute right-3 top-24 rounded border border-white/30 bg-black/60 px-3 py-1 text-xs font-bold text-white/80 hover:bg-black/80"
      >
        Abandon (Esc)
      </button>
    </div>
  );
}
