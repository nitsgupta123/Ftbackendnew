"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Switch } from "@/components/ui/switch";
import type {
  EmployeeProfile,
  ExtendedPermission,
  ManageableUser,
  ModuleGroupSection,
  PermissionKey,
} from "./types";

function extendedEqual(a: ExtendedPermission, b: ExtendedPermission): boolean {
  return (
    a.moduleKey === b.moduleKey &&
    a.canView === b.canView &&
    a.canCreate === b.canCreate &&
    a.canEdit === b.canEdit &&
    a.canDelete === b.canDelete &&
    a.canApprove === b.canApprove
  );
}

type EmployeeAccessDrawerProps = {
  canManage: boolean;
  employee: ManageableUser | null;
  employeeProfiles: Record<number, EmployeeProfile>;
  selectedEmployeeHasOverrides: boolean;
  selectedEmployeeOverrides: Record<string, ExtendedPermission>;
  rolePermissions: Record<string, ExtendedPermission[]>;
  fallbackPermissions: ExtendedPermission[];
  modulesByGroup: ModuleGroupSection[];
  formatRoleLabel: (role: string) => string;
  loading?: boolean;
  saving?: boolean;
  onClose: () => void;
  onTogglePermission: (moduleKey: string, field: PermissionKey, value: boolean) => void;
  onResetDefaults: () => void;
  onSave: () => void;
};

export default function EmployeeAccessDrawer({
  canManage,
  employee,
  employeeProfiles,
  selectedEmployeeHasOverrides,
  selectedEmployeeOverrides,
  rolePermissions,
  fallbackPermissions,
  modulesByGroup,
  formatRoleLabel,
  loading = false,
  saving = false,
  onClose,
  onTogglePermission,
  onResetDefaults,
  onSave,
}: EmployeeAccessDrawerProps) {
  if (!employee) return null;

  const controlsDisabled = !canManage || loading || saving;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20">
      <div className="flex h-full w-full max-w-full flex-col bg-white shadow-2xl border-l border-[#E5E7EB] sm:max-w-2xl">
        <div className="shrink-0 z-30 border-b border-[#E8ECF0] bg-white px-5 py-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-[#1F2A44]">Manage Access</h3>
              <p className="text-sm text-gray-500 mt-1 break-words">
                Employee Name: {employee.fullName} | Designation:{" "}
                {employeeProfiles[employee.id]?.designation ?? "—"} | Department:{" "}
                {employeeProfiles[employee.id]?.department ?? "—"} | Assigned Role:{" "}
                {formatRoleLabel(employee.role)}
              </p>
            </div>
            <Button type="button" size="icon-sm" onClick={onClose} disabled={saving}>
              <Icon name="X" size={14} />
            </Button>
          </div>
          {selectedEmployeeHasOverrides && (
            <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Warning: Individual permissions differ from assigned role defaults.
            </div>
          )}
          {loading && (
            <div className="mt-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
              Loading employee permissions...
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-auto overscroll-contain p-5">
          <div className="rounded-xl border border-[#E8ECF0] bg-white">
            <table className="w-full min-w-[760px] border-separate border-spacing-0 text-sm">
              <thead className="sticky top-0 z-20">
                <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="border-b border-[#E8ECF0] bg-[#FAFBFC] px-3 py-2.5 font-semibold">
                    Module
                  </th>
                  <th className="border-b border-[#E8ECF0] bg-[#FAFBFC] px-3 py-2.5 text-center font-semibold">
                    View
                  </th>
                  <th className="border-b border-[#E8ECF0] bg-[#FAFBFC] px-3 py-2.5 text-center font-semibold">
                    Create
                  </th>
                  <th className="border-b border-[#E8ECF0] bg-[#FAFBFC] px-3 py-2.5 text-center font-semibold">
                    Edit
                  </th>
                  <th className="border-b border-[#E8ECF0] bg-[#FAFBFC] px-3 py-2.5 text-center font-semibold">
                    Delete
                  </th>
                  <th className="border-b border-[#E8ECF0] bg-[#FAFBFC] px-3 py-2.5 text-center font-semibold">
                    Approve
                  </th>
                  <th className="border-b border-[#E8ECF0] bg-[#FAFBFC] px-3 py-2.5 font-semibold">
                    Source
                  </th>
                </tr>
              </thead>
              <tbody>
                {modulesByGroup.flatMap((group) => [
                  <tr key={`${group.group}-title`}>
                    <td
                      colSpan={7}
                      className="border-b border-[#E8ECF0] bg-[#F3F5F7] px-3 py-2 text-sm font-semibold text-[#1F2A44]"
                    >
                      {group.title}
                    </td>
                  </tr>,
                  ...group.modules.map((mod) => {
                    const roleDefault =
                      (rolePermissions[employee.role] ?? fallbackPermissions).find(
                        (perm) => perm.moduleKey === mod.key
                      ) ?? null;
                    const custom = selectedEmployeeOverrides[mod.key];
                    const effective = custom ?? roleDefault;
                    if (!effective || !roleDefault) return null;
                    const isCustom = Boolean(custom) && !extendedEqual(custom, roleDefault);
                    return (
                      <tr key={`${employee.id}-${mod.key}`} className="bg-white">
                        <td className="border-b border-[#EEF1F4] px-3 py-2 font-medium text-[#1F2A44]">
                          {mod.label}
                        </td>
                        {(
                          ["canView", "canCreate", "canEdit", "canDelete", "canApprove"] as const
                        ).map((field) => (
                          <td
                            key={field}
                            className="border-b border-[#EEF1F4] px-3 py-2 text-center"
                          >
                            <div className="inline-flex">
                              <Switch
                                checked={Boolean(effective[field])}
                                disabled={controlsDisabled}
                                onCheckedChange={(checked) =>
                                  onTogglePermission(mod.key, field, checked)
                                }
                                className="data-checked:bg-[#A68231]"
                              />
                            </div>
                          </td>
                        ))}
                        <td className="border-b border-[#EEF1F4] px-3 py-2 text-xs">
                          <span
                            className={`rounded-full px-2 py-0.5 ${
                              isCustom
                                ? "bg-[#FFF1CC] text-[#7A6226]"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {isCustom ? "Custom Permission" : "Inherited from Role"}
                          </span>
                        </td>
                      </tr>
                    );
                  }),
                ])}
              </tbody>
            </table>
          </div>
        </div>

        <div className="shrink-0 z-30 border-t border-[#E8ECF0] bg-white px-5 py-4 flex flex-col-reverse items-stretch justify-between gap-2 sm:flex-row sm:items-center">
          <Button
            type="button"
            variant="outline"
            onClick={onResetDefaults}
            disabled={controlsDisabled || !selectedEmployeeHasOverrides}
          >
            Reset to Role Defaults
          </Button>
          <Button
            type="button"
            className="bg-[#A68231] text-white hover:opacity-90"
            onClick={onSave}
            disabled={controlsDisabled}
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
