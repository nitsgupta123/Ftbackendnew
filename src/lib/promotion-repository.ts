import {
  deleteSettingBlob,
  getSettingBlobById,
  insertSettingBlob,
  listSettingBlobs,
  updateSettingBlob,
} from "./legacy-settings-store";
import { SETTINGS_BLOB } from "./legacy-tables";
import { nowIsoSgt } from "./format-date";
import type { PromotionInput, PromotionRecord, PromotionStatus } from "./promotion-types";

function strip(blob: PromotionRecord & {
  _rowId?: number;
  valid_from?: string | null;
  valid_to?: string | null;
}): PromotionRecord {
  const { _rowId: _ignored, valid_from, valid_to, ...rest } = blob;
  return {
    ...rest,
    // Older blobs only had a single validity window — treat it as the booking window.
    booking_from: rest.booking_from ?? valid_from ?? null,
    booking_to: rest.booking_to ?? valid_to ?? null,
    travel_from: rest.travel_from ?? null,
    travel_to: rest.travel_to ?? null,
  };
}

export async function listPromotions(): Promise<PromotionRecord[]> {
  const blobs = await listSettingBlobs<PromotionRecord>(SETTINGS_BLOB.promotion);
  return blobs
    .map(strip)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)) || b.id - a.id);
}

export async function getPromotionById(id: number): Promise<PromotionRecord | null> {
  const blob = await getSettingBlobById<PromotionRecord>(SETTINGS_BLOB.promotion, id);
  return blob ? strip(blob) : null;
}

export async function createPromotion(input: PromotionInput): Promise<PromotionRecord> {
  const now = nowIsoSgt();
  const draft = { ...input, created_at: now, updated_at: now };
  const id = await insertSettingBlob(SETTINGS_BLOB.promotion, input.title, draft);
  const created = await getPromotionById(id);
  if (!created) throw new Error("Promotion was not saved");
  return created;
}

export async function updatePromotion(
  id: number,
  input: PromotionInput
): Promise<PromotionRecord | null> {
  const existing = await getPromotionById(id);
  if (!existing) return null;
  const next: PromotionRecord = {
    ...input,
    id,
    created_at: existing.created_at,
    updated_at: nowIsoSgt(),
  };
  await updateSettingBlob(SETTINGS_BLOB.promotion, id, next);
  return getPromotionById(id);
}

export async function setPromotionStatus(
  id: number,
  status: PromotionStatus
): Promise<PromotionRecord | null> {
  const existing = await getPromotionById(id);
  if (!existing) return null;
  await updateSettingBlob(SETTINGS_BLOB.promotion, id, {
    ...existing,
    status,
    updated_at: nowIsoSgt(),
  });
  return getPromotionById(id);
}

export async function deletePromotion(id: number): Promise<boolean> {
  return deleteSettingBlob(SETTINGS_BLOB.promotion, id);
}
