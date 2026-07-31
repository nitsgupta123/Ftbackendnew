"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Icon } from "../ui/icons";
import type { HotelEntry } from "@/lib/package-types";
import {
  saveButtonLabel,
  stepPreviousButtonClass,
  stepSaveButtonClass,
  type StepFormBaseProps,
} from "./step-form-props";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";

const VISIBILITY_OPTIONS = ["Internal only", "Frontend visible", "Hidden"];

type HotelFormRow = HotelEntry & { id: string };

function ToggleCard({
  label,
  active,
  onChange,
}: {
  label: string;
  active: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div
      className="
        flex items-center justify-between
        bg-white border border-[#E5E7EB] rounded-[12px]
        px-5 py-[18px]
        transition-all duration-200 ease-in-out
        cursor-pointer select-none
        hover:border-gray-300
      "
      onClick={() => onChange(!active)}
    >
      <span className="text-sm font-bold text-[#1F2A44] whitespace-nowrap">
        {label}
      </span>

      <div className="flex items-center gap-3">
        <span
          className={`text-sm font-semibold ${active ? "text-[#16A34A]" : "text-[#64748B]"}`}
        >
          {active ? "Yes" : "No"}
        </span>

        <div
          role="switch"
          aria-checked={active}
          className={`
            relative inline-flex h-[26px] w-[46px] items-center rounded-full flex-shrink-0
            transition-colors duration-300 ease-in-out
            ${active ? "bg-[#22C55E]" : "bg-[#CBD5E1]"}
          `}
        >
          <span
            className={`
              inline-block h-[20px] w-[20px] transform rounded-full bg-white
              shadow-sm ring-0 transition-transform duration-300 ease-in-out
              ${active ? "translate-x-[23px]" : "translate-x-[3px]"}
            `}
          />
        </div>
      </div>
    </div>
  );
}

function createEmptyHotel(id?: string): HotelFormRow {
  return {
    id: id ?? String(Date.now()),
    hotelName: "",
    city: "",
    starRating: "",
    roomType: "",
    nights: "",
    childPolicy: "",
    maxOccupancy: "",
    address: "",
    googleMapsLink: "",
    visibility: "Internal only",
    internalNotes: "",
    breakfastIncluded: true,
    connectingRooms: false,
    halalBreakfast: false,
    extraBed: false,
  };
}

function toHotelRows(data?: HotelEntry[] | null): HotelFormRow[] {
  if (!data?.length) return [createEmptyHotel("1")];
  return data.map((hotel, index) => ({
    ...createEmptyHotel(String(index + 1)),
    ...hotel,
    id: String(index + 1),
    visibility: hotel.visibility ?? "Internal only",
    breakfastIncluded: hotel.breakfastIncluded ?? true,
    connectingRooms: hotel.connectingRooms ?? false,
    halalBreakfast: hotel.halalBreakfast ?? false,
    extraBed: hotel.extraBed ?? false,
  }));
}

function toHotelEntries(rows: HotelFormRow[]): HotelEntry[] {
  return rows.map(({ id: _id, ...hotel }) => hotel);
}

interface HotelsFormProps extends StepFormBaseProps {
  onNext: (data: HotelEntry[]) => void;
  onPrevious: () => void;
  initialData?: HotelEntry[] | null;
}

export default function HotelsForm({
  onNext,
  onPrevious,
  initialData,
  isSaving = false,
}: HotelsFormProps) {
  const [hotels, setHotels] = useState<HotelFormRow[]>(() =>
    toHotelRows(initialData)
  );

  useEffect(() => {
    if (!initialData) return;
    setHotels(toHotelRows(initialData));
  }, [initialData]);

  const inputClass =
    "w-full h-[48px] px-4 text-sm border border-[#E5E7EB] rounded-[12px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors hover:border-gray-300";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";
  const selectClass = `${inputClass} cursor-pointer appearance-none bg-no-repeat bg-[length:16px] bg-[right_12px_center] pr-10`;

  const updateHotel = <K extends keyof HotelFormRow>(
    id: string,
    field: K,
    value: HotelFormRow[K]
  ) => {
    setHotels((prev) =>
      prev.map((hotel) =>
        hotel.id === id ? { ...hotel, [field]: value } : hotel
      )
    );
  };

  const addHotel = () => {
    setHotels((prev) => [...prev, createEmptyHotel()]);
  };

  const deleteHotel = (id: string) => {
    setHotels((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((hotel) => hotel.id !== id);
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm">
        <div className="px-6 py-5 border-b border-[#E5E7EB]">
          <h2 className="text-lg font-semibold text-[#1F2A44]">Hotels</h2>
          <p className="text-sm text-gray-400 mt-1 max-w-2xl">
            Manage hotel information at the individual hotel level. Settings on
            one hotel do not affect the others.
          </p>
        </div>

        <div className="p-6 space-y-5">
          {hotels.map((hotel, index) => (
            <div
              key={hotel.id}
              className="rounded-[12px] border border-[#E5E7EB] p-5 space-y-5"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-bold text-[#1F2A44]">
                  Hotel {index + 1}
                  {hotel.hotelName ? ` — ${hotel.hotelName}` : ""}
                </h3>
                {hotels.length > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => deleteHotel(hotel.id)}
                    className="h-[36px] w-[36px] shrink-0 border-[#D1D5DB] text-gray-500 hover:text-red-600 hover:border-red-200"
                    aria-label={`Delete hotel ${index + 1}`}
                  >
                    <Icon name="Trash2" size={16} />
                  </Button>
                ) : null}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
                <div>
                  <Label className={labelClass}>Hotel name</Label>
                  <Input
                    type="text"
                    placeholder="Enter hotel name"
                    value={hotel.hotelName ?? ""}
                    onChange={(e) =>
                      updateHotel(hotel.id, "hotelName", e.target.value)
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <Label className={labelClass}>City</Label>
                  <Input
                    type="text"
                    placeholder="Enter city"
                    value={hotel.city ?? ""}
                    onChange={(e) =>
                      updateHotel(hotel.id, "city", e.target.value)
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <Label className={labelClass}>Star rating</Label>
                  <Input
                    type="text"
                    placeholder="e.g., 5"
                    value={hotel.starRating ?? ""}
                    onChange={(e) =>
                      updateHotel(hotel.id, "starRating", e.target.value)
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <Label className={labelClass}>Room type</Label>
                  <Input
                    type="text"
                    placeholder="e.g., Deluxe"
                    value={hotel.roomType ?? ""}
                    onChange={(e) =>
                      updateHotel(hotel.id, "roomType", e.target.value)
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <Label className={labelClass}>Nights</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="e.g., 3"
                    value={hotel.nights ?? ""}
                    onChange={(e) =>
                      updateHotel(hotel.id, "nights", e.target.value)
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <Label className={labelClass}>Child policy</Label>
                  <Input
                    type="text"
                    placeholder="e.g., Free under 12"
                    value={hotel.childPolicy ?? ""}
                    onChange={(e) =>
                      updateHotel(hotel.id, "childPolicy", e.target.value)
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <Label className={labelClass}>Max occupancy</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="e.g., 3"
                    value={hotel.maxOccupancy ?? ""}
                    onChange={(e) =>
                      updateHotel(hotel.id, "maxOccupancy", e.target.value)
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <Label className={labelClass}>Address</Label>
                  <Input
                    type="text"
                    placeholder="Hotel full address"
                    value={hotel.address ?? ""}
                    onChange={(e) =>
                      updateHotel(hotel.id, "address", e.target.value)
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <Label className={labelClass}>Google Maps link</Label>
                  <Input
                    type="url"
                    placeholder="https://maps.google.com/..."
                    value={hotel.googleMapsLink ?? ""}
                    onChange={(e) =>
                      updateHotel(hotel.id, "googleMapsLink", e.target.value)
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-6 gap-y-5">
                <div>
                  <Label className={labelClass}>Front-end visibility</Label>
                  <NativeSelect
                    value={hotel.visibility ?? "Internal only"}
                    onChange={(e) =>
                      updateHotel(hotel.id, "visibility", e.target.value)
                    }
                    className={selectClass}
                    style={{
                      appearance: "none",
                      WebkitAppearance: "none",
                      MozAppearance: "none",
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 12px center",
                      backgroundSize: "16px",
                      paddingRight: "40px",
                    }}
                  >
                    {VISIBILITY_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </NativeSelect>
                </div>

                <div className="lg:col-span-2">
                  <Label className={labelClass}>Internal notes</Label>
                  <Textarea
                    rows={3}
                    placeholder="Add any internal notes about this hotel..."
                    value={hotel.internalNotes ?? ""}
                    onChange={(e) =>
                      updateHotel(hotel.id, "internalNotes", e.target.value)
                    }
                    className="w-full px-4 py-3 text-sm border border-[#E5E7EB] rounded-[12px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/20 focus:border-[#B48A2C] transition-colors hover:border-gray-300 resize-y min-h-[48px]"
                  />
                </div>
              </div>

              <div className="border-t border-[#E5E7EB] pt-5">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Hotel Features & Status
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ToggleCard
                    label="Breakfast included"
                    active={hotel.breakfastIncluded ?? false}
                    onChange={(value) =>
                      updateHotel(hotel.id, "breakfastIncluded", value)
                    }
                  />
                  <ToggleCard
                    label="Halal breakfast"
                    active={hotel.halalBreakfast ?? false}
                    onChange={(value) =>
                      updateHotel(hotel.id, "halalBreakfast", value)
                    }
                  />
                  <ToggleCard
                    label="Connecting rooms available"
                    active={hotel.connectingRooms ?? false}
                    onChange={(value) =>
                      updateHotel(hotel.id, "connectingRooms", value)
                    }
                  />
                  <ToggleCard
                    label="Extra bed"
                    active={hotel.extraBed ?? false}
                    onChange={(value) =>
                      updateHotel(hotel.id, "extraBed", value)
                    }
                  />
                </div>
              </div>
            </div>
          ))}

          <Button
            type="button"
            onClick={addHotel}
            className="h-11 px-5 text-sm font-semibold text-white bg-[#B48A2C] rounded-[12px] hover:bg-[#B48A2C]/90 transition-colors flex items-center gap-2 shadow-sm"
          >
            <Plus size={16} />
            Add Hotel
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <Button
          type="button"
          onClick={onPrevious}
          className={stepPreviousButtonClass}
        >
          <Icon name="ChevronLeft" size={16} />
          Previous
        </Button>

        <p className="text-xs text-gray-400 flex-1 text-center">
          ... Incomplete sections stay as draft.
        </p>

        <Button
          type="button"
          onClick={() => onNext(toHotelEntries(hotels))}
          disabled={isSaving}
          className={stepSaveButtonClass}
        >
          {saveButtonLabel(isSaving)}
          <Icon name="ChevronRight" size={16} />
        </Button>
      </div>
    </div>
  );
}
