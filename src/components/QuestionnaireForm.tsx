"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import StepHeader from "./StepHeader";
import type { BookingData } from "./BookingApp";
import { format } from "date-fns";
import { formatTime12h } from "@/lib/timeFormat";

interface Props {
  bookingData: BookingData;
  updateBooking: (data: Partial<BookingData>) => void;
  onSubmit: (result: Record<string, unknown>) => void;
  onBack: () => void;
}

export default function QuestionnaireForm({
  bookingData,
  updateBooking,
  onSubmit,
  onBack,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const submissionInFlight = useRef(false);


  // Calculate total price
  const priceInfo = { total: bookingData.estimatedPrice, hasVariable: bookingData.priceIsEstimate };

  const handleSubmit = async () => {
    if (submissionInFlight.current) return;
    if (!bookingData.firstName.trim()) { setError("Please enter your first name"); return; }
    if (!bookingData.lastName.trim()) { setError("Please enter your last name"); return; }
    if (!bookingData.clientPhone.trim()) { setError("Please enter your phone number"); return; }
    if (!bookingData.service) { setError("Please select a service"); return; }
    if (!bookingData.policyAcknowledged) { setError("Please acknowledge the deposit and late policies"); return; }

    submissionInFlight.current = true;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          technicianId: bookingData.technicianId,
          firstName: bookingData.firstName,
          lastName: bookingData.lastName,
          clientPhone: bookingData.clientPhone,
          service: bookingData.service,
          extras: bookingData.extras,
          bookingDate: bookingData.date,
          bookingTime: bookingData.time,
          policyAcknowledged: bookingData.policyAcknowledged,
          notes: bookingData.notes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create booking");
        submissionInFlight.current = false;
        setSubmitting(false);
        return;
      }

      onSubmit(data);
    } catch {
      setError("Something went wrong. Please try again.");
      submissionInFlight.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <StepHeader
        step={5}
        totalSteps={6}
        title="Your Details"
        subtitle={
          bookingData.technicianName && bookingData.date && bookingData.time
            ? `${bookingData.technicianName} · ${format(new Date(bookingData.date + "T00:00:00"), "EEE, MMM d")} at ${formatTime12h(bookingData.time)}`
            : undefined
        }
        onBack={onBack}
      />

      <main className="flex-1 max-w-2xl mx-auto w-full px-5 sm:px-6 py-6 sm:py-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
          {/* Client name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-4">
            <div>
              <label htmlFor="first-name" className="block text-xs uppercase tracking-wider text-gray-500 mb-2 font-medium">First Name</label>
              <input id="first-name" type="text" value={bookingData.firstName} onChange={(e) => updateBooking({ firstName: e.target.value })} placeholder="First name" className="w-full h-12 border-b border-gray-200 text-base focus:border-black focus:outline-none transition-colors duration-150" autoComplete="given-name" />
            </div>
            <div>
              <label htmlFor="last-name" className="block text-xs uppercase tracking-wider text-gray-500 mb-2 font-medium">Last Name</label>
              <input id="last-name" type="text" value={bookingData.lastName} onChange={(e) => updateBooking({ lastName: e.target.value })} placeholder="Last name" className="w-full h-12 border-b border-gray-200 text-base focus:border-black focus:outline-none transition-colors duration-150" autoComplete="family-name" />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-xs uppercase tracking-wider text-gray-500 mb-2 font-medium">Phone Number</label>
            <input id="phone" type="tel" value={bookingData.clientPhone} onChange={(e) => updateBooking({ clientPhone: e.target.value })} placeholder="+20 xxx xxx xxxx" className="w-full h-12 border-b border-gray-200 text-base focus:border-black focus:outline-none transition-colors duration-150" autoComplete="tel" />
          </div>

          {/* Price summary */}
          {bookingData.service && (
            <div className="bg-gray-50 px-4 py-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Estimated Total</span>
                <span className="text-base font-semibold">
                  {priceInfo.total > 0 ? `${priceInfo.total.toLocaleString()} EGP` : "—"}
                </span>
              </div>
              {priceInfo.hasVariable && (
                <p className="text-xs text-gray-400 mt-1">Final price may vary based on density and length</p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                Estimated appointment time: {bookingData.duration} minutes
              </p>
            </div>
          )}

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-xs uppercase tracking-wider text-gray-500 mb-2 font-medium">
              Notes <span className="text-gray-400 normal-case">(optional)</span>
            </label>
            <textarea id="notes" value={bookingData.notes} onChange={(e) => updateBooking({ notes: e.target.value })} placeholder="Any special requests..." rows={2} className="w-full border border-gray-200 py-3 px-4 text-sm focus:border-black focus:outline-none transition-colors duration-150 resize-none" />
          </div>

          {/* Policy Notice */}
          <div className="border border-gray-200 p-5 space-y-4">
            <h3 className="text-sm font-semibold">Important Policies</h3>
            <div className="space-y-4 text-sm text-gray-600">
              <div className="space-y-2">
                <p><strong className="text-black">Deposit Required:</strong> Pay <strong className="text-black">1,000 EGP</strong> via InstaPay <strong className="text-black">within 1 hour</strong> to confirm. Non-refundable.</p>
                <div className="bg-gray-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">InstaPay Number</p>
                  <p className="text-base font-semibold text-black tracking-wide">0100 006 2272</p>
                </div>
                <a href="https://wa.me/201000062272?text=Hi%2C%20I%20just%20made%20a%20deposit%20for%20my%20booking.%20Here%E2%80%99s%20my%20payment%20screenshot." target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 h-10 px-4 bg-[#25D366] text-white text-sm font-medium hover:bg-[#1ebe5d] transition-colors duration-150">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                  Send Screenshot on WhatsApp
                </a>
              </div>
              <p><strong className="text-black">Late Policy:</strong> Booking is <strong className="text-black">automatically cancelled</strong> if more than <strong className="text-black">20 minutes late</strong>.</p>
            </div>
            <label className="flex items-start gap-3 pt-2 cursor-pointer">
              <input type="checkbox" checked={bookingData.policyAcknowledged} onChange={(e) => updateBooking({ policyAcknowledged: e.target.checked })} className="mt-0.5" />
              <span className="text-sm leading-snug">I understand and agree to the deposit and late policies</span>
            </label>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="px-4 py-3 bg-red-50 border border-red-100 text-red-600 text-sm" role="alert">{error}</motion.div>
          )}

          <button type="button" onClick={handleSubmit} disabled={submitting} className={`w-full h-12 text-sm font-medium tracking-wide transition-colors duration-150 ${submitting ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-black text-white hover:bg-gray-800 active:bg-gray-900"}`}>
            {submitting ? (<span className="inline-flex items-center gap-2"><span className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />Confirming...</span>) : "Confirm Booking"}
          </button>
        </motion.div>
      </main>
    </div>
  );
}
