"use client";

import { useGame } from "./GameProvider";
import LoginScreen from "./screens/LoginScreen";
import SelectScreen from "./screens/SelectScreen";
import HubScreen from "./screens/HubScreen";
import PlayScreen from "./screens/PlayScreen";

export default function AppShell() {
  const { ready, screen, save } = useGame();

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center">
        <p className="font-pixel text-sm text-slate-400 animate-pulse">LOADING…</p>
      </div>
    );
  }

  switch (screen) {
    case "login":
      return <LoginScreen />;
    case "select":
      return <SelectScreen />;
    case "play":
      return <PlayScreen />;
    case "hub":
    default:
      return save ? <HubScreen /> : <SelectScreen />;
  }
}
