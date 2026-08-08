import Link from "next/link";
import { Icon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

const writeNewBlogButtonClass =
  "inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-[#E3D3AC] bg-[#F7EFDF] px-5 text-sm font-semibold text-[#8C6D26] shadow-sm transition hover:bg-[#F1E5CD] hover:border-[#D6C295]";

interface WriteNewBlogLinkProps {
  href?: string;
  className?: string;
}

export default function WriteNewBlogLink({
  href = "/blogs/new",
  className,
}: WriteNewBlogLinkProps) {
  return (
    <Link href={href} className={cn(writeNewBlogButtonClass, className)}>
      <Icon name="Pencil" size={16} />
      Write New Blog
    </Link>
  );
}
