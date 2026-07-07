import Link from "next/link";
import { Icon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

const GOLD = "#A68231";

const writeNewBlogButtonClass =
  "inline-flex h-10 shrink-0 items-center gap-2 px-5 text-sm font-semibold text-white rounded-lg shadow-sm hover:opacity-90";

interface WriteNewBlogLinkProps {
  href?: string;
  className?: string;
}

export default function WriteNewBlogLink({
  href = "/blogs/new",
  className,
}: WriteNewBlogLinkProps) {
  return (
    <Link
      href={href}
      className={cn(writeNewBlogButtonClass, className)}
      style={{ backgroundColor: GOLD }}
    >
      <Icon name="Pencil" size={16} />
      Write New Blog
    </Link>
  );
}
