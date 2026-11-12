import path from "path";
import { fileURLToPath } from "url";
import {
  getMigrateDbConfig,
  runSqlFile,
  withMigrateConnection,
} from "./db-migrate-util.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const config = getMigrateDbConfig();
  await withMigrateConnection(async (connection, dbConfig) => {
    await runSqlFile(
      connection,
      __dirname,
      "migrate-add-promotions.sql",
      dbConfig.database
    );
    console.log(`Promotions tables are ready on ${config.database}.`);
  });
}

main().catch((error) => {
  console.error("Promotions migration failed:", error.message);
  process.exit(1);
});
