interface HomeScreenProps {
  onPublic: () => void;
  onPrivateCreate: () => void;
  onPrivateJoin: () => void;
}

export function HomeScreen({
  onPublic,
  onPrivateCreate,
  onPrivateJoin,
}: HomeScreenProps) {
  return (
    <div>
      {/* Hero */}
      <header className="home-hero">
        <p className="home-hero__eyebrow">Competitive · Real-time</p>
        <h1 className="home-hero__wordmark" aria-label="Sudo Race">
          <span className="home-hero__sudo">SUDO</span>
          <span className="home-hero__race">RACE</span>
        </h1>
        <p className="home-hero__tagline">
          Two solvers. One board. First to finish wins.
        </p>
      </header>

      {/* Mode cards */}
      <nav className="mode-cards" aria-label="Game modes">
        <button className="mode-card mode-card--public" onClick={onPublic}>
          <span className="mode-card__glyph" aria-hidden="true">
            ⚔
          </span>
          <div className="mode-card__body">
            <span className="mode-card__title">Quick Match</span>
            <span className="mode-card__desc">
              Join the public queue and get matched instantly
            </span>
          </div>
          <span className="mode-card__arrow" aria-hidden="true">
            →
          </span>
        </button>

        <button
          className="mode-card mode-card--private"
          onClick={onPrivateCreate}
        >
          <span className="mode-card__glyph" aria-hidden="true">
            ♟
          </span>
          <div className="mode-card__body">
            <span className="mode-card__title">Private Duel</span>
            <span className="mode-card__desc">
              Create a room and challenge a specific opponent
            </span>
          </div>
          <span className="mode-card__arrow" aria-hidden="true">
            →
          </span>
        </button>

        <button className="mode-card mode-card--join" onClick={onPrivateJoin}>
          <span className="mode-card__glyph" aria-hidden="true">
            ⌘
          </span>
          <div className="mode-card__body">
            <span className="mode-card__title">Enter Room</span>
            <span className="mode-card__desc">
              Join a private duel with a 6-digit invite code
            </span>
          </div>
          <span className="mode-card__arrow" aria-hidden="true">
            →
          </span>
        </button>
      </nav>
    </div>
  );
}
