import { io, type Socket } from "socket.io-client";
import type {
  AckResult,
  ClientToServerEvents,
  PublicRoomState,
  ServerToClientEvents,
} from "../src/lib/game";

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const URL = process.env.SMOKE_SOCKET_URL || "http://127.0.0.1:43128";
const DEFAULT_TIMEOUT_MS = 5000;

function waitForRoomState(
  socket: GameSocket,
  predicate: (state: PublicRoomState) => boolean,
  timeoutMessage: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<PublicRoomState> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off("room_state", onState);
      reject(new Error(timeoutMessage));
    }, timeoutMs);

    const onState = (state: PublicRoomState) => {
      if (predicate(state)) {
        clearTimeout(timer);
        socket.off("room_state", onState);
        resolve(state);
      }
    };

    socket.on("room_state", onState);
  });
}

function waitForPhase(
  socket: GameSocket,
  phase: PublicRoomState["phase"],
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<PublicRoomState> {
  return waitForRoomState(
    socket,
    (state) => state.phase === phase,
    `Timed out waiting for phase ${phase}`,
    timeoutMs,
  );
}

function waitForPlayerCount(
  socket: GameSocket,
  count: number,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<PublicRoomState> {
  return waitForRoomState(
    socket,
    (state) => state.players.filter((p) => p.connected).length >= count,
    `Timed out waiting for ${count} players`,
    timeoutMs,
  );
}

function emitAck(
  socket: GameSocket,
  event: "create_room" | "join_room",
  payload: { name: string; code?: string },
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<AckResult> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${event} ack timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    const onAck = (result: AckResult) => {
      clearTimeout(timer);
      resolve(result);
    };

    if (event === "create_room") {
      socket.emit("create_room", { name: payload.name }, onAck);
      return;
    }
    socket.emit(
      "join_room",
      { name: payload.name, code: payload.code || "" },
      onAck,
    );
  });
}

function connectOrFail(socket: GameSocket, label: string, timeoutMs = DEFAULT_TIMEOUT_MS) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off("connect", onConnect);
      socket.off("connect_error", onConnectError);
      reject(new Error(`${label} did not connect to ${URL} within ${timeoutMs}ms`));
    }, timeoutMs);

    const onConnect = () => {
      clearTimeout(timer);
      socket.off("connect_error", onConnectError);
      resolve();
    };

    const onConnectError = (error: Error) => {
      clearTimeout(timer);
      socket.off("connect", onConnect);
      reject(new Error(`${label} connect_error: ${error.message}`));
    };

    socket.once("connect", onConnect);
    socket.once("connect_error", onConnectError);
  });
}

async function main() {
  const host = io(URL, { transports: ["websocket"] }) as GameSocket;
  const guest = io(URL, { transports: ["websocket"] }) as GameSocket;

  await Promise.all([
    connectOrFail(host, "host"),
    connectOrFail(guest, "guest"),
  ]);

  const hostLobby = waitForPlayerCount(host, 1);
  const created = await emitAck(host, "create_room", { name: "Ada" });
  if (!created.ok) throw new Error(created.message);
  await hostLobby;

  const bothIn = Promise.all([
    waitForPlayerCount(host, 2),
    waitForPlayerCount(guest, 2),
  ]);
  const joined = await emitAck(guest, "join_room", {
    name: "Bo",
    code: created.code,
  });
  if (!joined.ok) throw new Error(joined.message);
  await bothIn;

  const estimating = waitForPhase(host, "estimating");
  host.emit("start_game");
  const started = await estimating;
  if (!started.question) throw new Error("Missing question");

  const reveal = waitForPhase(host, "reveal");
  host.emit("submit_guess", { value: 50 });
  guest.emit("submit_guess", { value: 80 });
  await reveal;

  host.disconnect();
  guest.disconnect();
  console.log("SMOKE OK");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
