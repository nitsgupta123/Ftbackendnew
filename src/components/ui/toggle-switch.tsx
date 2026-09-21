import * as React from "react";

import { cn } from "@/lib/utils";

const toggleColorClasses = {
  green: {
    checked: "bg-[#27AE60]",
    unchecked: "bg-[#CBD5E1]",
    focusRing: "focus-visible:ring-[#27AE60]/40",
  },
  emerald: {
    checked: "bg-[#22C55E]",
    unchecked: "bg-[#CBD5E1]",
    focusRing: "focus-visible:ring-[#22C55E]/40",
  },
  gold: {
    checked: "bg-[#A8832A]",
    unchecked: "bg-gray-300",
    focusRing: "focus-visible:ring-[#A8832A]/40",
  },
} as const;

type ToggleSwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  color?: keyof typeof toggleColorClasses;
  size?: "default" | "lg";
  "aria-label"?: string;
};

function ToggleSwitch({
  checked,
  onCheckedChange,
  disabled,
  className,
  color = "green",
  size = "default",
  "aria-label": ariaLabel,
}: ToggleSwitchProps) {
  const colors = toggleColorClasses[color];

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex shrink-0 cursor-pointer items-center rounded-full border-0 p-0 shadow-none transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        size === "default" ? "h-6 w-11" : "h-[26px] w-[46px]",
        checked ? colors.checked : colors.unchecked,
        colors.focusRing,
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "block rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out",
          size === "default"
            ? "h-4 w-4"
            : "h-5 w-5",
          size === "default"
            ? checked
              ? "translate-x-6"
              : "translate-x-1"
            : checked
              ? "translate-x-[23px]"
              : "translate-x-[3px]"
        )}
      />
    </button>
  );
}

export { ToggleSwitch };
