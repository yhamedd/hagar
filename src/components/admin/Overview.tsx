"use client";

import { formatTime12h } from "@/lib/timeFormat";
import { Badge, RemindButton, ReminderStamp, fmtDate, fmtPrice, type BookingRow } from "./shared";

export interface TechnicianStats {
  technicianId: number;
  completed: number;
  upcoming: number;
  clients: number;
  revenue: number;
}

export interface AdminStats {
  today: string;
  tomorrow: string;
  depositHoldMs: number;
  /** Client clock time when this snapshot was fetched; used for deposit countdowns. */
  loadedAt: number;
  kpis: {
    todayCount: number;
    todayRevenue: number;
    pendingDeposits: number;
    upcoming: number;
    monthBookings: number;
    monthRevenue: number;
    monthNoShows: number;
    remindersDue: number;
  };
  technicians: TechnicianStats[];
  lists: { today: BookingRow[]; tomorrow: BookingRow[]; pending: BookingRow[] };
}

interface RowActions {
  updatingId: number | null;
  onOpen: (row: BookingRow) => void;
  onStatus: (id: number, status: string) => void;
  onReminded: (id: number, sent?: boolean) => void;
}

function Kpi({ label, value, hint, tone = "default", onClick }: { label: string; value: string | number; hint?: string; tone?: "default" | "amber" | "green"; onClick?: () => void }) {
  const tones = { default: "text-black", amber: "text-amber-600", green: "text-green-700" };
  const body = (
    <>
      <p className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-semibold tabular-nums mt-1 ${tones[tone]}`}>{value}</p>
      {hint && <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>}
    </>
  );
  const cls = "bg-white border border-gray-200 px-4 py-3 text-left";
  return onClick
    ? <button type="button" onClick={onClick} className={`${cls} hover:border-black transition-colors`}>{body}</button>
    : <div className={cls}>{body}</div>;
}

const quickBtn = "flex-1 sm:flex-none h-9 sm:h-7 px-2.5 text-xs sm:text-[11px] font-medium border whitespace-nowrap transition-colors disabled:opacity-60 disabled:cursor-wait";
// Status actions sit on their own full-width row on phones, sharing it equally.
const quickGroup = "flex gap-2 basis-full sm:basis-auto";

/** How long a pending booking still has before its deposit hold auto-cancels. */
function holdLeft(createdAt: string, holdMs: number, now: number): { label: string; urgent: boolean } {
  const left = new Date(createdAt).getTime() + holdMs - now;
  if (left <= 0) return { label: "Hold expired", urgent: true };
  const hours = Math.floor(left / 3_600_000);
  const minutes = Math.floor((left % 3_600_000) / 60_000);
  return { label: hours > 0 ? `${hours}h ${minutes}m left` : `${minutes}m left`, urgent: left < 2 * 3_600_000 };
}

function BookingLine({ row, showDate, hold, actions }: { row: BookingRow; showDate?: boolean; hold?: { label: string; urgent: boolean }; actions: RowActions }) {
  const b = row.bookings;
  const busy = actions.updatingId === b.id;
  return (
    <li className="px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="w-20 shrink-0">
        <p className="text-sm font-semibold tabular-nums">{formatTime12h(b.bookingTime)}</p>
        {showDate && <p className="text-[11px] text-gray-400">{fmtDate(b.bookingDate)}</p>}
      </div>
      <div className="min-w-0 flex-1 basis-40">
        <button type="button" onClick={() => actions.onOpen(row)} className="block w-full text-left group">
          <span className="text-sm font-medium group-hover:underline">{b.clientName}</span>
          <span className="block text-xs text-gray-500 truncate">
            {b.service}<span className="text-gray-400"> · {row.technicians.name} · {fmtPrice(b.price)}</span>
          </span>
          {hold && <span className={`block text-[11px] mt-0.5 ${hold.urgent ? "text-red-600 font-medium" : "text-amber-600"}`}>{hold.label}</span>}
        </button>
        <ReminderStamp row={row} onSent={actions.onReminded} className="block mt-0.5" />
      </div>
      <div className="flex flex-wrap items-center gap-2 basis-full sm:basis-auto sm:shrink-0">
        <Badge status={b.status} />
        <RemindButton row={row} techName={row.technicians.name} onSent={actions.onReminded} stamp={false} />
        {b.status === "pending_deposit" && (
          <div className={quickGroup}>
            <button type="button" disabled={busy} onClick={() => actions.onStatus(b.id, "confirmed")} className={`${quickBtn} bg-black text-white border-black hover:bg-gray-800`}>{busy ? "Saving…" : "Deposit received"}</button>
            <button type="button" disabled={busy} onClick={() => { if (window.confirm(`Cancel ${b.clientName}'s booking?`)) actions.onStatus(b.id, "cancelled"); }} className={`${quickBtn} border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-600`}>Cancel</button>
          </div>
        )}
        {b.status === "confirmed" && !showDate && (
          <div className={quickGroup}>
            <button type="button" disabled={busy} onClick={() => actions.onStatus(b.id, "completed")} className={`${quickBtn} border-gray-200 hover:border-black`}>Completed</button>
            <button type="button" disabled={busy} onClick={() => actions.onStatus(b.id, "no_show")} className={`${quickBtn} border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-600`}>No-show</button>
          </div>
        )}
      </div>
    </li>
  );
}

