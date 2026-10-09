"use client";

import { useEffect, useRef } from "react";
import type { ClassId } from "@/lib/types";

/**
 * Decorative pixel-art village scene shown atop the hub.
 * Pure canvas — houses, NPCs, fountain, dungeon gate, day-stable night sky.
 */
const W = 640;
const H = 150;

const NPC_COLORS: Record<ClassId, string> = {
  swordsman: "#e2e8f0",
  mage: "#c4b5fd",
  archer: "#bbf7d0",
};

export default function VillageCanvas({ classId }: { classId: ClassId }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let t = 0;

    // stable star field
    const stars: { x: number; y: number; s: number }[] = [];
    let seed = 42;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < 60; i++)
      stars.push({ x: rnd() * W, y: rnd() * 70, s: rnd() > 0.85 ? 2 : 1 });

    const house = (
      x: number,
      base: string,
      roof: string,
      w = 52,
      h = 34,
      glow = true
    ) => {
      ctx.fillStyle = base;
      ctx.fillRect(x, H - 26 - h, w, h);
      // roof
      ctx.fillStyle = roof;
      ctx.beginPath();
      ctx.moveTo(x - 4, H - 26 - h);
      ctx.lineTo(x + w / 2, H - 26 - h - 20);
      ctx.lineTo(x + w + 4, H - 26 - h);
      ctx.fill();
      // door
      ctx.fillStyle = "#292524";
      ctx.fillRect(x + w / 2 - 5, H - 26 - 14, 10, 14);
      // glowing window
      if (glow) {
        const fl = 0.7 + 0.3 * Math.sin(t * 2.2 + x);
        ctx.fillStyle = `rgba(253,224,71,${fl.toFixed(2)})`;
        ctx.fillRect(x + 8, H - 26 - h + 8, 8, 8);
        ctx.fillRect(x + w - 16, H - 26 - h + 8, 8, 8);
      }
    };

    const npcx = (
      x: number,
      body: string,
      accent: string,
      bob: number,
      hat?: "hood" | "wizard" | "none" | "helmet"
    ) => {
      const y = H - 26 - 10 + Math.sin(t * 2 + x) * bob;
      ctx.fillStyle = "#1f2937";
      ctx.fillRect(x - 3, y + 8, 3, 5);
      ctx.fillRect(x + 1, y + 8, 3, 5);
      ctx.fillStyle = body;
      ctx.fillRect(x - 4, y, 8, 9);
      ctx.fillStyle = accent;
      ctx.fillRect(x - 4, y, 8, 2);
      ctx.fillStyle = "#f1c27d";
      ctx.fillRect(x - 3, y - 7, 6, 6);
      if (hat === "wizard") {
        ctx.fillStyle = accent;
        ctx.fillRect(x - 5, y - 9, 10, 3);
        ctx.fillRect(x - 2, y - 14, 4, 5);
      } else if (hat === "hood") {
        ctx.fillStyle = accent;
        ctx.fillRect(x - 4, y - 8, 8, 4);
      } else if (hat === "helmet") {
        ctx.fillStyle = accent;
        ctx.fillRect(x - 4, y - 9, 8, 4);
        ctx.fillRect(x + 2, y - 12, 2, 3);
      }
    };

    const draw = () => {
      t += 0.016;
      ctx.imageSmoothingEnabled = false;
      // sky
      const g = ctx.createLinearGradient(0, 0, 0, H - 20);
      g.addColorStop(0, "#0b1026");
      g.addColorStop(1, "#1c2447");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H - 20);
      // stars
      for (const s of stars) {
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.4 + s.x));
        ctx.fillStyle = `rgba(226,232,240,${(tw * 0.8).toFixed(2)})`;
        ctx.fillRect(s.x, s.y, s.s, s.s);
      }
      // moon
      ctx.fillStyle = "#e2e8f0";
      ctx.beginPath();
      ctx.arc(W - 60, 30, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1c2447";
      ctx.beginPath();
      ctx.arc(W - 54, 26, 12, 0, Math.PI * 2);
      ctx.fill();

      // ground
      ctx.fillStyle = "#17301f";
      ctx.fillRect(0, H - 26, W, 26);
      ctx.fillStyle = "#1f4028";
      for (let x = 0; x < W; x += 16)
        if ((x / 16) % 2 === 0) ctx.fillRect(x, H - 26, 16, 4);
      // path
      ctx.fillStyle = "#57534e";
      ctx.fillRect(0, H - 16, W, 10);
      ctx.fillStyle = "#44403c";
      for (let x = 8; x < W; x += 26) ctx.fillRect(x, H - 13, 12, 2);

      // buildings
      house(30, "#7c5a2e", "#9a3412", 56, 36); // blacksmith
      house(120, "#4c5b78", "#1e3a5f", 48, 30); // wizard tower base
      // tower
      ctx.fillStyle = "#3b4a63";
      ctx.fillRect(128, H - 26 - 58, 32, 28);
      ctx.fillStyle = "#1e3a5f";
      ctx.beginPath();
      ctx.moveTo(124, H - 26 - 58);
      ctx.lineTo(144, H - 26 - 76);
      ctx.lineTo(164, H - 26 - 58);
      ctx.fill();
      house(220, "#78350f", "#a16207", 54, 32); // inn
      // inn sign
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(246, H - 26 - 20, 14, 8);
      ctx.fillStyle = "#78350f";
      ctx.fillRect(249, H - 26 - 18, 8, 4);

      // fountain (village heart)
      const fx = 350;
      ctx.fillStyle = "#57534e";
      ctx.fillRect(fx - 22, H - 26 - 12, 44, 12);
      ctx.fillStyle = "#64748b";
      ctx.fillRect(fx - 22, H - 26 - 14, 44, 4);
      ctx.fillStyle = "#7dd3fc";
      ctx.fillRect(fx - 18, H - 26 - 11, 36, 3);
      // splashing water
      const spl = Math.sin(t * 6) * 2;
      ctx.fillStyle = "#bae6fd";
      ctx.fillRect(fx - 2, H - 26 - 20 - spl, 4, 8);
      ctx.fillRect(fx - 10, H - 26 - 15 - Math.abs(spl), 3, 4);
      ctx.fillRect(fx + 8, H - 26 - 15 - Math.abs(spl), 3, 4);

      // dungeon gate (right side)
      const gx = W - 110;
      ctx.fillStyle = "#374151";
      ctx.fillRect(gx, H - 26 - 52, 14, 52);
      ctx.fillRect(gx + 56, H - 26 - 52, 14, 52);
      ctx.fillRect(gx - 4, H - 26 - 60, 82, 10);
      const glow = 0.5 + 0.4 * Math.sin(t * 2.6);
      ctx.fillStyle = `rgba(168,85,247,${(0.35 + 0.3 * glow).toFixed(2)})`;
      ctx.fillRect(gx + 14, H - 26 - 50, 42, 50);
      ctx.strokeStyle = "#a855f7";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(gx + 14, H - 26 - 50, 42, 50);
      ctx.fillStyle = "#0b1026";
      ctx.font = "bold 7px monospace";
      ctx.textAlign = "center";
      ctx.fillText("DUNGEON", gx + 35, H - 26 - 64);

      // NPCs
      npcx(70, "#7c2d12", "#fbbf24", 1, "none"); // blacksmith (apron)
      npcx(150, "#4c1d95", "#a855f7", 1.2, "wizard"); // skill master
      npcx(255, "#f8fafc", "#94a3b8", 1, "none"); // healer
      npcx(330, "#78350f", "#fde68a", 1, "hood"); // innkeeper
      // hero (player class) standing before fountain
      const heroBody = NPC_COLORS[classId];
      npcx(
        fx + 30,
        heroBody,
        "#f59e0b",
        1.4,
        classId === "mage" ? "wizard" : classId === "swordsman" ? "helmet" : "hood"
      );

      // foreground grass tufts
      ctx.fillStyle = "#2f5d3a";
      for (let x = 6; x < W; x += 34) {
        ctx.fillRect(x, H - 5, 2, 4);
        ctx.fillRect(x + 3, H - 6, 2, 5);
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [classId]);

  return (
    <div className="pixel-panel mb-5 overflow-hidden rounded-2xl">
      <canvas
        ref={ref}
        width={W}
        height={H}
        className="block w-full"
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
}
