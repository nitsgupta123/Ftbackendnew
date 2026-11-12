"use client";

import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Icon } from "../ui/icons";
import {
  DEFAULT_HOTEL_DISCLAIMER,
  HOTEL_CATEGORY_OPTIONS,
  inferStarCategory,
  normalizeHotels,
} from "@/lib/package-content";
import type { HotelCategoryKey, HotelEntry, HotelsSection } from "@/lib/package-types";
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
      className="flex items-center justify-between bg-white border border-[#E5E7EB] rounded-[12px] px-5 py-[18px] transition-all duration-200 ease-in-out cursor-pointer select-none hover:border-gray-300"
      onClick={() => onChange(!active)}
    >
      <span className="text-sm font-bold text-[#1F2A44] whitespace-nowrap">{label}</span>
      <div className="flex items-center gap-3">
        <span className={`text-sm font-semibold ${active ? "text-[#16A34A]" : "text-[#64748B]"}`}>
          {active ? "Yes" : "No"}
        </span>
        <div
          role="switch"
          aria-checked={active}
          className={`relative inline-flex h-[26px] w-[46px] items-center rounded-full flex-shrink-0 transition-colors duration-300 ease-in-out ${active ? "bg-[#22C55E]" : "bg-[#CBD5E1]"}`}
        >
          <span
            className={`inline-block h-[20px] w-[20px] transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-300 ease-in-out ${active ? "translate-x-[23px]" : "translate-x-[3px]"}`}
          />
        </div>
      </div>
    </div>
  );
}

function createEmptyHotel(category: HotelCategoryKey, id?: string): HotelFormRow {
  const stars = category.replace("star", "");
  return {
    id: id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    hotelName: "",
    city: "",
    starCategory: category,
    starRating: stars,
    roomType: "",
    childPolicy: "",
    maxOccupancy: "",
    address: "",
    googleMapsLink: "",
    visibility: "Frontend visible",
    notesVisibility: "internal",
    internalNotes: "",
    breakfastIncluded: true,
    connectingRooms: false,
    halalBreakfast: false,
    extraBed: false,
  };
}

function toHotelRows(data?: HotelsSection | HotelEntry[] | null): HotelFormRow[] {
  const section = normalizeHotels(data);
  if (!section.entries.length) return [createEmptyHotel("4star", "hotel-1")];
  return section.entries.map((hotel, index) => {
    const category = inferStarCategory(hotel) || "4star";
    return {
      ...createEmptyHotel(category, `hotel-${index + 1}`),
      ...hotel,
      id: `hotel-${index + 1}-${hotel.hotelName ?? "stay"}`,
      starCategory: category,
      notesVisibility: hotel.notesVisibility === "client" ? "client" : "internal",
      visibility: hotel.visibility ?? "Frontend visible",
      breakfastIncluded: hotel.breakfastIncluded ?? true,
      connectingRooms: hotel.connectingRooms ?? false,
      halalBreakfast: hotel.halalBreakfast ?? false,
      extraBed: hotel.extraBed ?? false,
    };
  });
}

interface HotelsFormProps extends StepFormBaseProps {
  onNext: (data: HotelsSection) => void;
  onPrevious: () => void;
  initialData?: HotelsSection | HotelEntry[] | null;
}

