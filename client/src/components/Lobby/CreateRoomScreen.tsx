// src/components/Lobby/CreateRoomScreen.tsx

import type { Difficulty, GameError } from "../../types/game";
import { DIFFICULTY_LABELS, DIFFICULTY_CLUES } from "../../types/game";

interface CreateRoomScreenProps {
  displayName: string;
  difficulty: Difficulty;
  error: GameError | null;
  onDifficultyChange: (d: Difficulty) => void;
  onSubmit: () => void;
  onBack: () => void;
}

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

export function CreateRoomScreen({
  displayName,
  difficulty,
  error,
  onDifficultyChange,
  onSubmit,
  onBack,
}: CreateRoomScreenProps) {
  const canSubmit = displayName.trim().length > 0;

  return (
    <div className="lobby-panel">
      <div className="lobby-panel__header">
        <button className="back-btn" onClick={onBack} aria-label="Back to home">
          Back
        </button>
        <h2 className="lobby-panel__title">Private Duel</h2>
        <p className="lobby-panel__desc">
          Create a room and share the 6-digit code with your opponent.
        </p>
      </div>

      {/* Name */}
      <div className="form-field">
        <label className="field-label" htmlFor="cr-name">
          Your Handle
        </label>
        <div className="name-input-wrap">
          <input
            id="cr-name"
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

      {/* Difficulty */}
      <fieldset>
        <legend className="field-label">Difficulty</legend>
        <div className="diff-group">
          {DIFFICULTIES.map((d) => (
            <label
              key={d}
              className={`diff-option ${difficulty === d ? "diff-option--active" : ""}`}
            >
              <input
                type="radio"
                name="cr-difficulty"
                value={d}
                checked={difficulty === d}
                onChange={() => onDifficultyChange(d)}
                className="diff-option__input"
              />
              <span className="diff-option__label">{DIFFICULTY_LABELS[d]}</span>
              <span className="diff-option__sub">{DIFFICULTY_CLUES[d]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {error && (
        <p className="field-error" role="alert">
          {error.message}
        </p>
      )}

      <div className="form-actions">
        <button
          className="btn btn--primary btn--full btn--lg"
          disabled={!canSubmit}
          onClick={onSubmit}
        >
          Create Room
        </button>
      </div>
    </div>
  );
}
