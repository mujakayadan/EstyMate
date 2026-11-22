import { io, type Socket } from "socket.io-client";
import type {
  AckResult,
  ClientToServerEvents,
  PublicRoomState,
  ServerToClientEvents,
} from "../src/lib/game";

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const URL = process.env.SMOKE_SOCKET_URL || "http://127.0.0.1:43128";

function waitForPhase(
  socket: GameSocket,
  phase: PublicRoomState["phase"],
  timeoutMs = 5000,
): Promise<PublicRoomState> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off("room_state", onState);
      reject(new Error(`Timed out waiting for phase ${phase}`));
    }, timeoutMs);

    const onState = (state: PublicRoomState) => {
      if (state.phase === phase) {
        clearTimeout(timer);
        socket.off("room_state", onState);
        resolve(state);
      }
    };

    socket.on("room_state", onState);
  });
}

function waitForPlayerCount(
  socket: GameSocket,
  count: number,
  timeoutMs = 5000,
): Promise<PublicRoomState> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off("room_state", onState);
      reject(new Error(`Timed out waiting for ${count} players`));
    }, timeoutMs);

    const onState = (state: PublicRoomState) => {
      if (state.players.filter((p) => p.connected).length >= count) {
        clearTimeout(timer);
        socket.off("room_state", onState);
        resolve(state);
      }
    };

    socket.on("room_state", onState);
  });
}

function emitAck(
  socket: GameSocket,
  event: "create_room" | "join_room",
  payload: { name: string; code?: string },
): Promise<AckResult> {
  return new Promise((resolve) => {
    if (event === "create_room") {
      socket.emit("create_room", { name: payload.name }, resolve);
      return;
    }
    socket.emit(
      "join_room",
      { name: payload.name, code: payload.code || "" },
      resolve,
    );
  });
}

async function main() {
  const host = io(URL, { transports: ["websocket"] }) as GameSocket;
  const guest = io(URL, { transports: ["websocket"] }) as GameSocket;

  await Promise.all([
    new Promise<void>((resolve) => host.on("connect", () => resolve())),
    new Promise<void>((resolve) => guest.on("connect", () => resolve())),
  ]);

  const hostLobby = waitForPlayerCount(host, 1);
  const created = await emitAck(host, "create_room", { name: "Ada" });
  if (!created.ok) throw new Error(created.message);
  await hostLobby;
  console.log("host lobby", created.code);

  const bothIn = Promise.all([
    waitForPlayerCount(host, 2),
    waitForPlayerCount(guest, 2),
  ]);
  const joined = await emitAck(guest, "join_room", {
    name: "Bo",
    code: created.code,
  });
  if (!joined.ok) throw new Error(joined.message);
  const [lobby] = await bothIn;
  console.log(
    "joined",
    lobby.code,
    lobby.players.map((p) => p.name).join(","),
  );

  const estimating = waitForPhase(host, "estimating");
  host.emit("start_game");
  const started = await estimating;
  if (!started.question) throw new Error("Missing question");
  console.log("question", started.question.prompt);

  const reveal = waitForPhase(host, "reveal");
  host.emit("submit_guess", { value: 50 });
  guest.emit("submit_guess", { value: 80 });
  const revealed = await reveal;
  console.log("reveal", revealed.closestNames.join(", "), "closest");

  host.disconnect();
  guest.disconnect();
  console.log("SMOKE OK");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
