import {
  deleteSettingBlob,
  getSettingBlobById,
  insertSettingBlob,
  listSettingBlobs,
  updateSettingBlob,
} from "./legacy-settings-store";
import { SETTINGS_BLOB } from "./legacy-tables";

/**
 * Per-record fields that a legacy table has no column for, stored as one tbl_settings
 * JSON row per record (logical id = the record's id).
 */
function createExtrasStore<T extends object>(settingType: string, namePrefix: string) {
  async function get(recordId: number): Promise<T> {
    const blob = await getSettingBlobById<T>(settingType, recordId);
    if (!blob) return {} as T;
    const { id: _id, _rowId: _row, ...extras } = blob;
    return extras as T;
  }

  async function getMap(recordIds: number[]): Promise<Map<number, T>> {
    if (!recordIds.length) return new Map();
    const wanted = new Set(recordIds);
    const blobs = await listSettingBlobs<T>(settingType);
    const map = new Map<number, T>();
    for (const { id, _rowId: _row, ...extras } of blobs) {
      if (wanted.has(id)) map.set(id, extras as T);
    }
    return map;
  }

  async function save(recordId: number, patch: Partial<T>): Promise<void> {
    const defined = Object.fromEntries(
      Object.entries(patch).filter(([, value]) => value !== undefined)
    );
    if (!Object.keys(defined).length) return;
    const existing = await getSettingBlobById<T>(settingType, recordId);
    if (existing) {
      const { id: _id, _rowId: _row, ...current } = existing;
      await updateSettingBlob(settingType, recordId, { ...current, ...defined, id: recordId });
      return;
    }
    await insertSettingBlob(settingType, `${namePrefix}${recordId}`, { ...defined, id: recordId });
  }

  async function remove(recordId: number): Promise<void> {
    await deleteSettingBlob(settingType, recordId);
  }

  return { get, getMap, save, remove };
}

export type PostExtras = {
  excerpt?: string | null;
  author_name?: string | null;
  tags?: string[];
  related_package_ids?: number[];
  display_order?: number;
  show_in_nav?: boolean;
  updated_by?: string | null;
  /** Full publish datetime; tbl_post.auto_schedule_date is a DATE column. */
  scheduled_at?: string | null;
};

export type CategoryExtras = {
  display_order?: number;
  is_featured?: boolean;
  icon_path?: string | null;
  updated_by?: string | null;
};

const postExtras = createExtrasStore<PostExtras>(SETTINGS_BLOB.postExtras, "post_");
const categoryExtras = createExtrasStore<CategoryExtras>(SETTINGS_BLOB.categoryExtras, "category_");

export const getPostExtras = postExtras.get;
export const getPostExtrasMap = postExtras.getMap;
export const savePostExtras = postExtras.save;
export const deletePostExtras = postExtras.remove;

export const getCategoryExtras = categoryExtras.get;
export const getCategoryExtrasMap = categoryExtras.getMap;
export const saveCategoryExtras = categoryExtras.save;
export const deleteCategoryExtras = categoryExtras.remove;
