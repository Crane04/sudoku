// src/components/Countdown/CountdownOverlay.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Full-screen 3-2-1-GO countdown that sits on top of the already-mounted
// BoardGrid. The board is visible but non-interactive beneath the frosted
// backdrop — players orient themselves before the race starts.
//
// Timer is CLIENT-SIDE intentionally. Both players start their local countdown
// the instant they receive game_start from the server. ±1 frame of jitter is
// imperceptible and avoids the complexity of a server-synced clock.
//
// Sequence:
//   mount → show 3 (ring drains over 1s) → show 2 → show 1
//   → show GO (particle burst, 600ms hold) → onComplete() fires
//   → GameScreen sets phase → 'in_progress' → overlay unmounts
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from "react";
import "./CountdownOverlay.css";

// ─── Types ────────────────────────────────────────────────────────────────────

// 3 | 2 | 1 | 0 (0 = "GO")
type CountStep = 3 | 2 | 1 | 0;

interface CountdownOverlayProps {
  onComplete: () => void;
  myName: string;
  opponentName: string;
  difficulty: string;
}

// ─── Particle data ────────────────────────────────────────────────────────────
// Computed once at module level — stable reference, no re-render cost.

interface Particle {
  id: number;
  angle: number;
  dist: number;
  size: number;
  color: string;
  delay: number;
}

const PALETTE = [
  "var(--color-amber-400)",
  "var(--color-amber-200)",
  "var(--color-steel-300)",
  "var(--color-text-primary)",
  "var(--color-success)",
];

const PARTICLES: Particle[] = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  angle: (360 / 28) * i + Math.random() * (360 / 28),
  dist: 70 + Math.random() * 60,
  size: 2.5 + Math.random() * 4,
  color: PALETTE[i % PALETTE.length],
  delay: Math.random() * 0.1,
}));

// ─── SVG ring — drains from full to empty over exactly 1 second ───────────────

// SVG circle: r=52, circumference = 2π×52 ≈ 326.7
const RING_CIRCUMFERENCE = 2 * Math.PI * 52;

interface RingProps {
  step: CountStep;
}

function Ring({ step }: RingProps) {
  if (step === 0) return null; // no ring on GO

  const colors: Record<Exclude<CountStep, 0>, string> = {
    3: "var(--color-amber-500)",
    2: "var(--color-steel-400)",
    1: "var(--color-error)",
  };

  return (
    <svg className="cd-ring" viewBox="0 0 120 120" aria-hidden="true">
      {/* Track */}
      <circle
        className="cd-ring__track"
        cx="60"
        cy="60"
        r="52"
        fill="none"
        stroke="rgba(74,100,140,0.2)"
        strokeWidth="2.5"
      />
      {/* Animated fill — key forces re-mount on each step so animation restarts */}
      <circle
        key={step}
        className="cd-ring__fill"
        cx="60"
        cy="60"
        r="52"
        fill="none"
        stroke={colors[step as Exclude<CountStep, 0>]}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={RING_CIRCUMFERENCE}
        strokeDashoffset="0"
        style={{ transform: "rotate(-90deg)", transformOrigin: "60px 60px" }}
      />
    </svg>
  );
}

// ─── Digit frame ──────────────────────────────────────────────────────────────

interface DigitFrameProps {
  step: CountStep;
  visible: boolean;
}

function DigitFrame({ step, visible }: DigitFrameProps) {
  const isGo = step === 0;

  return (
    <div
      className={[
        "cd-digit-frame",
        visible ? "cd-digit-frame--visible" : "cd-digit-frame--hidden",
        isGo ? "cd-digit-frame--go" : `cd-digit-frame--${step}`,
      ].join(" ")}
      aria-hidden="true"
    >
      <Ring step={step} />

      <span className="cd-digit-frame__value">{isGo ? "GO" : step}</span>

      {/* Particle burst — only on GO, only when visible */}
      {isGo &&
        visible &&
        PARTICLES.map((p) => (
          <span
            key={p.id}
            className="cd-particle"
            style={
              {
                "--cd-angle": `${p.angle}deg`,
                "--cd-dist": `${p.dist}px`,
                "--cd-size": `${p.size}px`,
                "--cd-color": p.color,
                "--cd-delay": `${p.delay}s`,
              } as React.CSSProperties
            }
          />
        ))}
    </div>
  );
}

