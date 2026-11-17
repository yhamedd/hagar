"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import type { BookingData } from "./BookingApp";
import { formatTime12h } from "@/lib/timeFormat";
import PaymentContact from "./PaymentContact";
import { SITE } from "@/lib/site";

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

  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;
  const isUrgent = timeLeft < 60 * 60;
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
                  {hours > 0 ? `${hours}h ${minutes.toString().padStart(2, "0")}m` : `${minutes}:${seconds.toString().padStart(2, "0")}`}
                </p>
              </>
            )}
          </div>

          {/* Payment Instructions */}
          <div className="border border-gray-200 p-5 mb-5 space-y-4">
            <h2 className="text-sm font-semibold">Complete Your Booking</h2>
            <p className="text-sm text-gray-600">
              Pay the <strong className="text-black">{SITE.depositEgp.toLocaleString()} EGP</strong> deposit via InstaPay, then send us the screenshot.
            </p>
            <PaymentContact />
          </div>

          {/* Location */}
          <a
            href={SITE.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-3 bg-gray-50 mb-5 text-sm text-gray-600 hover:text-black transition-colors duration-150"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{SITE.location}</span>
            <span className="text-gray-400">→</span>
          </a>

          {/* Review nudge */}
          <div className="text-center text-sm text-gray-500 mb-6">
            <p>
              Enjoyed your experience?{" "}
              <a
                href={SITE.reviewUrl}
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
