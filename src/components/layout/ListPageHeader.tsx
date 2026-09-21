import { Link } from "react-router-dom";
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
  back?: {
    href: string;
    label: string;
  };
}

export const headerActionClassName =
  "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#E3D3AC] bg-[#F7EFDF] px-5 text-sm font-semibold !text-[#8C6D26] shadow-sm transition hover:bg-[#F1E5CD] hover:border-[#D6C295] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A68231]/25";

export default function ListPageHeader({
  icon,
  title,
  description,
  action,
  back,
}: ListPageHeaderProps) {
  const actionIcon = action?.icon ?? "Plus";

  return (
    <div className="mb-6">
      {back && (
        <Link
          to={back.href}
          className="mb-3 flex w-fit items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-gray-600"
        >
          <Icon name="ArrowLeft" size={16} />
          <span>{back.label}</span>
        </Link>
      )}

      <div className="overflow-hidden rounded-2xl border border-[#E8ECF0] bg-gradient-to-br from-[#FFFCF7] via-white to-[#F7F9FC] shadow-sm">
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
            <Link to={action.href} className={headerActionClassName}>
              <Icon name={actionIcon} size={16} />
              {action.label}
            </Link>
          ) : action?.onClick ? (
            <Button
              type="button"
              variant="ghost"
              onClick={action.onClick}
              className={headerActionClassName}
            >
              <Icon name={actionIcon} size={16} />
              {action.label}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
