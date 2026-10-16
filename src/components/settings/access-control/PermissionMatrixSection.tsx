import { useState } from "react";
import { Icon } from "@/components/ui/icons";
import { Switch } from "@/components/ui/switch";
import type { ModuleGroupSection, PermissionKey, ExtendedPermission } from "./types";
import type { AccessModuleDefinition } from "@/lib/permission-types";

type PermissionMatrixSectionProps = {
  canManage: boolean;
  saving: boolean;
  loading: boolean;
  modulesByGroup: ModuleGroupSection[];
  draftMap: Map<string, ExtendedPermission>;
  onToggleAllInGroup: (
    groupModules: AccessModuleDefinition[],
    field: PermissionKey,
    value: boolean
  ) => void;
  onSetPermission: (moduleKey: string, field: PermissionKey, value: boolean) => void;
};

export default function PermissionMatrixSection({
  canManage,
  saving,
  loading,
  modulesByGroup,
  draftMap,
  onToggleAllInGroup,
  onSetPermission,
}: PermissionMatrixSectionProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    panel: false,
    package_builder: false,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-gray-500">
        <Icon name="Loader2" size={18} className="mr-2 animate-spin" />
        Loading permission matrix…
      </div>
    );
  }

  return (
    <>
      {modulesByGroup.map((section) => {
        const isOpen = Boolean(openSections[section.group]);
        return (
          <div key={section.group} className="rounded-xl border border-[#E8ECF0] overflow-hidden">
            <button
              type="button"
              onClick={() =>
                setOpenSections((prev) => ({ ...prev, [section.group]: !prev[section.group] }))
              }
              className="w-full px-4 py-3 bg-[#FAFBFC] text-left border-b border-[#E8ECF0] flex items-center justify-between gap-3"
            >
              <div>
                <h3 className="text-sm font-semibold text-[#1F2A44]">{section.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{section.description}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#A68231]">
                {isOpen ? "Hide Modules" : "Show Modules"}
                <Icon name={isOpen ? "ChevronDown" : "ChevronRight"} size={14} />
              </span>
            </button>

            {isOpen && (
              <div className="overflow-x-auto overscroll-x-contain">
                <table className="w-full min-w-[640px] text-left">
                  <thead>
                    <tr className="border-b border-[#E8ECF0] bg-white">
                      <th className="sticky left-0 z-20 bg-white px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Module
                      </th>
                      {(
                        [
                          ["canView", "View"],
                          ["canEdit", "Create / Edit"],
                          ["canDelete", "Delete"],
                        ] as const
                      ).map(([field, label]) => (
                        <th
                          key={field}
                          className="sticky top-0 z-10 bg-white px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 text-center w-[120px]"
                        >
                          <div className="flex flex-col items-center gap-1.5">
                            <span>{label}</span>
                            {canManage && (
                              <button
                                type="button"
                                className="text-[10px] font-medium normal-case tracking-normal text-[#A68231] hover:underline"
                                onClick={() =>
                                  onToggleAllInGroup(
                                    section.modules,
                                    field,
                                    !section.modules.every((m) =>
                                      Boolean(draftMap.get(m.key)?.[field])
                                    )
                                  )
                                }
                              >
                                Toggle all
                              </button>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {section.modules.map((mod, index) => {
                      const perm = draftMap.get(mod.key);
                      return (
                        <tr
                          key={mod.key}
                          className={
                            index < section.modules.length - 1
                              ? "border-b border-[#E8ECF0]"
                              : undefined
                          }
                        >
                          <td className="sticky left-0 z-10 bg-white px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-[#555E69] ring-1 ring-[#E5E7EB]">
                                <Icon name={mod.icon} size={16} />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-[#1F2A44]">{mod.label}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{mod.description}</p>
                              </div>
                            </div>
                          </td>
                          {(
                            ["canView", "canEdit", "canDelete"] as const
                          ).map((field) => (
                            <td key={field} className="px-4 py-3.5 text-center">
                              <div className="inline-flex justify-center">
                                <Switch
                                  checked={Boolean(perm?.[field])}
                                  disabled={!canManage || saving}
                                  onCheckedChange={(checked) =>
                                    onSetPermission(mod.key, field, checked)
                                  }
                                  className="data-checked:bg-[#A68231]"
                                  aria-label={`${mod.label} ${field.replace("can", "")}`}
                                />
                              </div>
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
