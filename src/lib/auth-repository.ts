import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcrypt";
import { BCRYPT_ROUNDS } from "./auth-config";
import { query, sqlLimit, sqlOffset, type QueryParam } from "./db";
import { toIsoSgt } from "./format-date";
import type {
  AdminUser,
  AdminUserRow,
  AuthTokenPayload,
  SignupInput,
} from "./auth-types";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

/** Legacy website/admin users live in `tbl_user`; role is `user_type` → `tbl_roles`. */
export const USERS_TABLE = "tbl_user";
export const ROLES_TABLE = "tbl_roles";

const ADMIN_USER_FILTER = `user_type IS NOT NULL AND TRIM(user_type) <> '' AND LOWER(TRIM(user_type)) <> 'front'`;

function adminUserTypeFilter(alias = "u"): string {
  const col = `${alias}.user_type`;
  return `${col} IS NOT NULL AND TRIM(${col}) <> '' AND LOWER(TRIM(${col})) <> 'front'`;
}

interface TblUserRow extends RowDataPacket {
  id: number;
  user_email: string;
  password: string;
  first_name: string;
  last_name: string;
  user_type: string;
  status: number;
  email_verified: number;
  email_verification_token: string | null;
  email_verification_expires_at: Date | string | null;
  insert_date: Date | string | null;
  edit_date: Date | string | null;
  login_date: Date | string | null;
  role_name: string | null;
}

function normalizeRoleKey(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function roleKeyFromRoleName(roleName: string | null | undefined, userType: string): string {
  const name = String(roleName ?? "").trim();
  if (name) {
    const key = normalizeRoleKey(name);
    if (key === "super_admin" || key === "superadmin") return "super_admin";
    if (key === "admin") return "admin";
    return key || "admin";
  }
  if (userType === "1") return "super_admin";
  if (userType === "2") return "admin";
  return normalizeRoleKey(userType) || "admin";
}

function fullNameFromRow(row: TblUserRow): string {
  return [row.first_name, row.last_name].map((p) => String(p ?? "").trim()).filter(Boolean).join(" ") ||
    String(row.user_email ?? "").trim();
}

function asDate(value: Date | string | null | undefined): Date {
  if (value instanceof Date) return value;
  if (value == null || value === "") return new Date(0);
  return new Date(value);
}

function mapTblUser(row: TblUserRow): AdminUserRow {
  return {
    id: Number(row.id),
    email: String(row.user_email ?? "").trim().toLowerCase(),
    password_hash: String(row.password ?? ""),
    full_name: fullNameFromRow(row),
    role: roleKeyFromRoleName(row.role_name, String(row.user_type ?? "")),
    is_active: Number(row.status) === 1 ? 1 : 0,
    email_verified: Number(row.email_verified) === 1 ? 1 : 0,
    email_verification_token: row.email_verification_token
      ? String(row.email_verification_token)
      : null,
    email_verification_expires_at: row.email_verification_expires_at
      ? asDate(row.email_verification_expires_at)
      : null,
    created_at: asDate(row.insert_date),
    updated_at: asDate(row.edit_date ?? row.insert_date),
    last_login_at: row.login_date ? asDate(row.login_date) : null,
  };
}

function mapAdminUser(row: AdminUserRow): AdminUser {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    isActive: Boolean(row.is_active),
    emailVerified: Boolean(row.email_verified),
    createdAt: toIsoSgt(row.created_at) ?? toIsoSgt(new Date())!,
    lastLoginAt: row.last_login_at ? toIsoSgt(row.last_login_at) : null,
  };
}

const USER_SELECT = `
  SELECT u.id, u.user_email, u.password, u.first_name, u.last_name, u.user_type, u.status,
         u.email_verified, u.email_verification_token, u.email_verification_expires_at,
         u.insert_date, u.edit_date, u.login_date, r.role_name
  FROM ${USERS_TABLE} u
  LEFT JOIN ${ROLES_TABLE} r
    ON u.user_type REGEXP '^[0-9]+$'
   AND r.id = CAST(u.user_type AS UNSIGNED)
`;

function md5(password: string): string {
  return createHash("md5").update(password, "utf8").digest("hex");
}

