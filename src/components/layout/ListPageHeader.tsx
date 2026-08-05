"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";

type ListPageHeaderAction =
  | {
      label: string;
      onClick: () => void;
      href?: never;
      icon?: string;
    }
  | {
      label: string;
      href: string;
      onClick?: never;
      icon?: string;
    };

interface ListPageHeaderProps {
  icon: string;
  title: string;
  description: string;
  action?: ListPageHeaderAction;
}

const actionClassName =
  "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#A68231] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#947329] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A68231]/40";

export default function ListPageHeader({
  icon,
  title,
  description,
  action,
}: ListPageHeaderProps) {
  const actionIcon = action?.icon ?? "Plus";

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-[#E8ECF0] bg-gradient-to-br from-[#FFFCF7] via-white to-[#F7F9FC] shadow-sm">
      <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#A68231]/12 text-[#A68231] ring-1 ring-[#A68231]/20">
              <Icon name={icon} size={22} />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight text-[#1F2A44] sm:text-2xl">
                {title}
              </h1>
              <p className="mt-0.5 text-sm leading-relaxed text-gray-500">
                {description}
              </p>
            </div>
          </div>
        </div>

        {action?.href ? (
          <Link href={action.href} className={actionClassName}>
            <Icon name={actionIcon} size={16} />
            {action.label}
          </Link>
        ) : action?.onClick ? (
          <Button
            type="button"
            onClick={action.onClick}
            className={actionClassName}
          >
            <Icon name={actionIcon} size={16} />
            {action.label}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
