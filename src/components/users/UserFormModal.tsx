"use client";

import { useState, type FormEvent } from "react";
import type { AdminUser } from "@/lib/auth-types";
import type { CreateUserFormValues } from "@/lib/auth-validation";
import { ROLE_LABELS } from "@/lib/user-types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
interface UserFormModalProps {
  mode: "create" | "edit";
  initialUser?: AdminUser | null;
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
  isSaving = false,
  onSubmit,
  onCancel
}: UserFormModalProps) {
  const [fullName, setFullName] = useState(initialUser?.fullName ?? "");
  const [email, setEmail] = useState(initialUser?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AdminUser["role"]>(initialUser?.role ?? "admin");
  const [isActive, setIsActive] = useState(initialUser?.isActive ?? true);
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
        <Label className="block text-sm font-medium text-gray-700 mb-1.5">Role</Label>
        <NativeSelect value={role} onChange={e => setRole(e.target.value as AdminUser["role"])} className="w-full h-10 px-3 rounded-lg border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/30 focus:border-[#B48A2C]">
          
          <option value="admin">{ROLE_LABELS.admin}</option>
          <option value="super_admin">{ROLE_LABELS.super_admin}</option>
        </NativeSelect>
      </div>

      {mode === "edit" && <Label className="flex items-center gap-2 text-sm text-gray-700">
          <Input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="rounded border-gray-300 text-[#B48A2C] focus:ring-[#B48A2C]" />
        
          Account is active
        </Label>}

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" onClick={onCancel} disabled={isSaving} className="h-10 px-4 rounded-lg border border-[#E5E7EB] text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
          
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving} className="h-10 px-5 rounded-lg text-sm font-semibold text-white bg-[#B48A2C] hover:bg-[#B48A2C]/90 disabled:opacity-50">
          
          {isSaving ? "Saving…" : mode === "create" ? "Create User" : "Save Changes"}
        </Button>
      </div>
    </form>;
}
