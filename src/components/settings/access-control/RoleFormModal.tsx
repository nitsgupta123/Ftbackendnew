"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ManageableUser } from "./types";

type RoleFormState = {
  roleName: string;
  description: string;
  department: string;
  designation: string;
  assignUsers: number[];
};

type RoleFormModalProps = {
  open: boolean;
  editingRoleKey: string | null;
  roleForm: RoleFormState;
  allUsers: ManageableUser[];
  showDepartmentAndDesignation?: boolean;
  roleNameDisabled?: boolean;
  isSaving?: boolean;
  onClose: () => void;
  onRoleFormChange: (next: RoleFormState) => void;
  onSubmit: () => void;
};

export default function RoleFormModal({
  open,
  editingRoleKey,
  roleForm,
  allUsers,
  showDepartmentAndDesignation = true,
  roleNameDisabled = false,
  isSaving = false,
  onClose,
  onRoleFormChange,
  onSubmit,
}: RoleFormModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-3 sm:p-4">
      <div className="w-full max-w-xl max-h-[calc(100vh-1.5rem)] overflow-y-auto rounded-2xl border border-[#E5E7EB] bg-white shadow-xl sm:max-h-[calc(100vh-2rem)]">
        <div className="border-b border-[#E8ECF0] px-5 py-4">
          <h3 className="text-lg font-semibold text-[#1F2A44]">
            {editingRoleKey ? "Edit Role" : "Add New Role"}
          </h3>
        </div>
        <div className="space-y-3 px-5 py-4">
          <div className={`grid grid-cols-1 ${showDepartmentAndDesignation ? "md:grid-cols-2" : ""} gap-3`}>
            <Input
              placeholder="Role Name"
              value={roleForm.roleName}
              onChange={(e) => onRoleFormChange({ ...roleForm, roleName: e.target.value })}
              disabled={roleNameDisabled}
              className="h-10 border-[#E5E7EB]"
            />
            {showDepartmentAndDesignation && (
              <Input
                placeholder="Designation"
                value={roleForm.designation}
                onChange={(e) => onRoleFormChange({ ...roleForm, designation: e.target.value })}
                className="h-10 border-[#E5E7EB]"
              />
            )}
          </div>
          {showDepartmentAndDesignation && (
            <Input
              placeholder="Department"
              value={roleForm.department}
              onChange={(e) => onRoleFormChange({ ...roleForm, department: e.target.value })}
              className="h-10 border-[#E5E7EB]"
            />
          )}
          <textarea
            placeholder="Role Description"
            value={roleForm.description}
            onChange={(e) => onRoleFormChange({ ...roleForm, description: e.target.value })}
            className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#B48A2C]/20"
            rows={3}
          />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
              Assign Users
            </p>
            <div className="max-h-40 overflow-auto rounded-lg border border-[#E8ECF0] p-2">
              {allUsers.map((userRow) => {
                const checked = roleForm.assignUsers.includes(userRow.id);
                return (
                  <label key={userRow.id} className="flex items-center gap-2 px-2 py-1 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        onRoleFormChange({
                          ...roleForm,
                          assignUsers: e.target.checked
                            ? [...roleForm.assignUsers, userRow.id]
                            : roleForm.assignUsers.filter((id) => id !== userRow.id),
                        })
                      }
                    />
                    <span>{userRow.fullName}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex flex-col-reverse justify-end gap-2 border-t border-[#E8ECF0] px-5 py-4 sm:flex-row">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-[#A68231] text-white hover:opacity-90"
            onClick={onSubmit}
            disabled={isSaving}
          >
            {isSaving
              ? "Saving…"
              : editingRoleKey
                ? "Update Role"
                : "Create Role"}
          </Button>
        </div>
      </div>
    </div>
  );
}
