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

const [tables] = await connection.query("SHOW TABLES");
const names = tables.map((t) => Object.values(t)[0]).sort();
console.log(names.join("\n"));
await connection.end();
