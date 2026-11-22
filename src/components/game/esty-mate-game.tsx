"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  describeClosest,
  formatAnswer,
  formatCode,
  type ClientToServerEvents,
  type PublicRoomState,
  type ServerToClientEvents,
} from "@/lib/game";
import { MIN_PLAYERS } from "@/lib/questions";
import { getSocketUrl } from "@/lib/socket-url";
import { cn } from "@/lib/utils";

type Screen = "home" | "host" | "join" | "room";
type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

function useInviteCodeFromUrl(): string {
  return useMemo(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    return (params.get("room") || "").toUpperCase();
  }, []);
}

export function EstyMateGame() {
  const inviteFromUrl = useInviteCodeFromUrl();
  const [screen, setScreen] = useState<Screen>(inviteFromUrl ? "join" : "home");
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState(inviteFromUrl);
  const [guess, setGuess] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<PublicRoomState | null>(null);
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<GameSocket | null>(null);

  useEffect(() => {
    const instance: GameSocket = io(getSocketUrl(), {
      autoConnect: true,
      transports: ["websocket", "polling"],
    });
    socketRef.current = instance;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    instance.on("connect", onConnect);
    instance.on("disconnect", onDisconnect);

    instance.on("room_state", (next) => {
      setState(next);
      setScreen("room");
      setError(null);
    });

    instance.on("error_message", ({ message }) => {
      setError(message);
    });

    return () => {
      instance.off("connect", onConnect);
      instance.off("disconnect", onDisconnect);
      instance.disconnect();
      socketRef.current = null;
    };
  }, []);

  const connectedCount = state?.players.filter((p) => p.connected).length ?? 0;
  const you = state?.players.find((p) => p.id === state.yourPlayerId);
  const canStart =
    !!state?.youAreHost &&
    state.phase === "lobby" &&
    connectedCount >= MIN_PLAYERS;

  const submitCreate = () => {
    const socket = socketRef.current;
    if (!socket || !connected || busy) return;
    setBusy(true);
    setError(null);
    socket.emit("create_room", { name }, (res) => {
      setBusy(false);
      if (!res?.ok) {
        setError(res?.message || "Could not create room.");
        return;
      }
      const url = new URL(window.location.href);
      url.searchParams.set("room", res.code);
      window.history.replaceState({}, "", url.toString());
    });
  };

  const submitJoin = () => {
    const socket = socketRef.current;
    if (!socket || !connected || busy) return;
    setBusy(true);
    setError(null);
    socket.emit("join_room", { code: joinCode, name }, (res) => {
      setBusy(false);
      if (!res?.ok) {
        setError(res?.message || "Could not join room.");
        return;
      }
      const url = new URL(window.location.href);
      url.searchParams.set("room", res.code);
      window.history.replaceState({}, "", url.toString());
    });
  };

  const leave = () => {
    socketRef.current?.emit("leave_room");
    setState(null);
    setScreen("home");
    setGuess("");
    setError(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("room");
    window.history.replaceState({}, "", url.pathname);
  };

  const lockGuess = () => {
    const socket = socketRef.current;
    if (!socket) return;
    const value = Number(guess);
    if (!Number.isFinite(value)) {
      setError("Enter a number.");
      return;
    }
    socket.emit("submit_guess", { value });
    setGuess("");
  };

  const copyInvite = async () => {
    if (!state) return;
    const url = new URL(window.location.href);
    url.searchParams.set("room", state.code);
    try {
      await navigator.clipboard.writeText(url.toString());
    } catch {
      setError("Could not copy invite link.");
    }
  };

  return (
    <div className="relative min-h-dvh overflow-hidden text-[var(--ink)]">
      <div aria-hidden className="atmosphere">
        <span className="orb orb-a" />
        <span className="orb orb-b" />
        <span className="orb orb-c" />
        <span className="grid-wash" />
      </div>

      <main className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-10 pt-8">
        {error ? (
          <p className="mb-4 rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
            {error}
          </p>
        ) : null}

        {screen === "home" ? (
          <section className="flex flex-1 flex-col justify-center gap-8 animate-rise">
            <div className="space-y-4 text-center">
              <h1 className="font-display text-6xl leading-none tracking-tight text-[var(--brand)] sm:text-7xl">
                Esty Mate
              </h1>
              <p className="font-display text-xl text-[var(--brand)]/85">
                Closest guess wins — from every device.
              </p>
              <p className="mx-auto max-w-sm text-sm leading-relaxed text-[var(--ink)]/70">
                Host a room, share the code or link, and everyone estimates the
                same number live. Nearest answer takes the point.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Button size="lg" onClick={() => setScreen("host")}>
                Host a room
              </Button>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => setScreen("join")}
              >
                Join with code
              </Button>
            </div>
            <p className="text-center text-sm text-[var(--ink)]/55">
              2–6 players · live online rooms
            </p>
          </section>
        ) : null}

        {screen === "host" || screen === "join" ? (
          <section className="flex flex-1 flex-col justify-center gap-6 animate-rise">
            <div className="space-y-2">
              <p className="font-display text-sm text-[var(--brand)]">Esty Mate</p>
              <h2 className="font-display text-4xl text-[var(--brand)]">
                {screen === "host" ? "Host a room" : "Join a room"}
              </h2>
              <p className="text-sm text-[var(--ink)]/65">
                {screen === "host"
                  ? "Pick a name. You’ll get a code to share."
                  : "Enter the invite code and your display name."}
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Display name</Label>
                <Input
                  id="name"
                  value={name}
                  maxLength={24}
                  placeholder="Ada"
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              {screen === "join" ? (
                <div className="space-y-2">
                  <Label htmlFor="code">Room code</Label>
                  <Input
                    id="code"
                    value={joinCode}
                    maxLength={4}
                    placeholder="D3PN"
                    className="uppercase tracking-[0.35em]"
                    onChange={(e) =>
                      setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                    }
                  />
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-3">
              <Button
                size="lg"
                disabled={busy || !name.trim() || (screen === "join" && joinCode.length !== 4)}
                onClick={screen === "host" ? submitCreate : submitJoin}
              >
                {screen === "host" ? "Create room" : "Join room"}
              </Button>
              <Button variant="ghost" onClick={() => setScreen("home")}>
                Back
              </Button>
            </div>
          </section>
        ) : null}

        {screen === "room" && state ? (
          <RoomView
            state={state}
            youName={you?.name}
            canStart={canStart}
            guess={guess}
            setGuess={setGuess}
            onStart={() => socketRef.current?.emit("start_game")}
            onAdvance={() => socketRef.current?.emit("advance")}
            onLockGuess={lockGuess}
            onCopyInvite={copyInvite}
            onLeave={leave}
          />
        ) : null}
      </main>
    </div>
  );
}

function RoomView({
  state,
  youName,
  canStart,
  guess,
  setGuess,
  onStart,
  onAdvance,
  onLockGuess,
  onCopyInvite,
  onLeave,
}: {
  state: PublicRoomState;
  youName?: string;
  canStart: boolean;
  guess: string;
  setGuess: (value: string) => void;
  onStart: () => void;
  onAdvance: () => void;
  onLockGuess: () => void;
  onCopyInvite: () => void;
  onLeave: () => void;
}) {
  const you = state.players.find((p) => p.id === state.yourPlayerId);

  if (state.phase === "lobby") {
    return (
      <section className="flex flex-1 flex-col gap-6 animate-rise">
        <header className="space-y-2">
          <p className="font-display text-sm text-[var(--brand)]">Esty Mate</p>
          <h2 className="font-display text-4xl text-[var(--brand)]">
            Room {state.code}
          </h2>
          <p className="text-sm text-[var(--ink)]/65">
            Share the code or link. Host starts when at least {MIN_PLAYERS}{" "}
            players are in.
          </p>
        </header>

        <div className="rounded-[1.6rem] bg-[var(--ink)] px-5 py-5 text-[var(--ink-contrast)]">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-white/60">
            Invite code
          </p>
          <p className="mt-2 font-display text-4xl tracking-[0.28em]">
            {formatCode(state.code)}
          </p>
          <Button
            className="mt-4 border border-white/25 bg-transparent text-white hover:bg-white/10"
            variant="secondary"
            onClick={onCopyInvite}
          >
            Copy invite link
          </Button>
        </div>

        <ul className="space-y-2">
          {state.players.map((player) => (
            <li
              key={player.id}
              className="flex items-center justify-between rounded-2xl bg-white/55 px-4 py-3"
            >
              <span className="text-sm">
                {player.name}
                {player.isHost ? " · host" : ""}
                {player.id === state.yourPlayerId ? " · you" : ""}
              </span>
              <span className="text-xs uppercase tracking-wide text-[var(--ink)]/45">
                {player.connected ? "online" : "away"}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-auto flex flex-col gap-3">
          {state.youAreHost ? (
            <Button size="lg" disabled={!canStart} onClick={onStart}>
              Start game
            </Button>
          ) : (
            <p className="text-center text-sm text-[var(--ink)]/60 animate-pulse-soft">
              Waiting for host to start…
            </p>
          )}
          <Button variant="ghost" onClick={onLeave}>
            Leave
          </Button>
        </div>
      </section>
    );
  }

  if (state.phase === "estimating" && state.question) {
    return (
      <section className="flex flex-1 flex-col gap-6 animate-rise">
        <header className="flex items-start justify-between gap-3">
          <p className="text-sm text-[var(--ink)]/55">
            Esty Mate · {state.code}
          </p>
          <p className="text-sm text-[var(--ink)]/55">
            Round {state.round} / {state.totalRounds}
          </p>
        </header>
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink)]/50">
            {state.question.category}
          </p>
          <h2 className="font-display text-3xl leading-tight text-[var(--brand)]">
            {state.question.prompt}
          </h2>
        </div>

        <div className="mt-auto space-y-4">
          {you?.hasGuessed ? (
            <p className="rounded-2xl bg-white/55 px-4 py-4 text-center text-sm text-[var(--ink)]/70 animate-pulse-soft">
              Locked in. Waiting for {state.waitingCount} more…
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="guess">
                  Your estimate
                  {state.question.unit ? ` (${state.question.unit})` : ""}
                </Label>
                <Input
                  id="guess"
                  inputMode="decimal"
                  value={guess}
                  placeholder="Type a number"
                  onChange={(e) => setGuess(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onLockGuess();
                  }}
                />
              </div>
              <Button size="lg" className="w-full" onClick={onLockGuess}>
                Lock in guess
              </Button>
            </>
          )}
          {state.youAreHost ? (
            <Button variant="secondary" onClick={onAdvance}>
              Reveal early
            </Button>
          ) : null}
        </div>
      </section>
    );
  }

  if (state.phase === "reveal" && state.question) {
    return (
      <section className="flex flex-1 flex-col gap-6 animate-rise">
        <header className="space-y-2">
          <p className="text-sm text-[var(--ink)]/55">
            Esty Mate · {state.code}
          </p>
          <h2 className="font-display text-4xl text-[var(--brand)]">Reveal</h2>
          <p className="text-sm text-[var(--ink)]/70">{state.question.prompt}</p>
        </header>

        <div className="rounded-[1.6rem] bg-[var(--ink)] px-5 py-6 text-[var(--ink-contrast)]">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-white/60">
            True answer
          </p>
          <p className="mt-2 font-display text-4xl">
            {formatAnswer(state.question.answer ?? 0, state.question.unit)}
          </p>
          <p className="mt-3 text-sm text-white/75">
            {describeClosest(state.closestNames)}
          </p>
        </div>

        <ul className="space-y-2">
          {state.players
            .filter((p) => p.connected || p.guess !== undefined)
            .map((player) => (
              <li
                key={player.id}
                className={cn(
                  "flex items-center justify-between rounded-2xl px-4 py-3",
                  player.isClosest ? "bg-[var(--gold-soft)]" : "bg-white/55",
                )}
              >
                <span className="font-medium">{player.name}</span>
                <span className="text-sm tabular-nums">
                  {player.guess ?? "—"}
                </span>
                <span className="text-xs text-[var(--ink)]/55">
                  {player.distance !== undefined
                    ? `off by ${player.distance}`
                    : "no guess"}
                </span>
              </li>
            ))}
        </ul>

        <div className="mt-auto">
          {state.youAreHost ? (
            <Button size="lg" className="w-full" onClick={onAdvance}>
              See scores
            </Button>
          ) : (
            <p className="text-center text-sm text-[var(--ink)]/60">
              Waiting for host…
            </p>
          )}
        </div>
      </section>
    );
  }

  if (state.phase === "scoreboard" || state.phase === "finished") {
    const ranked = [...state.players]
      .filter((p) => p.connected || p.score > 0)
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

    return (
      <section className="flex flex-1 flex-col gap-6 animate-rise">
        <header className="space-y-2">
          <p className="text-sm text-[var(--ink)]/55">
            Esty Mate · {state.code}
          </p>
          <h2 className="font-display text-4xl text-[var(--brand)]">
            {state.phase === "finished" ? "Final scores" : "Scoreboard"}
          </h2>
          <p className="text-sm text-[var(--ink)]/65">
            {state.phase === "finished"
              ? "Match complete."
              : `After round ${state.round} of ${state.totalRounds}.`}
          </p>
        </header>

        <ul className="space-y-2">
          {ranked.map((player, index) => (
            <li
              key={player.id}
              className={cn(
                "flex items-center gap-4 rounded-2xl px-4 py-4",
                index === 0 ? "bg-[var(--gold-soft)]" : "bg-white/55",
              )}
            >
              <span className="font-display text-3xl text-[var(--brand)]">
                {index + 1}
              </span>
              <span className="flex-1 font-display text-2xl">{player.name}</span>
              <span className="font-display text-3xl">{player.score}</span>
            </li>
          ))}
        </ul>

        <div className="mt-auto flex flex-col gap-3">
          {state.phase === "finished" ? (
            <Button size="lg" onClick={onLeave}>
              Back home
            </Button>
          ) : state.youAreHost ? (
            <Button size="lg" onClick={onAdvance}>
              Next question
            </Button>
          ) : (
            <p className="text-center text-sm text-[var(--ink)]/60 animate-pulse-soft">
              Waiting for next question…
            </p>
          )}
          {youName ? (
            <p className="text-center text-xs text-[var(--ink)]/45">
              Playing as {youName}
            </p>
          ) : null}
        </div>
      </section>
    );
  }

  return null;
}
