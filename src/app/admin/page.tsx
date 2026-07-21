"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { formatTime12h } from "@/lib/timeFormat";
import { generateTimeSlots } from "@/lib/slots";
import type { ServiceCatalogItem } from "@/lib/serviceCatalog";

// ────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────
interface Technician {
  id: number;
  name: string;
  category: string;
  slotType: string;
  availableDays: number[];
  startTime: string | null;
  endTime: string | null;
  slotInterval: number | null;
  fixedSlots: string[] | null;
  active: boolean;
}

interface BookingRow {
  bookings: {
    id: number;
    clientId: number | null;
    technicianId: number;
    clientName: string;
    clientPhone: string;
    service: string;
    extras: string[];
    price: number | null;
    priceIsEstimate: boolean;
    bookingDate: string;
    bookingTime: string;
    duration: number | null;
    status: string;
    notes: string | null;
    adminNotes: string | null;
    createdAt: string;
  };
  technicians: { id: number; name: string; category: string };
}

interface ClientRow {
  id: number;
  name: string;
  phone: string;
  phoneNormalized: string;
  notes: string | null;
  totalBookings: number;
  totalSpent: number;
  upcoming: number;
}

interface BlockedDate {
  id: number;
  technicianId: number;
  blockedDate: string;
  reason: string | null;
}

// ────────────────────────────────────────────────────────
// Constants & Helpers
// ────────────────────────────────────────────────────────
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Tab = "bookings" | "clients" | "technicians" | "blocked" | "manual";

const TABS: { key: Tab; label: string }[] = [
  { key: "bookings", label: "Bookings" },
  { key: "clients", label: "Clients" },
  { key: "technicians", label: "Technicians" },
  { key: "blocked", label: "Schedule" },
  { key: "manual", label: "New Booking" },
];

const STATUSES = [
  { value: "pending_deposit", label: "Pending", bg: "bg-amber-50 text-amber-700" },
  { value: "confirmed", label: "Confirmed", bg: "bg-green-50 text-green-700" },
  { value: "completed", label: "Completed", bg: "bg-blue-50 text-blue-700" },
  { value: "cancelled", label: "Cancelled", bg: "bg-gray-100 text-gray-500" },
  { value: "no_show", label: "No-Show", bg: "bg-red-50 text-red-600" },
  { value: "rescheduled", label: "Rescheduled", bg: "bg-purple-50 text-purple-600" },
];

function sBg(s: string) { return STATUSES.find((x) => x.value === s)?.bg ?? "bg-gray-100 text-gray-500"; }
function sLbl(s: string) { return STATUSES.find((x) => x.value === s)?.label ?? s; }

function fmtDate(d: string) {
  if (!d) return "—";
  try { return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }); }
  catch { return d; }
}

function fmtPrice(p: number | null) { return p ? p.toLocaleString() + " EGP" : "—"; }

const TIME_OPTS = (() => {
  const r: { l: string; v: string }[] = [];
  for (let h = 0; h < 24; h++) for (const m of [0, 30]) {
    const v = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    r.push({ l: `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`, v });
  }
  return r;
})();

// Shared input / select / label class tokens
const inputCls = "w-full h-9 border border-gray-200 px-3 text-sm focus:outline-none focus:border-black transition-colors";
const labelCls = "block text-xs text-gray-500 uppercase tracking-wider font-medium mb-1.5";

// ────────────────────────────────────────────────────────
// Badge
// ────────────────────────────────────────────────────────
function Badge({ status }: { status: string }) {
  return <span className={`inline-block px-2 py-0.5 text-xs font-medium whitespace-nowrap ${sBg(status)}`}>{sLbl(status)}</span>;
}

// ────────────────────────────────────────────────────────
// Stat Box
// ────────────────────────────────────────────────────────
function Stat({ value, label, color = "" }: { value: string | number; label: string; color?: string }) {
  return (
    <div className={`px-3 py-2.5 text-center ${color || "bg-gray-50"}`}>
      <p className={`text-lg font-semibold ${color.includes("green") ? "text-green-700" : color.includes("blue") ? "text-blue-700" : color.includes("purple") ? "text-purple-700" : ""}`}>{value}</p>
      <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  );
}

