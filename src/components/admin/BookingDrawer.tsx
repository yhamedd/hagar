"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { generateTimeSlots } from "@/lib/slots";
import { formatTime12h } from "@/lib/timeFormat";
import { toWhatsAppNumber } from "@/lib/whatsapp";
import { WhatsAppIcon } from "@/components/PaymentContact";
import { Badge, RemindButton, STATUSES, fmtDate, inputCls, labelCls, type BookingRow, type Technician } from "./shared";

interface Props {
  row: BookingRow;
  techs: Technician[];
  af: (url: string, opts?: RequestInit) => Promise<Response>;
  onClose: () => void;
  onSaved: () => void;
  onReminded: (id: number) => void;
  onOpenClient: (clientId: number) => void;
}

/**
 * Side panel for one booking: everything about it, plus the edits the API
 * supports -- status, reschedule, reassign, final price, and internal notes.
 * Only the fields that actually changed are sent.
 */
export default function BookingDrawer({ row, techs, af, onClose, onSaved, onReminded, onOpenClient }: Props) {
  const b = row.bookings;
  const original = { status: b.status, date: b.bookingDate, time: b.bookingTime.slice(0, 5), technicianId: b.technicianId, price: b.price === null ? "" : String(b.price), adminNotes: b.adminNotes || "" };
  const [form, setForm] = useState(original);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (patch: Partial<typeof original>) => setForm((prev) => ({ ...prev, ...patch }));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    // Keep the page behind from scrolling while the panel is open.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = previous; };
  }, [onClose]);

  // Same-category technicians only; an inactive one stays listed if already assigned.
  const techOptions = useMemo(
    () => techs.filter((t) => t.category === row.technicians.category && (t.active || t.id === b.technicianId)),
    [techs, row.technicians.category, b.technicianId]
  );
  const timeOptions = useMemo(() => {
    const tech = techs.find((t) => t.id === form.technicianId);
    const slots = new Set(tech ? generateTimeSlots(tech) : []);
    slots.add(form.time); // never drop the booking's current time from the list
    return [...slots].sort();
  }, [techs, form.technicianId, form.time]);

  const changes: Record<string, unknown> = {};
  if (form.status !== original.status) changes.status = form.status;
  if (form.date !== original.date) changes.bookingDate = form.date;
  if (form.time !== original.time) changes.bookingTime = form.time;
  if (form.technicianId !== original.technicianId) changes.technicianId = form.technicianId;
  if (form.price !== original.price && form.price !== "" && Number.isFinite(Number(form.price)) && Number(form.price) >= 0) changes.price = Number(form.price);
  if (form.adminNotes !== original.adminNotes) changes.adminNotes = form.adminNotes;
  const dirty = Object.keys(changes).length > 0;

  const save = async () => {
    if (!dirty) { onClose(); return; }
    setSaving(true);
    setError("");
    try {
      const r = await af("/api/admin/bookings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: b.id, ...changes }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setError(d.error || "Could not update booking"); return; }
      onSaved();
    } catch {
      setError("Something went wrong. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const whatsappNumber = toWhatsAppNumber(b.clientPhone);
  const extras = b.extras?.length ? b.extras.join(", ") : null;

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={`Booking for ${b.clientName}`}>
      <div className="absolute inset-0 bg-black/30 drawer-fade" onClick={onClose} />
      <aside className="drawer-in absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col">
        <header className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <div className="min-w-0">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Booking #{b.id}</p>
            <h2 className="text-lg font-semibold truncate">{b.clientName}</h2>
            <p className="text-xs text-gray-500">{fmtDate(b.bookingDate)} · {formatTime12h(b.bookingTime)} · {row.technicians.name}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="h-8 w-8 shrink-0 text-xl leading-none text-gray-400 hover:text-black transition-colors">×</button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Contact */}
          <div className="flex flex-wrap items-center gap-2">
            <a href={`tel:${b.clientPhone}`} className="h-7 px-2.5 inline-flex items-center border border-gray-200 text-[11px] font-medium hover:border-black transition-colors">{b.clientPhone}</a>
            {whatsappNumber && (
              <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="h-7 px-2.5 inline-flex items-center gap-1.5 border border-gray-200 text-[11px] font-medium hover:border-black transition-colors">
                <WhatsAppIcon className="w-3.5 h-3.5 text-[#25D366]" />Chat
              </a>
            )}
            <RemindButton row={row} techName={row.technicians.name} onSent={onReminded} />
            {b.clientId && <button type="button" onClick={() => onOpenClient(b.clientId!)} className="h-7 px-2.5 border border-gray-200 text-[11px] font-medium hover:border-black transition-colors">Client profile</button>}
          </div>

          {/* Summary */}
          <dl className="bg-gray-50 px-4 py-3 text-sm grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
            <dt className="text-gray-400">Service</dt><dd className="font-medium">{b.service}</dd>
            {extras && (<><dt className="text-gray-400">Extras</dt><dd>{extras}</dd></>)}
            <dt className="text-gray-400">Duration</dt><dd>{b.duration || 60} min</dd>
            <dt className="text-gray-400">Status</dt><dd><Badge status={b.status} /></dd>
            <dt className="text-gray-400">Booked</dt><dd>{format(new Date(b.createdAt), "MMM d, yyyy · h:mm a")}</dd>
            {b.notes && (<><dt className="text-gray-400">Client note</dt><dd className="whitespace-pre-wrap">{b.notes}</dd></>)}
          </dl>

          {/* Edit */}
          <div>
            <label htmlFor="bd-status" className={labelCls}>Status</label>
            <select id="bd-status" value={form.status} onChange={(e) => set({ status: e.target.value })} className={inputCls}>
              {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="bd-date" className={labelCls}>Date</label>
              <input id="bd-date" type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label htmlFor="bd-time" className={labelCls}>Time</label>
              <select id="bd-time" value={form.time} onChange={(e) => set({ time: e.target.value })} className={inputCls}>
                {timeOptions.map((t) => <option key={t} value={t}>{formatTime12h(t)}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="bd-tech" className={labelCls}>Technician</label>
              <select id="bd-tech" value={form.technicianId} onChange={(e) => set({ technicianId: +e.target.value })} className={inputCls}>
                {techOptions.map((t) => <option key={t.id} value={t.id}>{t.name}{t.active ? "" : " (off)"}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="bd-price" className={labelCls}>Price (EGP){b.priceIsEstimate ? " · estimate" : ""}</label>
              <input id="bd-price" type="number" min={0} inputMode="numeric" value={form.price} onChange={(e) => set({ price: e.target.value })} className={inputCls} />
            </div>
          </div>
          <div>
            <label htmlFor="bd-notes" className={labelCls}>Internal notes</label>
            <textarea id="bd-notes" value={form.adminNotes} onChange={(e) => set({ adminNotes: e.target.value })} rows={3} maxLength={500} placeholder="Only visible to admins" className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-black resize-none" />
          </div>
          {error && <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2">{error}</p>}
        </div>

        <footer className="flex gap-2 px-5 py-4 border-t border-gray-100">
          <button type="button" onClick={save} disabled={saving || !dirty} className="flex-1 h-10 bg-black text-white text-sm font-medium hover:bg-gray-800 disabled:bg-gray-100 disabled:text-gray-400 transition-colors">{saving ? "Saving…" : "Save changes"}</button>
          <button type="button" onClick={onClose} disabled={saving} className="h-10 px-4 border border-gray-200 text-sm hover:bg-gray-50 transition-colors">Close</button>
        </footer>
      </aside>
    </div>
  );
}
