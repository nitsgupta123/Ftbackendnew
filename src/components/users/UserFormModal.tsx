"use client";

import { useState, type FormEvent } from "react";
import type { AdminUser } from "@/lib/auth-types";
import type { CreateUserFormValues } from "@/lib/auth-validation";
import { formatRoleLabel, ROLE_LABELS } from "@/lib/user-types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
interface UserFormModalProps {
  mode: "create" | "edit";
  initialUser?: AdminUser | null;
  availableRoles?: string[];
  onRoleAdded?: (role: string) => void;
  isSaving?: boolean;
  onSubmit: (data: CreateUserFormValues | {
    fullName: string;
    role: AdminUser["role"];
    isActive: boolean;
  }) => void;
  onCancel: () => void;
}
export default function UserFormModal({
  mode,
  initialUser,
  availableRoles = [],
  onRoleAdded,
  isSaving = false,
  onSubmit,
  onCancel
}: UserFormModalProps) {
  const [fullName, setFullName] = useState(initialUser?.fullName ?? "");
  const [email, setEmail] = useState(initialUser?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AdminUser["role"]>(initialUser?.role ?? "admin");
  const [roleOptions, setRoleOptions] = useState<string[]>(() => {
    const base = ["admin", "super_admin", ...availableRoles, initialUser?.role ?? ""];
    return Array.from(new Set(base.filter(Boolean)));
  });
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRoleDraft, setNewRoleDraft] = useState("");
  const [isActive, setIsActive] = useState(initialUser?.isActive ?? true);
  const [roleError, setRoleError] = useState<string | null>(null);

  function normalizeRole(input: string): string {
    return input.trim().toLowerCase().replace(/\s+/g, "_");
  }

  function addRole() {
    const normalized = normalizeRole(newRoleDraft);
    if (!normalized) {
      setRoleError("Role is required");
      return;
    }
    if (!/^[a-z][a-z0-9_]*$/.test(normalized)) {
      setRoleError("Use lowercase letters, numbers, and underscore only");
      return;
    }
    if (normalized.length > 60) {
      setRoleError("Role is too long");
      return;
    }
    if (roleOptions.includes(normalized)) {
      setRole(normalized);
      setShowAddRole(false);
      setNewRoleDraft("");
      setRoleError(null);
      return;
    }
    setRoleOptions((prev) => [...prev, normalized]);
    onRoleAdded?.(normalized);
    setRole(normalized);
    setShowAddRole(false);
    setNewRoleDraft("");
    setRoleError(null);
  }
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (mode === "create") {
      onSubmit({
        fullName,
        email,
        password,
        role
      });
    } else {
      onSubmit({
        fullName,
        role,
        isActive
      });
    }
  }
  return <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label className="block text-sm font-medium text-gray-700 mb-1.5">Full name</Label>
        <Input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required className="w-full h-10 px-3 rounded-lg border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/30 focus:border-[#B48A2C]" />
        
      </div>

      {mode === "create" && <>
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1.5">Email</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full h-10 px-3 rounded-lg border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/30 focus:border-[#B48A2C]" />
          
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1.5">Password</Label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} className="w-full h-10 px-3 rounded-lg border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/30 focus:border-[#B48A2C]" />
          
            <p className="mt-1 text-xs text-gray-400">
              At least 8 characters with a letter and a number.
            </p>
          </div>
        </>}

      {mode === "edit" && <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1.5">Email</Label>
          <Input type="email" value={email} disabled className="w-full h-10 px-3 rounded-lg border border-[#E5E7EB] bg-gray-50 text-sm text-gray-500" />
        
        </div>}

      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <Label className="block text-sm font-medium text-gray-700">Role</Label>
          <button
            type="button"
            onClick={() => {
              setShowAddRole((prev) => !prev);
              setRoleError(null);
            }}
            className="text-xs font-semibold text-[#A68231] hover:underline"
          >
            + Add Role
          </button>
        </div>
        <NativeSelect value={role} onChange={e => setRole(e.target.value as AdminUser["role"])} className="w-full h-10 px-3 rounded-lg border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/30 focus:border-[#B48A2C]">
          {roleOptions.map((roleOption) => (
            <option key={roleOption} value={roleOption}>
              {ROLE_LABELS[roleOption] ?? formatRoleLabel(roleOption)}
            </option>
          ))}
        </NativeSelect>
        {showAddRole && (
          <div className="mt-2 flex flex-col items-stretch gap-2 sm:flex-row sm:items-start">
            <Input
              type="text"
              value={newRoleDraft}
              onChange={(e) => {
                setNewRoleDraft(e.target.value);
                setRoleError(null);
              }}
              placeholder="e.g. operations_manager"
              className="h-10 text-sm"
            />
            <Button
              type="button"
              className="h-10 w-full px-3 text-xs font-semibold bg-[#A68231] text-white hover:bg-[#A68231]/90 sm:w-auto"
              onClick={addRole}
            >
              Add
            </Button>
          </div>
        )}
        {showAddRole && !roleError && (
          <p className="mt-1 text-xs text-gray-500">
            New role will be set for this user and follows Admin default access.
          </p>
        )}
        {roleError && (
          <p className="mt-1 text-xs text-red-600">{roleError}</p>
        )}
      </div>

      {mode === "edit" && <Label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-[#B48A2C] focus:ring-[#B48A2C]" />
        
          Account is active
        </Label>}

      <div className="flex flex-col-reverse items-stretch justify-end gap-2 pt-2 sm:flex-row sm:items-center">
        <Button type="button" onClick={onCancel} disabled={isSaving} className="h-10 px-4 rounded-lg border border-[#E5E7EB] text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
          
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving} className="h-10 px-5 rounded-lg text-sm font-semibold text-white bg-[#B48A2C] hover:bg-[#B48A2C]/90 disabled:opacity-50">
          
          {isSaving ? "Saving…" : mode === "create" ? "Create User" : "Save Changes"}
        </Button>
      </div>
    </form>;
}
