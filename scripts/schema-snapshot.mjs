/**
 * Capture every table and column of the reference database (DB_NAME, default fayyaz_new)
 * into scripts/schema/reference-schema.json, used by migrate-ensure-schema.mjs.
 *
 *   node scripts/schema-snapshot.mjs [--out path]
 */
import fs from "fs";
import path from "path";
import { withMigrateConnection } from "./db-migrate-util.mjs";

const outArg = process.argv.indexOf("--out");
const outPath = path.resolve(
  outArg > -1 ? process.argv[outArg + 1] : "scripts/schema/reference-schema.json"
);

const INDEX_LINE = /^\s*(PRIMARY KEY|UNIQUE KEY|KEY|FULLTEXT KEY|SPATIAL KEY|CONSTRAINT|CHECK)\b/;

/** Pull each column's exact DDL out of SHOW CREATE TABLE. */
function columnDefinitions(createSql) {
  const definitions = new Map();
  for (const line of createSql.split("\n").slice(1)) {
    if (INDEX_LINE.test(line) || line.startsWith(")")) continue;
    const match = line.match(/^\s*`((?:[^`]|``)+)`\s+(.*?),?$/);
    if (match) definitions.set(match[1].replace(/``/g, "`"), match[2]);
  }
  return definitions;
}

await withMigrateConnection(async (connection, dbConfig) => {
  const database = dbConfig.database;
  const [[{ version }]] = await connection.query("SELECT VERSION() AS version");
  const [tables] = await connection.query(
    `SELECT TABLE_NAME AS name FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME`,
    [database]
  );
  const [columns] = await connection.query(
    `SELECT TABLE_NAME AS tableName, COLUMN_NAME AS name, COLUMN_TYPE AS columnType
     FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ?
     ORDER BY TABLE_NAME, ORDINAL_POSITION`,
    [database]
  );

  const snapshot = {
    source: database,
    mysqlVersion: version,
    generatedAt: new Date().toISOString(),
    tables: [],
  };

  for (const { name } of tables) {
    const [[row]] = await connection.query(`SHOW CREATE TABLE \`${name}\``);
    const createSql = row["Create Table"].replace(/\sAUTO_INCREMENT=\d+/, "");
    const definitions = columnDefinitions(createSql);
    const tableColumns = columns
      .filter((column) => column.tableName === name)
      .map((column) => {
        const definition = definitions.get(column.name);
        if (!definition) throw new Error(`Could not parse ${name}.${column.name} from SHOW CREATE TABLE`);
        return { name: column.name, columnType: column.columnType, definition };
      });
    snapshot.tables.push({ name, createSql, columns: tableColumns });
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2) + "\n");
  const columnCount = snapshot.tables.reduce((sum, table) => sum + table.columns.length, 0);
  console.log(
    `Wrote ${snapshot.tables.length} tables / ${columnCount} columns from ${database} to ${path.relative(process.cwd(), outPath)}`
  );
});
