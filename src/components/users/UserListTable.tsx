"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icons";
import type { AdminUser } from "@/lib/auth-types";
import { formatPackageDateTime } from "@/lib/format-date";
import { formatRoleLabel } from "@/lib/user-types";
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
import { Skeleton } from "@/components/ui/skeleton";

const GOLD = "#A68231";

const ROLE_STYLES: Record<string, { badge: string; dot: string }> = {
  admin: {
    badge: "bg-blue-50 text-blue-700 ring-blue-600/20",
    dot: "bg-blue-500",
  },
  super_admin: {
    badge: "bg-amber-50 text-amber-700 ring-amber-600/20",
    dot: "bg-amber-500",
  },
};

const STATUS_STYLES: Record<string, { badge: string; dot: string }> = {
  active: {
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    dot: "bg-emerald-500",
  },
  inactive: {
    badge: "bg-gray-100 text-gray-600 ring-gray-500/10",
    dot: "bg-gray-400",
  },
};

interface UserListTableProps {
  users: AdminUser[];
  loading?: boolean;
  emptyMessage?: string;
  currentUserId?: number;
  canManage?: boolean;
  onEdit?: (user: AdminUser) => void;
  onAddUser?: () => void;
  onUserUpdated?: (user: AdminUser) => void;
  onUserRemoved?: (id: number) => void;
}

function UserAvatar({ user }: { user: AdminUser }) {
  const initials = user.fullName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
      style={{ backgroundColor: `${GOLD}14`, color: GOLD }}
    >
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
    if (!window.confirm(`${nextActive ? "Activate" : "Deactivate"} "${user.fullName}"?`)) {
      return;
    }

    setBusy(true);
    try {
      const { user: updated } = await updateUser(user.id, {
        isActive: nextActive,
      });
      onUserUpdated?.(updated);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : `Failed to ${action} user`);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${user.fullName}"? This cannot be undone.`)) {
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
    <div className="flex items-center justify-end gap-1.5">
      <Button
        type="button"
        variant="ghost"
        onClick={() => onEdit?.(user)}
        disabled={busy}
        className="inline-flex size-8 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#A68231] hover:bg-[#FFFCF7] hover:border-[#A68231]/30 disabled:opacity-40 transition-colors"
        title="Edit user"
      >
        <Icon name="Pencil" size={15} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={handleToggleActive}
        disabled={busy || isCurrentUser}
        className="inline-flex size-8 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#A68231] hover:bg-[#FFFCF7] hover:border-[#A68231]/30 disabled:opacity-40 transition-colors"
        title={user.isActive ? "Deactivate user" : "Activate user"}
      >
        <Icon name={user.isActive ? "Archive" : "CheckCircle"} size={15} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={handleDelete}
        disabled={busy || isCurrentUser}
        className="inline-flex size-8 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-gray-500 hover:bg-red-50 hover:border-red-200 hover:text-red-600 disabled:opacity-40 transition-colors"
        title="Delete user"
      >
        <Icon name="Trash2" size={15} />
      </Button>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="divide-y divide-[#F1F5F9]">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-4">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-8 w-24" />
        </div>
      ))}
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
  onAddUser,
  onUserUpdated,
  onUserRemoved,
}: UserListTableProps) {
  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!users.length) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl ring-1 mb-4"
          style={{ backgroundColor: `${GOLD}10`, color: GOLD, borderColor: `${GOLD}25` }}
        >
          <Icon name="Users" size={24} />
        </div>
        <p className="text-sm font-medium text-gray-700">{emptyMessage}</p>
        {onAddUser && (
          <Button
            type="button"
            onClick={onAddUser}
            className="mt-4 inline-flex h-10 items-center gap-2 px-5 text-sm font-semibold text-white rounded-lg shadow-sm hover:opacity-90"
            style={{ backgroundColor: GOLD }}
          >
            <Icon name="User" size={16} />
            Add User
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table className="w-full text-sm">
        <TableHeader>
          <TableRow className="border-b border-[#E8ECF0] bg-[#FAFBFC] hover:bg-[#FAFBFC]">
            <TableHead className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
              User
            </TableHead>
            <TableHead className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 hidden md:table-cell">
              Email
            </TableHead>
            <TableHead className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Role
            </TableHead>
            <TableHead className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Status
            </TableHead>
            <TableHead className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 hidden sm:table-cell">
              Last Login
            </TableHead>
            <TableHead className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 hidden lg:table-cell">
              Created
            </TableHead>
            {canManage && (
              <TableHead className="text-right px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Actions
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-[#F1F5F9]">
          {users.map((user) => {
            const isCurrentUser = user.id === currentUserId;
            const roleStyle = ROLE_STYLES[user.role] ?? ROLE_STYLES.admin;
            const statusKey = user.isActive ? "active" : "inactive";
            const statusStyle = STATUS_STYLES[statusKey];

            return (
              <TableRow key={user.id} className="group hover:bg-[#FFFCF7]/60 transition-colors">
                <TableCell className="px-4 py-3.5">
                  <div className="flex items-center gap-3 min-w-[180px]">
                    <UserAvatar user={user} />
                    <div className="min-w-0">
                      <p className="font-medium text-[#1F2A44] truncate group-hover:text-[#A68231] transition-colors">
                        {user.fullName}
                      </p>
                      {isCurrentUser && (
                        <span className="text-xs font-medium" style={{ color: GOLD }}>
                          You
                        </span>
                      )}
                      <p className="mt-0.5 text-xs text-gray-500 md:hidden truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="px-4 py-3.5 text-gray-600 hidden md:table-cell">
                  {user.email}
                </TableCell>
                <TableCell className="px-4 py-3.5">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${roleStyle.badge}`}
                  >
                    <span className={`size-1.5 rounded-full ${roleStyle.dot}`} />
                    {formatRoleLabel(user.role)}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-3.5">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 ring-inset ${statusStyle.badge}`}
                  >
                    <span className={`size-1.5 rounded-full ${statusStyle.dot}`} />
                    {user.isActive ? "Active" : "Inactive"}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-3.5 text-gray-500 text-xs hidden sm:table-cell whitespace-nowrap">
                  {formatPackageDateTime(user.lastLoginAt)}
                </TableCell>
                <TableCell className="px-4 py-3.5 text-gray-500 text-xs hidden lg:table-cell whitespace-nowrap">
                  {formatPackageDateTime(user.createdAt)}
                </TableCell>
                {canManage && (
                  <TableCell className="px-4 py-3.5">
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
  );
}
