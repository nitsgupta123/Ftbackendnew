import mysql from "mysql2/promise";
import { config } from "dotenv";

config({ path: ".env.local" });
config();

const SHEET_ID = "19w09KN05wTNDde4iqVyi7ZAG98TAAg31RbTXIHDSV-M";
const SHEET_GID = "39611087";
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (c === '"' && next === '"') {
        cur += '"';
        i += 1;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cur += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(cur);
      cur = "";
    } else if (c === "\n") {
      row.push(cur);
      rows.push(row);
      row = [];
      cur = "";
    } else if (c !== "\r") {
      cur += c;
    }
  }

  if (cur.length || row.length) {
    row.push(cur);
    rows.push(row);
  }

  return rows;
}

function clean(value) {
  if (value == null) return null;
  let text = String(value)
    .replace(/\uFEFF/g, "")
    .replace(/\r/g, "")
    .trim();
  if (!text || text.toLowerCase() === "na" || text === "-" || text === "—") {
    return null;
  }
  return text;
}

function mapStatus(value) {
  const text = (clean(value) || "").toLowerCase();
  if (text.includes("do not use") || text.includes("do_not_use")) return "do_not_use";
  if (text === "inactive") return "inactive";
  return "active";
}

function mapRelationship(value) {
  const text = (clean(value) || "").toLowerCase().replace(/\s+/g, " ").trim();
  if (text.includes("with issues")) return "with_issues";
  if (text.includes("under review")) return "under_review";
  if (text.includes("on probation") || text.includes("probation")) return "on_probation";
  if (text.includes("blacklist")) return "blacklisted";
  if (text.includes("excellent")) return "excellent";
  if (text.includes("good")) return "good";
  if (text.includes("average")) return "average";
  if (text.includes("poor")) return "poor";
  if (text === "inactive") return "inactive";
  if (text.includes("new")) return "new";
  return "average";
}

function parseSheetDate(value) {
  const text = clean(value);
  if (!text) return null;

  const dmy = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    const day = dmy[1].padStart(2, "0");
    const month = dmy[2].padStart(2, "0");
    return `${dmy[3]}-${month}-${day}`;
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    return text.slice(0, 10);
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return null;
}

function cell(row, index) {
  return clean(row[index] ?? "");
}

async function downloadSheetCsv() {
  console.log("Downloading supplier sheet CSV...");
  const response = await fetch(SHEET_CSV_URL);
  if (!response.ok) {
    throw new Error(`Failed to download sheet CSV (${response.status})`);
  }
  return response.text();
}

async function main() {
  const raw = await downloadSheetCsv();
  const rows = parseCsv(raw);

  // Row 0 = confidentiality notice, row 1 = headers
  const dataRows = rows.slice(2).filter((row) => {
    const company = cell(row, 5);
    const country = cell(row, 1);
    return Boolean(company && country);
  });

  console.log(`Parsed ${dataRows.length} supplier rows from sheet.`);

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "fz",
    multipleStatements: true,
  });

  try {
    console.log("Clearing existing suppliers...");
    await connection.query("DELETE FROM suppliers");

    const sql = `
      INSERT INTO suppliers (
        company_name, country, city_tour_area, status, relationship_status,
        services_offered, contact_person, email_address, contact_number, website,
        notes, problems_with_services, account_details, tc_poc_fixed_departure,
        relationship_owner, date_added_updated, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    let inserted = 0;
    for (const row of dataRows) {
      const payload = [
        cell(row, 5),
        cell(row, 1),
        cell(row, 3),
        mapStatus(row[2]),
        mapRelationship(row[4]),
        cell(row, 6),
        cell(row, 7),
        cell(row, 8),
        cell(row, 9),
        cell(row, 10),
        cell(row, 11),
        cell(row, 12),
        cell(row, 13),
        cell(row, 14),
        cell(row, 15),
        parseSheetDate(row[0]),
        "sheet-import",
        "sheet-import",
      ];

      await connection.query(sql, payload);
      inserted += 1;
      if (inserted % 100 === 0) {
        console.log(`Inserted ${inserted}...`);
      }
    }

    const [countRows] = await connection.query(
      "SELECT COUNT(*) AS total FROM suppliers"
    );
    console.log(
      `Done. Imported ${inserted} suppliers. Table count: ${countRows[0].total}`
    );
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("Supplier sheet import failed:", error.message);
  process.exit(1);
});
