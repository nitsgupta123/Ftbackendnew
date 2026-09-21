import mysql from "mysql2/promise";
import { config } from "dotenv";

config({ path: ".env.local" });
config();

const email = (process.argv[2] ?? "").trim().toLowerCase();
if (!email) {
  console.error("Usage: node scripts/promote-super-admin.mjs <email>");
  process.exit(1);
}

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "fz",
  });

  try {
    const [existing] = await connection.query(
      `SELECT id, user_email, first_name, last_name, user_type, status
       FROM tbl_user
       WHERE LOWER(user_email) = ? AND LOWER(TRIM(user_type)) <> 'front'
       LIMIT 1`,
      [email]
    );

    if (!existing.length) {
      throw new Error(`No admin user found for ${email}`);
    }

    const before = existing[0];
    await connection.query(
      `UPDATE tbl_user
       SET user_type = '1', status = 1, edit_date = NOW()
       WHERE id = ?`,
      [before.id]
    );

    const [updated] = await connection.query(
      `SELECT id, user_email, first_name, last_name, user_type, status
       FROM tbl_user WHERE id = ? LIMIT 1`,
      [before.id]
    );

    console.log("Promoted to Super Admin (user_type=1):");
    console.log(
      `  Before: ${before.first_name} <${before.user_email}> — type ${before.user_type}`
    );
    console.log(
      `  After:  ${updated[0].first_name} <${updated[0].user_email}> — type ${updated[0].user_type}`
    );
    console.log("\nAsk the user to sign out and sign in again to refresh their session.");
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("Promotion failed:", error.message);
  process.exit(1);
});
