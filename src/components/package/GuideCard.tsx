import { GUIDE_ITEMS } from "@/lib/constants";import { Button } from "@/components/ui/button";

const FIRST_ROW_ITEMS = GUIDE_ITEMS.slice(0, 3);
const SEO_GUIDE = GUIDE_ITEMS[3];
const SEO_STEP = 13;

interface GuideCardProps {
  onGuideClick?: (step: number) => void;
}

export default function GuideCard({ onGuideClick }: GuideCardProps) {
  return (
    <div className="bg-[#F7F3E8] rounded-[16px] border border-[#D9B24C] p-5">
      <h3 className="text-sm font-semibold text-[#1F2A44] mb-1">
        Package Guide
      </h3>
      <p className="text-xs text-[#6B7280] mb-4 leading-relaxed">
        Each section should explain what to enter, where the info comes from
        and what it affects.
      </p>

      <div className="flex flex-wrap gap-2.5">
        {FIRST_ROW_ITEMS.map((item) =>
        <Button
          key={item.title}
          type="button"
          className="h-8 px-3.5 text-xs font-medium text-[#7A1F1F] bg-white border border-[#D9B24C] rounded-full whitespace-nowrap hover:bg-[#F7F3E8] transition-colors"
          style={{ lineHeight: "32px" }}>
          
            {item.title}
          </Button>
        )}
      </div>

      <div className="mt-2.5">
        <Button
          type="button"
          onClick={() => onGuideClick?.(SEO_STEP)}
          className="h-8 px-3.5 text-xs font-medium text-[#7A1F1F] bg-white border border-[#D9B24C] rounded-full whitespace-nowrap hover:bg-[#F7F3E8] transition-colors"
          style={{ lineHeight: "32px" }}>
          
          {SEO_GUIDE.title}
        </Button>
      </div>
    </div>);

}
