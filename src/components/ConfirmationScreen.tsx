"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import type { BookingData } from "./BookingApp";
import { formatTime12h } from "@/lib/timeFormat";

interface Props {
  bookingData: BookingData;
  bookingResult: Record<string, unknown> | null;
  onNewBooking: () => void;
}

export default function ConfirmationScreen({
  bookingData,
  bookingResult,
  onNewBooking,
}: Props) {
  const [showCheck, setShowCheck] = useState(false);
  const expiresAt = typeof bookingResult?.expiresAt === "string" ? bookingResult.expiresAt : null;
  const calculateTimeLeft = () => expiresAt
    ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000))
    : 0;
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft);

  useEffect(() => {
    const timer = setTimeout(() => setShowCheck(true), 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(
        expiresAt
          ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000))
          : 0
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isUrgent = timeLeft < 10 * 60;
  const isExpired = timeLeft <= 0;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center px-5 sm:px-6 py-12">
        {/* Success Animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="w-20 h-20 rounded-full border-2 border-black flex items-center justify-center mb-6"
        >
          {showCheck && (
            <svg
              className="w-8 h-8"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <motion.path
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.4 }}
                d="M5 13l4 4L19 7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-light tracking-tight mb-2">
              Booking Submitted
            </h1>
            <p className="text-gray-400 text-sm">
              Complete payment to confirm your appointment
            </p>
          </div>

          {/* Booking Details */}
          <div className="border border-gray-100 divide-y divide-gray-100 mb-5">
            {typeof bookingResult?.bookingId === "number" && (
              <div className="flex justify-between items-center px-4 py-3">
                <span className="text-xs uppercase tracking-wider text-gray-400">Booking</span>
                <span className="text-sm font-medium">#{bookingResult.bookingId}</span>
              </div>
            )}
            <div className="flex justify-between items-center px-4 py-3">
              <span className="text-xs uppercase tracking-wider text-gray-400">
                Technician
              </span>
              <span className="text-sm font-medium">{bookingData.technicianName}</span>
            </div>
            <div className="flex justify-between items-center px-4 py-3">
              <span className="text-xs uppercase tracking-wider text-gray-400">
                Date
              </span>
              <span className="text-sm font-medium">
                {bookingData.date ? format(new Date(bookingData.date + "T00:00:00"), "EEE, MMM d, yyyy") : "—"}
              </span>
            </div>
            <div className="flex justify-between items-center px-4 py-3">
              <span className="text-xs uppercase tracking-wider text-gray-400">
                Time
              </span>
              <span className="text-sm font-medium">{bookingData.time ? formatTime12h(bookingData.time) : "—"}</span>
            </div>
            <div className="flex justify-between items-center px-4 py-3">
              <span className="text-xs uppercase tracking-wider text-gray-400">
                Service
              </span>
              <span className="text-sm font-medium">{bookingData.service}</span>
            </div>
            {bookingData.extras && bookingData.extras.length > 0 && (
              <div className="flex justify-between items-center px-4 py-3">
                <span className="text-xs uppercase tracking-wider text-gray-400">
                  Extras
                </span>
                <span className="text-sm font-medium">
                  {bookingData.extras.join(", ")}
                </span>
              </div>
            )}
            {(() => {
              const total = typeof bookingResult?.price === "number" ? bookingResult.price : bookingData.estimatedPrice;
              return total > 0 ? (
                <div className="flex justify-between items-center px-4 py-3">
                  <span className="text-xs uppercase tracking-wider text-gray-400">Price</span>
                  <span className="text-sm font-medium">{total.toLocaleString()} EGP{bookingResult?.priceIsEstimate === true ? " (estimate)" : ""}</span>
                </div>
              ) : null;
            })()}
            <div className="flex justify-between items-center px-4 py-3">
              <span className="text-xs uppercase tracking-wider text-gray-400">
                Status
              </span>
              <span className="text-sm font-medium text-amber-600">
                Pending Deposit
              </span>
            </div>
          </div>

          {/* Countdown timer */}
          <div
            className={`p-4 mb-5 text-center border ${
              isExpired
                ? "border-red-200 bg-red-50"
                : isUrgent
                ? "border-amber-200 bg-amber-50"
                : "border-gray-100 bg-gray-50"
            }`}
            role="timer"
            aria-live="polite"
          >
            {isExpired ? (
              <p className="text-sm font-medium text-red-600">
                Time expired — booking automatically cancelled
              </p>
            ) : (
              <>
                <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">
                  Confirm within
                </p>
                <p
                  className={`text-2xl font-semibold tracking-wide tabular-nums ${
                    isUrgent ? "text-amber-600" : "text-black"
                  }`}
                >
                  {minutes}:{seconds.toString().padStart(2, "0")}
                </p>
              </>
            )}
          </div>

          {/* Payment Instructions */}
          <div className="border border-gray-200 p-5 mb-5 space-y-4">
            <h2 className="text-sm font-semibold">Complete Your Booking</h2>

            {/* Step 1 */}
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-black text-white text-xs font-medium flex items-center justify-center">
                1
              </span>
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-2">
                  Pay <strong className="text-black">1,000 EGP</strong> via InstaPay:
                </p>
                <div className="bg-gray-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-wider text-gray-400 mb-0.5">
                    InstaPay Number
                  </p>
                  <p className="text-lg font-semibold text-black tracking-wide">
                    0100 006 2272
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-black text-white text-xs font-medium flex items-center justify-center">
                2
              </span>
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-3">
                  Send payment screenshot on WhatsApp:
                </p>
                <a
                  href="https://wa.me/201000062272?text=Hi%2C%20I%20just%20made%20a%20deposit%20for%20my%20booking.%20Here%E2%80%99s%20my%20payment%20screenshot."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full h-12 bg-[#25D366] text-white text-base font-semibold hover:bg-[#1ebe5d] active:bg-[#1aa855] transition-colors duration-150"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Send Screenshot on WhatsApp
                </a>
              </div>
            </div>
          </div>

          {/* Location */}
          <a
            href="https://maps.app.goo.gl/EzPcSawmXD3QJhJ2A?g_st=ic"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-3 bg-gray-50 mb-5 text-sm text-gray-600 hover:text-black transition-colors duration-150"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Agora Mall, New Cairo</span>
            <span className="text-gray-400">→</span>
          </a>

          {/* Review nudge */}
          <div className="text-center text-sm text-gray-500 mb-6">
            <p>
              Enjoyed your experience?{" "}
              <a
                href="https://g.page/review/hagarlashes"
                target="_blank"
                rel="noopener noreferrer"
                className="text-black font-medium hover:underline"
              >
                Leave a review
              </a>
            </p>
          </div>

          {/* New booking button */}
          <button
            onClick={onNewBooking}
            className="w-full h-12 border border-gray-200 text-sm font-medium hover:border-black hover:bg-black hover:text-white active:bg-gray-900 transition-colors duration-150"
          >
            Book Another Appointment
          </button>
        </motion.div>
      </main>
    </div>
  );
}
