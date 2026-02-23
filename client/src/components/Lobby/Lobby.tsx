// src/components/Lobby/Lobby.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useGameStore, selectPhase, selectError } from "../../store/gameStore";
import { connectSocket, socketActions } from "../../socket/socketClient";
import { getOrCreateUsername } from "../../utils/usernameGenerator"; // Add this import
import type { Difficulty } from "../../types/game";

import { HomeScreen } from "./HomeScreen";
import { PublicQueueScreen } from "./PublicQueueScreen";
import { QueueWaitingScreen } from "./QueueWaitingScreen";
import { CreateRoomScreen } from "./CreateRoomScreen";
import { RoomCodeScreen } from "./RoomCodeScreen";
import { JoinRoomScreen } from "./JoinRoomScreen";

import "./Lobby.css";
import { OngoingGames } from "./OngoingGames";

export type LobbyMode =
  | "home"
  | "public"
  | "queue_waiting"
  | "private_create"
  | "room_code"
  | "join";

// ─── Background digit grid ────────────────────────────────────────────────────

function BackgroundGrid() {
  const digits = Array.from(
    { length: 108 },
    (_, i) => ((i * 7 + i * i) % 9) + 1,
  );
  return (
    <div className="lobby-bg" aria-hidden="true">
      {digits.map((d, i) => (
        <span
          key={i}
          className="lobby-bg__digit"
          style={{
            animationDelay: `${(i * 0.17) % 9}s`,
            animationDuration: `${9 + (i % 6)}s`,
            opacity: 0.025 + (i % 5) * 0.009,
          }}
        >
          {d}
        </span>
      ))}
    </div>
  );
}

// ─── Lobby ────────────────────────────────────────────────────────────────────

// src/components/Lobby/Lobby.tsx
export function Lobby() {
  const phase = useGameStore(selectPhase);
  const error = useGameStore(selectError);
  const roomId = useGameStore((s) => s.roomId);
  const setError = useGameStore((s) => s.setError);

  const [mode, setMode] = useState<LobbyMode>("home");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");

  // Initialize username from localStorage/generator
  const [username, setUsername] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    connectSocket();

    // Load or generate username when component mounts
    const savedUsername = getOrCreateUsername();
    setUsername(savedUsername);
    setIsLoading(false);
  }, []);

  // Server phase → local mode
  useEffect(() => {
    if (phase === "queued") setMode("queue_waiting");
    if (phase === "waiting") setMode("room_code");
    if (phase === "idle") setMode("home");
  }, [phase]);

  const goTo = useCallback(
    (m: LobbyMode) => {
      setError(null);
      setMode(m);
    },
    [setError],
  );

  // ALL HOOKS MUST BE DEFINED BEFORE ANY CONDITIONAL RETURNS
  const handleJoinPublic = useCallback(
    () => socketActions.joinPublicQueue(username, difficulty),
    [username, difficulty],
  );

  const handleCreatePrivate = useCallback(
    () => socketActions.createPrivateRoom(username, difficulty),
    [username, difficulty],
  );

  const handleJoinPrivate = useCallback(
    (code: string) => socketActions.joinPrivateRoom(username, code),
    [username],
  );

  const handleCancel = useCallback(() => {
    socketActions.leaveRoom();
    goTo("home");
  }, [goTo]);

  // NOW we can have conditional returns
  if (isLoading) {
    return (
      <div className="lobby">
        <BackgroundGrid />
        <main className="lobby__content">
          <div className="loading-spinner">Generating your username...</div>
        </main>
      </div>
    );
  }

  const renderScreen = () => {
    switch (mode) {
      case "home":
        return (
          <HomeScreen
            // displayName={username}
            onPublic={() => goTo("public")}
            onPrivateCreate={() => goTo("private_create")}
            onPrivateJoin={() => goTo("join")}
          />
        );
      case "public":
        return (
          <PublicQueueScreen
            displayName={username}
            difficulty={difficulty}
            error={error}
            onDifficultyChange={setDifficulty}
            onSubmit={handleJoinPublic}
            onBack={() => goTo("home")}
          />
        );
      case "queue_waiting":
        return (
          <QueueWaitingScreen
            displayName={username}
            difficulty={difficulty}
            onCancel={handleCancel}
          />
        );
      case "private_create":
        return (
          <CreateRoomScreen
            displayName={username}
            difficulty={difficulty}
            error={error}
            onDifficultyChange={setDifficulty}
            onSubmit={handleCreatePrivate}
            onBack={() => goTo("home")}
          />
        );
      case "room_code":
        return (
          <RoomCodeScreen code={roomId ?? "------"} onCancel={handleCancel} />
        );
      case "join":
        return (
          <JoinRoomScreen
            displayName={username}
            error={error}
            onSubmit={handleJoinPrivate}
            onBack={() => goTo("home")}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="lobby">
      <BackgroundGrid />
      <main className="lobby__content" key={mode}>
        {renderScreen()}
      </main>
      <OngoingGames />
      <footer className="lobby__footer" aria-hidden="true">
        SUDO·RACE &nbsp;·&nbsp; Real-time Competitive Sudoku
      </footer>
    </div>
  );
}
