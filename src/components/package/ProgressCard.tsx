"use client";

import { STEPS } from "@/lib/constants";

interface ProgressCardProps {
  currentStep?: number;
}

export default function ProgressCard({ currentStep = 1 }: ProgressCardProps) {
  const totalSteps = STEPS.length;
  const percent = Math.round((currentStep / totalSteps) * 100);

  return (
    <div className="bg-[#F7F3E8] rounded-[16px] border border-[#D9B24C] p-5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-[#1F2A44]">
          Package progress
        </h3>
        <span className="text-2xl font-bold text-[#1F2A44]">{percent}%</span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-[#D9B24C]/20 rounded-full h-2.5">
        <div
          className="bg-[#A9832E] h-2.5 rounded-full transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}