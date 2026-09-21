import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/icons";
import { useAuth } from "@/components/auth/AuthProvider";
import UserStatsGrid from "@/components/users/UserStatsGrid";
import UserListTable from "@/components/users/UserListTable";
import UserFormModal from "@/components/users/UserFormModal";
import { getPermissions } from "@/lib/permission-api";
import {
  getKnownRolesFromStorage,
  rememberKnownRole,
  ROLE_CATALOG_CHANGED_EVENT,
  setKnownRoles,
} from "@/lib/role-catalog";
import { createUser, getUserStats, listUsers, updateUser } from "@/lib/user-api";
import type { AdminUser } from "@/lib/auth-types";
import type { CreateUserFormValues } from "@/lib/auth-validation";
import { USER_ROLE_FILTER_OPTIONS, USER_SORT_OPTIONS, USER_STATUS_FILTER_OPTIONS, formatRoleLabel, type AdminUserStats, type UserRoleFilter, type UserSortField, type UserStatusFilter } from "@/lib/user-types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";

type FormMode = "create" | "edit" | null;

export interface UserManagementPanelHandle {
  openCreate: () => void;
}

const UserManagementPanel = forwardRef<UserManagementPanelHandle>(
  function UserManagementPanel(_, ref) {
  const {
    user: currentUser
  } = useAuth();
  const canManage = currentUser?.role === "super_admin";
  const [stats, setStats] = useState<AdminUserStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<UserStatusFilter>("all");
  const [roleFilter, setRoleFilter] = useState<UserRoleFilter>("all");
  const [sort, setSort] = useState<UserSortField>("created_at");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const limit = 20;
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [customRoles, setCustomRoles] = useState<string[]>([]);
  const [catalogRoles, setCatalogRoles] = useState<string[]>(() => getKnownRolesFromStorage());
  const [isSaving, setIsSaving] = useState(false);
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const {
        stats: nextStats
      } = await getUserStats();
      setStats(nextStats);
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);
  const loadCatalogRoles = useCallback(async () => {
    try {
      const permissionsResult = await getPermissions();
      const fromApi = Array.from(
        new Set(permissionsResult.matrices.map((matrix) => matrix.role))
      );
      setCatalogRoles(setKnownRoles(fromApi));
    } catch {
      setCatalogRoles(getKnownRolesFromStorage());
    }
  }, []);
  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listUsers({
        search: search.trim() || undefined,
        status: statusFilter,
        role: roleFilter,
        sort,
        order,
        page,
        limit
      });
      setUsers(result.users);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, roleFilter, sort, order, page]);
  useEffect(() => {
    queueMicrotask(() => {
      void loadStats();
      void loadCatalogRoles();
    });
  }, [loadStats, loadCatalogRoles]);
  useEffect(() => {
    const syncFromStorage = () => {
      const nextRoles = getKnownRolesFromStorage();
      setCatalogRoles(nextRoles);
      setRoleFilter((current) =>
        current === "all" ||
        current === "admin" ||
        current === "super_admin" ||
        nextRoles.includes(current)
          ? current
          : "all"
      );
      void loadUsers();
      void loadStats();
    };
    window.addEventListener(ROLE_CATALOG_CHANGED_EVENT, syncFromStorage);
    window.addEventListener("storage", syncFromStorage);
    return () => {
      window.removeEventListener(ROLE_CATALOG_CHANGED_EVENT, syncFromStorage);
      window.removeEventListener("storage", syncFromStorage);
    };
  }, [loadStats, loadUsers]);
  useEffect(() => {
    queueMicrotask(() => {
      void loadUsers();
    });
  }, [loadUsers]);
  const emptyMessage = useMemo(() => {
    if (search.trim()) return `No users match "${search.trim()}".`;
    if (statusFilter !== "all" || roleFilter !== "all") {
      return "No users match the selected filters.";
    }
    return "No admin users found.";
  }, [search, statusFilter, roleFilter]);
  const roleFilterOptions = useMemo(() => {
    const dynamicRoles = Array.from(
      new Set([...catalogRoles, ...users.map((user) => user.role), ...customRoles])
    );
    const options = [...USER_ROLE_FILTER_OPTIONS];
    for (const roleOption of dynamicRoles) {
      if (!options.some((item) => item.value === roleOption)) {
        options.push({ value: roleOption, label: formatRoleLabel(roleOption) });
      }
    }
    return options;
  }, [users, customRoles, catalogRoles]);

  const availableRoles = useMemo(() => {
    return Array.from(
      new Set([
        "admin",
        "super_admin",
        ...catalogRoles,
        ...customRoles,
        ...users.map((user) => user.role),
        editingUser?.role ?? "",
      ].filter(Boolean))
    );
  }, [users, editingUser, customRoles, catalogRoles]);
  async function handleCreate(data: CreateUserFormValues) {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const result = await createUser(data);
      if (result.role !== data.role) {
        setError(
          `Role "${data.role}" could not be saved correctly. Run "npm run db:migrate:admin-role-string" and try again.`
        );
      } else {
        setSuccessMessage(
          result.message ||
            `Verification email sent to ${result.email}. They will appear here after verifying.`
        );
      }
      setCustomRoles((prev) =>
        prev.includes(result.role) ? prev : [...prev, result.role]
      );
      rememberKnownRole(result.role);
      setCatalogRoles((prev) =>
        prev.includes(result.role) ? prev : [...prev, result.role]
      );
      setFormMode(null);
      setPage(1);
      await Promise.all([loadUsers(), loadStats(), loadCatalogRoles()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setIsSaving(false);
    }
  }
  async function handleUpdate(data: {
    fullName: string;
    role: AdminUser["role"];
    isActive: boolean;
  }) {
    if (!editingUser) return;
    setIsSaving(true);
    setError(null);
    try {
      const {
        user: updated
      } = await updateUser(editingUser.id, data);
      setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
      rememberKnownRole(updated.role);
      setCatalogRoles((prev) =>
        prev.includes(updated.role) ? prev : [...prev, updated.role]
      );
      setFormMode(null);
      setEditingUser(null);
      await Promise.all([loadStats(), loadCatalogRoles()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setIsSaving(false);
    }
  }
  const openCreate = useCallback(() => {
    setCatalogRoles(getKnownRolesFromStorage());
    setEditingUser(null);
    setFormMode("create");
    void loadCatalogRoles();
  }, [loadCatalogRoles]);
  function openEdit(user: AdminUser) {
    setCatalogRoles(getKnownRolesFromStorage());
    setEditingUser(user);
    setFormMode("edit");
    void loadCatalogRoles();
  }

  useImperativeHandle(ref, () => ({ openCreate }), [openCreate]);

  return <>
      <div className="mb-6">
        <UserStatsGrid stats={stats} loading={statsLoading} />
      </div>

      <div className="mb-4 rounded-2xl border border-[#E8ECF0] bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col gap-3 px-4 py-4 border-b border-[#E8ECF0] bg-gradient-to-r from-[#FFFCF7] via-white to-white xl:flex-row xl:items-center">
          <div className="relative flex-1 min-w-0">
            <Icon
              name="Search"
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <Input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name or email..."
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#E5E7EB] bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/30 focus:border-[#B48A2C]"
            />
          </div>

          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 xl:flex xl:w-auto xl:items-center xl:gap-2 xl:shrink-0">
            <NativeSelect
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as UserStatusFilter);
                setPage(1);
              }}
              wrapperClassName="w-full xl:w-auto xl:shrink-0"
              className="h-10 w-full xl:min-w-[130px] px-3 pr-9 rounded-lg border border-[#E5E7EB] bg-white text-sm"
            >
              {USER_STATUS_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>

            <NativeSelect
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value as UserRoleFilter);
                setPage(1);
              }}
              wrapperClassName="w-full xl:w-auto xl:shrink-0"
              className="h-10 w-full xl:min-w-[130px] px-3 pr-9 rounded-lg border border-[#E5E7EB] bg-white text-sm"
            >
              {roleFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>

            <NativeSelect
              value={sort}
              onChange={(e) => setSort(e.target.value as UserSortField)}
              wrapperClassName="w-full xl:w-auto xl:shrink-0"
              className="h-10 w-full xl:min-w-[150px] px-3 pr-9 rounded-lg border border-[#E5E7EB] bg-white text-sm"
            >
              {USER_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  Sort: {option.label}
                </option>
              ))}
            </NativeSelect>

            <NativeSelect
              value={order}
              onChange={(e) => setOrder(e.target.value as "asc" | "desc")}
              wrapperClassName="w-full xl:w-auto xl:shrink-0"
              className="h-10 w-full xl:min-w-[120px] px-3 pr-9 rounded-lg border border-[#E5E7EB] bg-white text-sm"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </NativeSelect>
          </div>
        </div>

        {!loading && total > 0 && (
          <div className="px-4 py-3 bg-[#FAFBFC]">
            <p className="text-xs text-gray-500">
              {users.length} of {total} users
            </p>
          </div>
        )}
      </div>

      {successMessage && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-100 text-sm">
          {successMessage}
        </div>
      )}

      {error && <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 text-red-700 border border-red-100 text-sm">
          {error}
          {error === "Unauthorized" ? <>
              {" "}
              — please{" "}
              <a href="/login" className="underline font-medium">
                sign in again
              </a>
              .
            </> : null}
        </div>}

      {!canManage && <div className="mb-4 px-4 py-3 rounded-lg bg-amber-50 text-amber-800 border border-amber-100 text-sm">
          You have read-only access. Only Super Admins can create or edit users.
        </div>}
      {canManage && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-[#FFF9EB] text-[#7A6226] border border-[#F2E3B8] text-sm">
          Roles from{" "}
          <Link
            to="/settings/role-management"
            className="font-medium underline underline-offset-2 hover:text-[#1F2A44]"
          >
            Role Management
          </Link>{" "}
          appear automatically when adding or editing users.
        </div>
      )}

      <UserListTable
        users={users}
        loading={loading}
        emptyMessage={emptyMessage}
        currentUserId={currentUser?.id}
        canManage={canManage}
        onEdit={openEdit}
        onUserUpdated={(updated) => {
          setUsers((prev) =>
            prev.map((u) => (u.id === updated.id ? updated : u))
          );
          void loadStats();
        }}
        onUserRemoved={(id) => {
          setUsers((prev) => prev.filter((u) => u.id !== id));
          setTotal((prev) => Math.max(0, prev - 1));
          void loadStats();
        }}
      />
      

      {totalPages > 1 && <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row">
          <Button type="button" disabled={page <= 1 || loading} onClick={() => setPage(p => p - 1)} className="h-9 px-3 rounded-lg border border-[#E5E7EB] text-sm disabled:opacity-40">
          
            Previous
          </Button>
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <Button type="button" disabled={page >= totalPages || loading} onClick={() => setPage(p => p + 1)} className="h-9 px-3 rounded-lg border border-[#E5E7EB] text-sm disabled:opacity-40">
          
            Next
          </Button>
        </div>}

      {formMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <button
            type="button"
            className="absolute inset-0 border-0 bg-black/40"
            aria-label="Close"
            onClick={() => {
              if (!isSaving) {
                setFormMode(null);
                setEditingUser(null);
              }
            }}
          />

          <div className="relative w-full max-w-md max-h-[calc(100vh-1.5rem)] overflow-y-auto rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-xl sm:max-h-[calc(100vh-2rem)] sm:p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5">
              {formMode === "create" ? "Add Admin User" : "Edit User"}
            </h2>
            <UserFormModal
              mode={formMode}
              initialUser={editingUser}
              availableRoles={availableRoles}
              onRoleAdded={(role) => {
                rememberKnownRole(role);
                setCustomRoles((prev) => (prev.includes(role) ? prev : [...prev, role]));
                setCatalogRoles((prev) => (prev.includes(role) ? prev : [...prev, role]));
              }}
              isSaving={isSaving}
              onSubmit={(data) => {
                if (formMode === "create") {
                  void handleCreate(data as CreateUserFormValues);
                } else {
                  void handleUpdate(
                    data as {
                      fullName: string;
                      role: AdminUser["role"];
                      isActive: boolean;
                    }
                  );
                }
              }}
              onCancel={() => {
                if (!isSaving) {
                  setFormMode(null);
                  setEditingUser(null);
                }
              }}
            />
          </div>
        </div>
      )}
    </>;
});

export default UserManagementPanel;
