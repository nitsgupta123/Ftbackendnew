import { useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { PromotionPackageOption } from "@/lib/promotion-types";

const inputClass =
  "w-full h-11 px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/30 focus:border-[#B48A2C]";

interface PackageMultiSelectProps {
  options: PromotionPackageOption[];
  selectedKeys: string[];
  onChange: (keys: string[]) => void;
  loading?: boolean;
  placeholder?: string;
}

export default function PackageMultiSelect({
  options,
  selectedKeys,
  onChange,
  loading = false,
  placeholder = "Leave empty for all packages",
}: PackageMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const selectedLabels = useMemo(() => {
    const map = new Map(options.map((o) => [o.key, o.label]));
    return selectedKeys.map((key) => ({
      key,
      label: map.get(key) ?? key,
    }));
  }, [options, selectedKeys]);

  function toggle(key: string) {
    if (selectedKeys.includes(key)) {
      onChange(selectedKeys.filter((item) => item !== key));
    } else {
      onChange([...selectedKeys, key]);
    }
  }

  function remove(key: string) {
    onChange(selectedKeys.filter((item) => item !== key));
  }

  return (
    <div>
      {selectedLabels.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedLabels.map((item) => (
            <span
              key={item.key}
              className="inline-flex items-center gap-1.5 max-w-full rounded-md border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1 text-xs text-gray-700"
            >
              <span className="truncate max-w-[220px]">{item.label}</span>
              <button
                type="button"
                onClick={() => remove(item.key)}
                className="shrink-0 text-gray-400 hover:text-gray-600"
                aria-label={`Remove ${item.label}`}
              >
                <Icon name="X" size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-xs text-gray-400 py-2">Loading packages…</p>
      ) : (
        <Popover
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) setSearch("");
          }}
        >
          <PopoverTrigger asChild>
            <Button
              type="button"
              className={`${inputClass} text-left font-normal justify-between hover:bg-white`}
            >
              <span className="truncate text-gray-500">
                {selectedKeys.length > 0
                  ? `${selectedKeys.length} package(s) selected`
                  : placeholder}
              </span>
              <Icon name="ChevronDown" size={16} className="text-gray-400 shrink-0 ml-2" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-[var(--radix-popover-trigger-width)] p-2 bg-white border border-[#E5E7EB] shadow-lg"
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              searchRef.current?.focus();
            }}
          >
            <div className="relative mb-2">
              <Icon
                name="Search"
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <Input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search packages…"
                className="h-9 pl-8 pr-3 text-sm border-[#E5E7EB] rounded-lg"
              />
            </div>
            <div className="max-h-52 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="px-2 py-3 text-xs text-gray-400">No packages found.</p>
              ) : (
                filtered.map((option) => {
                  const checked = selectedKeys.includes(option.key);
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => toggle(option.key)}
                      className={`w-full text-left px-3 py-2.5 text-sm rounded-md transition-colors ${
                        checked
                          ? "bg-[#1F2A44] text-white"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
