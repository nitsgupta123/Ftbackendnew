import mysql from "mysql2/promise";

const connection = await mysql.createConnection({
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME ?? "fz",
});

try {
  const [create] = await connection.query("SHOW CREATE TABLE add_package");
  console.log(create[0]["Create Table"]);

  const [fks] = await connection.query(`
    SELECT
      CONSTRAINT_NAME,
      COLUMN_NAME,
      REFERENCED_TABLE_NAME,
      REFERENCED_COLUMN_NAME
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = 'fz'
      AND TABLE_NAME = 'add_package'
      AND REFERENCED_TABLE_NAME IS NOT NULL
  `);
  console.log("\nForeign keys:", fks);
} finally {
  await connection.end();
}
