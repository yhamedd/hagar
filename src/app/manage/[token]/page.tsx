"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { formatTime12h } from "@/lib/timeFormat";

type ManagedBooking = { id: number; technicianId: number; technicianName: string; service: string; extras: string[]; price: number | null; priceIsEstimate: boolean; bookingDate: string; bookingTime: string; duration: number; status: string; canManage: boolean };
type Slot = { time: string; available: boolean };

export default function ManageBookingPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [booking, setBooking] = useState<ManagedBooking | null>(null);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const response = await fetch(`/api/manage-booking/${token}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Booking could not be loaded"); return; }
    setBooking(data);
  };

  useEffect(() => {
    // Loading the token-protected server record is this effect's external synchronization.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadSlots = async (nextDate: string) => {
    setDate(nextDate); setSlots([]); setError("");
    if (!booking || !nextDate) return;
    const response = await fetch(`/api/slots?technicianId=${booking.technicianId}&date=${nextDate}&duration=${booking.duration}`);
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Times could not be loaded"); return; }
    setSlots(data.slots || []);
  };

  const update = async (payload: Record<string, unknown>) => {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/manage-booking/${token}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "Booking could not be updated"); return; }
      setMessage(payload.action === "cancel" ? "Your booking has been cancelled." : "Your appointment has been rescheduled.");
      setDate(""); setSlots([]); await load();
    } catch { setError("Connection lost. Please try again."); }
    finally { setBusy(false); }
  };

  return <main className="min-h-screen bg-gray-50 px-5 py-10">
    <section className="max-w-lg mx-auto bg-white border border-gray-200 p-5 sm:p-8">
      <p className="text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">Hagar Lashes & Nails</p>
      <h1 className="text-2xl font-light mb-6">Manage Booking</h1>
      {!booking && !error && <p className="text-sm text-gray-400">Loading booking…</p>}
      {error && <p role="alert" className="bg-red-50 border border-red-100 text-red-700 p-3 text-sm mb-4">{error}</p>}
      {message && <p role="status" className="bg-green-50 border border-green-100 text-green-700 p-3 text-sm mb-4">{message}</p>}
      {booking && <>
        <dl className="divide-y divide-gray-100 border-y border-gray-100 mb-6 text-sm">
          <div className="flex justify-between py-3"><dt className="text-gray-400">Booking</dt><dd>#{booking.id}</dd></div>
          <div className="flex justify-between py-3"><dt className="text-gray-400">Technician</dt><dd>{booking.technicianName}</dd></div>
          <div className="flex justify-between py-3"><dt className="text-gray-400">Service</dt><dd className="text-right">{booking.service}</dd></div>
          <div className="flex justify-between py-3"><dt className="text-gray-400">Appointment</dt><dd>{booking.bookingDate} · {formatTime12h(booking.bookingTime)}</dd></div>
          <div className="flex justify-between py-3"><dt className="text-gray-400">Price</dt><dd>{booking.price?.toLocaleString() || "—"} EGP{booking.priceIsEstimate ? " estimated" : ""}</dd></div>
          <div className="flex justify-between py-3"><dt className="text-gray-400">Status</dt><dd className="capitalize">{booking.status.replaceAll("_", " ")}</dd></div>
        </dl>
        {booking.canManage && <div className="space-y-4">
          <div><label htmlFor="new-date" className="block text-xs uppercase tracking-wider text-gray-500 mb-2">New date</label><input id="new-date" type="date" min={new Date().toISOString().slice(0, 10)} value={date} onChange={(event) => void loadSlots(event.target.value)} className="w-full h-11 border border-gray-200 px-3" /></div>
          {slots.length > 0 && <div className="grid grid-cols-2 gap-2">{slots.map((slot) => <button type="button" key={slot.time} disabled={!slot.available || busy} onClick={() => void update({ action: "reschedule", bookingDate: date, bookingTime: slot.time })} className="h-11 border border-gray-200 disabled:text-gray-300 disabled:line-through hover:border-black">{formatTime12h(slot.time)}</button>)}</div>}
          <button type="button" disabled={busy} onClick={() => { if (window.confirm("Cancel this appointment?")) void update({ action: "cancel" }); }} className="w-full h-11 border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50">Cancel Booking</button>
        </div>}
      </>}
    </section>
  </main>;
}
