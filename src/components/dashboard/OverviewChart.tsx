"use client";

import { useMemo, useState } from "react";
import { NativeSelect } from "@/components/ui/native-select";
import type { ChartDataPoint } from "@/lib/dashboard-data";

const PERIODS = ["Last 7 Days", "Last 30 Days", "Last 90 Days"] as const;

interface OverviewChartProps {
  data: ChartDataPoint[];
  period?: (typeof PERIODS)[number];
  onPeriodChange?: (period: (typeof PERIODS)[number]) => void;
  loading?: boolean;
}

export default function OverviewChart({
  data,
  period = "Last 7 Days",
  onPeriodChange,
  loading = false,
}: OverviewChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const width = 560;
  const height = 220;
  const padding = {
    top: 20,
    right: 16,
    bottom: 32,
    left: 44,
  };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxValue = useMemo(() => {
    const peak = data.reduce(
      (max, point) => Math.max(max, point.visitors, point.pageViews),
      0
    );
    if (peak <= 0) return 10;
    const magnitude = 10 ** Math.floor(Math.log10(peak));
    return Math.ceil(peak / magnitude) * magnitude;
  }, [data]);

  const yTicks = useMemo(() => {
    const step = maxValue / 4;
    return [0, step, step * 2, step * 3, maxValue];
  }, [maxValue]);

  const pointCount = Math.max(data.length, 1);
  const segmentWidth = pointCount > 1 ? chartW / (pointCount - 1) : chartW;
  const toX = (i: number) => padding.left + (i / (pointCount - 1 || 1)) * chartW;
  const toY = (v: number) => padding.top + chartH - (v / maxValue) * chartH;

  const makePath = (key: "visitors" | "pageViews") =>
    data
      .map((d, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(d[key])}`)
      .join(" ");

  const makeArea = (key: "visitors" | "pageViews") => {
    if (!data.length) return "";
    const line = data
      .map((d, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(d[key])}`)
      .join(" ");
    const lastX = toX(data.length - 1);
    const firstX = toX(0);
    const bottom = padding.top + chartH;
    return `${line} L ${lastX} ${bottom} L ${firstX} ${bottom} Z`;
  };

  return (
    <div className="h-full rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-semibold text-gray-900">Overview Statistics</h3>
        <NativeSelect
          value={period}
          onChange={(e) => onPeriodChange?.(e.target.value as (typeof PERIODS)[number])}
          disabled={loading}
          className="text-sm text-gray-600 border border-[#E5E7EB] rounded-lg px-3 py-1.5 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/30 disabled:opacity-60"
        >
          {PERIODS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3 sm:gap-5 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          Unique Enquiries
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          Total Enquiries
        </span>
      </div>

      <div className="relative w-full overflow-x-auto">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/70 text-sm text-gray-500">
            Updating chart...
          </div>
        )}

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto min-w-[520px] w-full"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {yTicks.map((tick) => (
            <g key={tick}>
              <line
                x1={padding.left}
                y1={toY(tick)}
                x2={width - padding.right}
                y2={toY(tick)}
                stroke="#F3F4F6"
                strokeWidth={1}
              />
              <text
                x={padding.left - 8}
                y={toY(tick) + 4}
                textAnchor="end"
                className="fill-gray-400 text-[10px]"
              >
                {tick >= 1000 ? `${tick / 1000}K` : Math.round(tick)}
              </text>
            </g>
          ))}

          {data.length > 0 && (
            <>
              <path d={makeArea("pageViews")} fill="url(#greenGrad)" opacity={0.3} />
              <path d={makeArea("visitors")} fill="url(#blueGrad)" opacity={0.3} />
              <path d={makePath("pageViews")} fill="none" stroke="#10B981" strokeWidth={2} />
              <path d={makePath("visitors")} fill="none" stroke="#3B82F6" strokeWidth={2} />
            </>
          )}

          {data.map((d, i) => (
            <g key={`${d.date}-${i}`}>
              <rect
                x={toX(i) - segmentWidth / 2}
                y={padding.top}
                width={segmentWidth}
                height={chartH}
                fill="transparent"
                onMouseEnter={() => setHoveredIndex(i)}
              />
              <text
                x={toX(i)}
                y={height - 8}
                textAnchor="middle"
                className="fill-gray-400 text-[10px]"
              >
                {d.date}
              </text>
            </g>
          ))}

          {hoveredIndex !== null && data[hoveredIndex] && (
            <>
              <line
                x1={toX(hoveredIndex)}
                y1={padding.top}
                x2={toX(hoveredIndex)}
                y2={padding.top + chartH}
                stroke="#D1D5DB"
                strokeDasharray="4 4"
              />
              <circle
                cx={toX(hoveredIndex)}
                cy={toY(data[hoveredIndex].visitors)}
                r={4}
                fill="#3B82F6"
              />
              <circle
                cx={toX(hoveredIndex)}
                cy={toY(data[hoveredIndex].pageViews)}
                r={4}
                fill="#10B981"
              />
            </>
          )}

          <defs>
            <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
            </linearGradient>
          </defs>
        </svg>

        {hoveredIndex !== null && data[hoveredIndex] && (
          <div
            className="absolute top-2 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg pointer-events-none z-10"
            style={{
              left: `${((toX(hoveredIndex) / width) * 100).toFixed(1)}%`,
              transform: "translateX(-50%)",
            }}
          >
            <p className="font-medium mb-1">{data[hoveredIndex].date}</p>
            <p className="text-blue-300">
              Unique Enquiries: {data[hoveredIndex].visitors.toLocaleString()}
            </p>
            <p className="text-emerald-300">
              Total Enquiries: {data[hoveredIndex].pageViews.toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
