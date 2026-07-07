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
      "SELECT id, email, full_name, role, is_active FROM admin_users WHERE email = ? LIMIT 1",
      [email]
    );

    if (!existing.length) {
      throw new Error(`No admin user found for ${email}`);
    }

    const before = existing[0];
    await connection.query(
      "UPDATE admin_users SET role = 'super_admin', is_active = 1 WHERE email = ?",
      [email]
    );

    const [updated] = await connection.query(
      "SELECT id, email, full_name, role, is_active FROM admin_users WHERE email = ? LIMIT 1",
      [email]
    );

    console.log("Promoted to super_admin:");
    console.log(`  Before: ${before.full_name} <${before.email}> — ${before.role}`);
    console.log(`  After:  ${updated[0].full_name} <${updated[0].email}> — ${updated[0].role}`);
    console.log("\nAsk the user to sign out and sign in again to refresh their session.");
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("Promotion failed:", error.message);
  process.exit(1);
});
