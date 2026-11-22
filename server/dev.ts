import { spawn } from "node:child_process";
import path from "node:path";
import { startSocketServer } from "./socket";

const PORT = process.env.PORT || "43127";
const SOCKET_PORT = process.env.SOCKET_PORT || "43128";
const HOST = process.env.HOST || "0.0.0.0";

process.env.PORT = PORT;
process.env.SOCKET_PORT = SOCKET_PORT;
process.env.HOST = HOST;
process.env.WEB_ORIGIN = process.env.WEB_ORIGIN || `http://127.0.0.1:${PORT}`;

startSocketServer();

const nextBin = path.join(
  process.cwd(),
  "node_modules",
  "next",
  "dist",
  "bin",
  "next",
);

const child = spawn(
  process.execPath,
  [nextBin, "dev", "--hostname", HOST, "--port", PORT],
  {
    cwd: process.cwd(),
    stdio: "inherit",
    env: {
      ...process.env,
      PORT,
      SOCKET_PORT,
      HOST,
    },
  },
);

const shutdown = (signal: NodeJS.Signals) => {
  if (!child.killed) child.kill(signal);
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
