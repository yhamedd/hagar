"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import StepHeader from "./StepHeader";
import type { BookingData } from "./BookingApp";
import { format } from "date-fns";
import { formatTime12h } from "@/lib/timeFormat";
import PaymentContact from "./PaymentContact";
import { SITE } from "@/lib/site";

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
                <p><strong className="text-black">Deposit Required:</strong> Pay <strong className="text-black">{SITE.depositEgp.toLocaleString()} EGP</strong> via InstaPay <strong className="text-black">within {SITE.depositHoldHours} hours</strong> to confirm. Non-refundable.</p>
                <PaymentContact compact />
              </div>
              <p><strong className="text-black">Late Policy:</strong> Booking is <strong className="text-black">automatically cancelled</strong> if more than <strong className="text-black">{SITE.lateGraceMinutes} minutes late</strong>.</p>
            </div>
            <label className="flex items-start gap-3 pt-2 cursor-pointer">
              <input type="checkbox" checked={bookingData.policyAcknowledged} onChange={(e) => updateBooking({ policyAcknowledged: e.target.checked })} className="mt-0.5" />
              <span className="text-sm leading-snug">I understand and agree to the deposit and late policies</span>
            </label>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="px-4 py-3 bg-red-50 border border-red-100 text-red-600 text-sm" role="alert">{error}</motion.div>
          )}

          <button type="button" onClick={handleSubmit} disabled={submitting || !bookingData.policyAcknowledged} className={`w-full h-12 text-sm font-medium tracking-wide transition-colors duration-150 ${submitting || !bookingData.policyAcknowledged ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-black text-white hover:bg-gray-800 active:bg-gray-900"}`}>
            {submitting ? (<span className="inline-flex items-center gap-2"><span className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />Confirming...</span>) : "Confirm Booking"}
          </button>
        </motion.div>
      </main>
    </div>
  );
}
