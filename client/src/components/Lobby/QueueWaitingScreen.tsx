// src/components/Lobby/QueueWaitingScreen.tsx

import  { useState, useEffect } from "react";
import type { Difficulty } from "../../types/game";
import { DIFFICULTY_LABELS } from "../../types/game";

interface QueueWaitingScreenProps {
  displayName: string;
  difficulty: Difficulty;
  onCancel: () => void;
}

// Cycling ellipsis — 3 frames so layout doesn't jump
const DOT_FRAMES = ["·", "··", "···"] as const;

export function QueueWaitingScreen({
  displayName,
  difficulty,
  onCancel,
}: QueueWaitingScreenProps) {
  const [elapsed, setElapsed] = useState(0);
  const [dotFrame, setDotFrame] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setElapsed((e) => e + 1);
      setDotFrame((f) => (f + 1) % 3);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="queue-screen">
      {/* Pulse rings */}
      <div className="pulse-rig" aria-hidden="true">
        <span className="pulse-ring pulse-ring--1" />
        <span className="pulse-ring pulse-ring--2" />
        <span className="pulse-ring pulse-ring--3" />
        <span className="pulse-core">⚔</span>
      </div>

      {/* Headline */}
      <h2 className="queue-screen__headline" aria-live="polite">
        Seeking opponent{DOT_FRAMES[dotFrame]}
      </h2>

      {/* VS card */}
      <div
        className="queue-matchup"
        aria-label={`${displayName} versus unknown opponent`}
      >
        <div className="queue-player queue-player--you">
          <span className="queue-player__tag">{displayName}</span>
          <span className="queue-player__role">You</span>
        </div>

        <span className="queue-vs" aria-hidden="true">
          VS
        </span>

        <div className="queue-player queue-player--opp">
          <span className="queue-player__tag">???</span>
          <span className="queue-player__role">Opponent</span>
        </div>
      </div>

      {/* Difficulty + timer */}
      <div className="queue-meta">
        <span className="badge badge--amber">
          {DIFFICULTY_LABELS[difficulty]}
        </span>
        <span
          className="queue-timer"
          aria-live="polite"
          aria-label={`Time elapsed: ${mm} minutes ${ss} seconds`}
        >
          {mm}:{ss}
        </span>
      </div>

      {/* Cancel */}
      <button className="btn btn--ghost btn--sm" onClick={onCancel}>
        Leave Queue
      </button>
    </div>
  );
}