function Panel({ title, count, empty, children }: { title: string; count: number; empty: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-gray-200">
      <header className="flex items-baseline justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-medium">{title}</h3>
        <span className="text-xs text-gray-400 tabular-nums">{count}</span>
      </header>
      {count === 0 ? <p className="text-sm text-gray-400 px-4 py-8 text-center">{empty}</p> : <ul className="divide-y divide-gray-50">{children}</ul>}
    </section>
  );
}

interface Props extends RowActions {
  stats: AdminStats | null;
  error: boolean;
  onRetry: () => void;
  onShowPending: () => void;
  onShowCalendar: () => void;
}

/** The admin's landing view: what needs doing now, then today and tomorrow. */
export default function Overview({ stats, error, onRetry, onShowPending, onShowCalendar, ...actions }: Props) {
  if (!stats) {
    return error ? (
      <div className="text-center py-16">
        <p className="text-sm text-red-600 mb-3">The overview could not be loaded.</p>
        <button type="button" onClick={onRetry} className="h-9 px-4 border border-gray-300 text-sm hover:border-black transition-colors">Try again</button>
      </div>
    ) : (
      <div className="space-y-3" aria-busy="true">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[1, 2, 3, 4].map((i) => <div key={i} className="h-20 skeleton" />)}</div>
        <div className="h-40 skeleton" />
        <div className="h-40 skeleton" />
      </div>
    );
  }

  const { kpis, lists } = stats;
  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Today" value={kpis.todayCount} hint={kpis.todayRevenue > 0 ? `${fmtPrice(kpis.todayRevenue)} booked` : "appointments"} onClick={onShowCalendar} />
        <Kpi label="Awaiting deposit" value={kpis.pendingDeposits} hint="need confirming" tone={kpis.pendingDeposits > 0 ? "amber" : "default"} onClick={onShowPending} />
        <Kpi label="Reminders to send" value={kpis.remindersDue} hint="for tomorrow" tone={kpis.remindersDue > 0 ? "amber" : "default"} />
        <Kpi label="This month" value={kpis.monthRevenue > 0 ? fmtPrice(kpis.monthRevenue) : "—"} hint={`${kpis.monthBookings} bookings · ${kpis.upcoming} upcoming · ${kpis.monthNoShows} no-shows`} tone="green" />
      </div>

      {lists.pending.length > 0 && (
        <Panel title="Awaiting deposit" count={lists.pending.length} empty="">
          {lists.pending.map((row) => (
            <BookingLine key={row.bookings.id} row={row} showDate hold={holdLeft(row.bookings.createdAt, stats.depositHoldMs, stats.loadedAt)} actions={actions} />
          ))}
        </Panel>
      )}

      <Panel title={`Today · ${fmtDate(stats.today)}`} count={lists.today.length} empty="No appointments today.">
        {lists.today.map((row) => <BookingLine key={row.bookings.id} row={row} actions={actions} />)}
      </Panel>

      <Panel title={`Tomorrow · ${fmtDate(stats.tomorrow)}`} count={lists.tomorrow.length} empty="Nothing booked for tomorrow yet.">
        {lists.tomorrow.map((row) => <BookingLine key={row.bookings.id} row={row} showDate actions={actions} />)}
      </Panel>
    </section>
  );
}
