import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import { HELP_DESK_SECTIONS } from "@/lib/help-desk-content";
import { Icon } from "@/components/ui/icons";

export default function HelpDeskPanel() {
  const [activeId, setActiveId] = useState(HELP_DESK_SECTIONS[0]?.id ?? "");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return HELP_DESK_SECTIONS;
    return HELP_DESK_SECTIONS.filter(
      (section) =>
        section.title.toLowerCase().includes(term) ||
        section.summary.toLowerCase().includes(term) ||
        section.steps.some((step) => step.toLowerCase().includes(term))
    );
  }, [query]);

  useEffect(() => {
    if (!filtered.some((section) => section.id === activeId)) {
      setActiveId(filtered[0]?.id ?? "");
    }
  }, [filtered, activeId]);

  const active = filtered.find((section) => section.id === activeId) ?? filtered[0];

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="rounded-xl border border-[#E5E7EB] bg-white p-3 h-fit lg:sticky lg:top-20">
        <label className="sr-only" htmlFor="help-search">
          Search help
        </label>
        <input
          id="help-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search sections…"
          className="mb-3 w-full h-10 rounded-lg border border-[#E5E7EB] px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C]"
        />
        <ul className="space-y-1 max-h-[70vh] overflow-y-auto">
          {filtered.map((section) => {
            const isActive = section.id === active?.id;
            return (
              <li key={section.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(section.id)}
                  className={`w-full text-left rounded-lg px-3 py-2 text-sm ${
                    isActive
                      ? "bg-[#FFF8EC] text-[#8C6D26] font-medium border border-[#E3D3AC]"
                      : "text-gray-600 hover:bg-gray-50 border border-transparent"
                  }`}
                >
                  {section.title}
                </button>
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li className="px-3 py-6 text-sm text-gray-500 text-center">
              No matching sections.
            </li>
          )}
        </ul>
      </aside>

      {active ? (
        <article className="rounded-xl border border-[#E5E7EB] bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E5E7EB] pb-4">
            <div>
              <h2 className="text-xl font-semibold text-[#1F2A44]">{active.title}</h2>
              <p className="mt-1 text-sm text-gray-600">{active.summary}</p>
            </div>
            <Link
              to={active.href}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#E3D3AC] bg-[#F7EFDF] px-4 text-sm font-semibold text-[#8C6D26] hover:bg-[#F1E5CD]"
            >
              Open section
              <Icon name="ChevronRight" size={16} />
            </Link>
          </div>

          <ol className="mt-5 space-y-3">
            {active.steps.map((step, index) => (
              <li
                key={`${active.id}-${index}`}
                className="flex gap-3 rounded-lg border border-[#EEF1F6] bg-[#FBFCFD] p-3"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1F2A44] text-xs font-semibold text-white">
                  {index + 1}
                </span>
                <p className="text-sm text-gray-700 leading-relaxed pt-1">{step}</p>
              </li>
            ))}
          </ol>
        </article>
      ) : null}
    </div>
  );
}
