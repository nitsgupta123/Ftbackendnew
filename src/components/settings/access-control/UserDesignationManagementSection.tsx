import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Icon } from "@/components/ui/icons";
import type { EmployeeProfile, ManageableUser } from "./types";

type UserDesignationManagementSectionProps = {
  canManage: boolean;
  search: string;
  roleFilter: string;
  statusFilter: string;
  availableRoles: string[];
  filteredUsers: ManageableUser[];
  employeeProfiles: Record<number, EmployeeProfile>;
  formatRoleLabel: (role: string) => string;
  onSearchChange: (value: string) => void;
  onRoleFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onProfileChange: (userId: number, patch: Partial<EmployeeProfile>) => void;
  onRoleChange: (userId: number, role: string) => void;
  onManageAccess: (userId: number) => void;
};

export default function UserDesignationManagementSection({
  canManage,
  search,
  roleFilter,
  statusFilter,
  availableRoles,
  filteredUsers,
  employeeProfiles,
  formatRoleLabel,
  onSearchChange,
  onRoleFilterChange,
  onStatusFilterChange,
  onProfileChange,
  onRoleChange,
  onManageAccess,
}: UserDesignationManagementSectionProps) {
  return (
    <div className="rounded-xl border border-[#E8ECF0] bg-white shadow-sm">
      <div className="px-4 py-3 border-b border-[#E8ECF0] bg-gradient-to-r from-[#FFFCF7] via-white to-white">
        <h3 className="text-sm font-semibold text-[#1F2A44]">User Management Directory</h3>
        <p className="text-xs text-gray-500 mt-1">
          Manage employee role, status, access level, and direct access panel controls.
        </p>
      </div>
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          <div className="relative">
            <Icon
              name="Search"
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search name, email..."
              className="h-10 border-[#E5E7EB] pl-9"
            />
          </div>
          <NativeSelect
            value={roleFilter}
            onChange={(e) => onRoleFilterChange(e.target.value)}
            className="h-10 border-[#E5E7EB]"
          >
            <option value="all">All Roles</option>
            {availableRoles.map((role) => (
              <option key={role} value={role}>
                {formatRoleLabel(role)}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="h-10 border-[#E5E7EB]"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </NativeSelect>
        </div>

        <div className="overflow-x-auto overscroll-x-contain">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-[#E8ECF0] bg-[#FAFBFC]">
                <th className="sticky left-0 z-20 bg-[#FAFBFC] px-3 py-2.5">Name</th>
                <th className="px-3 py-2.5">Email</th>
                <th className="px-3 py-2.5">Role</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Access Level</th>
                <th className="sticky right-0 z-20 bg-[#FAFBFC] px-3 py-2.5 text-right">Manage Access</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((userRow) => {
                const profile = employeeProfiles[userRow.id];
                return (
                  <tr
                    key={userRow.id}
                    className="border-b border-[#EEF1F4] transition-colors hover:bg-[#FFFCF5]"
                  >
                    <td className="sticky left-0 z-10 bg-white px-3 py-2.5 font-medium text-[#1F2A44]">{userRow.fullName}</td>
                    <td className="px-3 py-2.5 text-gray-600">{userRow.email}</td>
                    <td className="px-3 py-2.5">
                      <NativeSelect
                        value={userRow.role}
                        className="h-8 border-[#E5E7EB]"
                        disabled={!canManage}
                        onChange={(e) => onRoleChange(userRow.id, e.target.value)}
                      >
                        {availableRoles.map((role) => (
                          <option key={role} value={role}>
                            {formatRoleLabel(role)}
                          </option>
                        ))}
                      </NativeSelect>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
                          userRow.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {userRow.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <NativeSelect
                        value={profile?.accessLevel ?? "Standard"}
                        className="h-8 border-[#E5E7EB]"
                        disabled={!canManage}
                        onChange={(e) =>
                          onProfileChange(userRow.id, { accessLevel: e.target.value })
                        }
                      >
                        <option value="Standard">Standard</option>
                        <option value="Advanced">Advanced</option>
                        <option value="Restricted">Restricted</option>
                      </NativeSelect>
                    </td>
                    <td className="sticky right-0 z-10 bg-white px-3 py-2.5 text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-md border-[#E7BD58] bg-white px-3 text-[11px] font-semibold text-[#B5881E] hover:bg-[#FFF9EA] hover:text-[#9C741B]"
                        onClick={() => onManageAccess(userRow.id)}
                      >
                        Manage Access
                        <Icon name="ArrowLeft" size={12} className="ml-1 rotate-180" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
