import { createServer } from "node:http";
import { Server } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "../src/lib/game";
import { RoomManager } from "./rooms";

const SOCKET_PORT = Number(process.env.SOCKET_PORT || 43128);
const HOST = process.env.HOST || "0.0.0.0";
const WEB_ORIGIN = process.env.WEB_ORIGIN || `http://127.0.0.1:${process.env.PORT || 43127}`;

export function startSocketServer() {
  const rooms = new RoomManager();
  const httpServer = createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Esty Mate socket server");
  });

  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: [
        WEB_ORIGIN,
        "http://127.0.0.1:43127",
        "http://localhost:43127",
      ],
      methods: ["GET", "POST"],
    },
  });

  const broadcast = (code: string) => {
    for (const socket of io.sockets.sockets.values()) {
      const state = rooms.getPublicState(code, socket.id);
      if (state) {
        socket.emit("room_state", state);
      }
    }
  };

  io.on("connection", (socket) => {
    socket.on("create_room", (payload, ack) => {
      try {
        const result = rooms.createRoom(socket.id, payload.name);
        socket.join(result.code);
        broadcast(result.code);
        ack?.({ ok: true, code: result.code, playerId: result.playerId });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not create room.";
        ack?.({ ok: false, message });
        socket.emit("error_message", { message });
      }
    });

    socket.on("join_room", (payload, ack) => {
      try {
        const result = rooms.joinRoom(socket.id, payload.code, payload.name);
        socket.join(result.code);
        broadcast(result.code);
        ack?.({ ok: true, code: result.code, playerId: result.playerId });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not join room.";
        ack?.({ ok: false, message });
        socket.emit("error_message", { message });
      }
    });

    socket.on("leave_room", () => {
      const code = rooms.leaveSocket(socket.id);
      if (code) broadcast(code);
    });

    socket.on("start_game", () => {
      try {
        const code = rooms.startGame(socket.id);
        broadcast(code);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not start.";
        socket.emit("error_message", { message });
      }
    });

    socket.on("submit_guess", (payload) => {
      try {
        const code = rooms.submitGuess(socket.id, payload.value);
        broadcast(code);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not submit guess.";
        socket.emit("error_message", { message });
      }
    });

    socket.on("advance", () => {
      try {
        const code = rooms.advance(socket.id);
        broadcast(code);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not advance.";
        socket.emit("error_message", { message });
      }
    });

    socket.on("disconnect", () => {
      const code = rooms.leaveSocket(socket.id);
      if (code) broadcast(code);
    });
  });

  httpServer.listen(SOCKET_PORT, HOST, () => {
    console.log(`Socket.io listening on http://${HOST}:${SOCKET_PORT}`);
  });

  return httpServer;
}

const isDirectRun =
  typeof process.argv[1] === "string" &&
  process.argv[1].replace(/\\/g, "/").endsWith("/server/socket.ts");

if (isDirectRun) {
  startSocketServer();
}
