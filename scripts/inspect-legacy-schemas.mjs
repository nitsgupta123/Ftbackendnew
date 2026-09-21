import { config } from "dotenv";
import mysql from "mysql2/promise";

config({ path: ".env.local" });
config();

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME,
});

const targets = [
  "tbl_packages",
  "tbl_post",
  "tbl_post_details",
  "tbl_settings",
  "tbl_roles",
  "tbl_categories",
  "tbl_promotion",
  "tbl_smtp",
  "pages",
  "articles",
  "authors",
  "categories",
  "tbl_price",
  "tbl_itinerary",
  "tbl_partners",
];

for (const name of targets) {
  try {
    const [cols] = await connection.query(`SHOW COLUMNS FROM \`${name}\``);
    console.log(`\n=== ${name} ===`);
    console.log(cols.map((c) => `${c.Field}:${c.Type}`).join(" | "));
  } catch (e) {
    console.log(`\n=== ${name} === MISSING (${e.message})`);
  }
}

await connection.end();
