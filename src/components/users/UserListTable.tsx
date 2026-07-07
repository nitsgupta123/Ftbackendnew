"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icons";
import type { AdminUser } from "@/lib/auth-types";
import { formatPackageDateTime } from "@/lib/format-date";
import { ROLE_LABELS } from "@/lib/user-types";
import { deleteUser, updateUser } from "@/lib/user-api";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

const ROLE_STYLES: Record<string, string> = {
  admin: "bg-blue-50 text-blue-700",
  super_admin: "bg-amber-50 text-amber-700",
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700",
  inactive: "bg-gray-100 text-gray-600",
};

interface UserListTableProps {
  users: AdminUser[];
  loading?: boolean;
  emptyMessage?: string;
  currentUserId?: number;
  canManage?: boolean;
  onEdit?: (user: AdminUser) => void;
  onUserUpdated?: (user: AdminUser) => void;
  onUserRemoved?: (id: number) => void;
}

const actionIconClass =
  "inline-flex items-center justify-center size-8 rounded-lg border border-[#E5E7EB] bg-white text-[#B48A2C] hover:bg-gray-50 hover:text-[#9A7424] disabled:opacity-40 disabled:cursor-not-allowed transition-colors";

function UserAvatar({ user }: { user: AdminUser }) {
  const initials = user.fullName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="h-10 w-10 rounded-full bg-[#B48A2C]/10 flex items-center justify-center text-sm font-semibold text-[#B48A2C]">
      {initials || "?"}
    </div>
  );
}

function UserRowActions({
  user,
  isCurrentUser,
  onEdit,
  onUserUpdated,
  onUserRemoved,
}: {
  user: AdminUser;
  isCurrentUser: boolean;
  onEdit?: (user: AdminUser) => void;
  onUserUpdated?: (user: AdminUser) => void;
  onUserRemoved?: (id: number) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function handleToggleActive() {
    const nextActive = !user.isActive;
    const action = nextActive ? "activate" : "deactivate";
    if (
      !window.confirm(
        `${nextActive ? "Activate" : "Deactivate"} "${user.fullName}"?`
      )
    ) {
      return;
    }

    setBusy(true);
    try {
      const { user: updated } = await updateUser(user.id, {
        isActive: nextActive,
      });
      onUserUpdated?.(updated);
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : `Failed to ${action} user`
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (
      !window.confirm(
        `Delete "${user.fullName}"? This cannot be undone.`
      )
    ) {
      return;
    }

    setBusy(true);
    try {
      await deleteUser(user.id);
      onUserRemoved?.(user.id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="ghost"
        onClick={() => onEdit?.(user)}
        disabled={busy}
        className={actionIconClass}
        title="Edit user"
      >
        <Icon name="Pencil" size={16} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={handleToggleActive}
        disabled={busy || isCurrentUser}
        className={actionIconClass}
        title={user.isActive ? "Deactivate user" : "Activate user"}
      >
        <Icon name={user.isActive ? "Archive" : "CheckCircle"} size={16} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={handleDelete}
        disabled={busy || isCurrentUser}
        className={actionIconClass}
        title="Delete user"
      >
        <Icon name="Trash2" size={16} />
      </Button>
    </div>
  );
}

export default function UserListTable({
  users,
  loading = false,
  emptyMessage = "No users found.",
  currentUserId,
  canManage = false,
  onEdit,
  onUserUpdated,
  onUserRemoved,
}: UserListTableProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-12 text-center text-sm text-gray-500">
        <Icon name="Loader2" size={20} className="inline animate-spin mr-2" />
        Loading users…
      </div>
    );
  }

  if (!users.length) {
    return (
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-12 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
          <Icon name="Users" size={22} className="text-gray-400" />
        </div>
        <p className="text-sm text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <Table className="w-full text-sm">
          <TableHeader>
            <TableRow className="border-b border-[#E5E7EB] bg-gray-50/80">
              <TableHead className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                User
              </TableHead>
              <TableHead className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                Email
              </TableHead>
              <TableHead className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                Role
              </TableHead>
              <TableHead className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                Status
              </TableHead>
              <TableHead className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                Last Login
              </TableHead>
              <TableHead className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                Created
              </TableHead>
              {canManage && (
                <TableHead className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                  Actions
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-[#E5E7EB]">
            {users.map((user) => {
              const isCurrentUser = user.id === currentUserId;
              return (
                <TableRow
                  key={user.id}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  <TableCell className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <UserAvatar user={user} />
                      <div>
                        <div className="font-medium text-gray-900">
                          {user.fullName}
                        </div>
                        {isCurrentUser && (
                          <span className="text-xs text-[#B48A2C] font-medium">
                            You
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-gray-600">
                    {user.email}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        ROLE_STYLES[user.role] ?? ROLE_STYLES.admin
                      }`}
                    >
                      {ROLE_LABELS[user.role]}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                        STATUS_STYLES[user.isActive ? "active" : "inactive"]
                      }`}
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                    {formatPackageDateTime(user.lastLoginAt)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                    {formatPackageDateTime(user.createdAt)}
                  </TableCell>
                  {canManage && (
                    <TableCell className="px-4 py-3">
                      <UserRowActions
                        user={user}
                        isCurrentUser={isCurrentUser}
                        onEdit={onEdit}
                        onUserUpdated={onUserUpdated}
                        onUserRemoved={onUserRemoved}
                      />
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
