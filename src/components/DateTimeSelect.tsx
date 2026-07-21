"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
  isToday,
  isBefore,
} from "date-fns";
import StepHeader from "./StepHeader";
import { formatTime12h } from "@/lib/timeFormat";

interface DayInfo {
  date: string;
  available: boolean;
  slotsRemaining: number;
}

interface SlotInfo {
  time: string;
  available: boolean;
}

interface Props {
  technicianId: number;
  technicianName: string;
  duration: number;
  onSelect: (date: string, time: string) => void;
  onBack: () => void;
}

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function DateTimeSelect({
  technicianId,
  technicianName,
  duration,
  onSelect,
  onBack,
}: Props) {
  // Booking reopens in August; default straight to it instead of the (fully
  // blocked) current month. Once August actually arrives this naturally
  // falls back to just showing the current month like normal.
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return now.getMonth() < 7 ? new Date(now.getFullYear(), 7, 1) : now;
  });
  const [availableDays, setAvailableDays] = useState<DayInfo[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [loadingDays, setLoadingDays] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState("");

  const fetchDays = useCallback(async () => {
    setLoadingDays(true);
    setError("");
    const monthStr = format(currentMonth, "yyyy-MM");
    try {
      const res = await fetch(
        `/api/available-days?technicianId=${technicianId}&month=${monthStr}&duration=${duration}`
      );
      if (!res.ok) throw new Error("Unable to load available dates");
      const data = await res.json();
      setAvailableDays(data.days || []);
    } catch {
      setAvailableDays([]);
      setError("Available dates could not be loaded. Please try again.");
    }
    setLoadingDays(false);
  }, [currentMonth, technicianId, duration]);

  useEffect(() => {
    // Data fetching is the external synchronization performed by this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDays();
  }, [fetchDays]);

  const fetchSlots = useCallback(
    async (dateStr: string) => {
      setLoadingSlots(true);
      try {
        const res = await fetch(
          `/api/slots?technicianId=${technicianId}&date=${dateStr}&duration=${duration}`
        );
        if (!res.ok) throw new Error("Unable to load time slots");
        const data = await res.json();
        setSlots(data.slots || []);
      } catch {
        setSlots([]);
        setError("Available times could not be loaded. Please try again.");
      }
      setLoadingSlots(false);
    },
    [technicianId, duration]
  );

  useEffect(() => {
    if (selectedDate) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchSlots(selectedDate);
    }
  }, [selectedDate, fetchSlots]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);

  const getDayInfo = (dateStr: string) =>
    availableDays.find((d) => d.date === dateStr);

  const canGoToPrevMonth = !isBefore(subMonths(currentMonth, 1), startOfMonth(new Date()));

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <StepHeader
        step={4}
        totalSteps={6}
        title="Pick a Date & Time"
        subtitle={`Available slots for ${technicianName}`}
        onBack={onBack}
      />

      <main className="flex-1 max-w-2xl mx-auto w-full px-5 sm:px-6 py-6 sm:py-8">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-10">
          {/* Calendar */}
          <div>
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => {
                  if (!canGoToPrevMonth) return;
                  setSelectedDate(null);
                  setSlots([]);
                  setCurrentMonth(subMonths(currentMonth, 1));
                }}
                disabled={!canGoToPrevMonth}
                className={`w-10 h-10 flex items-center justify-center transition-colors duration-150 ${
                  canGoToPrevMonth 
                    ? "hover:bg-gray-50 active:bg-gray-100" 
                    : "opacity-30 cursor-not-allowed"
                }`}
                aria-label="Previous month"
              >
                <svg
                  className="w-5 h-5 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <h2 className="text-base font-medium tracking-tight">
                {format(currentMonth, "MMMM yyyy")}
              </h2>
              <button
                onClick={() => {
                  setSelectedDate(null);
                  setSlots([]);
                  setCurrentMonth(addMonths(currentMonth, 1));
                }}
                disabled={currentMonth >= addMonths(startOfMonth(new Date()), 12)}
                className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-150"
                aria-label="Next month"
              >
                <svg
                  className="w-5 h-5 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAY_LABELS.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs text-gray-400 uppercase tracking-wider py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-px bg-gray-100 border border-gray-100">
              {/* Empty cells for start offset */}
              {Array.from({ length: startDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square bg-white" />
              ))}

              {days.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const info = getDayInfo(dateStr);
                const isAvailable = info?.available ?? false;
                const isSelected = selectedDate === dateStr;
                const today = isToday(day);

                return (
                  <button
                    key={dateStr}
                    disabled={!isAvailable || loadingDays}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`
                      aspect-square flex items-center justify-center text-sm bg-white relative transition-colors duration-150
                      ${
                        isSelected
                          ? "bg-black text-white"
                          : isAvailable
                          ? "hover:bg-gray-50 active:bg-gray-100 text-gray-900"
                          : "text-gray-200 cursor-not-allowed"
                      }
                      ${today && !isSelected ? "font-semibold" : ""}
                    `}
                    aria-label={`${format(day, "MMMM d")}${isAvailable ? ", available" : ", unavailable"}`}
                    aria-pressed={isSelected}
                  >
                    <span>{format(day, "d")}</span>
                    {isAvailable && !isSelected && (
                      <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-black/30" />
                    )}
                  </button>
                );
              })}
            </div>

            {loadingDays && (
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-400">
                <div className="w-4 h-4 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
                <span>Loading...</span>
              </div>
            )}
            {error && !loadingDays && <p className="mt-4 text-sm text-red-600" role="alert">{error}</p>}
          </div>

          {/* Time slots */}
          <div className="lg:border-l lg:border-gray-100 lg:pl-10">
            <AnimatePresence mode="wait">
              {!selectedDate ? (
                <motion.div
                  key="prompt"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center h-48 lg:h-full"
                >
                  <p className="text-gray-300 text-base text-center">
                    Select a date to view
                    <br />
                    available times
                  </p>
                </motion.div>
              ) : loadingSlots ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-2"
                >
                  <p className="text-sm text-gray-500 font-medium mb-3">
                    {format(new Date(selectedDate + "T00:00:00"), "EEEE, MMMM d")}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="h-11 skeleton" />
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="slots"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <p className="text-sm text-gray-500 font-medium mb-3">
                    {format(new Date(selectedDate + "T00:00:00"), "EEEE, MMMM d")}
                  </p>
                  {slots.length === 0 ? (
                    <p className="text-gray-300 text-sm">
                      No slots available on this date.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {slots.map((slot) => (
                        <button
                          key={slot.time}
                          disabled={!slot.available}
                          onClick={() => onSelect(selectedDate, slot.time)}
                          className={`
                            h-11 text-sm border transition-colors duration-150
                            ${
                              slot.available
                                ? "border-gray-200 hover:border-black hover:bg-black hover:text-white active:bg-gray-900"
                                : "border-gray-100 text-gray-200 cursor-not-allowed line-through"
                            }
                          `}
                        >
                          {formatTime12h(slot.time)}
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
