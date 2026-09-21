import path from "path";
import { fileURLToPath } from "url";
import { runSqlFile, withMigrateConnection } from "./db-migrate-util.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Core admin-panel tables needed for signup and basic modules. */
const MIGRATIONS = [
  "migrate-add-admin-users.sql",
  "migrate-alter-admin-role-string.sql",
  "migrate-add-permissions.sql",
  "migrate-alter-role-permissions-role-string.sql",
  "migrate-add-user-permissions.sql",
  "migrate-alter-user-permissions-bigint-fk.sql",
  "migrate-add-settings.sql",
  "migrate-add-quote-management-emails.sql",
  "migrate-add-package-categories.sql",
  "migrate-add-pricing-rules.sql",
  "migrate-add-package-templates.sql",
  "migrate-add-blogs.sql",
  "migrate-alter-blog-scheduled-status.sql",
  "migrate-blog-related-packages-and-approval.sql",
  "migrate-add-pages.sql",
  "migrate-add-suppliers.sql",
  "migrate-alter-supplier-relationship-status.sql",
  "migrate-alter-supplier-active-status.sql",
];

async function main() {
  await withMigrateConnection(async (connection, dbConfig) => {
    for (const file of MIGRATIONS) {
      try {
        await runSqlFile(connection, __dirname, file, dbConfig.database);
      } catch (error) {
        console.warn(`Skipped ${file}: ${error.message}`);
      }
    }
    console.log("Core migrations finished.");
  });
}

main().catch((error) => {
  console.error("Core migrations failed:", error.message);
  process.exit(1);
});
