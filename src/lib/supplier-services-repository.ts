import { getJsonSetting, setJsonSetting } from "./legacy-settings-store";
import { SETTINGS_BLOB } from "./legacy-tables";
import { isPresetSupplierService, type CustomSupplierService } from "./supplier-types";

const NAME = "custom_services";

export async function listCustomSupplierServices(): Promise<CustomSupplierService[]> {
  const stored = await getJsonSetting<CustomSupplierService[]>(
    SETTINGS_BLOB.supplierCatalog,
    NAME,
    []
  );
  return Array.isArray(stored) ? stored : [];
}

export async function addCustomSupplierService(
  input: CustomSupplierService
): Promise<CustomSupplierService[]> {
  const existing = await listCustomSupplierServices();
  const name = input.name.trim();
  if (
    isPresetSupplierService(name) ||
    existing.some((item) => item.name.toLowerCase() === name.toLowerCase())
  ) {
    return existing;
  }
  const next = [...existing, { name, slug: input.slug.trim() }];
  await setJsonSetting(SETTINGS_BLOB.supplierCatalog, NAME, next);
  return next;
}
