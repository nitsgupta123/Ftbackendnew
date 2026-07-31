import { createConnection } from "net";
import { spawn } from "child_process";
import { existsSync } from "fs";

const DB_HOST = process.env.DB_HOST ?? "127.0.0.1";
const DB_PORT = Number(process.env.DB_PORT ?? 3306);
const MAX_WAIT_MS = 90_000;
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
  const xamppRoot = process.env.XAMPP_ROOT ?? "C:\\xampp";
  const mysqld = process.env.XAMPP_MYSQLD ?? `${xamppRoot}\\mysql\\bin\\mysqld.exe`;
  const ini = process.env.XAMPP_MY_INI ?? `${xamppRoot}\\mysql\\bin\\my.ini`;

  if (existsSync(mysqld) && existsSync(ini)) {
    spawn(mysqld, [`--defaults-file=${ini}`, "--standalone"], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
      cwd: xamppRoot,
    }).unref();
    return true;
  }

  const bat = process.env.XAMPP_MYSQL_START ?? `${xamppRoot}\\mysql_start.bat`;
  if (existsSync(bat)) {
    spawn("cmd.exe", ["/c", "start", "/B", bat], {
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
