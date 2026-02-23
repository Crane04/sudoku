// src/components/Game/NumberPad.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Touch-friendly number pad for mobile play.
// Hidden on desktop via CSS (keyboard handles input there).
// Calls onDigit(n) for 1–9, onErase() for backspace/clear.
// ─────────────────────────────────────────────────────────────────────────────

import { memo } from "react";

interface NumberPadProps {
  onDigit: (n: number) => void;
  onErase: () => void;
  disabled: boolean;
}

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

function NumberPadComponent({ onDigit, onErase, disabled }: NumberPadProps) {
  return (
    <div
      className="numpad"
      role="group"
      aria-label="Number input pad"
      aria-disabled={disabled}
    >
      {DIGITS.map((n) => (
        <button
          key={n}
          className="numpad__btn"
          onClick={() => !disabled && onDigit(n)}
          disabled={disabled}
          aria-label={`Enter ${n}`}
          // Prevent focus stealing from the board on touch
          onMouseDown={(e) => e.preventDefault()}
        >
          {n}
        </button>
      ))}

      <button
        className="numpad__btn numpad__btn--erase"
        onClick={() => !disabled && onErase()}
        disabled={disabled}
        aria-label="Erase cell"
        onMouseDown={(e) => e.preventDefault()}
      >
        ⌫
      </button>
    </div>
  );
}

export const NumberPad = memo(NumberPadComponent);
NumberPad.displayName = "NumberPad";
