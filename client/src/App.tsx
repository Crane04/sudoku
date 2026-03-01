import { useEffect } from "react";
import { useGameStore, selectPhase } from "./store/gameStore";
import { bindSocketEvents } from "./socket/socketEvents";
import { Lobby } from "./components/Lobby/Lobby";
import { GameScreen } from "./components/Game/GameScreen";
import type { GamePhase } from "./types/game";

const LOBBY_PHASES = new Set<GamePhase>([
  "idle",
  "queued",
  "waiting",
  "disconnected",
]);

const GAME_PHASES = new Set<GamePhase>(["countdown", "in_progress", "victory"]);

export default function App() {
  const phase = useGameStore(selectPhase);

  useEffect(() => {
    const unbind = bindSocketEvents();
    return unbind;
  }, []);

  const showLobby = LOBBY_PHASES.has(phase);
  const showGame = GAME_PHASES.has(phase);

  return (
    <>
      {showLobby && (
        <div key="lobby" className="page-enter">
          <Lobby />
        </div>
      )}

      {showGame && (
        <div key="game" className="page-enter">
          <GameScreen />
        </div>
      )}
    </>
  );
}
