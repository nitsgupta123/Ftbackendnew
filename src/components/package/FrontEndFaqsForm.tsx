import { useState } from "react";
import { Plus } from "lucide-react";
import { Icon } from "../ui/icons";
import type { FaqItem as FaqItemData } from "@/lib/package-types";
import { saveButtonLabel, stepPreviousButtonClass, stepSaveButtonClass, type StepFormBaseProps } from "./step-form-props";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
interface FrontEndFaqsFormProps extends StepFormBaseProps {
  onNext: (data: FaqItemData[]) => void;
  onPrevious: () => void;
  initialData?: FaqItemData[] | null;
}
interface FaqItem {
  id: string;
  question: string;
  visibility: string;
  answer: string;
}
const VISIBILITY_OPTIONS = ["Show on front-end", "Hide from front-end"];
export default function FrontEndFaqsForm({
  onNext,
  onPrevious,
  isSaving = false
}: FrontEndFaqsFormProps) {
  const [faqs, setFaqs] = useState<FaqItem[]>([{
    id: "1",
    question: "Is this package suitable for f",
    visibility: "Show on front-end",
    answer: ""
  }]);
  const inputClass = "w-full h-[48px] px-4 text-sm border border-[#E5E7EB] rounded-[12px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors";
  const selectClass = `${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 24 24%27=%27none%27 stroke=%27%239CA3AF%27 stroke-width=%272%27%3E%3Cpath d=%27m6 9 6 6 6-6%27/%3E%3C/svg%3E')] bg-[length:12px] bg-[right_16px_center] bg-no-repeat pr-10`;
  const labelClass = "block text-sm font-semibold text-[#1F2A44] mb-2";
  const textareaClass = "w-full min-h-[120px] px-4 py-3 text-sm border border-[#E5E7EB] rounded-[12px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors resize-y";
  const updateFaq = (id: string, field: keyof FaqItem, value: string) => {
    setFaqs(prev => prev.map(faq => faq.id === id ? {
      ...faq,
      [field]: value
    } : faq));
  };
  const addFaq = () => {
    setFaqs(prev => [...prev, {
      id: String(Date.now()),
      question: "",
      visibility: "Show on front-end",
      answer: ""
    }]);
  };
  const deleteFaq = (id: string) => {
    setFaqs((prev) => {
      if (prev.length <= 1) {
        return [
          {
            id: String(Date.now()),
            question: "",
            visibility: "Show on front-end",
            answer: "",
          },
        ];
      }
      return prev.filter((faq) => faq.id !== id);
    });
  };
  return <div className="space-y-6">
      <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-[#1F2A44]">Front-End FAQs</h2>
          <p className="text-sm text-gray-400 mt-1.5 max-w-3xl leading-relaxed">
            FAQs shown on the package page. These should answer actual client
            buying concerns and support SEO without adding genericer.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => <div key={faq.id} className="rounded-[12px] border border-[#E5E7EB] p-5 space-y-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-bold text-[#1F2A44]">
                  FAQ {index + 1}
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => deleteFaq(faq.id)}
                  className="h-[36px] w-[36px] shrink-0 border-[#D1D5DB] text-gray-500 hover:text-red-600 hover:border-red-200"
                  aria-label={`Delete FAQ ${index + 1}`}
                  title="Delete FAQ"
                >
                  <Icon name="Trash2" size={16} />
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-x-6 gap-y-5">
                <div>
                  <Label htmlFor={`faq-question-${faq.id}`} className={labelClass}>
                    Question
                  </Label>
                  <Input id={`faq-question-${faq.id}`} type="text" value={faq.question} onChange={e => updateFaq(faq.id, "question", e.target.value)} className={inputClass} />
                
                </div>

                <div>
                  <Label htmlFor={`faq-visibility-${faq.id}`} className={labelClass}>
                  
                    Visibility
                  </Label>
                  <NativeSelect id={`faq-visibility-${faq.id}`} value={faq.visibility} onChange={e => updateFaq(faq.id, "visibility", e.target.value)} className={selectClass}>
                  
                    {VISIBILITY_OPTIONS.map(option => <option key={option} value={option}>
                        {option}
                      </option>)}
                  </NativeSelect>
                </div>
              </div>

              <div>
                <Label htmlFor={`faq-answer-${faq.id}`} className={labelClass}>
                  Answer
                </Label>
                <Textarea id={`faq-answer-${faq.id}`} value={faq.answer} onChange={e => updateFaq(faq.id, "answer", e.target.value)} className={textareaClass} />
              
              </div>
            </div>)}
        </div>

        <Button type="button" onClick={addFaq} className="h-11 px-5 text-sm font-semibold text-white bg-[#B48A2C] rounded-[12px] hover:bg-[#B48A2C]/90 transition-colors flex items-center gap-2 shadow-sm">
          
          <Plus size={16} />
          Add FAQ
        </Button>
      </div>

      <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <Button type="button" onClick={onPrevious} className={stepPreviousButtonClass}>
          
          <Icon name="ChevronLeft" size={16} />
          Previous
        </Button>

        <p className="text-xs text-gray-400 flex-1 text-center">
          Incomplete sections stay as draft.
        </p>

        <Button type="button" onClick={() => onNext(faqs)} disabled={isSaving} data-package-step-save="" className={stepSaveButtonClass}>
          
          {saveButtonLabel(isSaving)}
          <Icon name="ChevronRight" size={16} />
        </Button>
      </div>
    </div>;
}