// ─── Matchup banner ───────────────────────────────────────────────────────────

function MatchupBanner({
  myName,
  opponentName,
  difficulty,
}: {
  myName: string;
  opponentName: string;
  difficulty: string;
}) {
  return (
    <div
      className="cd-banner"
      aria-label={`${myName} versus ${opponentName}, ${difficulty} difficulty`}
    >
      <div className="cd-banner__player cd-banner__player--you">
        <span className="cd-banner__role">You</span>
        <span className="cd-banner__name">{myName}</span>
      </div>

      <div className="cd-banner__centre">
        <span className="cd-banner__vs">VS</span>
        <span className="cd-banner__diff">{difficulty}</span>
      </div>

      <div className="cd-banner__player cd-banner__player--opp">
        <span className="cd-banner__role">Opponent</span>
        <span className="cd-banner__name">{opponentName}</span>
      </div>
    </div>
  );
}

// ─── Hint text ────────────────────────────────────────────────────────────────
// One hint per count step so the label changes with each digit.

const HINTS: Record<CountStep, string> = {
  3: "Board locked — memorise the clues.",
  2: "Scan each 3×3 box for naked singles.",
  1: "First to 81 cells wins. Go fast.",
  0: "",
};

// ─── CountdownOverlay ─────────────────────────────────────────────────────────

export function CountdownOverlay({
  onComplete,
  myName,
  opponentName,
  difficulty,
}: CountdownOverlayProps) {
  const [step, setStep] = useState<CountStep>(3);
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(0);

  // Clear timer on unmount to prevent state updates after unmount
  useEffect(() => () => clearTimeout(timerRef.current), []);

  useEffect(() => {
    if (step > 1) {
      // 3 → 2 → 1  each after 1000 ms
      timerRef.current = setTimeout(
        () => setStep((s) => (s - 1) as CountStep),
        1000,
      );
    } else if (step === 1) {
      // 1 → GO  after 1000 ms
      timerRef.current = setTimeout(() => setStep(0), 1000);
    } else {
      // GO — hold 600 ms then trigger exit animation, then fire onComplete
      timerRef.current = setTimeout(() => {
        setExiting(true);
        // Fire onComplete after exit animation completes (~400 ms)
        setTimeout(onComplete, 420);
      }, 600);
    }
  }, [step, onComplete]);

  // aria-live announcement — screen reader calls out the count
  const announcement = step === 0 ? "Go!" : `${step}`;

  return (
    <div
      className={`cd-overlay ${exiting ? "cd-overlay--exiting" : ""}`}
      role="status"
      aria-live="assertive"
      aria-label={announcement}
    >
      {/* Frosted backdrop — board visible but non-interactive beneath */}
      <div className="cd-backdrop" aria-hidden="true" />

      {/* Per-step coloured spotlight */}
      <div
        className={`cd-spotlight cd-spotlight--step-${step}`}
        aria-hidden="true"
      />

      {/* Decorative vertical grid lines */}
      <div className="cd-grid-lines" aria-hidden="true">
        {Array.from({ length: 9 }, (_, i) => (
          <span key={i} className="cd-grid-line" />
        ))}
      </div>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="cd-content">
        <MatchupBanner
          myName={myName}
          opponentName={opponentName}
          difficulty={difficulty}
        />

        {/* Digit stage — all 4 frames present, CSS controls visibility */}
        <div className="cd-stage" aria-hidden="true">
          {([3, 2, 1, 0] as CountStep[]).map((s) => (
            <DigitFrame key={s} step={s} visible={step === s} />
          ))}
        </div>

        {/* Hint — keyed by step so entering animation fires on change */}
        {step > 0 && (
          <p className="cd-hint" key={step} aria-hidden="true">
            {HINTS[step]}
          </p>
        )}
      </div>
    </div>
  );
}
