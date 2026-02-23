import { useUsername } from "../../hooks/usePersistedUsername";
import "./Username.css";

interface UsernameProps {
  // No username prop needed!
  size?: "small" | "medium" | "large";
  showEmoji?: boolean;
  showLabel?: boolean;
  label?: string;
  variant?: "display" | "badge" | "compact";
  className?: string;
}

export function Username({
  size = "medium",
  showEmoji = true,
  showLabel = false,
  label = "Your Handle",
  variant = "display",
  className = "",
}: UsernameProps) {
  // Get username directly from hook
  const { username, isLoading } = useUsername();

  // Split username into text and emoji parts
  const parts = username.split(" ");
  const possibleEmoji = parts[parts.length - 1];
  const hasEmoji = /[\u{1F300}-\u{1F6FF}\u{2600}-\u{26FF}]/u.test(
    possibleEmoji,
  );

  const usernameText = hasEmoji ? parts.slice(0, -1).join(" ") : username;
  const emoji = hasEmoji ? possibleEmoji : "🎮";

  const variantClass = `username--${variant}`;
  const sizeClass = `username--${size}`;

  if (isLoading) {
    return (
      <div className={`username ${variantClass} ${sizeClass} ${className}`}>
        {showLabel && <span className="username__label">{label}</span>}
        <div className="username__content">
          <span className="username__emoji">⏳</span>
          <span className="username__text">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`username ${variantClass} ${sizeClass} ${className}`}>
      {showLabel && <span className="username__label">{label}</span>}
      <div className="username__content">
        {showEmoji && (
          <span className="username__emoji" aria-hidden="true">
            {emoji}
          </span>
        )}
        <span className="username__text">{usernameText}</span>
      </div>
    </div>
  );
}

// Compact version for headers and small spaces
export function UsernameBadge({ className = "" }: { className?: string }) {
  return (
    <Username
      variant="badge"
      size="small"
      showLabel={false}
      className={className}
    />
  );
}

// Display version for forms/screens
export function UsernameDisplay({
  label,
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <Username
      variant="display"
      size="large"
      showLabel={true}
      label={label}
      className={className}
    />
  );
}
