import { useState } from "react";
import { Plus } from "lucide-react";
import { Icon } from "../ui/icons";
import type { BookingPolicyData } from "@/lib/package-types";
import { saveButtonLabel, stepPreviousButtonClass, stepSaveButtonClass, type StepFormBaseProps } from "./step-form-props";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
interface BookingPolicyFormProps extends StepFormBaseProps {
  onNext: (data: BookingPolicyData) => void;
  onPrevious: () => void;
  initialData?: BookingPolicyData | null;
}
interface CancellationRow {
  id: string;
  from: string;
  to: string;
  clientCharge: string;
}
export default function BookingPolicyForm({
  onNext,
  onPrevious,
  initialData,
  isSaving = false
}: BookingPolicyFormProps) {
  const saved = initialData ?? null;
  const [paymentMode, setPaymentMode] = useState(saved?.paymentMode || "full");
  const [depositAmount, setDepositAmount] = useState(saved?.depositAmount ?? "");
  const [balanceDue, setBalanceDue] = useState(saved?.balanceDue ?? "");
  const [confirmationRule, setConfirmationRule] = useState(saved ? saved.confirmationRule ?? "" : "Booking is only confirmed after payment is received, verified by accounts, and supplier availability is reconfirmed.");
  const [amendmentPolicy, setAmendmentPolicy] = useState(saved?.amendmentPolicy ?? "");
  const [exceptionApproval, setExceptionApproval] = useState(saved?.exceptionApproval ?? "");
  const [refundableComponents, setRefundableComponents] = useState(saved?.refundableComponents ?? "");
  const [nonRefundableComponents, setNonRefundableComponents] = useState(saved?.nonRefundableComponents ?? "");
  const [cancellationRows, setCancellationRows] = useState<CancellationRow[]>(saved ? saved.cancellationRows ?? [] : [{
    id: "1",
    from: "90 days before",
    to: "61 days before",
    clientCharge: "Admin fee only"
  }, {
    id: "2",
    from: "30 days before",
    to: "Travel date",
    clientCharge: "Non-refundable"
  }]);
  const addCancellationRow = () => {
    setCancellationRows(prev => [...prev, {
      id: String(Date.now()),
      from: "",
      to: "",
      clientCharge: ""
    }]);
  };
  const updateCancellationRow = (id: string, field: keyof CancellationRow, value: string) => {
    setCancellationRows(prev => prev.map(row => row.id === id ? {
      ...row,
      [field]: value
    } : row));
  };
  const inputClass = "w-full h-[48px] px-4 text-sm border border-[#E5E7EB] rounded-[12px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors";
  const selectClass = `${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 24 24%27=%27none%27 stroke=%27%239CA3AF%27 stroke-width=%272%27%3E%3Cpath d=%27m6 9 6 6 6-6%27/%3E%3C/svg%3E')] bg-[length:12px] bg-[right_16px_center] bg-no-repeat pr-10`;
  const labelClass = "block text-sm font-semibold text-[#1F2A44] mb-2";
  const textareaClass = "w-full min-h-[120px] px-4 py-3 text-sm border border-[#E5E7EB] rounded-[12px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors resize-y";
  const rowInputClass = "w-full h-[44px] px-4 text-sm border border-[#E5E7EB] rounded-full bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors";
  return <div className="space-y-6">
      {/* Main card: header, payment, confirmation, cancellation builder */}
      <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-[#1F2A44]">Booking Policy</h2>
          <p className="text-sm text-gray-400 mt-1.5 max-w-3xl leading-relaxed">
            Use a structured payment and cancellation setup instead of one messy
            text box. Online sales should default to full payment where possible.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5">
          <div>
            <Label className={labelClass}>Payment mode</Label>
            <NativeSelect value={paymentMode} onChange={e => setPaymentMode(e.target.value)} className={selectClass}>
              
              <option value="full">Full payment online</option>
              <option value="deposit">Deposit + balance</option>
              <option value="onarrival">Pay on arrival</option>
              <option value="installments">Installments</option>
            </NativeSelect>
          </div>

          <div>
            <Label className={labelClass}>Deposit amount or percentage</Label>
            <Input type="text" placeholder="Example: 30%" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} className={inputClass} />
            
          </div>

          <div>
            <Label className={labelClass}>Balance due</Label>
            <Input type="text" placeholder="Example: 30 days" value={balanceDue} onChange={e => setBalanceDue(e.target.value)} className={inputClass} />
            
          </div>
        </div>

        <div>
          <Label className={labelClass}>Confirmation rule</Label>
          <Textarea value={confirmationRule} onChange={e => setConfirmationRule(e.target.value)} className={textareaClass} />
          
        </div>

        {/* Nested cancellation policy builder */}
        <div className="rounded-[12px] border border-[#E5E7EB] p-5 space-y-5">
          <div>
            <h3 className="text-base font-bold text-[#1F2A44]">
              Cancellation policy builder
            </h3>
            <p className="text-sm text-gray-400 mt-1.5 max-w-3xl leading-relaxed">
              Use this to build a proper cancellation ladder. This can be shown
              internally or converted into client-facing wording.
            </p>
          </div>

          <div className="overflow-x-auto pb-1">
            <div className="min-w-[560px]">
              <div className="grid grid-cols-[1fr_1fr_1fr] gap-3 text-sm font-semibold text-[#1F2A44] pb-3">
                <span>From</span>
                <span>To</span>
                <span>Client charge</span>
              </div>

              <div className="space-y-3">
                {cancellationRows.map(row => <div key={row.id} className="grid grid-cols-[1fr_1fr_1fr] gap-3 items-center">
                  
                    <Input type="text" placeholder="e.g., 90 days before" value={row.from} onChange={e => updateCancellationRow(row.id, "from", e.target.value)} className={rowInputClass} />
                  
                    <Input type="text" placeholder="e.g., 61 days before" value={row.to} onChange={e => updateCancellationRow(row.id, "to", e.target.value)} className={rowInputClass} />
                  
                    <Input type="text" placeholder="e.g., Admin fee only" value={row.clientCharge} onChange={e => updateCancellationRow(row.id, "clientCharge", e.target.value)} className={rowInputClass} />
                  
                  </div>)}
              </div>
            </div>
          </div>

          <Button type="button" onClick={addCancellationRow} className="h-10 px-5 text-sm font-medium text-white bg-[#1F2A44] rounded-[10px] hover:bg-[#1F2A44]/90 transition-colors flex items-center gap-2 shadow-sm">
            
            <Plus size={14} />
            Add cancellation rule
          </Button>
        </div>
      </div>

      {/* 2x2 policy text areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm p-6">
          <Label className={labelClass}>Amendment policy</Label>
          <Textarea placeholder="Describe the amendment policy..." value={amendmentPolicy} onChange={e => setAmendmentPolicy(e.target.value)} className={textareaClass} />
          
        </div>

        <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm p-6">
          <Label className={labelClass}>Exception approval rules</Label>
          <Textarea placeholder="Who can approve exceptions, refunds, changes, goodwill offers." value={exceptionApproval} onChange={e => setExceptionApproval(e.target.value)} className={textareaClass} />
          
        </div>

        <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm p-6">
          <Label className={labelClass}>Refundable components</Label>
          <Textarea placeholder="List refundable components..." value={refundableComponents} onChange={e => setRefundableComponents(e.target.value)} className={textareaClass} />
          
        </div>

        <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm p-6">
          <Label className={labelClass}>Non-refundable components</Label>
          <Textarea placeholder="List non-refundable components..." value={nonRefundableComponents} onChange={e => setNonRefundableComponents(e.target.value)} className={textareaClass} />
          
        </div>
      </div>

      {/* Footer navigation */}
      <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <Button type="button" onClick={onPrevious} className={stepPreviousButtonClass}>
          
          <Icon name="ChevronLeft" size={16} />
          Previous
        </Button>

        <p className="text-xs text-gray-400 flex-1 text-center">
          Incomplete sections stay as draft.
        </p>

        <Button type="button" onClick={() => onNext({
        paymentMode,
        depositAmount,
        balanceDue,
        confirmationRule,
        cancellationRows,
        amendmentPolicy,
        exceptionApproval,
        refundableComponents,
        nonRefundableComponents
      })} disabled={isSaving} data-package-step-save="" className={stepSaveButtonClass}>
          
          {saveButtonLabel(isSaving)}
          <Icon name="ChevronRight" size={16} />
        </Button>
      </div>
    </div>;
}
