import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { formatPackageDate } from "@/lib/format-date";
import type { RoleMeta } from "./types";

type RoleManagementSectionProps = {
  canManage: boolean;
  loading: boolean;
  saving: boolean;
  dirty: boolean;
  availableRoles: string[];
  selectedRole: string;
  roleMeta: Record<string, RoleMeta>;
  usersByRole: Map<string, number>;
  protectedRoles: Set<string>;
  formatRoleLabel: (role: string) => string;
  onOpenRoleModal: (roleKey?: string) => void;
  onResetDefaults: () => void;
  onSave: () => void;
  onApplyRole: (role: string) => void;
  onDuplicateRole: (role: string) => void;
  onDeleteRequest: (role: string) => void;
};

export default function RoleManagementSection({
  canManage,
  loading,
  saving,
  dirty,
  availableRoles,
  selectedRole,
  roleMeta,
  usersByRole,
  protectedRoles,
  formatRoleLabel,
  onOpenRoleModal,
  onResetDefaults,
  onSave,
  onApplyRole,
  onDuplicateRole,
  onDeleteRequest,
}: RoleManagementSectionProps) {
  return (
    <div className="px-5 py-4 border-b border-[#E8ECF0] bg-gradient-to-r from-[#FFFCF7] via-white to-white">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#1F2A44]">Role Management</h2>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            Super Admin controls role creation, assignment, metadata, and module access defaults.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 shrink-0 lg:w-auto">
          <Link to="/settings/user-management">
            <Button variant="outline" className="h-10 w-full rounded-lg px-4 border-[#E5E7EB] sm:w-auto">
              <Icon name="UserCog" size={16} className="mr-2" />
              Manage users
            </Button>
          </Link>
          {canManage && (
            <Button
              type="button"
              className="h-10 w-full rounded-lg px-4 bg-[#A68231] text-white hover:opacity-90 sm:w-auto"
              onClick={() => onOpenRoleModal()}
            >
              <Icon name="Plus" size={16} className="mr-2" />
              Add New Role
            </Button>
          )}
          {canManage && (
            <>
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full rounded-lg px-4 border-[#E5E7EB] sm:w-auto"
                disabled={loading || saving}
                onClick={onResetDefaults}
              >
                Reset defaults
              </Button>
              <Button
                type="button"
                className="h-10 w-full rounded-lg px-4 bg-[#A68231] text-white hover:opacity-90 sm:w-auto"
                disabled={loading || saving || !dirty}
                onClick={onSave}
              >
                {saving ? (
                  <>
                    <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Icon name="Save" size={16} className="mr-2" />
                    Save role permissions
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto overscroll-x-contain">
        <table className="w-full min-w-[920px]">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="sticky left-0 z-20 bg-white px-2 py-2">Role Name</th>
              <th className="px-2 py-2">Users</th>
              <th className="px-2 py-2">Description</th>
              <th className="px-2 py-2">Department</th>
              <th className="px-2 py-2">Designation</th>
              <th className="px-2 py-2">Created By</th>
              <th className="px-2 py-2">Created Date</th>
              <th className="sticky right-0 z-20 bg-white px-2 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {availableRoles.map((role) => {
              const active = selectedRole === role;
              const meta = roleMeta[role];
              const createdDate = formatPackageDate(meta?.createdDate);
              const protectedRole = protectedRoles.has(role);
              return (
                <tr
                  key={role}
                  className={`border-t border-[#EEF1F4] text-sm ${
                    active ? "bg-[#FFF9EB]/50" : ""
                  }`}
                >
                  <td className="sticky left-0 z-10 bg-white px-2 py-2">
                    <button
                      type="button"
                      onClick={() => onApplyRole(role)}
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ring-1 ring-inset ${
                        active
                          ? "bg-[#A68231] text-white ring-[#A68231]"
                          : "bg-white text-gray-600 ring-[#E5E7EB]"
                      }`}
                    >
                      <Icon name={protectedRole ? "Shield" : "User"} size={13} />
                      {formatRoleLabel(role)}
                    </button>
                  </td>
                  <td className="px-2 py-2 text-[#1F2A44]">{usersByRole.get(role) ?? 0}</td>
                  <td className="px-2 py-2 text-gray-600">{meta?.description ?? "—"}</td>
                  <td className="px-2 py-2 text-gray-600">{meta?.department ?? "General"}</td>
                  <td className="px-2 py-2 text-gray-600">
                    {meta?.designation ?? "Team Member"}
                  </td>
                  <td className="px-2 py-2 text-gray-600">{meta?.createdBy ?? "System"}</td>
                  <td className="px-2 py-2 text-gray-600">{createdDate}</td>
                  <td className="sticky right-0 z-10 bg-white px-2 py-2">
                    <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => onOpenRoleModal(role)}
                        disabled={!canManage}
                      >
                        <Icon name="Pencil" size={13} className="mr-1" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => onDuplicateRole(role)}
                        disabled={!canManage}
                      >
                        <Icon name="Copy" size={13} className="mr-1" />
                        Duplicate
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => onDeleteRequest(role)}
                        disabled={!canManage || protectedRole}
                      >
                        <Icon name="Trash2" size={13} className="mr-1" />
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
