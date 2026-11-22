import type { Question } from "./questions";

export type RoomPhase =
  | "lobby"
  | "estimating"
  | "reveal"
  | "scoreboard"
  | "finished";

export type PublicPlayer = {
  id: string;
  name: string;
  score: number;
  connected: boolean;
  isHost: boolean;
  hasGuessed: boolean;
  guess?: number;
  distance?: number;
  isClosest?: boolean;
};

export type PublicQuestion = {
  id: string;
  category: string;
  prompt: string;
  unit: string;
  answer?: number;
};

export type PublicRoomState = {
  code: string;
  phase: RoomPhase;
  round: number;
  totalRounds: number;
  players: PublicPlayer[];
  question: PublicQuestion | null;
  youAreHost: boolean;
  yourPlayerId: string;
  waitingCount: number;
  closestNames: string[];
};

export type ClientToServerEvents = {
  create_room: (payload: { name: string }, ack?: (res: AckResult) => void) => void;
  join_room: (
    payload: { code: string; name: string },
    ack?: (res: AckResult) => void,
  ) => void;
  leave_room: () => void;
  start_game: () => void;
  submit_guess: (payload: { value: number }) => void;
  advance: () => void;
};

export type ServerToClientEvents = {
  room_state: (state: PublicRoomState) => void;
  error_message: (payload: { message: string }) => void;
};

export type AckResult =
  | { ok: true; code: string; playerId: string }
  | { ok: false; message: string };

export function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

export function pickQuestions(bank: Question[], count: number): Question[] {
  const copy = [...bank];
  shuffleInPlace(copy);
  return copy.slice(0, Math.min(count, copy.length));
}

export function formatAnswer(value: number, unit: string): string {
  const formatted = value.toLocaleString("en-US");
  return unit ? `${formatted} ${unit}` : formatted;
}

export function formatCode(code: string): string {
  return code.toUpperCase().split("").join(" ");
}

export function describeClosest(names: string[]): string {
  if (names.length === 0) return "No guesses this round.";
  if (names.length === 1) return `${names[0]} was closest.`;
  if (names.length === 2) return `${names[0]} and ${names[1]} tied for closest.`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]} tied for closest.`;
}
