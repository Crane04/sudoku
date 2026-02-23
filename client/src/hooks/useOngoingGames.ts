// src/hooks/useOngoingGames.ts
import { useState, useEffect } from "react";
import { useUsername } from "./usePersistedUsername";
import BASE_URL from "../constants/server";

interface OngoingGame {
  roomId: string;
  opponent?: {
    id: string;
    displayName: string;
    completedCells: number;
  };
  status: "waiting" | "countdown" | "in_progress" | "finished";
  difficulty: "easy" | "medium" | "hard";
  myProgress: number;
  opponentProgress: number;
  updatedAt: number;
}

export function useOngoingGames() {
  const { username, isLoading } = useUsername();
  const [games, setGames] = useState<OngoingGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username) {
      setLoading(false);
      return;
    }

    const fetchGames = async () => {
      try {
        const response = await fetch(`${BASE_URL}/player/${username}/ongoing`);
        const data = await response.json();

        if (data.success) {
          setGames(data.games);
        } else {
          setError(data.error);
        }
      } catch (err) {
        setError("Failed to fetch games");
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, [isLoading, username]);

  return { games, loading, error };
}
