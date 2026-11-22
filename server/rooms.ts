import {
  pickQuestions,
  type PublicPlayer,
  type PublicQuestion,
  type PublicRoomState,
  type RoomPhase,
} from "../src/lib/game";
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  QUESTION_BANK,
  ROUNDS_PER_MATCH,
  type Question,
} from "../src/lib/questions";

type Player = {
  id: string;
  socketId: string;
  name: string;
  score: number;
  connected: boolean;
  isHost: boolean;
  guess: number | null;
};

type Room = {
  code: string;
  phase: RoomPhase;
  hostId: string;
  players: Map<string, Player>;
  questions: Question[];
  roundIndex: number;
  closestIds: Set<string>;
};

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(length = 4): string {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

function makePlayerId(): string {
  return `p_${Math.random().toString(36).slice(2, 10)}`;
}

export class RoomManager {
  private rooms = new Map<string, Room>();
  private socketIndex = new Map<string, { code: string; playerId: string }>();

  createRoom(socketId: string, name: string): { code: string; playerId: string } {
    const trimmed = name.trim().slice(0, 24);
    if (!trimmed) {
      throw new Error("Enter a display name.");
    }

    let code = randomCode();
    while (this.rooms.has(code)) {
      code = randomCode();
    }

    const playerId = makePlayerId();
    const player: Player = {
      id: playerId,
      socketId,
      name: trimmed,
      score: 0,
      connected: true,
      isHost: true,
      guess: null,
    };

    const room: Room = {
      code,
      phase: "lobby",
      hostId: playerId,
      players: new Map([[playerId, player]]),
      questions: [],
      roundIndex: 0,
      closestIds: new Set(),
    };

    this.rooms.set(code, room);
    this.socketIndex.set(socketId, { code, playerId });
    return { code, playerId };
  }

  joinRoom(
    socketId: string,
    codeRaw: string,
    name: string,
  ): { code: string; playerId: string } {
    const code = codeRaw.trim().toUpperCase();
    const trimmed = name.trim().slice(0, 24);
    if (!trimmed) {
      throw new Error("Enter a display name.");
    }
    if (!/^[A-Z0-9]{4}$/.test(code)) {
      throw new Error("Room codes are 4 characters.");
    }

    const room = this.rooms.get(code);
    if (!room) {
      throw new Error("Room not found.");
    }
    if (room.phase !== "lobby") {
      throw new Error("That match already started.");
    }

    const connected = [...room.players.values()].filter((p) => p.connected);
    if (connected.length >= MAX_PLAYERS) {
      throw new Error(`Rooms hold up to ${MAX_PLAYERS} players.`);
    }

    const playerId = makePlayerId();
    room.players.set(playerId, {
      id: playerId,
      socketId,
      name: trimmed,
      score: 0,
      connected: true,
      isHost: false,
      guess: null,
    });
    this.socketIndex.set(socketId, { code, playerId });
    return { code, playerId };
  }

  leaveSocket(socketId: string): string | null {
    const ref = this.socketIndex.get(socketId);
    if (!ref) return null;
    this.socketIndex.delete(socketId);

    const room = this.rooms.get(ref.code);
    if (!room) return null;

    const player = room.players.get(ref.playerId);
    if (!player) return ref.code;

    player.connected = false;

    if (room.phase === "lobby") {
      room.players.delete(ref.playerId);
      if (player.isHost) {
        const nextHost = [...room.players.values()].find((p) => p.connected);
        if (nextHost) {
          nextHost.isHost = true;
          room.hostId = nextHost.id;
        }
      }
      if ([...room.players.values()].every((p) => !p.connected) || room.players.size === 0) {
        this.rooms.delete(ref.code);
        return null;
      }
      return ref.code;
    }

    if ([...room.players.values()].every((p) => !p.connected)) {
      this.rooms.delete(ref.code);
      return null;
    }

    if (player.isHost) {
      const nextHost = [...room.players.values()].find(
        (p) => p.connected && p.id !== player.id,
      );
      if (nextHost) {
        player.isHost = false;
        nextHost.isHost = true;
        room.hostId = nextHost.id;
      }
    }

    return ref.code;
  }

  startGame(socketId: string): string {
    const { room } = this.requireHost(socketId);
    if (room.phase !== "lobby") {
      throw new Error("Game already started.");
    }
    const ready = [...room.players.values()].filter((p) => p.connected);
    if (ready.length < MIN_PLAYERS) {
      throw new Error(`Need at least ${MIN_PLAYERS} players.`);
    }

    room.questions = pickQuestions(QUESTION_BANK, ROUNDS_PER_MATCH);
    room.roundIndex = 0;
    room.closestIds = new Set();
    for (const p of room.players.values()) {
      p.score = 0;
      p.guess = null;
    }
    room.phase = "estimating";
    return room.code;
  }

  submitGuess(socketId: string, value: number): string {
    const { room, player } = this.requirePlayer(socketId);
    if (room.phase !== "estimating") {
      throw new Error("Guessing is closed.");
    }
    if (!Number.isFinite(value)) {
      throw new Error("Enter a number.");
    }
    if (player.guess !== null) {
      throw new Error("Guess already locked in.");
    }

    player.guess = Math.round(value);

    const active = [...room.players.values()].filter((p) => p.connected);
    if (active.every((p) => p.guess !== null)) {
      this.scoreRound(room);
      room.phase = "reveal";
    }

    return room.code;
  }

  advance(socketId: string): string {
    const { room } = this.requireHost(socketId);

    if (room.phase === "estimating") {
      const active = [...room.players.values()].filter((p) => p.connected);
      if (!active.some((p) => p.guess !== null)) {
        throw new Error("Wait for at least one guess.");
      }
      this.scoreRound(room);
      room.phase = "reveal";
      return room.code;
    }

    if (room.phase === "reveal") {
      room.phase = "scoreboard";
      return room.code;
    }

    if (room.phase === "scoreboard") {
      if (room.roundIndex + 1 >= room.questions.length) {
        room.phase = "finished";
        return room.code;
      }
      room.roundIndex += 1;
      room.closestIds = new Set();
      for (const p of room.players.values()) {
        p.guess = null;
      }
      room.phase = "estimating";
      return room.code;
    }

    throw new Error("Nothing to advance.");
  }

  getCodeForSocket(socketId: string): string | null {
    return this.socketIndex.get(socketId)?.code ?? null;
  }

  getPublicState(code: string, viewerSocketId: string): PublicRoomState | null {
    const room = this.rooms.get(code);
    if (!room) return null;

    const viewer = this.socketIndex.get(viewerSocketId);
    const yourPlayerId = viewer?.code === code ? viewer.playerId : "";
    const youAreHost = yourPlayerId === room.hostId;
    const question = this.publicQuestion(room);
    const players = this.publicPlayers(room);

    const waitingCount =
      room.phase === "estimating"
        ? players.filter((p) => p.connected && !p.hasGuessed).length
        : 0;

    const closestNames = players
      .filter((p) => p.isClosest)
      .map((p) => p.name);

    return {
      code: room.code,
      phase: room.phase,
      round: room.roundIndex + 1,
      totalRounds: room.questions.length || ROUNDS_PER_MATCH,
      players,
      question,
      youAreHost,
      yourPlayerId,
      waitingCount,
      closestNames,
    };
  }

  private scoreRound(room: Room) {
    const question = room.questions[room.roundIndex];
    const active = [...room.players.values()].filter(
      (p) => p.connected && p.guess !== null,
    );
    if (!question || active.length === 0) {
      room.closestIds = new Set();
      return;
    }

    let best = Number.POSITIVE_INFINITY;
    for (const p of active) {
      const distance = Math.abs((p.guess as number) - question.answer);
      if (distance < best) best = distance;
    }

    room.closestIds = new Set();
    for (const p of active) {
      const distance = Math.abs((p.guess as number) - question.answer);
      if (distance === best) {
        room.closestIds.add(p.id);
        p.score += 1;
      }
    }
  }

  private publicQuestion(room: Room): PublicQuestion | null {
    if (room.phase === "lobby" || room.questions.length === 0) return null;
    const q = room.questions[room.roundIndex];
    if (!q) return null;

    const revealAnswer =
      room.phase === "reveal" ||
      room.phase === "scoreboard" ||
      room.phase === "finished";

    return {
      id: q.id,
      category: q.category,
      prompt: q.prompt,
      unit: q.unit,
      answer: revealAnswer ? q.answer : undefined,
    };
  }

  private publicPlayers(room: Room): PublicPlayer[] {
    const question = room.questions[room.roundIndex];
    const reveal =
      room.phase === "reveal" ||
      room.phase === "scoreboard" ||
      room.phase === "finished";

    return [...room.players.values()]
      .map((p) => {
        const distance =
          reveal && p.guess !== null && question
            ? Math.abs(p.guess - question.answer)
            : undefined;
        return {
          id: p.id,
          name: p.name,
          score: p.score,
          connected: p.connected,
          isHost: p.isHost,
          hasGuessed: p.guess !== null,
          guess: reveal ? (p.guess ?? undefined) : undefined,
          distance,
          isClosest: reveal ? room.closestIds.has(p.id) : undefined,
        };
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.name.localeCompare(b.name);
      });
  }

  private requirePlayer(socketId: string): { room: Room; player: Player } {
    const ref = this.socketIndex.get(socketId);
    if (!ref) throw new Error("Join a room first.");
    const room = this.rooms.get(ref.code);
    if (!room) throw new Error("Room not found.");
    const player = room.players.get(ref.playerId);
    if (!player || !player.connected) throw new Error("You are not in this room.");
    return { room, player };
  }

  private requireHost(socketId: string): { room: Room; player: Player } {
    const ctx = this.requirePlayer(socketId);
    if (!ctx.player.isHost) throw new Error("Only the host can do that.");
    return ctx;
  }
}

