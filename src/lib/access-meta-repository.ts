import { randomUUID } from "node:crypto";
import { getJsonSetting, setJsonSetting } from "./legacy-settings-store";
import { SETTINGS_BLOB } from "./legacy-tables";
import { nowIsoSgt } from "./format-date";

export type StoredRoleMeta = {
  key: string;
  description: string;
  department: string;
  designation: string;
  createdBy: string;
  createdByName?: string;
  createdDate: string;
  updatedBy?: string;
  updatedByName?: string;
  updatedAt?: string;
};

export type StoredEmployeeProfile = {
  designation: string;
  department: string;
  accessLevel: string;
};

export type StoredActivityItem = {
  id: string;
  actor: string;
  employee: string;
  permission: string;
  previousAccess: string;
  newAccess: string;
  createdAt: string;
};

const ROLE_META = "role_meta";
const EMPLOYEE_PROFILES = "employee_profiles";
const ACTIVITY = "access_activity";
/** Keeps the serialized log well under the 64 KB tbl_settings.setting_content TEXT limit. */
const ACTIVITY_LIMIT = 100;

const TYPE = SETTINGS_BLOB.accessControl;

export async function getRoleMetaMap(): Promise<Record<string, StoredRoleMeta>> {
  return getJsonSetting<Record<string, StoredRoleMeta>>(TYPE, ROLE_META, {});
}

export async function upsertRoleMeta(
  role: string,
  input: Omit<StoredRoleMeta, "key" | "createdBy" | "createdByName" | "createdDate" | "updatedAt" | "updatedBy" | "updatedByName">,
  actor: { label: string; name: string }
): Promise<StoredRoleMeta> {
  const map = await getRoleMetaMap();
  const existing = map[role];
  const now = nowIsoSgt();
  const next: StoredRoleMeta = {
    key: role,
    description: input.description,
    department: input.department,
    designation: input.designation,
    createdBy: existing?.createdBy ?? actor.label,
    createdByName: existing?.createdByName ?? actor.name,
    createdDate: existing?.createdDate ?? now,
    updatedBy: actor.label,
    updatedByName: actor.name,
    updatedAt: now,
  };
  await setJsonSetting(TYPE, ROLE_META, { ...map, [role]: next });
  return next;
}

export async function renameRoleMeta(currentRole: string, nextRole: string): Promise<void> {
  const map = await getRoleMetaMap();
  if (!map[currentRole]) return;
  const { [currentRole]: meta, ...rest } = map;
  await setJsonSetting(TYPE, ROLE_META, { ...rest, [nextRole]: { ...meta, key: nextRole } });
}

export async function deleteRoleMeta(role: string): Promise<void> {
  const map = await getRoleMetaMap();
  if (!map[role]) return;
  const { [role]: _removed, ...rest } = map;
  await setJsonSetting(TYPE, ROLE_META, rest);
}

export async function getEmployeeProfiles(): Promise<Record<string, StoredEmployeeProfile>> {
  return getJsonSetting<Record<string, StoredEmployeeProfile>>(TYPE, EMPLOYEE_PROFILES, {});
}

export async function upsertEmployeeProfile(
  userId: number,
  profile: StoredEmployeeProfile
): Promise<StoredEmployeeProfile> {
  const map = await getEmployeeProfiles();
  await setJsonSetting(TYPE, EMPLOYEE_PROFILES, { ...map, [String(userId)]: profile });
  return profile;
}

export async function deleteEmployeeProfile(userId: number): Promise<void> {
  const map = await getEmployeeProfiles();
  if (!map[String(userId)]) return;
  const { [String(userId)]: _removed, ...rest } = map;
  await setJsonSetting(TYPE, EMPLOYEE_PROFILES, rest);
}

export async function listAccessActivity(): Promise<StoredActivityItem[]> {
  return getJsonSetting<StoredActivityItem[]>(TYPE, ACTIVITY, []);
}

export async function appendAccessActivity(
  entries: Array<Omit<StoredActivityItem, "id" | "createdAt">>
): Promise<StoredActivityItem[]> {
  const now = nowIsoSgt();
  const created = entries.map((entry) => ({ ...entry, id: randomUUID(), createdAt: now }));
  const existing = await listAccessActivity();
  const next = [...created, ...existing].slice(0, ACTIVITY_LIMIT);
  await setJsonSetting(TYPE, ACTIVITY, next);
  return created;
}