async function hashPassword(password: string): Promise<string> {
  // Prefer bcrypt for new panel accounts; verifyPassword still accepts legacy MD5.
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function resolveRoleTypeId(role: string): Promise<string> {
  const key = normalizeRoleKey(role);
  if (key === "super_admin" || key === "superadmin") return "1";
  if (key === "admin") return "2";

  const rows = await query<RowDataPacket[]>(
    `SELECT id, role_name FROM ${ROLES_TABLE} WHERE status = 1`
  );
  for (const row of rows) {
    if (normalizeRoleKey(String(row.role_name ?? "")) === key) {
      return String(row.id);
    }
  }

  // Create a matching legacy role row so user_type stays an id.
  const label = role
    .split("_")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
  const result = await query<ResultSetHeader>(
    `INSERT INTO ${ROLES_TABLE} (role_name, roles, insert_date, edit_date, status, user_id)
     VALUES (?, '', NOW(), NOW(), 1, 0)`,
    [label || role]
  );
  return String(result.insertId);
}

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
/** Kept short so `pwreset_` + hex fits in email_verification_token VARCHAR(64). */
const PASSWORD_RESET_PREFIX = "pr_";

export function createEmailVerificationToken(): {
  token: string;
  expiresAt: Date;
} {
  return {
    token: randomBytes(32).toString("hex"),
    expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
  };
}

export function createPasswordResetToken(): {
  token: string;
  storedToken: string;
  expiresAt: Date;
} {
  // 16 bytes → 32 hex; with "pr_" prefix = 35 chars (fits VARCHAR(64))
  const token = randomBytes(16).toString("hex");
  return {
    token,
    storedToken: `${PASSWORD_RESET_PREFIX}${token}`,
    expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
  };
}

/** Counts verified + active admins (used for first-user bootstrap). */
export async function countAdminUsers(): Promise<number> {
  const rows = await query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM ${USERS_TABLE}
     WHERE ${ADMIN_USER_FILTER} AND status = 1 AND email_verified = 1`
  );
  return Number(rows[0]?.total ?? 0);
}

export async function countAllAdminUsers(): Promise<number> {
  const rows = await query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM ${USERS_TABLE} WHERE ${ADMIN_USER_FILTER}`
  );
  return Number(rows[0]?.total ?? 0);
}

