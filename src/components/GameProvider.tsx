"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { SaveData, RunResult, ClassId } from "@/lib/types";

type Screen = "login" | "select" | "hub" | "play";

interface GameContextValue {
  ready: boolean;
  user: { id: number; username: string } | null;
  save: SaveData | null;
  savesList: SaveData[];
  screen: Screen;
  playMap: number;
  notice: { text: string; kind: "ok" | "err" } | null;
  register: (u: string, p: string) => Promise<void>;
  login: (u: string, p: string) => Promise<void>;
  logout: () => Promise<void>;
  chooseClass: (c: ClassId) => Promise<void>;
  enterMap: (m: number) => void;
  applyRunResult: (result: RunResult) => Promise<void>;
  goHub: () => void;
  buyWeapon: (id: string) => Promise<void>;
  upgradeSkill: (id: string) => Promise<void>;
  equipWeapon: (id: string) => Promise<void>;
  setNotice: (t: string, kind?: "ok" | "err") => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}

async function fetchJson(url: string, opts?: RequestInit) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export default function GameProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<{ id: number; username: string } | null>(null);
  const [save, setSave] = useState<SaveData | null>(null);
  const [savesList, setSavesList] = useState<SaveData[]>([]);
  const [screen, setScreen] = useState<Screen>("login");
  const [playMap, setPlayMap] = useState(1);
  const [notice, setNoticeState] = useState<{ text: string; kind: "ok" | "err" } | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function setNotice(text: string, kind: "ok" | "err" = "ok") {
    setNoticeState({ text, kind });
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNoticeState(null), 2600);
  }

  async function refreshSaves() {
    try {
      const data = await fetchJson("/api/saves");
      setSavesList(data.saves ?? []);
    } catch {
      setSavesList([]);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchJson("/api/auth/me");
        if (data.user) {
          setUser(data.user);
          setScreen("select");
          await refreshSaves();
        }
      } catch {
        /* not logged in */
      } finally {
        setReady(true);
      }
    })();
  }, []);

  async function register(username: string, password: string) {
    const data = await fetchJson("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    setUser(data.user);
    setScreen("select");
    setSavesList([]);
  }

  async function login(username: string, password: string) {
    const data = await fetchJson("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    setUser(data.user);
    setScreen("select");
    await refreshSaves();
  }

  async function logout() {
    await fetchJson("/api/auth/logout", { method: "POST" });
    setUser(null);
    setSave(null);
    setSavesList([]);
    setScreen("login");
  }

  async function chooseClass(c: ClassId) {
    const data = await fetchJson(`/api/saves/${c}`);
    setSave(data.save);
    setScreen("hub");
  }

  function enterMap(m: number) {
    setPlayMap(m);
    setScreen("play");
  }

  async function persist(next: SaveData) {
    const data = await fetchJson(`/api/saves/${next.classId}`, {
      method: "PUT",
      body: JSON.stringify(next),
    });
    setSave(data.save);
    return data.save as SaveData;
  }

  async function applyRunResult(result: RunResult) {
    if (save) {
      const next: SaveData = { ...save };
      next.gold = Math.max(0, save.gold + result.goldEarned);
      next.resources = Math.max(0, save.resources + result.resourcesEarned);
      next.level = result.level;
      next.xp = result.xp;
      if (result.bossDefeated) {
        if (!next.defeatedBosses.includes(playMap))
          next.defeatedBosses = [...next.defeatedBosses, playMap];
        next.unlockedMaps = Math.max(next.unlockedMaps, playMap + 1);
      }
      for (const w of result.weaponRewards) {
        if (!next.ownedWeapons.includes(w)) next.ownedWeapons = [...next.ownedWeapons, w];
      }
      await persist(next);
      await refreshSaves();
    }
  }

  function goHub() {
    setScreen("hub");
  }

  async function buyWeapon(id: string) {
    const data = await fetchJson("/api/shop/buy", {
      method: "POST",
      body: JSON.stringify({ weaponId: id }),
    });
    setSave(data.save);
    setNotice(`${id} purchased!`, "ok");
    await refreshSaves();
  }

  async function upgradeSkill(id: string) {
    const data = await fetchJson("/api/skills/upgrade", {
      method: "POST",
      body: JSON.stringify({ skillId: id }),
    });
    setSave(data.save);
    setNotice("Skill upgraded!", "ok");
    await refreshSaves();
  }

  async function equipWeapon(id: string) {
    if (!save) return;
    const next = { ...save, equippedWeapon: id };
    const server = await persist(next);
    setNotice("Weapon equipped.", "ok");
    await refreshSaves();
  }

  const value: GameContextValue = {
    ready,
    user,
    save,
    savesList,
    screen,
    playMap,
    notice,
    register,
    login,
    logout,
    chooseClass,
    enterMap,
    applyRunResult,
    goHub,
    buyWeapon,
    upgradeSkill,
    equipWeapon,
    setNotice,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
