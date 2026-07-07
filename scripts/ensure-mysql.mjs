import { createConnection } from "net";
import { spawn } from "child_process";
import { existsSync } from "fs";

const DB_HOST = process.env.DB_HOST ?? "127.0.0.1";
const DB_PORT = Number(process.env.DB_PORT ?? 3306);
const MAX_WAIT_MS = 30_000;
const POLL_MS = 500;

function isPortOpen(host, port) {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port });
    socket.setTimeout(2_000);
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function startXamppMysql() {
  const candidates = [
    process.env.XAMPP_MYSQL_START,
    "C:\\xampp\\mysql_start.bat",
    "C:\\xampp\\mysql\\bin\\mysqld.exe",
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;

    if (candidate.endsWith(".bat")) {
      spawn("cmd.exe", ["/c", candidate], {
        detached: true,
        stdio: "ignore",
        windowsHide: true,
      }).unref();
      return true;
    }

    spawn(candidate, ["--standalone"], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    }).unref();
    return true;
  }

  return false;
}

async function waitForMysql() {
  const startedAt = Date.now();

  while (Date.now() - startedAt < MAX_WAIT_MS) {
    if (await isPortOpen(DB_HOST, DB_PORT)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }

  return false;
}

async function main() {
  if (await isPortOpen(DB_HOST, DB_PORT)) {
    return;
  }

  console.log(`[db] MySQL is not reachable at ${DB_HOST}:${DB_PORT}. Attempting to start it...`);

  if (!startXamppMysql()) {
    console.warn(
      "[db] Could not auto-start MySQL. Start XAMPP/MySQL manually, then restart `npm run dev`."
    );
    process.exit(1);
  }

  const ready = await waitForMysql();
  if (!ready) {
    console.error(
      `[db] MySQL did not become ready within ${MAX_WAIT_MS / 1000}s. Start it manually and retry.`
    );
    process.exit(1);
  }

  console.log(`[db] MySQL is ready at ${DB_HOST}:${DB_PORT}`);
}

main().catch((error) => {
  console.error("[db] Failed to ensure MySQL:", error);
  process.exit(1);
});
