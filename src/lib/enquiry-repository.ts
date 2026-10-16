import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { query, sqlLimit, sqlOffset, type QueryParam } from "./db";
import { toIsoSgt } from "./format-date";
import type {
  EnquiryRecord,
  EnquirySortField,
  EnquiryStats,
  EnquiryStatusFilter,
  EnquiryTypeFilter,
  ListEnquiriesParams,
  ListEnquiriesResult,
} from "./enquiry-types";

const SORT_COLUMNS: Record<EnquirySortField, string> = {
  insert_date: "m.insert_date",
  first_name: "m.first_name",
  email: "m.email",
};

/** origin/destination hold one or more comma-separated tbl_destinations ids (e.g. "146,150"). */
function destinationNamesSql(column: string): string {
  return `(SELECT GROUP_CONCAT(d.d_name ORDER BY FIND_IN_SET(d.id, REPLACE(${column}, ' ', '')) SEPARATOR ', ')
     FROM tbl_destinations d
     WHERE REPLACE(${column}, ' ', '') REGEXP '^[0-9]+(,[0-9]+)*$'
       AND FIND_IN_SET(d.id, REPLACE(${column}, ' ', '')) > 0)`;
}

const ENQUIRY_SELECT = `
  SELECT
    m.*,
    ${destinationNamesSql("m.origin")} AS origin_name,
    ${destinationNamesSql("m.destination")} AS destination_name
  FROM tbl_message m
`;

function asString(value: unknown): string {
  if (value == null) return "";
  return String(value);
}

function asNullableDate(value: unknown): string | null {
  if (value == null) return null;
  return toIsoSgt(
    value instanceof Date || typeof value === "string" ? value : String(value)
  );
}

function mapEnquiry(row: RowDataPacket): EnquiryRecord {
  return {
    id: Number(row.id),
    title: asString(row.title),
    company: asString(row.company),
    firstName: asString(row.first_name),
    lastName: asString(row.last_name),
    email: asString(row.email),
    countryCode: asString(row.c_code),
    phone: asString(row.phone),
    location: asString(row.location),
    origin: asString(row.origin),
    originName: row.origin_name ? asString(row.origin_name) : null,
    destination: asString(row.destination),
    destinationName: row.destination_name
      ? asString(row.destination_name)
      : null,
    departureDate: asString(row.departure_date),
    returnDate: asString(row.return_date),
    flexible: Number(row.flexible ?? 0),
    adults: asString(row.adults),
    youngAdults: asString(row.y_adults),
    children: asString(row.children),
    infants: asString(row.infants),
    budget: asString(row.budget),
    message: asString(row.message),
    aboutUs: asString(row.aboutus),
    services: asString(row.services),
    currency: asString(row.currency),
    pageUrl: asString(row.page_url),
    status: Number(row.status ?? 1),
    messageType: asString(row.message_type),
    systemIp: asString(row.system_ip),
    systemInfo: asString(row.system_info),
    insertDate: asNullableDate(row.insert_date),
    editDate: asNullableDate(row.edit_date),
  };
}

function buildFilters(params: ListEnquiriesParams): {
  where: string;
  values: QueryParam[];
} {
  const clauses: string[] = [];
  const values: QueryParam[] = [];

  const search = params.search?.trim();
  if (search) {
    const like = `%${search}%`;
    clauses.push(
      `(m.first_name LIKE ? OR m.last_name LIKE ? OR m.email LIKE ? OR m.phone LIKE ? OR m.company LIKE ? OR m.message LIKE ?)`
    );
    values.push(like, like, like, like, like, like);
  }

  const type: EnquiryTypeFilter = params.type ?? "all";
  if (type !== "all") {
    clauses.push("m.message_type = ?");
    values.push(type);
  }

  const status: EnquiryStatusFilter = params.status ?? "all";
  if (status === "open") {
    clauses.push("IFNULL(m.status, 1) != 2");
  } else if (status === "closed") {
    clauses.push("m.status = 2");
  }

  return {
    where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    values,
  };
}

export async function getEnquiryStats(): Promise<EnquiryStats> {
  const rows = await query<RowDataPacket[]>(
    `
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN IFNULL(status, 1) != 2 THEN 1 ELSE 0 END) AS open_count,
        SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) AS closed_count,
        SUM(CASE WHEN insert_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01') THEN 1 ELSE 0 END) AS this_month,
        SUM(CASE WHEN message_type = 'contactus' THEN 1 ELSE 0 END) AS contact_us,
        SUM(CASE WHEN message_type = 'popupenquery' THEN 1 ELSE 0 END) AS popup,
        SUM(CASE WHEN message_type = 'contactus_visa' THEN 1 ELSE 0 END) AS visa,
        SUM(CASE WHEN message_type = 'contactus_corporate' THEN 1 ELSE 0 END) AS corporate
      FROM tbl_message
    `
  );

  const row = rows[0] ?? {};
  return {
    total: Number(row.total ?? 0),
    open: Number(row.open_count ?? 0),
    closed: Number(row.closed_count ?? 0),
    thisMonth: Number(row.this_month ?? 0),
    contactUs: Number(row.contact_us ?? 0),
    popup: Number(row.popup ?? 0),
    visa: Number(row.visa ?? 0),
    corporate: Number(row.corporate ?? 0),
  };
}

export async function listEnquiries(
  params: ListEnquiriesParams = {}
): Promise<ListEnquiriesResult> {
  const page = Math.max(1, params.page ?? 1);
  const limit = sqlLimit(params.limit ?? 20);
  const offset = sqlOffset((page - 1) * limit);
  const sort = params.sort && SORT_COLUMNS[params.sort] ? params.sort : "insert_date";
  const order = params.order === "asc" ? "ASC" : "DESC";
  const { where, values } = buildFilters(params);

  const [countRows, rows] = await Promise.all([
    query<RowDataPacket[]>(
      `
        SELECT COUNT(*) AS total
        FROM tbl_message m
        ${where}
      `,
      values
    ),
    query<RowDataPacket[]>(
      `
        ${ENQUIRY_SELECT}
        ${where}
        ORDER BY ${SORT_COLUMNS[sort]} ${order}, m.id DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
      values
    ),
  ]);

  const total = Number(countRows[0]?.total ?? 0);
  return {
    enquiries: rows.map(mapEnquiry),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function findEnquiryById(id: number): Promise<EnquiryRecord | null> {
  const rows = await query<RowDataPacket[]>(
    `
      ${ENQUIRY_SELECT}
      WHERE m.id = ?
      LIMIT 1
    `,
    [id]
  );

  return rows[0] ? mapEnquiry(rows[0]) : null;
}

export async function updateEnquiryStatus(
  id: number,
  status: "open" | "closed"
): Promise<EnquiryRecord | null> {
  const nextStatus = status === "closed" ? 2 : 1;
  const result = await query<ResultSetHeader>(
    `
      UPDATE tbl_message
      SET status = ?, edit_date = NOW()
      WHERE id = ?
    `,
    [nextStatus, id]
  );

  if (!result.affectedRows) return null;
  return findEnquiryById(id);
}

export async function deleteEnquiry(id: number): Promise<boolean> {
  const result = await query<ResultSetHeader>(
    `DELETE FROM tbl_message WHERE id = ?`,
    [id]
  );
  return result.affectedRows > 0;
}
