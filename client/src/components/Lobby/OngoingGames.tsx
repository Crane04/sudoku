// src/components/Lobby/OngoingGames.tsx
import React from "react";
import { useOngoingGames } from "../../hooks/useOngoingGames";
import { useGameStore } from "../../store/gameStore";
import { socketActions } from "../../socket/socketClient";
import { Username } from "../Username/Username";
import "./OngoingGames.css";
import { useUsername } from "../../hooks/usePersistedUsername";

export function OngoingGames() {
  const { games, loading, error } = useOngoingGames();
  const { username, isLoading } = useUsername();

  console.log("fetching ongoing games", games);

  if (loading) {
    return (
      <div className="ongoing-loading">
        <div className="pulse-rig">
          <div className="pulse-ring pulse-ring--1"></div>
          <div className="pulse-ring pulse-ring--2"></div>
          <div className="pulse-ring pulse-ring--3"></div>
          <div className="pulse-core">⌛</div>
        </div>
        <span className="ongoing-loading__text">Resuming duels...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ongoing-error">
        <span className="badge badge--error">⚠</span>
        <span>{error}</span>
      </div>
    );
  }

  if (games.length === 0) {
    return null;
  }

  return (
    <div className="ongoing-games">
      <div className="ongoing-games__header">
        <h3 className="ongoing-games__title">
          <span className="badge badge--amber">⚔️</span>
          Active Duels
        </h3>
        <div className="divider"></div>
      </div>

      <div className="games-list">
        {games.map((game, index) => (
          <div
            key={game.roomId}
            className="game-card"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="game-card__header">
              <span
                className={`badge badge--${game.status === "in_progress" ? "amber" : "steel"}`}
              >
                {game.status === "in_progress"
                  ? "⚔️ IN PROGRESS"
                  : "⏳ WAITING"}
              </span>
              <span className="game-card__difficulty">
                <span className="badge badge--steel">
                  {game.difficulty.toUpperCase()}
                </span>
              </span>
            </div>

            <div className="game-card__players">
              <div className="game-player game-player--opp">
                <div className="game-player__label">
                  <span className="status-dot status-dot--amber"></span>
                  YOU
                </div>
                <span className="game-player__name">{username}</span>

                <span className="game-player__progress">
                  {game.myProgress}/81
                </span>
              </div>

              <div className="game-vs">VS</div>

              <div className="game-player game-player--opp">
                <div className="game-player__label">OPPONENT</div>
                {game.opponent ? (
                  <>
                    <span className="game-player__name">
                      {game.opponent.displayName}
                    </span>
                    <span className="game-player__progress">
                      {game.opponentProgress}/81
                    </span>
                  </>
                ) : (
                  <span className="game-player__waiting">
                    Waiting for opponent...
                  </span>
                )}
              </div>
            </div>

            <div className="game-card__footer">
              <button
                className="btn btn--primary btn--full"
                onClick={() => socketActions.rejoinRoom(game.roomId, username)}
              >
                <span>⚔️ REJOIN DUEL</span>
                <span className="btn__arrow">→</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