function Pagination({ page, total, pageSize, onPage }: { page: number; total: number; pageSize: number; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  return (
    <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
      <span>{total.toLocaleString()} records</span>
      <div className="flex items-center gap-2">
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="border border-gray-200 px-3 py-1.5 disabled:opacity-40">Previous</button>
        <span>Page {page} of {pages}</span>
        <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)} className="border border-gray-200 px-3 py-1.5 disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────
// Login Form
// ────────────────────────────────────────────────────────
function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const go = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u, password: p }),
      });
      const d = await r.json().catch(() => ({ error: "The server returned an invalid response" }));
      if (!r.ok) { setErr(d.error || "Login failed"); setBusy(false); return; }
      await new Promise((r) => setTimeout(r, 120));
      onSuccess();
    } catch {
      setErr("Something went wrong");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-xl font-semibold tracking-tight mb-1">Admin Dashboard</h1>
          <p className="text-sm text-gray-400">Hagar Lashes & Nails</p>
        </div>

        <form onSubmit={go} className="space-y-5">
          <div>
            <label htmlFor="usr" className={labelCls}>Username</label>
            <input id="usr" type="text" value={u} onChange={(e) => setU(e.target.value)} className="w-full h-11 border-b border-gray-200 text-base focus:border-black focus:outline-none transition-colors" autoComplete="username" />
          </div>
          <div>
            <label htmlFor="pwd" className={labelCls}>Password</label>
            <input id="pwd" type="password" value={p} onChange={(e) => setP(e.target.value)} className="w-full h-11 border-b border-gray-200 text-base focus:border-black focus:outline-none transition-colors" autoComplete="current-password" />
          </div>
          {err && <p className="text-sm text-red-600 bg-red-50 px-4 py-2.5 border border-red-100">{err}</p>}
          <button type="submit" disabled={busy} className={`w-full h-11 text-sm font-medium tracking-wide transition-colors ${busy ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-black text-white hover:bg-gray-800"}`}>
            {busy ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────
// Admin Page
// ────────────────────────────────────────────────────────
export default function AdminPage() {
  const [auth, setAuth] = useState<"loading" | "login" | "ok">("loading");
  const [tab, setTab] = useState<Tab>("bookings");

  // ── Data ──
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [bookingTotal, setBookingTotal] = useState(0);
  const [bookingPage, setBookingPage] = useState(1);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [techs, setTechs] = useState<Technician[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [clientTotal, setClientTotal] = useState(0);
  const [clientPage, setClientPage] = useState(1);
  const [blocked, setBlocked] = useState<BlockedDate[]>([]);
  const [serviceCatalog, setServiceCatalog] = useState<ServiceCatalogItem[]>([]);

  // ── Filters ──
  const [fStatus, setFStatus] = useState("all");
  const [fTech, setFTech] = useState(0);
  const [clientQ, setClientQ] = useState("");
  const [bookingQ, setBookingQ] = useState("");

  // ── Active states ──
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [actionMessage, setActionMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [editTech, setEditTech] = useState<Technician | null>(null);
  const [savingTech, setSavingTech] = useState(false);
  const [portalUsername, setPortalUsername] = useState("technicians");
  const [portalPassword, setPortalPassword] = useState("");
  const [portalActive, setPortalActive] = useState(true);
  const [portalBusy, setPortalBusy] = useState(false);
  const [portalMessage, setPortalMessage] = useState("");
  const [selClient, setSelClient] = useState<{ client: ClientRow; bookings: BookingRow[] } | null>(null);
  const [clientNotes, setClientNotes] = useState("");

  // ── Blocked dates ──
  const [bTech, setBTech] = useState(0);
  const [bDate, setBDate] = useState("");
  const [bReason, setBReason] = useState("");
  const [bBusy, setBBusy] = useState(false);
  const [cDate, setCDate] = useState("");
  const [cReason, setCReason] = useState("");
  const [cBusy, setCBusy] = useState(false);

  // ── Manual booking ──
  const [mCat, setMCat] = useState<"lashes" | "nails" | "">("");
  const [mTech, setMTech] = useState(0);
  const [mName, setMName] = useState("");
  const [mPhone, setMPhone] = useState("");
  const [mSvc, setMSvc] = useState("");
  const [mDate, setMDate] = useState("");
  const [mTime, setMTime] = useState("");
  const [mNotes, setMNotes] = useState("");
  const [mBusy, setMBusy] = useState(false);
  const [mMsg, setMMsg] = useState("");

  // ── Derived ──
  const allT = techs;
  const tName = useCallback((id: number) => allT.find((t) => t.id === id)?.name ?? "—", [allT]);
  const mTechs = useMemo(() => mCat ? allT.filter((t) => t.category === mCat) : [], [allT, mCat]);
  const mSvcs = useMemo(() => mCat ? serviceCatalog.filter((service) => service.category === mCat) : [], [mCat, serviceCatalog]);
  // Only offer times the selected technician actually works, instead of every hour of the day.
  const mTimeOpts = useMemo(() => {
    const tech = allT.find((t) => t.id === mTech);
    return tech ? generateTimeSlots(tech).map((v) => ({ v, l: formatTime12h(v) })) : [];
  }, [allT, mTech]);

  // ── Fetch helper ──
  const af = useCallback((url: string, opts?: RequestInit) =>
    fetch(url, { credentials: "include", cache: "no-store", ...opts }), []);

  // ── Data loaders ──
  const loadBookings = useCallback(async () => {
    setLoadingBookings(true);
    try {
      const query = new URLSearchParams({ page: String(bookingPage), pageSize: "25", status: fStatus, technicianId: String(fTech), search: bookingQ });
      const r = await af(`/api/admin/bookings?${query}`);
      if (r.ok) { const d = await r.json(); setBookings(d.items); setBookingTotal(d.total); }
    } finally { setLoadingBookings(false); }
  }, [af, bookingPage, fStatus, fTech, bookingQ]);
  const loadTechs = useCallback(async () => { const r = await af("/api/admin/technicians"); if (r.ok) setTechs(await r.json()); }, [af]);
  const loadPortal = useCallback(async () => { const r = await af("/api/admin/technician-portal"); if (r.ok) { const d = await r.json(); if (d) { setPortalUsername(d.username); setPortalActive(d.active); } } }, [af]);
  const loadBlocked = useCallback(async () => { const r = await af("/api/admin/blocked-dates"); if (r.ok) setBlocked(await r.json()); }, [af]);
  const loadClients = useCallback(async () => {
    const query = new URLSearchParams({ search: clientQ, page: String(clientPage), pageSize: "25" });
    const r = await af(`/api/admin/clients?${query}`);
    if (r.ok) { const d = await r.json(); setClients(d.items); setClientTotal(d.total); }
  }, [af, clientQ, clientPage]);

  // ── Init ──
  useEffect(() => {
    fetch("/api/admin/session", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((session) => setAuth(session.authenticated ? "ok" : "login"))
      .catch(() => setAuth("login"));
    fetch("/api/services")
      .then((response) => response.ok ? response.json() : [])
      .then((items) => setServiceCatalog(items))
      .catch(() => setServiceCatalog([]));
  }, []);

  useEffect(() => {
    // Authenticated data loading is the external synchronization for this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (auth === "ok") { loadTechs(); loadBlocked(); loadPortal(); }
  }, [auth, loadTechs, loadBlocked, loadPortal]);

  useEffect(() => {
    if (auth !== "ok") return;
    const timer = window.setTimeout(() => loadBookings(), 250);
    return () => window.clearTimeout(timer);
  }, [auth, loadBookings]);

  useEffect(() => {
    if (auth !== "ok") return;
    const timer = window.setTimeout(() => loadClients(), 250);
    return () => window.clearTimeout(timer);
  }, [auth, clientQ, clientPage, loadClients]);

  // ── Actions ──
  const changeStatus = async (id: number, status: string) => {
    setUpdatingId(id);
    setActionMessage(null);
    try {
      const r = await af("/api/admin/bookings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setActionMessage({ text: d.error || "Could not update booking", error: true }); return; }
      setActionMessage({ text: "Booking status updated", error: false });
      await loadBookings();
    } finally { setUpdatingId(null); }
  };

  const saveTech = async () => {
    if (!editTech) return; setSavingTech(true);
    try { await af("/api/admin/technicians", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editTech) }); setEditTech(null); await loadTechs(); } finally { setSavingTech(false); }
  };

  const savePortal = async () => {
    setPortalBusy(true); setPortalMessage("");
    try {
      const r = await af("/api/admin/technician-portal", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: portalUsername, password: portalPassword, active: portalActive }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setPortalMessage(d.error || "Could not save portal access"); return; }
      setPortalPassword(""); setPortalMessage("Technician portal access updated");
    } finally { setPortalBusy(false); }
  };

  const addBlock = async () => {
    if (!bTech || !bDate) return; setBBusy(true);
    try { await af("/api/admin/blocked-dates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ technicianId: bTech, blockedDate: bDate, reason: bReason || null }) }); setBDate(""); setBReason(""); await loadBlocked(); } finally { setBBusy(false); }
  };

  const closeStore = async () => {
    if (!cDate) return; setCBusy(true);
    try { await Promise.all(allT.map((t) => af("/api/admin/blocked-dates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ technicianId: t.id, blockedDate: cDate, reason: cReason.trim() || "Store closed" }) }))); setCDate(""); setCReason(""); await loadBlocked(); } finally { setCBusy(false); }
  };

  const removeBlock = async (id: number) => { await af(`/api/admin/blocked-dates?id=${id}`, { method: "DELETE" }); loadBlocked(); };

  const createBooking = async () => {
    if (!mTech || !mName || !mPhone || !mSvc || !mDate || !mTime) { setMMsg("Fill all required fields"); return; }
    setMBusy(true); setMMsg("");
    try {
      const r = await af("/api/admin/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ technicianId: mTech, clientName: mName, clientPhone: mPhone, service: mSvc, bookingDate: mDate, bookingTime: mTime, notes: mNotes || null }) });
      if (r.ok) { setMMsg("Booking created!"); setMName(""); setMPhone(""); setMSvc(""); setMDate(""); setMTime(""); setMNotes(""); setMTech(0); setMCat(""); loadBookings(); loadClients(); setTimeout(() => setMMsg(""), 3000); }
      else { const d = await r.json(); setMMsg(d.error || "Failed"); }
    } finally { setMBusy(false); }
  };

  const openClient = async (id: number) => {
    const r = await af(`/api/admin/clients?id=${id}`);
    if (r.ok) { const d = await r.json(); setSelClient(d); setClientNotes(d.client.notes || ""); setTab("clients"); }
  };

  const saveNotes = async () => {
    if (!selClient) return;
    await af("/api/admin/clients", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: selClient.client.id, notes: clientNotes }) });
    openClient(selClient.client.id);
  };

  // ── Render ──
  if (auth === "loading") return <div className="min-h-screen flex items-center justify-center bg-white"><div className="w-5 h-5 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" /></div>;
  if (auth === "login") return <LoginForm onSuccess={() => setAuth("ok")} />;

  return (
    <div className="min-h-screen bg-gray-50/80">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 h-14 flex items-center justify-between">
          <h1 className="text-sm font-semibold tracking-tight sm:text-base">Hagar Lashes & Nails</h1>
          <button onClick={async () => { await af("/api/admin/logout", { method: "POST" }); setAuth("login"); }} className="text-sm text-gray-400 hover:text-black transition-colors">Sign out</button>
        </div>
      </header>

      {/* ── Tabs ── */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-5 sm:px-6">
          <nav className="flex gap-1 overflow-x-auto no-scrollbar -mb-px">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setSelClient(null); }}
                className={`px-3 py-3 text-sm whitespace-nowrap border-b-2 transition-colors ${tab === t.key ? "border-black text-black font-medium" : "border-transparent text-gray-400 hover:text-gray-600"}`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-6xl mx-auto px-5 sm:px-6 py-5">
        {actionMessage && <div role="status" className={`mb-4 border px-4 py-3 text-sm ${actionMessage.error ? "border-red-100 bg-red-50 text-red-700" : "border-green-100 bg-green-50 text-green-700"}`}>{actionMessage.text}</div>}

        {/* ═══════════════ BOOKINGS ═══════════════ */}
        {tab === "bookings" && (
          <section>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <h2 className="text-lg font-medium mr-auto">Bookings</h2>
              <input value={bookingQ} onChange={(e) => { setBookingQ(e.target.value); setBookingPage(1); }} placeholder="Search client, phone, service…" aria-label="Search bookings" className="h-10 sm:h-8 w-full sm:w-56 text-xs border border-gray-200 px-3 focus:outline-none focus:border-black" />
              <select value={fStatus} onChange={(e) => { setFStatus(e.target.value); setBookingPage(1); }} className="h-10 sm:h-8 text-xs border border-gray-200 px-2 focus:outline-none focus:border-black">
                <option value="all">All status</option>
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <select value={fTech} onChange={(e) => { setFTech(+e.target.value); setBookingPage(1); }} className="h-10 sm:h-8 text-xs border border-gray-200 px-2 focus:outline-none focus:border-black">
                <option value={0}>All techs</option>
                {allT.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            {loadingBookings ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-14 skeleton" />)}</div>
            ) : bookings.length === 0 ? (
              <p className="text-gray-400 text-sm py-12 text-center">No bookings match your filters.</p>
            ) : (
              <div className="bg-white border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                        <th className="text-left px-4 py-2.5 font-medium">Client</th>
                        <th className="text-left px-4 py-2.5 font-medium">Tech</th>
                        <th className="text-left px-4 py-2.5 font-medium">Service</th>
                        <th className="text-left px-4 py-2.5 font-medium">Date</th>
                        <th className="text-left px-4 py-2.5 font-medium">Price</th>
                        <th className="text-left px-4 py-2.5 font-medium">Status</th>
                        <th className="text-left px-4 py-2.5 font-medium w-28"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {bookings.map((r) => (
                        <tr key={r.bookings.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-4 py-2.5">
                            <button onClick={() => r.bookings.clientId && openClient(r.bookings.clientId)} className="text-left group">
                              <span className="font-medium group-hover:underline">{r.bookings.clientName}</span>
                              <span className="block text-[11px] text-gray-400">{r.bookings.clientPhone}</span>
                            </button>
                          </td>
                          <td className="px-4 py-2.5 text-gray-600">{r.technicians?.name || tName(r.bookings.technicianId)}</td>
                          <td className="px-4 py-2.5 text-gray-600 max-w-[140px] truncate">{r.bookings.service}</td>
                          <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                            {fmtDate(r.bookings.bookingDate)}<br />
                            <span className="text-[11px] text-gray-400">{formatTime12h(r.bookings.bookingTime)}</span>
                          </td>
                          <td className="px-4 py-2.5 text-gray-600">{fmtPrice(r.bookings.price)}{r.bookings.priceIsEstimate ? <span className="block text-[10px] text-amber-600">Estimate</span> : null}</td>
                          <td className="px-4 py-2.5"><Badge status={r.bookings.status} /></td>
                          <td className="px-4 py-2.5">
                            {updatingId === r.bookings.id ? <span className="text-[11px] text-gray-400">…</span> : (
                              <select value="" onChange={(e) => e.target.value && changeStatus(r.bookings.id, e.target.value)} className="text-[11px] border border-gray-200 px-1.5 py-1 focus:outline-none focus:border-black bg-white">
                                <option value="">Change…</option>
                                {STATUSES.filter((s) => s.value !== r.bookings.status).map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                              </select>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination page={bookingPage} total={bookingTotal} pageSize={25} onPage={setBookingPage} />
              </div>
            )}
          </section>
        )}

        {/* ═══════════════ CLIENTS LIST ═══════════════ */}
        {tab === "clients" && !selClient && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-medium mr-auto">Clients</h2>
              <input
                type="text"
                value={clientQ}
                onChange={(e) => { setClientQ(e.target.value); setClientPage(1); }}
                placeholder="Search name or phone…"
                className="h-8 border border-gray-200 px-3 text-xs focus:outline-none focus:border-black w-56"
              />
            </div>

            {clients.length === 0 ? (
              <p className="text-gray-400 text-sm py-12 text-center">{clientQ ? "No results." : "No clients yet."}</p>
            ) : (
              <div className="bg-white border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                        <th className="text-left px-4 py-2.5 font-medium">Name</th>
                        <th className="text-left px-4 py-2.5 font-medium">Phone</th>
                        <th className="text-left px-4 py-2.5 font-medium">Bookings</th>
                        <th className="text-left px-4 py-2.5 font-medium">Spent</th>
                        <th className="text-left px-4 py-2.5 font-medium">Upcoming</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {clients.map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50/60 cursor-pointer transition-colors" onClick={() => openClient(c.id)}>
                          <td className="px-4 py-2.5 font-medium">{c.name}</td>
                          <td className="px-4 py-2.5 text-gray-500">{c.phone}</td>
                          <td className="px-4 py-2.5">{c.totalBookings}</td>
                          <td className="px-4 py-2.5">{c.totalSpent > 0 ? fmtPrice(c.totalSpent) : "—"}</td>
                          <td className="px-4 py-2.5">{c.upcoming > 0 ? <span className="text-green-600 font-medium">{c.upcoming}</span> : "0"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination page={clientPage} total={clientTotal} pageSize={25} onPage={setClientPage} />
              </div>
            )}
          </section>
        )}

        {/* ═══════════════ CLIENT PROFILE ═══════════════ */}
        {tab === "clients" && selClient && (
          <section>
            <button onClick={() => setSelClient(null)} className="text-xs text-gray-400 hover:text-black mb-4 inline-flex items-center gap-1 transition-colors">
              ← Back to Clients
            </button>

            <div className="bg-white border border-gray-200 p-5 mb-4">
              <h2 className="text-xl font-semibold mb-0.5">{selClient.client.name}</h2>
              <p className="text-sm text-gray-400 mb-5">{selClient.client.phone}</p>

              <div className="grid grid-cols-3 gap-2 mb-5">
                <Stat value={selClient.client.totalBookings} label="Bookings" />
                <Stat value={selClient.client.totalSpent > 0 ? fmtPrice(selClient.client.totalSpent) : "—"} label="Spent" color="bg-green-50" />
                <Stat value={selClient.client.upcoming} label="Upcoming" color="bg-blue-50" />
              </div>

              {/* Insights */}
              {selClient.bookings.length > 0 && (() => {
                const sc: Record<string, number> = {};
                const tc: Record<string, number> = {};
                selClient.bookings.forEach((b) => { sc[b.bookings.service] = (sc[b.bookings.service] || 0) + 1; const n = b.technicians?.name; if (n) tc[n] = (tc[n] || 0) + 1; });
                const topS = Object.entries(sc).sort((a, b) => b[1] - a[1]).slice(0, 3);
                const topT = Object.entries(tc).sort((a, b) => b[1] - a[1])[0];
                return (
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600 mb-5">
                    {topT && <div><span className="text-[10px] text-gray-400 uppercase tracking-wider block mb-0.5">Preferred Tech</span><span className="font-medium">{topT[0]}</span></div>}
                    <div><span className="text-[10px] text-gray-400 uppercase tracking-wider block mb-0.5">Top Services</span>{topS.map(([s]) => s).join(", ")}</div>
                  </div>
                );
              })()}

              {/* Notes */}
              <div>
                <label className={labelCls}>Internal Notes</label>
                <textarea value={clientNotes} onChange={(e) => setClientNotes(e.target.value)} rows={2} className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-black resize-none" />
                <button onClick={saveNotes} className="mt-2 h-8 px-4 bg-black text-white text-xs font-medium hover:bg-gray-800 transition-colors">Save Notes</button>
              </div>
            </div>

            {/* History */}
            <h3 className="text-sm font-medium mb-2">Booking History ({selClient.bookings.length})</h3>
            {selClient.bookings.length === 0 ? <p className="text-gray-400 text-sm">No bookings yet.</p> : (
              <div className="bg-white border border-gray-200 overflow-hidden"><div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                    <th className="text-left px-4 py-2 font-medium">Date</th>
                    <th className="text-left px-4 py-2 font-medium">Service</th>
                    <th className="text-left px-4 py-2 font-medium">Tech</th>
                    <th className="text-left px-4 py-2 font-medium">Price</th>
                    <th className="text-left px-4 py-2 font-medium">Status</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {selClient.bookings.map((r) => (
                      <tr key={r.bookings.id}>
                        <td className="px-4 py-2 whitespace-nowrap">{fmtDate(r.bookings.bookingDate)} <span className="text-gray-400 text-[11px]">{formatTime12h(r.bookings.bookingTime)}</span></td>
                        <td className="px-4 py-2">{r.bookings.service}</td>
                        <td className="px-4 py-2 text-gray-500">{r.technicians?.name ?? "—"}</td>
                        <td className="px-4 py-2">{fmtPrice(r.bookings.price)}</td>
                        <td className="px-4 py-2"><Badge status={r.bookings.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div></div>
            )}
          </section>
        )}

        {/* ═══════════════ TECHNICIANS ═══════════════ */}
        {tab === "technicians" && (
          <section>
            <h2 className="text-lg font-medium mb-4">Technicians</h2>
            <div className="bg-[#f8f4f3] border border-[#eadfdb] p-5 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
                <div><h3 className="font-medium">Shared calendar login</h3><p className="text-xs text-gray-500 mt-1">One read-only login for the whole technician team. Client names and phone numbers are never shared.</p></div>
                <a href="/technician" target="_blank" className="text-xs underline underline-offset-4 shrink-0">Open portal</a>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><label className={labelCls}>Shared username</label><input value={portalUsername} onChange={(e) => setPortalUsername(e.target.value)} className={inputCls} autoComplete="off" /></div>
                <div><label className={labelCls}>New password</label><input type="password" value={portalPassword} onChange={(e) => setPortalPassword(e.target.value)} placeholder="Leave blank to keep current" className={inputCls} autoComplete="new-password" /></div>
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-4">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={portalActive} onChange={(e) => setPortalActive(e.target.checked)} />Portal enabled</label>
                <button onClick={savePortal} disabled={portalBusy} className="h-9 px-4 bg-black text-white text-sm disabled:opacity-50">{portalBusy ? "Saving…" : "Save access"}</button>
                {portalMessage && <p className={`text-xs ${portalMessage.includes("updated") ? "text-green-700" : "text-red-700"}`}>{portalMessage}</p>}
              </div>
            </div>
            <div className="grid gap-3">
              {techs.map((t) => {
                const tb = bookings.filter((b) => b.bookings.technicianId === t.id);
                const done = tb.filter((b) => b.bookings.status === "completed").length;
                const today = new Date().toISOString().split("T")[0];
                const up = tb.filter((b) => b.bookings.status === "confirmed" && b.bookings.bookingDate >= today).length;
                const rev = tb.filter((b) => b.bookings.status === "confirmed" || b.bookings.status === "completed").reduce((s, b) => s + (b.bookings.price || 0), 0);
                const uc = new Set(tb.map((b) => b.bookings.clientPhone)).size;

                return (
                  <div key={t.id} className="bg-white border border-gray-200 p-4">
                    {editTech?.id === t.id ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium">{t.name}</h3>
                          <span className="text-xs text-gray-400 uppercase">{t.category}</span>
                        </div>
                        <div>
                          <label className={labelCls}>Available Days</label>
                          <div className="flex flex-wrap gap-1.5">
                            {DAY_LABELS.map((d, i) => (
                              <button key={d} onClick={() => { const ds = editTech.availableDays.includes(i) ? editTech.availableDays.filter((x) => x !== i) : [...editTech.availableDays, i]; setEditTech({ ...editTech, availableDays: ds }); }} className={`h-8 px-3 text-xs border transition-colors ${editTech.availableDays.includes(i) ? "bg-black text-white border-black" : "border-gray-200 hover:border-gray-400"}`}>{d}</button>
                            ))}
                          </div>
                        </div>
                        {editTech.slotType === "range" && (
                          <div className="grid grid-cols-3 gap-3">
                            <div><label className={labelCls}>Start</label>
                              <select value={(editTech.startTime || "").slice(0, 5)} onChange={(e) => setEditTech({ ...editTech, startTime: e.target.value })} className={inputCls}>
                                <option value="">Select…</option>
                                {TIME_OPTS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                              </select>
                            </div>
                            <div><label className={labelCls}>End</label>
                              <select value={(editTech.endTime || "").slice(0, 5)} onChange={(e) => setEditTech({ ...editTech, endTime: e.target.value })} className={inputCls}>
                                <option value="">Select…</option>
                                {TIME_OPTS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                              </select>
                            </div>
                            <div><label className={labelCls}>Interval (min)</label><input type="number" value={editTech.slotInterval || 60} onChange={(e) => setEditTech({ ...editTech, slotInterval: parseInt(e.target.value) || 60 })} className={inputCls} /></div>
                          </div>
                        )}
                        {editTech.slotType === "fixed" && (
                          <div><label className={labelCls}>Fixed Slots</label><input type="text" value={(editTech.fixedSlots || []).join(",")} onChange={(e) => setEditTech({ ...editTech, fixedSlots: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} className={inputCls} placeholder="11:30,13:00,14:30" /></div>
                        )}
                        <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={editTech.active} onChange={(e) => setEditTech({ ...editTech, active: e.target.checked })} />Active</label>
                        <div className="flex gap-2 pt-1">
                          <button onClick={saveTech} disabled={savingTech} className="h-9 px-4 bg-black text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">{savingTech ? "Saving…" : "Save"}</button>
                          <button onClick={() => setEditTech(null)} disabled={savingTech} className="h-9 px-4 border border-gray-200 text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-medium text-[15px]">{t.name}{!t.active && <span className="text-xs text-red-500 ml-2">(Off)</span>}</h3>
                            <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                              {t.category === "lashes" ? "Lash Tech" : "Nail Tech"}
                              {t.availableDays.length > 0 && ` · ${t.availableDays.sort().map((d) => DAY_LABELS[d]).join(", ")}`}
                              {t.slotType === "range" && t.startTime && ` · ${formatTime12h(t.startTime)}–${formatTime12h(t.endTime || "")}`}
                              {t.slotType === "fixed" && t.fixedSlots && ` · ${t.fixedSlots.map((s) => formatTime12h(s)).join(", ")}`}
                            </p>
                          </div>
                          {techs.length > 0 && <button onClick={() => setEditTech({ ...t })} className="text-xs text-gray-400 hover:text-black transition-colors shrink-0 ml-4">Edit</button>}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <Stat value={done} label="Completed" />
                          <Stat value={up} label="Upcoming" color="bg-purple-50" />
                          <Stat value={uc} label="Clients" color="bg-blue-50" />
                          <Stat value={rev > 0 ? fmtPrice(rev) : "—"} label="Revenue" color="bg-green-50" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ═══════════════ SCHEDULE (BLOCKED) ═══════════════ */}
        {tab === "blocked" && (
          <section>
            <h2 className="text-lg font-medium mb-4">Schedule & Closures</h2>

            <div className="grid sm:grid-cols-2 items-stretch gap-3 mb-4">
              {/* Block single tech */}
              <div className="bg-white border border-gray-200 p-4 h-full flex flex-col">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-1">Block a Technician</p>
                <p className="text-[11px] leading-4 text-gray-400 mb-3 min-h-4">Blocks one technician for that day.</p>
                <div className="flex flex-1 flex-col gap-2">
                  <select value={bTech} onChange={(e) => setBTech(+e.target.value)} className={inputCls}><option value={0}>Technician…</option>{allT.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
                  <input type="date" value={bDate} onChange={(e) => setBDate(e.target.value)} className={inputCls} />
                  <input type="text" value={bReason} onChange={(e) => setBReason(e.target.value)} placeholder="Reason (optional)" className={inputCls} />
                  <button onClick={addBlock} disabled={bBusy || !bTech || !bDate} className="mt-auto w-full h-9 bg-black text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">{bBusy ? "Adding…" : "Block Date"}</button>
                </div>
              </div>

              {/* Close store */}
              <div className="bg-white border border-gray-200 p-4 h-full flex flex-col">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-1">Close Store</p>
                <p className="text-[11px] leading-4 text-gray-400 mb-3 min-h-4">Blocks every technician for that day.</p>
                <div className="flex flex-1 flex-col gap-2">
                  <div className={`${inputCls} flex items-center bg-gray-50 text-gray-500`} aria-label="All technicians">All technicians</div>
                  <input type="date" value={cDate} onChange={(e) => setCDate(e.target.value)} className={inputCls} />
                  <input type="text" value={cReason} onChange={(e) => setCReason(e.target.value)} placeholder="Reason (e.g. Holiday)" className={inputCls} />
                  <button onClick={closeStore} disabled={cBusy || !cDate} className="mt-auto w-full h-9 bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">{cBusy ? "Closing…" : "Close Store"}</button>
                </div>
              </div>
            </div>

            {blocked.length === 0 ? <p className="text-gray-400 text-sm py-8 text-center">No blocked dates.</p> : (
              <div className="bg-white border border-gray-200 overflow-hidden"><div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                    <th className="text-left px-4 py-2.5 font-medium">Tech</th>
                    <th className="text-left px-4 py-2.5 font-medium">Date</th>
                    <th className="text-left px-4 py-2.5 font-medium">Reason</th>
                    <th className="px-4 py-2.5 w-16"></th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {blocked.map((b) => (
                      <tr key={b.id}>
                        <td className="px-4 py-2.5">{tName(b.technicianId)}</td>
                        <td className="px-4 py-2.5">{fmtDate(b.blockedDate)}</td>
                        <td className="px-4 py-2.5 text-gray-400">{b.reason || "—"}</td>
                        <td className="px-4 py-2.5 text-right"><button onClick={() => removeBlock(b.id)} className="text-[11px] text-red-500 hover:underline">Remove</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div></div>
            )}
          </section>
        )}

        {/* ═══════════════ NEW BOOKING ═══════════════ */}
        {tab === "manual" && (
          <section>
            <h2 className="text-lg font-medium mb-4">New Booking</h2>
            <div className="bg-white border border-gray-200 p-5 max-w-md space-y-4">
              {/* Category */}
              <div>
                <label className={labelCls}>Category</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["lashes", "nails"] as const).map((c) => (
                    <button key={c} type="button" onClick={() => { setMCat(c); setMTech(0); setMSvc(""); }} className={`h-10 text-sm border capitalize transition-colors ${mCat === c ? "bg-black text-white border-black" : "border-gray-200 hover:border-gray-400"}`}>{c}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelCls}>Technician</label>
                <select value={mTech} onChange={(e) => { setMTech(+e.target.value); setMTime(""); }} disabled={!mCat} className={`${inputCls} disabled:bg-gray-50 disabled:text-gray-400`}>
                  <option value={0}>{mCat ? "Select technician…" : "Pick category first"}</option>
                  {mTechs.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <div>
                <label className={labelCls}>Service</label>
                <select value={mSvc} onChange={(e) => setMSvc(e.target.value)} disabled={!mCat} className={`${inputCls} disabled:bg-gray-50 disabled:text-gray-400`}>
                  <option value="">{mCat ? "Select service…" : "Pick category first"}</option>
                  {mSvcs.map((s) => <option key={s.name} value={s.name}>{s.name} — {s.priceLabel}</option>)}
                </select>
              </div>

              <div><label className={labelCls}>Client Name</label><input type="text" value={mName} onChange={(e) => setMName(e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Phone</label><input type="tel" value={mPhone} onChange={(e) => setMPhone(e.target.value)} className={inputCls} /></div>

              <div><label className={labelCls}>Date</label><input type="date" value={mDate} onChange={(e) => setMDate(e.target.value)} className={inputCls} /></div>
              <div>
                <label className={labelCls}>Time</label>
                <select value={mTime} onChange={(e) => setMTime(e.target.value)} disabled={!mTech} className={`${inputCls} disabled:bg-gray-50 disabled:text-gray-400`}>
                  <option value="">{mTech ? "Select…" : "Pick technician first"}</option>
                  {mTimeOpts.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </div>

              <div><label className={labelCls}>Notes</label><textarea value={mNotes} onChange={(e) => setMNotes(e.target.value)} rows={2} className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-black resize-none" /></div>

              {mMsg && <p className={`text-sm ${mMsg.includes("created") ? "text-green-600" : "text-red-600"}`}>{mMsg}</p>}

              <button onClick={createBooking} disabled={mBusy} className="w-full h-10 bg-black text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {mBusy ? "Creating…" : "Create Booking"}
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
