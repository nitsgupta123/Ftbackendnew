export interface StepFormBaseProps {
  isSaving?: boolean;
}

export function saveButtonLabel(isSaving?: boolean) {
  return isSaving ? "Saving..." : "Save & continue";
}

const stepNavButtonClass =
  "step-nav-button h-10 gap-2 px-5 text-sm font-semibold rounded-[8px]";

export const stepPreviousButtonClass = stepNavButtonClass;
export const stepSaveButtonClass = stepNavButtonClass;
