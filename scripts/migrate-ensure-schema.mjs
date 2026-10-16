/**
 * Make the target database (DB_NAME) contain every table and column in the reference
 * snapshot (scripts/schema/reference-schema.json). Missing tables are created and missing
 * columns are added in their reference position. Nothing is ever dropped or modified;
 * columns whose type differs from the reference are only reported.
 *
 *   node scripts/migrate-ensure-schema.mjs            # dry run: print the plan
 *   node scripts/migrate-ensure-schema.mjs --apply    # execute the plan
 *   node scripts/migrate-ensure-schema.mjs --schema other.json
 */
import fs from "fs";
import path from "path";
import { withMigrateConnection } from "./db-migrate-util.mjs";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const schemaArg = args.indexOf("--schema");
const schemaPath = path.resolve(
  schemaArg > -1 ? args[schemaArg + 1] : "scripts/schema/reference-schema.json"
);

const quote = (identifier) => `\`${identifier.replace(/`/g, "``")}\``;

function loadSnapshot() {
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema snapshot not found: ${schemaPath}. Run scripts/schema-snapshot.mjs first.`);
  }
  return JSON.parse(fs.readFileSync(schemaPath, "utf8"));
}

async function readTargetSchema(connection, database) {
  const [tableRows] = await connection.query(
    `SELECT TABLE_NAME AS name FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'`,
    [database]
  );
  const [columnRows] = await connection.query(
    `SELECT TABLE_NAME AS tableName, COLUMN_NAME AS name, COLUMN_TYPE AS columnType
     FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ?`,
    [database]
  );
  const tables = new Map(tableRows.map((row) => [row.name.toLowerCase(), new Map()]));
  for (const column of columnRows) {
    tables.get(column.tableName.toLowerCase())?.set(column.name.toLowerCase(), column.columnType);
  }
  return tables;
}

function buildPlan(snapshot, target) {
  const plan = { createTables: [], addColumns: [], skipped: [], typeMismatches: [] };

  for (const table of snapshot.tables) {
    const existing = target.get(table.name.toLowerCase());
    if (!existing) {
      plan.createTables.push({
        table: table.name,
        sql: table.createSql.replace(/^CREATE TABLE/, "CREATE TABLE IF NOT EXISTS"),
      });
      continue;
    }

    let previous = null;
    for (const column of table.columns) {
      const existingType = existing.get(column.name.toLowerCase());
      if (existingType === undefined) {
        if (/\bAUTO_INCREMENT\b/i.test(column.definition)) {
          plan.skipped.push(
            `${table.name}.${column.name}: AUTO_INCREMENT column needs a key; add it manually (${column.definition})`
          );
        } else {
          const position = previous ? `AFTER ${quote(previous)}` : "FIRST";
          plan.addColumns.push({
            table: table.name,
            column: column.name,
            sql: `ALTER TABLE ${quote(table.name)} ADD COLUMN ${quote(column.name)} ${column.definition} ${position}`,
          });
          existing.set(column.name.toLowerCase(), column.columnType);
        }
      } else if (existingType.toLowerCase() !== column.columnType.toLowerCase()) {
        plan.typeMismatches.push(
          `${table.name}.${column.name}: target ${existingType}, reference ${column.columnType}`
        );
      }
      if (existing.has(column.name.toLowerCase())) previous = column.name;
    }
  }

  return plan;
}

async function main() {
  const snapshot = loadSnapshot();

  await withMigrateConnection(async (connection, dbConfig) => {
    const database = dbConfig.database;
    if (database.toLowerCase() === String(snapshot.source).toLowerCase()) {
      console.log(`Target ${database} is the reference database itself; nothing to do.`);
      return;
    }

    const target = await readTargetSchema(connection, database);
    const extraTables = [...target.keys()].filter(
      (name) => !snapshot.tables.some((table) => table.name.toLowerCase() === name)
    );
    const plan = buildPlan(snapshot, target);

    console.log(
      `Reference: ${snapshot.source} (${snapshot.tables.length} tables, captured ${snapshot.generatedAt})`
    );
    console.log(`Target:    ${database} (${target.size} tables before migration)`);
    console.log(`Mode:      ${apply ? "APPLY" : "DRY RUN (pass --apply to execute)"}\n`);

    const statements = [
      ...plan.createTables.map((item) => ({ label: `create table ${item.table}`, sql: item.sql })),
      ...plan.addColumns.map((item) => ({ label: `add column ${item.table}.${item.column}`, sql: item.sql })),
    ];

    if (statements.length === 0) {
      console.log("Schema already contains every reference table and column.");
    }

    if (apply && statements.length > 0) {
      // Session only: lets legacy definitions (zero-date defaults, implicit NOT NULL fills)
      // apply under a strict server sql_mode, and allows creating tables in any FK order.
      await connection.query("SET SESSION sql_mode = ''");
      await connection.query("SET SESSION foreign_key_checks = 0");
    }

    let done = 0;
    const failures = [];
    for (const statement of statements) {
      if (!apply) {
        console.log(`-- ${statement.label}\n${statement.sql};\n`);
        continue;
      }
      try {
        await connection.query(statement.sql);
        done += 1;
        console.log(`OK    ${statement.label}`);
      } catch (error) {
        failures.push(`${statement.label}: ${error.message}`);
        console.log(`FAIL  ${statement.label}: ${error.message}`);
      }
    }

    if (apply && statements.length > 0) {
      await connection.query("SET SESSION foreign_key_checks = 1");
    }

    console.log("\nSummary");
    console.log(`  tables to create:   ${plan.createTables.length}`);
    console.log(`  columns to add:     ${plan.addColumns.length}`);
    if (apply) console.log(`  applied:            ${done}/${statements.length}`);
    console.log(`  extra tables kept:  ${extraTables.length} (in target only, left untouched)`);

    if (plan.typeMismatches.length) {
      console.log(`\nType differences (reported only, not changed): ${plan.typeMismatches.length}`);
      for (const line of plan.typeMismatches) console.log(`  ${line}`);
    }
    if (plan.skipped.length) {
      console.log(`\nSkipped: ${plan.skipped.length}`);
      for (const line of plan.skipped) console.log(`  ${line}`);
    }
    if (failures.length) {
      console.log(`\nFailures: ${failures.length}`);
      for (const line of failures) console.log(`  ${line}`);
      process.exitCode = 1;
    }
  });
}

main().catch((error) => {
  console.error("Schema migration failed:", error.message);
  process.exit(1);
});
