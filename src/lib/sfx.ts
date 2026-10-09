/**
 * Tiny WebAudio synth for retro game SFX — no audio assets required.
 * All sounds are short oscillator/noise blips in the classic 8-bit style.
 */

export type SfxName =
  | "swing"
  | "arrow"
  | "orb"
  | "hit"
  | "crit"
  | "skill"
  | "dodge"
  | "chest"
  | "coin"
  | "pickup"
  | "levelup"
  | "hurt"
  | "death"
  | "boss"
  | "phase"
  | "buy"
  | "ui"
  | "gate"
  | "secret"
  | "victory"
  | "crack";

class Sfx {
  private ctx: AudioContext | null = null;
  muted = false;

  private ensure(): AudioContext | null {
    if (this.muted) return null;
    try {
      if (!this.ctx) {
        const AC = window.AudioContext ?? (window as any).webkitAudioContext;
        if (!AC) return null;
        this.ctx = new AC();
      }
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return this.ctx;
    } catch {
      return null;
    }
  }

  /** Call from a user gesture to unlock audio. */
  unlock() {
    this.ensure();
  }

  setMuted(m: boolean) {
    this.muted = m;
  }

  private tone(
    freq: number,
    dur: number,
    opts: {
      type?: OscillatorType;
      vol?: number;
      slide?: number;
      delay?: number;
    } = {}
  ) {
    const ctx = this.ensure();
    if (!ctx) return;
    const { type = "square", vol = 0.12, slide = 0, delay = 0 } = opts;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide !== 0)
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, freq + slide),
        t0 + dur
      );
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private noise(
    dur: number,
    opts: { vol?: number; hp?: number; lp?: number; delay?: number } = {}
  ) {
    const ctx = this.ensure();
    if (!ctx) return;
    const { vol = 0.1, hp = 0, lp = 20000, delay = 0 } = opts;
    const t0 = ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let node: AudioNode = src;
    if (hp > 0) {
      const f = ctx.createBiquadFilter();
      f.type = "highpass";
      f.frequency.value = hp;
      node.connect(f);
      node = f;
    }
    if (lp < 20000) {
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = lp;
      node.connect(f);
      node = f;
    }
    node.connect(gain).connect(ctx.destination);
    src.start(t0);
  }

  play(name: SfxName) {
    if (!this.ensure()) return;
    switch (name) {
      case "swing":
        this.noise(0.09, { vol: 0.08, hp: 1200 });
        break;
      case "arrow":
        this.noise(0.12, { vol: 0.09, lp: 3500 });
        this.tone(500, 0.08, { type: "triangle", vol: 0.05, slide: -260 });
        break;
      case "orb":
        this.tone(180, 0.16, { type: "sine", vol: 0.14, slide: -80 });
        this.noise(0.1, { vol: 0.04, lp: 900 });
        break;
      case "hit":
        this.tone(220, 0.08, { type: "square", vol: 0.1, slide: -140 });
        this.noise(0.05, { vol: 0.08, lp: 2400 });
        break;
      case "crit":
        this.tone(660, 0.07, { type: "square", vol: 0.11 });
        this.tone(880, 0.1, { type: "square", vol: 0.11, delay: 0.05 });
        this.noise(0.07, { vol: 0.1, hp: 800 });
        break;
      case "skill":
        this.tone(440, 0.09, { type: "triangle", vol: 0.12, slide: 220 });
        this.tone(660, 0.12, { type: "triangle", vol: 0.1, delay: 0.06 });
        break;
      case "dodge":
        this.noise(0.14, { vol: 0.07, lp: 1600 });
        this.tone(300, 0.1, { type: "sine", vol: 0.05, slide: 240 });
        break;
      case "chest":
        this.tone(523, 0.09, { vol: 0.12 });
        this.tone(659, 0.09, { vol: 0.12, delay: 0.08 });
        this.tone(784, 0.16, { vol: 0.12, delay: 0.16 });
        break;
      case "coin":
        this.tone(1046, 0.06, { vol: 0.09 });
        this.tone(1568, 0.12, { vol: 0.09, delay: 0.05 });
        break;
      case "pickup":
        this.tone(600, 0.07, { type: "triangle", vol: 0.1, slide: 300 });
        break;
      case "levelup":
        [523, 659, 784, 1046].forEach((f, i) =>
          this.tone(f, 0.12, { vol: 0.11, delay: i * 0.08 })
        );
        break;
      case "hurt":
        this.tone(200, 0.14, { type: "sawtooth", vol: 0.12, slide: -120 });
        break;
      case "death":
        this.tone(300, 0.9, { type: "sawtooth", vol: 0.14, slide: -260 });
        this.noise(0.7, { vol: 0.06, lp: 700, delay: 0.1 });
        break;
      case "boss":
        this.tone(60, 0.8, { type: "sawtooth", vol: 0.16, slide: 30 });
        this.noise(0.7, { vol: 0.1, lp: 500 });
        break;
      case "phase":
        this.tone(150, 0.5, { type: "sawtooth", vol: 0.13, slide: 220 });
        break;
      case "buy":
        this.tone(880, 0.05, { vol: 0.1 });
        this.tone(1320, 0.09, { vol: 0.1, delay: 0.05 });
        this.noise(0.04, { vol: 0.06, hp: 2000 });
        break;
      case "ui":
        this.tone(900, 0.04, { type: "square", vol: 0.06 });
        break;
      case "gate":
        this.tone(80, 1.0, { type: "sawtooth", vol: 0.16, slide: 40 });
        [392, 523, 659].forEach((f, i) =>
          this.tone(f, 0.2, { type: "triangle", vol: 0.09, delay: 0.4 + i * 0.1 })
        );
        break;
      case "secret":
        [784, 988, 1175, 1568].forEach((f, i) =>
          this.tone(f, 0.14, { type: "triangle", vol: 0.1, delay: i * 0.07 })
        );
        break;
      case "victory":
        [523, 659, 784, 1046, 1318].forEach((f, i) =>
          this.tone(f, 0.18, { vol: 0.12, delay: i * 0.11 })
        );
        break;
      case "crack":
        this.noise(0.12, { vol: 0.12, lp: 1400 });
        this.tone(140, 0.1, { type: "square", vol: 0.08, slide: -60 });
        break;
    }
  }
}

/** Shared singleton (client-side only). */
export const sfx = new Sfx();
