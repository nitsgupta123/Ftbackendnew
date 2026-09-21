import path from "path";
import { fileURLToPath } from "url";
import { runSqlFile, withMigrateConnection } from "./db-migrate-util.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  await withMigrateConnection(async (connection, dbConfig) => {
    await runSqlFile(
      connection,
      __dirname,
      "migrate-add-admin-users.sql",
      dbConfig.database
    );
    console.log("admin_users table is ready.");
  });
}

main().catch((error) => {
  console.error("Admin users migration failed:", error.message);
  process.exit(1);
});
