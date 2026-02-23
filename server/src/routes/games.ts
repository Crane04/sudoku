// server/src/routes/games.ts
import { Router } from "express";
import { GameStateManager } from "../services/GameStateManager";

function gamesRouter(gsm: GameStateManager) {
  const router = Router();

  router.get("/player/:playerId/ongoing", (req, res) => {
    const { playerId } = req.params;
    const games = gsm.getPlayerGames(playerId);
    res.json({ success: true, games });
  });

  return router;
}

export default gamesRouter;