export interface ListAdminUsersParams {
  search?: string;
  role?: AdminUser["role"] | "all";
  status?: "active" | "inactive" | "all";
  sort?: "created_at" | "full_name" | "last_login_at";
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface ListAdminUsersResult {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminUserStats {
  total: number;
  active: number;
  inactive: number;
  superAdmins: number;
  recentlyActive: number;
}

export interface UpdateAdminUserInput {
  fullName?: string;
  role?: AdminUser["role"];
  isActive?: boolean;
  password?: string;
}

export async function getAdminUserStats(): Promise<AdminUserStats> {
  const rows = await query<RowDataPacket[]>(
    `SELECT
       COUNT(*) AS total,
       SUM(u.status = 1) AS active,
       SUM(u.status <> 1) AS inactive,
       SUM(u.status = 1 AND (u.user_type = '1' OR LOWER(TRIM(r.role_name)) IN ('super admin', 'super_admin'))) AS super_admins,
       SUM(u.status = 1 AND u.login_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)) AS recently_active
     FROM ${USERS_TABLE} u
     LEFT JOIN ${ROLES_TABLE} r
       ON u.user_type REGEXP '^[0-9]+$'
      AND r.id = CAST(u.user_type AS UNSIGNED)
     WHERE ${adminUserTypeFilter("u")} AND u.email_verified = 1`
  );
  const row = rows[0] ?? {};
  return {
    total: Number(row.total ?? 0),
    active: Number(row.active ?? 0),
    inactive: Number(row.inactive ?? 0),
    superAdmins: Number(row.super_admins ?? 0),
    recentlyActive: Number(row.recently_active ?? 0),
  };
}

export async function listAdminUsers(
  params: ListAdminUsersParams = {}
): Promise<ListAdminUsersResult> {
  const page = Math.max(1, params.page ?? 1);
  const limit = sqlLimit(params.limit ?? 20);
  const offset = sqlOffset((page - 1) * limit);
  const sort = params.sort ?? "created_at";
  const order = params.order === "asc" ? "ASC" : "DESC";

  const conditions: string[] = [adminUserTypeFilter("u"), "u.email_verified = 1"];
  const values: QueryParam[] = [];

  if (params.search?.trim()) {
    conditions.push(
      "(u.first_name LIKE ? OR u.last_name LIKE ? OR u.user_email LIKE ? OR u.user_name LIKE ?)"
    );
    const term = `%${params.search.trim()}%`;
    values.push(term, term, term, term);
  }

  if (params.role && params.role !== "all") {
    const roleTypeId = await resolveRoleTypeId(params.role);
    conditions.push("u.user_type = ?");
    values.push(roleTypeId);
  }

  if (params.status === "active") {
    conditions.push("u.status = 1");
  } else if (params.status === "inactive") {
    conditions.push("u.status <> 1");
  }

  const where = `WHERE ${conditions.join(" AND ")}`;

  const countRows = await query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM ${USERS_TABLE} u ${where}`,
    values
  );
  const total = Number(countRows[0]?.total ?? 0);

  const sortColumn =
    sort === "full_name"
      ? "u.first_name"
      : sort === "last_login_at"
        ? "u.login_date"
        : "u.insert_date";

  const rows = await query<TblUserRow[]>(
    `${USER_SELECT}
     ${where}
     ORDER BY ${sortColumn} ${order}
     LIMIT ${limit} OFFSET ${offset}`,
    values
  );

  return {
    users: rows.map((row) => mapAdminUser(mapTblUser(row))),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function findAdminUserById(id: number): Promise<AdminUser | null> {
  const rows = await query<TblUserRow[]>(
    `${USER_SELECT}
     WHERE u.id = ? AND ${adminUserTypeFilter("u")}
     LIMIT 1`,
    [id]
  );
  const row = rows[0];
  return row ? mapAdminUser(mapTblUser(row)) : null;
}

export async function deleteAdminUser(id: number): Promise<boolean> {
  const existing = await findAdminUserById(id);
  if (!existing) {
    return false;
  }

  if (existing.role === "super_admin" && existing.isActive) {
    const { users } = await listAdminUsers({
      role: "super_admin",
      status: "active",
      limit: 100,
    });
    const otherSuperAdmins = users.filter((u) => u.id !== id && u.isActive);
    if (!otherSuperAdmins.length) {
      throw new Error("Cannot delete the last active Super Admin");
    }
  }

  await query(`DELETE FROM ${USERS_TABLE} WHERE id = ?`, [id]);
  return true;
}

export async function updateAdminUser(
  id: number,
  input: UpdateAdminUserInput
): Promise<AdminUser | null> {
  const sets: string[] = [];
  const values: QueryParam[] = [];

  if (input.fullName !== undefined) {
    const parts = input.fullName.trim().split(/\s+/);
    const firstName = parts[0] ?? "";
    const lastName = parts.slice(1).join(" ");
    sets.push("first_name = ?", "last_name = ?");
    values.push(firstName, lastName);
  }
  if (input.role !== undefined) {
    sets.push("user_type = ?");
    values.push(await resolveRoleTypeId(input.role));
  }
  if (input.isActive !== undefined) {
    sets.push("status = ?");
    values.push(input.isActive ? 1 : 2);
  }
  if (input.password !== undefined && input.password.length > 0) {
    sets.push("password = ?");
    values.push(await hashPassword(input.password));
  }

  if (!sets.length) {
    return findAdminUserById(id);
  }

  sets.push("edit_date = NOW()");
  values.push(id);
  await query(
    `UPDATE ${USERS_TABLE} SET ${sets.join(", ")} WHERE id = ?`,
    values
  );
  return findAdminUserById(id);
}

export interface CreatePendingSignupResult {
  email: string;
  fullName: string;
  token: string;
}

/** Admin-created users stay hidden until they verify email (unless activateImmediately). */
export async function createAdminUserByAdmin(
  input: SignupInput & { role?: AdminUser["role"]; activateImmediately?: boolean }
): Promise<
  CreatePendingSignupResult & { id: number; role: AdminUser["role"]; activated: boolean }
> {
  const email = input.email.trim().toLowerCase();
  const passwordHash = await hashPassword(input.password);
  const role = input.role ?? "admin";
  const activate = Boolean(input.activateImmediately);
  const { token, expiresAt } = createEmailVerificationToken();
  const userType = await resolveRoleTypeId(role);
  const fullName = input.fullName.trim();
  const parts = fullName.split(/\s+/);
  const firstName = parts[0] ?? fullName;
  const lastName = parts.slice(1).join(" ");

  const status = activate ? 1 : 0;
  const emailVerified = activate ? 1 : 0;
  const verificationToken = activate ? null : token;
  const verificationExpires = activate ? null : expiresAt;

  const existing = await findAdminByEmail(email);
  if (existing) {
    if (Boolean(existing.email_verified)) {
      throw new Error("An account with this email already exists");
    }
    await query(
      `UPDATE ${USERS_TABLE}
       SET password = ?, first_name = ?, last_name = ?, user_type = ?,
           status = ?, email_verified = ?,
           email_verification_token = ?, email_verification_expires_at = ?,
           edit_date = NOW()
       WHERE id = ?`,
      [
        passwordHash,
        firstName,
        lastName,
        userType,
        status,
        emailVerified,
        verificationToken,
        verificationExpires,
        existing.id,
      ]
    );
    return {
      id: existing.id,
      email,
      fullName,
      token: activate ? "" : token,
      role,
      activated: activate,
    };
  }

  const result = await query<ResultSetHeader>(
    `INSERT INTO ${USERS_TABLE} (
       user_name, password, user_email, first_name, last_name,
       country_code, phone, birthday, place_birth, gender, country, user_img,
       insert_date, edit_date, user_type, status, email_verified,
       email_verification_token, email_verification_expires_at, user_id
     ) VALUES (?, ?, ?, ?, ?, '', '', '', '', '', '', '', NOW(), NOW(), ?, ?, ?, ?, ?, 0)`,
    [
      email,
      passwordHash,
      email,
      firstName,
      lastName,
      userType,
      status,
      emailVerified,
      verificationToken,
      verificationExpires,
    ]
  );

  return {
    id: Number(result.insertId),
    email,
    fullName,
    token: activate ? "" : token,
    role,
    activated: activate,
  };
}

export async function findAdminByEmail(email: string): Promise<AdminUserRow | null> {
  const rows = await query<TblUserRow[]>(
    `${USER_SELECT}
     WHERE LOWER(u.user_email) = ?
       AND ${adminUserTypeFilter("u")}
     ORDER BY u.id ASC
     LIMIT 1`,
    [email.toLowerCase()]
  );
  const row = rows[0];
  return row ? mapTblUser(row) : null;
}

export async function findAdminById(id: number): Promise<AdminUser | null> {
  const rows = await query<TblUserRow[]>(
    `${USER_SELECT}
     WHERE u.id = ?
       AND u.status = 1
       AND u.email_verified = 1
       AND ${adminUserTypeFilter("u")}
     LIMIT 1`,
    [id]
  );
  const row = rows[0];
  return row ? mapAdminUser(mapTblUser(row)) : null;
}

/**
 * First verified user becomes super_admin and is auto-verified (bootstrap).
 */
export async function createBootstrapAdminUser(input: SignupInput): Promise<AdminUser> {
  const email = input.email.trim().toLowerCase();
  const passwordHash = await hashPassword(input.password);
  const userType = await resolveRoleTypeId("super_admin");
  const fullName = input.fullName.trim();
  const parts = fullName.split(/\s+/);
  const firstName = parts[0] ?? fullName;
  const lastName = parts.slice(1).join(" ");

  const result = await query<ResultSetHeader>(
    `INSERT INTO ${USERS_TABLE} (
       user_name, password, user_email, first_name, last_name,
       country_code, phone, birthday, place_birth, gender, country, user_img,
       insert_date, edit_date, user_type, status, email_verified, user_id
     ) VALUES (?, ?, ?, ?, ?, '', '', '', '', '', '', '', NOW(), NOW(), ?, 1, 1, 0)`,
    [email, passwordHash, email, firstName, lastName, userType]
  );
  const created = await findAdminById(result.insertId);
  if (!created) {
    throw new Error("Failed to create admin user");
  }
  return created;
}

/** Creates an inactive, unverified signup pending email confirmation. */
export async function createPendingSignupAdminUser(
  input: SignupInput
): Promise<CreatePendingSignupResult> {
  const created = await createAdminUserByAdmin({ ...input, role: "admin" });
  return {
    email: created.email,
    fullName: created.fullName,
    token: created.token,
  };
}

export async function refreshEmailVerificationToken(
  email: string
): Promise<CreatePendingSignupResult | null> {
  const row = await findAdminByEmail(email.trim().toLowerCase());
  if (!row || Boolean(row.email_verified)) {
    return null;
  }

  const { token, expiresAt } = createEmailVerificationToken();
  await query(
    `UPDATE ${USERS_TABLE}
     SET email_verification_token = ?,
         email_verification_expires_at = ?,
         status = 0,
         email_verified = 0,
         edit_date = NOW()
     WHERE id = ?`,
    [token, expiresAt, row.id]
  );

  return {
    email: row.email,
    fullName: row.full_name,
    token,
  };
}

export async function deletePendingSignupByEmail(email: string): Promise<void> {
  await query(
    `DELETE FROM ${USERS_TABLE}
     WHERE LOWER(user_email) = ? AND email_verified = 0 AND status = 0
       AND ${ADMIN_USER_FILTER}`,
    [email.toLowerCase()]
  );
}

export async function verifyAdminEmailByToken(token: string): Promise<AdminUser | null> {
  const normalized = token.trim();
  if (!normalized || normalized.startsWith(PASSWORD_RESET_PREFIX)) return null;

  const rows = await query<TblUserRow[]>(
    `${USER_SELECT}
     WHERE u.email_verification_token = ?
       AND ${adminUserTypeFilter("u")}
     LIMIT 1`,
    [normalized]
  );
  const row = rows[0];
  if (!row) return null;

  const mapped = mapTblUser(row);
  if (
    mapped.email_verification_expires_at &&
    mapped.email_verification_expires_at.getTime() < Date.now()
  ) {
    return null;
  }

  await query(
    `UPDATE ${USERS_TABLE}
     SET email_verified = 1,
         status = 1,
         email_verification_token = NULL,
         email_verification_expires_at = NULL,
         edit_date = NOW()
     WHERE id = ?`,
    [mapped.id]
  );

  return findAdminById(mapped.id);
}

export interface PasswordResetRequestResult {
  email: string;
  fullName: string;
  token: string;
}

/** Issue a password-reset token for an active admin (reuses verification columns with prefix). */
export async function createAdminPasswordReset(
  email: string
): Promise<PasswordResetRequestResult | null> {
  const row = await findAdminByEmail(email.trim().toLowerCase());
  // Allow legacy admins even if email_verified was never set.
  if (!row || !Boolean(row.is_active)) {
    return null;
  }

  const { token, storedToken, expiresAt } = createPasswordResetToken();
  await query(
    `UPDATE ${USERS_TABLE}
     SET email_verification_token = ?,
         email_verification_expires_at = ?,
         edit_date = NOW()
     WHERE id = ?`,
    [storedToken, expiresAt, row.id]
  );

  return {
    email: row.email,
    fullName: row.full_name,
    token,
  };
}

export async function resetAdminPasswordByToken(
  token: string,
  newPassword: string
): Promise<AdminUser | null> {
  const normalized = token.trim();
  if (!normalized) return null;

  const storedToken = normalized.startsWith(PASSWORD_RESET_PREFIX)
    ? normalized
    : `${PASSWORD_RESET_PREFIX}${normalized}`;

  const rows = await query<TblUserRow[]>(
    `${USER_SELECT}
     WHERE u.email_verification_token = ?
       AND ${adminUserTypeFilter("u")}
     LIMIT 1`,
    [storedToken]
  );
  const row = rows[0];
  if (!row) return null;

  const mapped = mapTblUser(row);
  if (
    mapped.email_verification_expires_at &&
    mapped.email_verification_expires_at.getTime() < Date.now()
  ) {
    return null;
  }

  const passwordHash = await hashPassword(newPassword);
  await query(
    `UPDATE ${USERS_TABLE}
     SET password = ?,
         email_verified = 1,
         status = 1,
         email_verification_token = NULL,
         email_verification_expires_at = NULL,
         edit_date = NOW()
     WHERE id = ?`,
    [passwordHash, mapped.id]
  );

  return findAdminById(mapped.id);
}

async function passwordMatches(stored: string, password: string): Promise<boolean> {
  if (!stored) return false;
  if (stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$")) {
    return bcrypt.compare(password, stored);
  }
  return stored.toLowerCase() === md5(password);
}

export async function verifyAdminPassword(
  row: AdminUserRow,
  password: string
): Promise<boolean> {
  if (!Boolean(row.is_active) || !Boolean(row.email_verified)) {
    return false;
  }
  return passwordMatches(row.password_hash, password);
}

export async function passwordMatchesAdmin(
  row: AdminUserRow,
  password: string
): Promise<boolean> {
  return passwordMatches(row.password_hash, password);
}

export async function createAdminUser(input: SignupInput): Promise<AdminUser> {
  return createBootstrapAdminUser(input);
}

export async function touchAdminLastLogin(id: number): Promise<void> {
  await query(`UPDATE ${USERS_TABLE} SET login_date = NOW() WHERE id = ?`, [id]);
}

export function toAuthTokenPayload(user: AdminUser): AuthTokenPayload {
  return {
    sub: user.id,
    email: user.email,
    name: user.fullName,
    role: user.role,
  };
}

export async function listLegacyRoleKeys(): Promise<string[]> {
  const rows = await query<RowDataPacket[]>(
    `SELECT role_name FROM ${ROLES_TABLE} WHERE status = 1 ORDER BY id ASC`
  );
  return rows
    .map((row) => roleKeyFromRoleName(String(row.role_name ?? ""), ""))
    .filter(Boolean);
}
