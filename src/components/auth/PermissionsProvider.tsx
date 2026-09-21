import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getMyPermissions } from "@/lib/permission-api";
import {
  buildDefaultMatrix,
  hasModulePermission,
  type ModulePermission,
  type PermissionAction,
} from "@/lib/permission-types";

interface PermissionsContextValue {
  permissions: ModulePermission[];
  loading: boolean;
  can: (moduleKey: string, action?: PermissionAction) => boolean;
  refresh: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [permissions, setPermissions] = useState<ModulePermission[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { matrix } = await getMyPermissions();
      setPermissions(matrix.permissions);
    } catch {
      setPermissions(buildDefaultMatrix(user.role).permissions);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    queueMicrotask(() => {
      void refresh();
    });
  }, [refresh]);

  const can = useCallback(
    (moduleKey: string, action: PermissionAction = "view") => {
      if (!user) return false;
      if (user.role === "super_admin") return true;
      return hasModulePermission(permissions, moduleKey, action);
    },
    [permissions, user]
  );

  const value = useMemo(
    () => ({
      permissions,
      loading,
      can,
      refresh,
    }),
    [permissions, loading, can, refresh]
  );

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error("usePermissions must be used within PermissionsProvider");
  }
  return context;
}
