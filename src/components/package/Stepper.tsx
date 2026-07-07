"use client";

import { Icon } from "../ui/icons";
import { STEPS } from "@/lib/constants";

interface StepperProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export default function Stepper({ currentStep = 1, onStepClick }: StepperProps) {
  return (
    <div className="space-y-0">
      {STEPS.map((step, index) => {
        const isCompleted = step.number < currentStep;
        const isCurrent = step.number === currentStep;

        return (
          <div key={step.number} className="flex gap-3">
            {/* Circle + connector line column */}
            <div className="flex flex-col items-center">
              {/* Circle */}
              <div
                className={`
                  w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0
                  border-2 transition-colors duration-300
                  ${
                    isCompleted
                      ? "bg-[#A9832E] border-[#A9832E]"
                      : isCurrent
                      ? "bg-[#A8832A] border-[#A8832A]"
                      : "bg-white border-[#D1D5DB]"
                  }
                `}
              >
                {isCompleted ? (
                  <Icon name="CheckCheck" size={14} className="text-white" />
                ) : (
                  <Icon
                    name={step.icon}
                    size={14}
                    className={
                      isCurrent ? "text-white" : "text-[#9CA3AF]"
                    }
                  />
                )}
              </div>

              {/* Connector line */}
              {index < STEPS.length - 1 && (
                <div
                  className={`
                    w-0.5 flex-1 min-h-[16px]
                    ${
                      isCompleted || isCurrent
                        ? "bg-[#A9832E]/30"
                        : "bg-[#D1D5DB]"
                    }
                  `}
                />
              )}
            </div>

            {/* Step label */}
            <div
              className={`pb-4 flex-1 ${
                index === STEPS.length - 1 ? "pb-0" : ""
              }`}
            >
              <div
                onClick={() => onStepClick?.(step.number)}
                className={`
                  flex items-start justify-between cursor-pointer rounded-[10px] px-3 py-2 -mx-3
                  transition-all duration-200
                  ${
                    isCurrent
                      ? "bg-[#A8832A]"
                      : "hover:bg-[#F7F3E8]"
                  }
                `}
              >
                <div>
                  <p
                    className={`text-sm font-medium leading-tight ${
                      isCurrent
                        ? "text-white"
                        : isCompleted
                        ? "text-[#1F2A44]"
                        : "text-[#6B7280]"
                    }`}
                  >
                    {step.title}
                  </p>
                  <p
                    className={`text-xs mt-0.5 ${
                      isCurrent
                        ? "text-white/70"
                        : "text-[#9CA3AF]"
                    }`}
                  >
                    {step.department}
                  </p>
                </div>
                {isCurrent && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-white/20 text-white rounded-full whitespace-nowrap ml-2">
                    Current
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}