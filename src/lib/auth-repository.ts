import bcrypt from "bcrypt";
import { BCRYPT_ROUNDS } from "./auth-config";
import { query, type QueryParam } from "./db";
import type {
  AdminUser,
  AdminUserRow,
  AuthTokenPayload,
  SignupInput,
} from "./auth-types";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

function mapAdminUser(row: AdminUserRow): AdminUser {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at.toISOString(),
    lastLoginAt: row.last_login_at?.toISOString() ?? null,
  };
}

export async function countAdminUsers(): Promise<number> {
  const rows = await query<RowDataPacket[]>(
    "SELECT COUNT(*) AS total FROM admin_users WHERE is_active = 1"
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
}

export async function getAdminUserStats(): Promise<AdminUserStats> {
  const rows = await query<RowDataPacket[]>(
    `SELECT
       COUNT(*) AS total,
       SUM(is_active = 1) AS active,
       SUM(is_active = 0) AS inactive,
       SUM(role = 'super_admin' AND is_active = 1) AS super_admins,
       SUM(is_active = 1 AND last_login_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) AS recently_active
     FROM admin_users`
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
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  const offset = (page - 1) * limit;
  const sort = params.sort ?? "created_at";
  const order = params.order === "asc" ? "ASC" : "DESC";

  const conditions: string[] = [];
  const values: QueryParam[] = [];

  if (params.search?.trim()) {
    conditions.push("(full_name LIKE ? OR email LIKE ?)");
    const term = `%${params.search.trim()}%`;
    values.push(term, term);
  }

  if (params.role && params.role !== "all") {
    conditions.push("role = ?");
    values.push(params.role);
  }

  if (params.status === "active") {
    conditions.push("is_active = 1");
  } else if (params.status === "inactive") {
    conditions.push("is_active = 0");
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const countRows = await query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM admin_users ${where}`,
    values
  );
  const total = Number(countRows[0]?.total ?? 0);

  const sortColumn =
    sort === "full_name"
      ? "full_name"
      : sort === "last_login_at"
        ? "last_login_at"
        : "created_at";

  const rows = await query<AdminUserRow[]>(
    `SELECT id, email, password_hash, full_name, role, is_active,
            created_at, updated_at, last_login_at
     FROM admin_users
     ${where}
     ORDER BY ${sortColumn} ${order}
     LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );

  return {
    users: rows.map(mapAdminUser),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function findAdminUserById(id: number): Promise<AdminUser | null> {
  const rows = await query<AdminUserRow[]>(
    `SELECT id, email, password_hash, full_name, role, is_active,
            created_at, updated_at, last_login_at
     FROM admin_users
     WHERE id = ?
     LIMIT 1`,
    [id]
  );
  const row = rows[0];
  return row ? mapAdminUser(row) : null;
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

  await query("DELETE FROM admin_users WHERE id = ?", [id]);
  return true;
}

export async function updateAdminUser(
  id: number,
  input: UpdateAdminUserInput
): Promise<AdminUser | null> {
  const sets: string[] = [];
  const values: QueryParam[] = [];

  if (input.fullName !== undefined) {
    sets.push("full_name = ?");
    values.push(input.fullName.trim());
  }
  if (input.role !== undefined) {
    sets.push("role = ?");
    values.push(input.role);
  }
  if (input.isActive !== undefined) {
    sets.push("is_active = ?");
    values.push(input.isActive ? 1 : 0);
  }

  if (!sets.length) {
    return findAdminUserById(id);
  }

  values.push(id);
  await query(`UPDATE admin_users SET ${sets.join(", ")} WHERE id = ?`, values);
  return findAdminUserById(id);
}

export async function createAdminUserByAdmin(
  input: SignupInput & { role?: AdminUser["role"] }
): Promise<AdminUser> {
  const email = input.email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const role = input.role ?? "admin";

  const result = await query<ResultSetHeader>(
    `INSERT INTO admin_users (email, password_hash, full_name, role)
     VALUES (?, ?, ?, ?)`,
    [email, passwordHash, input.fullName.trim(), role]
  );

  const created = await findAdminUserById(result.insertId);
  if (!created) {
    throw new Error("Failed to create admin user");
  }
  return created;
}

export async function findAdminByEmail(email: string): Promise<AdminUserRow | null> {
  const rows = await query<AdminUserRow[]>(
    `SELECT id, email, password_hash, full_name, role, is_active,
            created_at, updated_at, last_login_at
     FROM admin_users
     WHERE email = ?
     LIMIT 1`,
    [email.toLowerCase()]
  );
  return rows[0] ?? null;
}

export async function findAdminById(id: number): Promise<AdminUser | null> {
  const rows = await query<AdminUserRow[]>(
    `SELECT id, email, password_hash, full_name, role, is_active,
            created_at, updated_at, last_login_at
     FROM admin_users
     WHERE id = ? AND is_active = 1
     LIMIT 1`,
    [id]
  );
  const row = rows[0];
  return row ? mapAdminUser(row) : null;
}

export async function createAdminUser(input: SignupInput): Promise<AdminUser> {
  const email = input.email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const existingCount = await countAdminUsers();
  const role = existingCount === 0 ? "super_admin" : "admin";

  const result = await query<ResultSetHeader>(
    `INSERT INTO admin_users (email, password_hash, full_name, role)
     VALUES (?, ?, ?, ?)`,
    [email, passwordHash, input.fullName.trim(), role]
  );

  const created = await findAdminById(result.insertId);
  if (!created) {
    throw new Error("Failed to create admin user");
  }
  return created;
}

export async function verifyAdminPassword(
  row: AdminUserRow,
  password: string
): Promise<boolean> {
  if (!Boolean(row.is_active)) {
    return false;
  }
  return bcrypt.compare(password, row.password_hash);
}

export async function touchAdminLastLogin(id: number): Promise<void> {
  await query("UPDATE admin_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?", [
    id,
  ]);
}

export function toAuthTokenPayload(user: AdminUser): AuthTokenPayload {
  return {
    sub: user.id,
    email: user.email,
    name: user.fullName,
    role: user.role,
  };
}
