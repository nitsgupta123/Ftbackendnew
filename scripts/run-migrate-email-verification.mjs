import { config } from "dotenv";
import { withMigrateConnection } from "./db-migrate-util.mjs";

config({ path: ".env.production" });
config({ path: ".env.local" });
config();

const COLUMNS = [
  {
    name: "email_verified",
    ddl: "ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 0",
  },
  {
    name: "email_verification_token",
    ddl: "ADD COLUMN email_verification_token VARCHAR(64) NULL",
  },
  {
    name: "email_verification_expires_at",
    ddl: "ADD COLUMN email_verification_expires_at DATETIME NULL",
  },
];

const INDEXES = [
  {
    name: "idx_tbl_user_email_verified",
    ddl: "CREATE INDEX idx_tbl_user_email_verified ON tbl_user (email_verified)",
  },
  {
    name: "idx_tbl_user_verification_token",
    ddl: "CREATE INDEX idx_tbl_user_verification_token ON tbl_user (email_verification_token)",
  },
];

async function columnExists(connection, database, column) {
  const [rows] = await connection.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tbl_user' AND COLUMN_NAME = ?`,
    [database, column]
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function indexExists(connection, database, indexName) {
  const [rows] = await connection.query(
    `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tbl_user' AND INDEX_NAME = ?`,
    [database, indexName]
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function main() {
  await withMigrateConnection(async (connection, dbConfig) => {
    const database = dbConfig.database;
    let added = 0;

    for (const column of COLUMNS) {
      if (await columnExists(connection, database, column.name)) {
        console.log(`Column ${column.name} already exists — skip.`);
        continue;
      }
      console.log(`Adding ${column.name}...`);
      await connection.query(`ALTER TABLE \`${database}\`.tbl_user ${column.ddl}`);
      added += 1;
    }

    // Existing accounts are treated as already verified.
    await connection.query(
      `UPDATE \`${database}\`.tbl_user
       SET email_verified = 1
       WHERE email_verified = 0
         AND email_verification_token IS NULL`
    );

    for (const index of INDEXES) {
      if (await indexExists(connection, database, index.name)) {
        console.log(`Index ${index.name} already exists — skip.`);
        continue;
      }
      console.log(`Creating ${index.name}...`);
      await connection.query(index.ddl.replace("ON tbl_user", `ON \`${database}\`.tbl_user`));
    }

    console.log(
      added
        ? `Email verification ready on ${database}.tbl_user (${added} column(s) added).`
        : `Email verification already ready on ${database}.tbl_user.`
    );
  });
}

main().catch((error) => {
  console.error("Email verification migration failed:", error.message);
  process.exit(1);
});
