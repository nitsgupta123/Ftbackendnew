import { Icon } from "../ui/icons";
import { STEPS } from "@/lib/constants";

interface StepperProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
  canAccessStep?: (step: number) => boolean;
}

export default function Stepper({
  currentStep = 1,
  onStepClick,
  canAccessStep,
}: StepperProps) {
  return (
    <div className="space-y-0">
      {STEPS.map((step, index) => {
        const isCompleted = step.number < currentStep;
        const isCurrent = step.number === currentStep;
        const locked = canAccessStep ? !canAccessStep(step.number) : false;

        return (
          <div
            key={step.number}
            className={`flex gap-4 ${locked ? "opacity-45" : ""}`}
          >
            <div className="flex flex-col items-center">
              <div
                className={`
                  w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0
                  border-2
                  ${
                    locked
                      ? "bg-gray-100 border-[#D1D5DB]"
                      : isCompleted
                      ? "bg-[#A9832E] border-[#A9832E]"
                      : isCurrent
                      ? "bg-[#A8832A] border-[#A8832A]"
                      : "bg-white border-[#D1D5DB]"
                  }
                `}
              >
                {locked ? (
                  <Icon name="Shield" size={14} className="text-[#9CA3AF]" />
                ) : isCompleted ? (
                  <Icon name="CheckCheck" size={14} className="text-white" />
                ) : (
                  <Icon
                    name={step.icon}
                    size={14}
                    className={isCurrent ? "text-white" : "text-[#9CA3AF]"}
                  />
                )}
              </div>

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

            <div
              className={`pb-4 flex-1 min-w-0 ${
                index === STEPS.length - 1 ? "pb-0" : ""
              }`}
            >
              <div
                onClick={() => {
                  if (locked) return;
                  onStepClick?.(step.number);
                }}
                className={`
                  flex items-start justify-between rounded-[10px] px-3 py-2
                  ${
                    locked
                      ? "cursor-not-allowed"
                      : isCurrent
                      ? "bg-[#A8832A] cursor-pointer"
                      : "hover:bg-[#F7F3E8] cursor-pointer"
                  }
                `}
              >
                <div>
                  <p
                    className={`text-sm font-medium leading-tight ${
                      locked
                        ? "text-[#9CA3AF]"
                        : isCurrent
                        ? "text-white"
                        : isCompleted
                        ? "text-[#1F2A44]"
                        : "text-[#6B7280]"
                    }`}
                  >
                    {step.title}
                  </p>
                  {locked && (
                    <p className="text-xs mt-0.5 text-[#9CA3AF]">No access</p>
                  )}
                </div>
                {isCurrent && !locked && (
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
