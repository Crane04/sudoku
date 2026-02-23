// src/components/Lobby/JoinRoomScreen.tsx

import React, { useState, useRef, useCallback } from "react";
import type { GameError } from "../../types/game";

interface JoinRoomScreenProps {
  displayName: string;
  error: GameError | null;
  onSubmit: (code: string) => void;
  onBack: () => void;
}

const CODE_LENGTH = 6;

export function JoinRoomScreen({
  displayName,
  error,
  onSubmit,
  onBack,
}: JoinRoomScreenProps) {
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const isCodeError =
    error?.code === "INVALID_CODE" || error?.code === "ROOM_FULL";
  const fullCode = digits.join("");
  const canSubmit =
    fullCode.length === CODE_LENGTH && displayName.trim().length > 0;

  // ── Single digit change ──────────────────────────────────────────────────
  const handleChange = useCallback((index: number, raw: string) => {
    const ch = raw
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = ch;
      return next;
    });
    // Auto-advance to next cell
    if (ch && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }, []);

  // ── Keyboard navigation ──────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace") {
        if (digits[index]) {
          // Clear current cell
          setDigits((prev) => {
            const n = [...prev];
            n[index] = "";
            return n;
          });
        } else if (index > 0) {
          // Move back and clear previous
          inputRefs.current[index - 1]?.focus();
          setDigits((prev) => {
            const n = [...prev];
            n[index - 1] = "";
            return n;
          });
        }
        e.preventDefault();
      }
      if (e.key === "ArrowLeft" && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
      if (e.key === "ArrowRight" && index < CODE_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
      if (e.key === "Enter" && canSubmit) {
        onSubmit(fullCode);
      }
    },
    [digits, canSubmit, fullCode, onSubmit],
  );

  // ── Paste: accept full 6-char paste anywhere in the inputs ───────────────
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, CODE_LENGTH);
    if (pasted.length === CODE_LENGTH) {
      setDigits(pasted.split(""));
      inputRefs.current[CODE_LENGTH - 1]?.focus();
    }
  }, []);

  return (
    <div className="lobby-panel">
      <div className="lobby-panel__header">
        <button className="back-btn" onClick={onBack} aria-label="Back to home">
          Back
        </button>
        <h2 className="lobby-panel__title">Enter Room</h2>
        <p className="lobby-panel__desc">
          Type or paste the 6-character code from your opponent.
        </p>
      </div>

      {/* Name */}
      <div className="form-field">
        <label className="field-label" htmlFor="jr-name">
          Your Handle
        </label>
        <div className="name-input-wrap">
          <input
            id="jr-name"
            className="text-input"
            type="text"
            value={displayName}
            maxLength={20}
            placeholder="Anonymous"
            autoComplete="off"
            spellCheck={false}
          />
          <span className="name-input__counter" aria-hidden="true">
            {displayName.length}/20
          </span>
        </div>
      </div>

      {/* 6-digit code entry */}
      <div className="form-field">
        <span className="field-label">Room Code</span>
        <div
          className="code-inputs"
          onPaste={handlePaste}
          role="group"
          aria-label="6-digit room code"
        >
          {digits.map((ch, i) => (
            <React.Fragment key={i}>
              {/* Visual separator between digit 3 and 4 */}
              {i === 3 && (
                <span className="code-sep" aria-hidden="true">
                  –
                </span>
              )}
              <input
                ref={(el) => {
                  inputRefs.current[i] = el;
                }}
                className={[
                  "code-input",
                  ch ? "code-input--filled" : "",
                  isCodeError ? "code-input--error" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                type="text"
                inputMode="text"
                maxLength={1}
                value={ch}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                aria-label={`Code digit ${i + 1}`}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </React.Fragment>
          ))}
        </div>

        {isCodeError && (
          <p className="field-error" role="alert">
            {error!.message}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="form-actions">
        <button
          className="btn btn--primary btn--full btn--lg"
          disabled={!canSubmit}
          onClick={() => canSubmit && onSubmit(fullCode)}
        >
          Enter Room
        </button>
      </div>
    </div>
  );
}