export default function HotelsForm({
  onNext,
  onPrevious,
  initialData,
  isSaving = false,
}: HotelsFormProps) {
  const [hotels, setHotels] = useState<HotelFormRow[]>(() => toHotelRows(initialData));
  const [openHotelId, setOpenHotelId] = useState<string | null>(
    () => toHotelRows(initialData)[0]?.id ?? null
  );
  const [disclaimer, setDisclaimer] = useState(
    () => normalizeHotels(initialData).disclaimer || DEFAULT_HOTEL_DISCLAIMER
  );
  const pendingScrollId = useRef<string | null>(null);

  useEffect(() => {
    if (!initialData) return;
    const rows = toHotelRows(initialData);
    setHotels(rows);
    setDisclaimer(normalizeHotels(initialData).disclaimer || DEFAULT_HOTEL_DISCLAIMER);
    setOpenHotelId((current) =>
      current && rows.some((hotel) => hotel.id === current) ? current : rows[0]?.id ?? null
    );
  }, [initialData]);

  useEffect(() => {
    const id = pendingScrollId.current;
    if (!id) return;
    pendingScrollId.current = null;
    document.getElementById(`hotel-card-${id}`)?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [hotels]);

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
      prev.map((hotel) => (hotel.id === id ? { ...hotel, [field]: value } : hotel))
    );
  };

  const addHotel = (category: HotelCategoryKey) => {
    const next = createEmptyHotel(category);
    pendingScrollId.current = next.id;
    setHotels((prev) => [...prev, next]);
    setOpenHotelId(next.id);
  };

  const deleteHotel = (id: string) => {
    setHotels((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((hotel) => hotel.id !== id);
    });
    setOpenHotelId((current) => {
      if (current !== id) return current;
      const remaining = hotels.filter((hotel) => hotel.id !== id);
      return remaining[0]?.id ?? null;
    });
  };

  const clientGroups = HOTEL_CATEGORY_OPTIONS.map((group) => ({
    ...group,
    rows: hotels.filter(
      (hotel) =>
        hotel.starCategory === group.key &&
        hotel.visibility === "Frontend visible" &&
        hotel.hotelName?.trim()
    ),
  })).filter((group) => group.rows.length > 0);
  const hiddenFromWebsite = hotels.filter(
    (hotel) => hotel.hotelName?.trim() && hotel.visibility !== "Frontend visible"
  ).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm">
        <div className="px-6 py-5 border-b border-[#E5E7EB]">
          <h2 className="text-lg font-semibold text-[#1F2A44]">Hotels</h2>
          <p className="text-sm text-gray-400 mt-1 max-w-2xl">
            Group hotels under the 3-star, 4-star, and 5-star package options. Adding
            another hotel collapses the one you were editing.
          </p>
        </div>

        <div className="p-6 space-y-6">
          {HOTEL_CATEGORY_OPTIONS.map((group) => {
            const rows = hotels.filter((hotel) => hotel.starCategory === group.key);
            return (
              <section key={group.key} className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold text-[#1F2A44]">{group.label}</h3>
                  <span className="text-xs text-gray-400">
                    {rows.length} hotel{rows.length === 1 ? "" : "s"}
                  </span>
                </div>
                {rows.map((hotel, index) => {
                  const open = openHotelId === hotel.id;
                  return (
                    <div
                      key={hotel.id}
                      id={`hotel-card-${hotel.id}`}
                      className="rounded-[12px] border border-[#E5E7EB] overflow-hidden"
                    >
                      <button
                        type="button"
                        aria-expanded={open}
                        onClick={() => setOpenHotelId(open ? null : hotel.id)}
                        className="flex w-full items-center justify-between gap-3 bg-[#FAFAFA] px-5 py-4 text-left"
                      >
                        <span className="min-w-0 text-left">
                          <span className="block truncate text-sm font-bold text-[#1F2A44]">
                            Hotel {index + 1}
                            {hotel.hotelName?.trim() ? ` — ${hotel.hotelName.trim()}` : ""}
                          </span>
                          {(hotel.city?.trim() ||
                            (hotel.visibility && hotel.visibility !== "Frontend visible")) && (
                            <span className="mt-0.5 block truncate text-xs font-normal text-gray-400">
                              {[
                                hotel.city?.trim(),
                                hotel.visibility && hotel.visibility !== "Frontend visible"
                                  ? hotel.visibility
                                  : "",
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          )}
                        </span>
                        <Icon
                          name={open ? "ChevronDown" : "ChevronRight"}
                          size={16}
                          className="shrink-0 text-gray-400"
                        />
                      </button>
                      {open ? (
                        <div className="space-y-5 p-5">
                          <div className="flex justify-end">
                            {hotels.length > 1 ? (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => deleteHotel(hotel.id)}
                                className="h-[36px] w-[36px] shrink-0 border-[#D1D5DB] text-gray-500 hover:text-red-600 hover:border-red-200"
                                aria-label={`Delete ${hotel.hotelName || "hotel"}`}
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
                                onChange={(e) => updateHotel(hotel.id, "hotelName", e.target.value)}
                                className={inputClass}
                              />
                            </div>
                            <div>
                              <Label className={labelClass}>City</Label>
                              <Input
                                type="text"
                                placeholder="Enter city"
                                value={hotel.city ?? ""}
                                onChange={(e) => updateHotel(hotel.id, "city", e.target.value)}
                                className={inputClass}
                              />
                            </div>
                            <div>
                              <Label className={labelClass}>Package option</Label>
                              <NativeSelect
                                value={hotel.starCategory ?? group.key}
                                onChange={(e) => {
                                  const next = e.target.value as HotelCategoryKey;
                                  setHotels((prev) =>
                                    prev.map((row) =>
                                      row.id === hotel.id
                                        ? {
                                            ...row,
                                            starCategory: next,
                                            starRating: next.replace("star", ""),
                                          }
                                        : row
                                    )
                                  );
                                }}
                                className={selectClass}
                              >
                                {HOTEL_CATEGORY_OPTIONS.map((option) => (
                                  <option key={option.key} value={option.key}>
                                    {option.label}
                                  </option>
                                ))}
                              </NativeSelect>
                            </div>
                            <div>
                              <Label className={labelClass}>Room type</Label>
                              <Input
                                type="text"
                                placeholder="e.g., Deluxe"
                                value={hotel.roomType ?? ""}
                                onChange={(e) => updateHotel(hotel.id, "roomType", e.target.value)}
                                className={inputClass}
                              />
                            </div>
                            <div>
                              <Label className={labelClass}>Child policy</Label>
                              <Input
                                type="text"
                                placeholder="e.g., Free under 12"
                                value={hotel.childPolicy ?? ""}
                                onChange={(e) => updateHotel(hotel.id, "childPolicy", e.target.value)}
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
                                onChange={(e) => updateHotel(hotel.id, "maxOccupancy", e.target.value)}
                                className={inputClass}
                              />
                            </div>
                            <div>
                              <Label className={labelClass}>Address</Label>
                              <Input
                                type="text"
                                placeholder="Hotel full address"
                                value={hotel.address ?? ""}
                                onChange={(e) => updateHotel(hotel.id, "address", e.target.value)}
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
                            <div>
                              <Label className={labelClass}>Front-end visibility</Label>
                              <NativeSelect
                                value={hotel.visibility ?? "Frontend visible"}
                                onChange={(e) => updateHotel(hotel.id, "visibility", e.target.value)}
                                className={selectClass}
                              >
                                {VISIBILITY_OPTIONS.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </NativeSelect>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-6 gap-y-5">
                            <div>
                              <Label className={labelClass}>Hotel notes visibility</Label>
                              <NativeSelect
                                value={hotel.notesVisibility ?? "internal"}
                                onChange={(e) =>
                                  updateHotel(
                                    hotel.id,
                                    "notesVisibility",
                                    e.target.value === "client" ? "client" : "internal"
                                  )
                                }
                                className={selectClass}
                              >
                                <option value="internal">Internally only</option>
                                <option value="client">Client facing</option>
                              </NativeSelect>
                            </div>
                            <div className="lg:col-span-2">
                              <Label className={labelClass}>Hotel Internal Notes</Label>
                              <Textarea
                                rows={3}
                                placeholder="Notes about this hotel. Choose whether clients can see them."
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
                                onChange={(value) => updateHotel(hotel.id, "halalBreakfast", value)}
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
                                onChange={(value) => updateHotel(hotel.id, "extraBed", value)}
                              />
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                <Button
                  type="button"
                  onClick={() => addHotel(group.key)}
                  className="h-11 px-5 text-sm font-semibold text-white bg-[#B48A2C] rounded-[12px] hover:bg-[#B48A2C]/90 transition-colors flex items-center gap-2 shadow-sm"
                >
                  <Plus size={16} />
                  Add {group.stars}-star hotel
                </Button>
              </section>
            );
          })}

          <div className="rounded-[12px] border border-[#E5E7EB] p-5">
            <Label className={labelClass}>Hotel disclaimer</Label>
            <p className="mb-2 text-xs text-gray-400">
              Shown once beneath the hotel lists on the client-facing website.
            </p>
            <Textarea
              rows={3}
              value={disclaimer}
              onChange={(event) => setDisclaimer(event.target.value)}
              className="w-full px-4 py-3 text-sm border border-[#E5E7EB] rounded-[12px] bg-white"
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[16px] border border-[#E5E7EB] bg-white">
        <div className="bg-[#F8F4EC] px-5 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#8A6A22]">
          Client-facing website preview
        </div>
        <p className="border-b border-[#E5E7EB] px-5 py-2 text-xs text-gray-500">
          This is the public Hotels block. Each star option with a Frontend visible hotel gets its
          own list.
          {hiddenFromWebsite > 0
            ? ` ${hiddenFromWebsite} named hotel${hiddenFromWebsite === 1 ? " is" : "s are"} set to stay off the website.`
            : ""}
        </p>
        <div className="px-6 py-6">
          <p className="text-xs uppercase tracking-[0.14em] text-[#B48A2C]">Where you stay</p>
          <h3 className="mt-1 text-2xl font-semibold text-[#1F2A44]">Hotels</h3>
          {clientGroups.length === 0 ? (
            <p className="mt-4 text-sm text-gray-400">
              Add a hotel name and set it to Frontend visible to see it in a star category list.
            </p>
          ) : (
            <div className="mt-6 space-y-6">
              {clientGroups.map((group) => (
                <section key={group.key}>
                  <h4 className="text-base font-semibold text-[#1F2A44]">{group.label}</h4>
                  <ul className="mt-2 divide-y divide-[#E5E7EB] border-y border-[#E5E7EB]">
                    {group.rows.map((hotel) => (
                      <li key={hotel.id} className="py-3">
                        <p className="text-sm font-semibold text-[#1F2A44]">{hotel.hotelName}</p>
                        {[hotel.city?.trim(), hotel.roomType?.trim()].filter(Boolean).length > 0 ? (
                          <p className="text-sm text-gray-500">
                            {[hotel.city?.trim(), hotel.roomType?.trim()].filter(Boolean).join(" · ")}
                          </p>
                        ) : null}
                        {hotel.notesVisibility === "client" && hotel.internalNotes?.trim() ? (
                          <p className="mt-1 text-sm text-[#334155] whitespace-pre-wrap">
                            {hotel.internalNotes}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
          <p className="mt-6 text-xs italic leading-relaxed text-gray-500">
            {disclaimer.trim() || DEFAULT_HOTEL_DISCLAIMER}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <Button type="button" onClick={onPrevious} className={stepPreviousButtonClass}>
          <Icon name="ChevronLeft" size={16} />
          Previous
        </Button>
        <p className="text-xs text-gray-400 flex-1 text-center">
          ... Incomplete sections stay as draft.
        </p>
        <Button
          type="button"
          onClick={() =>
            onNext({
              entries: hotels.map(({ id: _id, ...hotel }) => hotel),
              disclaimer: disclaimer.trim() || DEFAULT_HOTEL_DISCLAIMER,
            })
          }
          disabled={isSaving}
          data-package-step-save=""
          className={stepSaveButtonClass}
        >
          {saveButtonLabel(isSaving)}
          <Icon name="ChevronRight" size={16} />
        </Button>
      </div>
    </div>
  );
}
