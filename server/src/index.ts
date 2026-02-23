// server/src/index.ts
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "./types/Board";
import { GameStateManager } from "./services/GameStateManager";
import { MatchmakingService } from "./services/MatchmakingService";
import { applyGameMiddleware } from "./socket/middleware/gameMiddleware";
import { registerGameHandlers } from "./socket/handlers/gameHandlers";
import { registerRoomHandlers } from "./socket/handlers/roomHandlers";
import router from "./routes/games";
import cors from "cors";
// import { connectDB } from "./config/db";

async function bootstrap() {
  //   await connectDB();

  const app = express();
  const httpServer = createServer(app);

  const corsOptions = {
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  };

  app.use(cors(corsOptions));

  const io = new Server<ClientToServerEvents, ServerToClientEvents>(
    httpServer,
    {
      cors: {
        origin: process.env.CLIENT_URL ?? "http://localhost:5173",
        methods: ["GET", "POST"],
      },
      // Prevent clients from sending massive payloads through socket events
      maxHttpBufferSize: 1e4, // 10 KB ceiling
    },
  );

  // ── Shared singletons ───────────────────────────────────────────────────────
  const gsm = new GameStateManager();
  const mm = new MatchmakingService(io, gsm); // Pass gsm so MM registers rooms centrally

  // ── Middleware (runs before every connection's first event) ─────────────────
  applyGameMiddleware(io, gsm);

  // ── Per-connection handler registration ────────────────────────────────────
  io.on("connection", (socket) => {
    console.log(`[+] Socket connected: ${socket.id}`);

    registerRoomHandlers(io, socket, mm);
    registerGameHandlers(io, socket, gsm);

    socket.on("disconnect", (reason) => {
      console.log(`[-] Socket disconnected: ${socket.id} — ${reason}`);
    });
  });

  app.use("", router(gsm));

  const PORT = process.env.PORT ?? 3001;
  httpServer.listen(PORT, () => {
    console.log(`Sudo-Race server running on port ${PORT}`);
  });
}

bootstrap().catch(console.error);
