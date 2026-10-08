"use client";

import { useState } from "react";
import { useGame } from "../GameProvider";

export default function LoginScreen() {
  const { login, register } = useGame();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") await login(username, password);
      else await register(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md pixel-panel rounded-2xl p-8">
        <div className="mb-2 text-center">
          <h1 className="font-pixel text-2xl text-amber-300 animate-glow">AETHERFALL</h1>
          <p className="font-retro mt-2 text-lg text-slate-400">
            A pixel-art action RPG
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`pixel-btn rounded-md px-3 py-3 ${
              mode === "login" ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-300"
            }`}
          >
            LOGIN
          </button>
          <button
            onClick={() => {
              setMode("register");
              setError(null);
            }}
            className={`pixel-btn rounded-md px-3 py-3 ${
              mode === "register" ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-300"
            }`}
          >
            NEW HERO
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="font-pixel text-[0.6rem] text-slate-300">USERNAME</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="font-retro mt-1 w-full rounded-md border-2 border-slate-600 bg-slate-900/80 px-3 py-2 text-xl text-white outline-none focus:border-amber-400"
              placeholder="hero_name"
            />
          </div>
          <div>
            <label className="font-pixel text-[0.6rem] text-slate-300">PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="font-retro mt-1 w-full rounded-md border-2 border-slate-600 bg-slate-900/80 px-3 py-2 text-xl text-white outline-none focus:border-amber-400"
              placeholder="••••••"
            />
          </div>

          {error && (
            <p className="font-retro rounded-md border border-red-500/50 bg-red-500/10 px-3 py-2 text-lg text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="pixel-btn w-full rounded-md bg-amber-500 py-4 text-black hover:bg-amber-400"
          >
            {busy ? "..." : mode === "login" ? "ENTER" : "CREATE ACCOUNT"}
          </button>
        </form>

        <p className="font-retro mt-6 text-center text-base text-slate-500">
          Your heroes, loot and progress are saved to your account.
        </p>
      </div>
    </div>
  );
}
