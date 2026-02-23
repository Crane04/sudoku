// src/components/Lobby/RoomCodeScreen.tsx

import  { useState, useEffect, useCallback } from "react";

interface RoomCodeScreenProps {
  code: string;
  onCancel: () => void;
}

const DOT_FRAMES = ["·", "··", "···"] as const;

export function RoomCodeScreen({ code, onCancel }: RoomCodeScreenProps) {
  const [copied, setCopied] = useState(false);
  const [dotFrame, setDotFrame] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setDotFrame((f) => (f + 1) % 3), 900);
    return () => clearInterval(t);
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Fallback for older browsers / non-secure contexts
      const el = document.createElement("textarea");
      el.value = code;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }, [code]);

  return (
    <div className="room-code-screen">
      {/* Header */}
      <div>
        <p className="room-code-screen__eyebrow">Private Room</p>
        <h2 className="room-code-screen__title">Share this code</h2>
        <p className="room-code-screen__desc">
          Your opponent enters this to join your game.
        </p>
      </div>

      {/* 6 individual digit tiles */}
      <div
        className="room-code"
        role="text"
        aria-label={`Room code: ${code.split("").join(" ")}`}
      >
        {code.split("").map((ch, i) => (
          <span key={i} className="room-code__digit">
            {ch}
          </span>
        ))}
      </div>

      {/* Copy button */}
      <button
        className={`btn btn--ghost ${copied ? "btn--copied" : ""}`}
        onClick={handleCopy}
        aria-live="polite"
        aria-label={copied ? "Code copied to clipboard" : "Copy room code"}
      >
        <span aria-hidden="true">{copied ? "✓" : "⎘"}</span>
        {copied ? "Copied!" : "Copy Code"}
      </button>

      {/* Waiting status */}
      <div className="room-waiting-status" aria-live="polite">
        <span className="status-dot status-dot--green" aria-hidden="true" />
        <span>Waiting for opponent{DOT_FRAMES[dotFrame]}</span>
      </div>

      {/* Cancel */}
      <button className="btn btn--danger btn--sm" onClick={onCancel}>
        Cancel &amp; Discard Room
      </button>
    </div>
  );
}
