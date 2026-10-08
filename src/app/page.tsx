import GameProvider from "@/components/GameProvider";
import AppShell from "@/components/AppShell";

export default function Page() {
  return (
    <GameProvider>
      <AppShell />
    </GameProvider>
  );
}
