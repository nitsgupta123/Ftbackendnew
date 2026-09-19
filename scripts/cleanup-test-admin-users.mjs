/**
 * Remove dummy/test admin users and temporary per-user permission overrides.
 * Keeps neetu.inncelerator@gmail.com (and any @fayyaztravels.com accounts).
 *
 * Usage: node scripts/cleanup-test-admin-users.mjs
 */
import mysql from "mysql2/promise";
import { config } from "dotenv";

config({ path: ".env.local" });
config();

const KEEP_EMAILS = new Set(["neetu.inncelerator@gmail.com"]);
const COMPANY_DOMAINS = ["fayyaztravels.com"];
/** Clearly temporary / scratch roles created during access testing. */
const TEMP_TEST_ROLES = new Set(["aaa", "aaaff", "xyz"]);
const PROTECTED_ROLES = new Set(["owner", "super_admin", "admin"]);

function shouldKeep(email) {
  const normalized = email.trim().toLowerCase();
  if (KEEP_EMAILS.has(normalized)) return true;
  const domain = normalized.split("@")[1] ?? "";
  return COMPANY_DOMAINS.includes(domain);
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
    const [before] = await connection.query(
      "SELECT id, email, full_name, role, is_active FROM admin_users ORDER BY id"
    );

    const keep = before.filter((u) => shouldKeep(u.email));
    const remove = before.filter((u) => !shouldKeep(u.email));

    console.log("Keeping:");
    for (const u of keep) {
      console.log(`  ${u.id}\t${u.email}\t${u.full_name}\t${u.role}`);
    }
    if (!keep.length) {
      throw new Error(
        "No keepers found. Aborting so the last Super Admin is not deleted."
      );
    }

    console.log("\nRemoving:");
    for (const u of remove) {
      console.log(`  ${u.id}\t${u.email}\t${u.full_name}\t${u.role}`);
    }

    const removeIds = remove.map((u) => u.id);
    if (removeIds.length) {
      await connection.query("DELETE FROM user_permissions WHERE user_id IN (?)", [
        removeIds,
      ]);
      const [deleted] = await connection.query(
        "DELETE FROM admin_users WHERE id IN (?)",
        [removeIds]
      );
      console.log(`\nDeleted ${deleted.affectedRows} admin user(s).`);
    } else {
      console.log("\nNo dummy/test users to delete.");
    }

    // Drop temporary per-user overrides for remaining accounts (role defaults apply).
    const keepIds = keep.map((u) => u.id);
    if (keepIds.length) {
      const [cleared] = await connection.query(
        "DELETE FROM user_permissions WHERE user_id IN (?)",
        [keepIds]
      );
      console.log(
        `Cleared ${cleared.affectedRows} temporary user_permissions row(s) for kept users.`
      );
    }

    // Ensure Neetu remains an active super admin for access testing.
    await connection.query(
      `UPDATE admin_users
       SET role = 'super_admin', is_active = 1
       WHERE email = ?`,
      ["neetu.inncelerator@gmail.com"]
    );

    const [roleRows] = await connection.query(
      "SELECT DISTINCT role FROM role_permissions ORDER BY role"
    );
    const tempRoles = roleRows
      .map((r) => String(r.role))
      .filter((role) => TEMP_TEST_ROLES.has(role) && !PROTECTED_ROLES.has(role));

    if (tempRoles.length) {
      console.log("\nRemoving temporary test roles:");
      for (const role of tempRoles) {
        await connection.query(
          "UPDATE admin_users SET role = 'admin' WHERE role = ?",
          [role]
        );
        const [deletedRole] = await connection.query(
          "DELETE FROM role_permissions WHERE role = ?",
          [role]
        );
        console.log(`  ${role} (${deletedRole.affectedRows} permission row(s))`);
      }
    } else {
      console.log("\nNo temporary test roles to delete.");
    }

    const [after] = await connection.query(
      "SELECT id, email, full_name, role, is_active FROM admin_users ORDER BY id"
    );
    const [permCount] = await connection.query(
      "SELECT COUNT(*) AS n FROM user_permissions"
    );
    const [rolesLeft] = await connection.query(
      "SELECT DISTINCT role FROM role_permissions ORDER BY role"
    );

    console.log("\nRemaining admin_users:");
    for (const u of after) {
      console.log(
        `  ${u.id}\t${u.email}\t${u.full_name}\t${u.role}\tactive=${u.is_active}`
      );
    }
    console.log(
      `Roles left: ${rolesLeft.map((r) => r.role).join(", ") || "(none)"}`
    );
    console.log(`user_permissions rows left: ${permCount[0].n}`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("Cleanup failed:", error.message);
  process.exit(1);
});
