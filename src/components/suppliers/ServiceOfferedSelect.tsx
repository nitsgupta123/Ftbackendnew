import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { slugify } from "@/lib/slug";
import {
  buildSupplierServiceOptions,
  getSupplierServiceClassName,
  loadCustomSupplierServices,
  parseSupplierServices,
  saveCustomSupplierService,
  serializeSupplierServices,
  type CustomSupplierService,
  type SupplierServiceOption,
} from "@/lib/supplier-types";

interface ServiceOfferedSelectProps {
  id?: string;
  value?: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
}

const fieldClass =
  "w-full h-11 px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/30 focus:border-[#B48A2C]";

export default function ServiceOfferedSelect({
  id,
  value,
  onChange,
  placeholder = "Select services…",
}: ServiceOfferedSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [serviceName, setServiceName] = useState("");
  const [serviceSlug, setServiceSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [customServices, setCustomServices] = useState<CustomSupplierService[]>(
    []
  );
  const searchRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCustomServices(loadCustomSupplierServices());
  }, []);

  useEffect(() => {
    if (!adding || slugTouched) return;
    setServiceSlug(slugify(serviceName));
  }, [adding, serviceName, slugTouched]);

  const selectedValues = useMemo(() => parseSupplierServices(value), [value]);

  const allOptions = useMemo(
    () => buildSupplierServiceOptions(customServices, selectedValues),
    [customServices, selectedValues]
  );

  const optionMap = useMemo(() => {
    const map = new Map(
      allOptions.map((option) => [option.value.toLowerCase(), option.value])
    );
    return map;
  }, [allOptions]);

  const normalizedSelected = useMemo(() => {
    return selectedValues.map((item) => {
      const canonical = optionMap.get(item.toLowerCase());
      return canonical ?? item;
    });
  }, [optionMap, selectedValues]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allOptions;
    return allOptions.filter((option) =>
      option.label.toLowerCase().includes(q)
    );
  }, [allOptions, search]);

  function commit(next: string[]) {
    onChange(serializeSupplierServices(next));
  }

  function toggle(service: string) {
    if (normalizedSelected.some((item) => item.toLowerCase() === service.toLowerCase())) {
      commit(
        normalizedSelected.filter(
          (item) => item.toLowerCase() !== service.toLowerCase()
        )
      );
    } else {
      commit([...normalizedSelected, service]);
    }
  }

  function remove(service: string) {
    commit(
      normalizedSelected.filter(
        (item) => item.toLowerCase() !== service.toLowerCase()
      )
    );
  }

  function startAddService() {
    setAdding(true);
    setServiceName("");
    setServiceSlug("");
    setSlugTouched(false);
    setFormError(null);
    setOpen(false);
    queueMicrotask(() => nameInputRef.current?.focus());
  }

  function cancelAddService() {
    setAdding(false);
    setServiceName("");
    setServiceSlug("");
    setSlugTouched(false);
    setFormError(null);
  }

  function submitCustomService() {
    const name = serviceName.trim();
    const slug = slugify(serviceSlug || serviceName);
    if (!name) {
      setFormError("Service offered is required.");
      return;
    }
    if (!slug) {
      setFormError("Unable to generate a valid slug.");
      return;
    }

    const existing = allOptions.find(
      (option) => option.value.toLowerCase() === name.toLowerCase()
    );
    const toAdd = existing?.value ?? name;

    const savedCustoms = saveCustomSupplierService({ name: toAdd, slug });
    setCustomServices(savedCustoms);

    if (
      !normalizedSelected.some((item) => item.toLowerCase() === toAdd.toLowerCase())
    ) {
      commit([...normalizedSelected, toAdd]);
    }

    cancelAddService();
  }

  function renderOptionRow(option: SupplierServiceOption) {
    const isSelected = normalizedSelected.some(
      (item) => item.toLowerCase() === option.value.toLowerCase()
    );
    return (
      <button
        key={option.value}
        type="button"
        onClick={() => toggle(option.value)}
        className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 text-sm text-left rounded-md transition-colors ${
          isSelected ? "bg-[#F1F5F9]" : "hover:bg-[#F8FAFC]"
        }`}
      >
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${option.className}`}
        >
          {option.label}
        </span>
        {isSelected ? (
          <Icon name="Check" size={16} className="text-[#1F2A44] shrink-0" />
        ) : null}
      </button>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <label
          htmlFor={id}
          className="block text-sm font-semibold text-[#334155]"
        >
          Services Offered
        </label>
        <Button
          type="button"
          onClick={startAddService}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 px-3 text-xs font-semibold rounded-lg border border-[#E5E7EB] bg-white text-[#0B3A5C] shadow-sm hover:bg-[#F8FAFC]"
        >
          <Icon name="Plus" size={14} />
          Add Service
        </Button>
      </div>

      {normalizedSelected.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2.5">
          {normalizedSelected.map((service) => (
            <span
              key={service}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${getSupplierServiceClassName(service)}`}
            >
              {service}
              <button
                type="button"
                onClick={() => remove(service)}
                className="shrink-0 opacity-80 hover:opacity-100"
                aria-label={`Remove ${service}`}
              >
                <Icon name="X" size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setSearch("");
        }}
      >
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            className="w-full h-11 px-3 rounded-lg border border-[#E5E7EB] bg-white text-left text-sm font-normal text-gray-500 hover:bg-[#F9FAFB] justify-between"
          >
            <span className="truncate">
              {normalizedSelected.length > 0
                ? `${normalizedSelected.length} selected`
                : placeholder}
            </span>
            <Icon name="ChevronDown" size={16} className="text-gray-400 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] p-2 bg-white border border-[#E5E7EB] shadow-lg"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
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
              placeholder="Search services…"
              className="h-9 pl-8 pr-3 text-sm border-[#E5E7EB] rounded-lg focus-visible:ring-0 focus-visible:border-[#E5E7EB]"
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-2 py-3 text-xs text-gray-400">No services found.</p>
            ) : (
              filtered.map((option) => renderOptionRow(option))
            )}
          </div>
        </PopoverContent>
      </Popover>

      {adding ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-service-title"
            className="relative w-full max-w-md rounded-2xl border border-[#E5E7EB] bg-white shadow-xl pointer-events-auto"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[#E8ECF0] px-5 py-4">
              <h3
                id="add-service-title"
                className="text-base font-semibold text-[#1F2A44]"
              >
                Add Service
              </h3>
              <Button
                type="button"
                variant="ghost"
                onClick={cancelAddService}
                className="size-8 p-0 text-gray-500 hover:text-gray-700"
                aria-label="Close"
              >
                <Icon name="X" size={16} />
              </Button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div>
                <Label
                  htmlFor="new-service-name"
                  className="block text-sm font-semibold text-[#334155] mb-1.5"
                >
                  Service Offered <span className="text-red-500">*</span>
                </Label>
                <Input
                  ref={nameInputRef}
                  id="new-service-name"
                  value={serviceName}
                  onChange={(e) => {
                    setServiceName(e.target.value);
                    setFormError(null);
                  }}
                  placeholder="e.g. Yacht Charter"
                  className={fieldClass}
                />
              </div>

              <div>
                <Label
                  htmlFor="new-service-slug"
                  className="block text-sm font-semibold text-[#334155] mb-1.5"
                >
                  Slug <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="new-service-slug"
                  value={serviceSlug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setServiceSlug(slugify(e.target.value));
                    setFormError(null);
                  }}
                  placeholder="yacht-charter"
                  className={fieldClass}
                />
                <p className="mt-1 text-xs text-gray-400">
                  Auto-generated from service offered. Example: yacht-charter
                </p>
              </div>

              {formError ? (
                <p className="text-xs text-red-600">{formError}</p>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[#E8ECF0] px-5 py-4">
              <Button
                type="button"
                onClick={cancelAddService}
                className="h-10 px-4 rounded-lg border border-[#E5E7EB] bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={submitCustomService}
                className="h-10 px-4 rounded-lg bg-[#A68231] text-sm font-semibold text-white hover:opacity-90"
              >
                Add Service
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
