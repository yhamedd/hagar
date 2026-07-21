"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addDays, addMonths, addWeeks, endOfMonth, endOfWeek, format, isBefore, isSameDay, parseISO, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import { formatTime12h } from "@/lib/timeFormat";

type View = "day" | "week" | "month";
type Technician = { id: number; name: string; category: string };
type Appointment = { bookingDate: string; bookingTime: string; duration: number | null; service: string };

export default function TechnicianCalendarPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [view, setView] = useState<View>("day");
  const [cursor, setCursor] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [calendarBusy, setCalendarBusy] = useState(false);
  const [error, setError] = useState("");
  const requestSequence = useRef(0);

  useEffect(() => {
    Promise.all([
      fetch("/api/technician/session", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/technicians", { cache: "no-store" }),
    ]).then(async ([session, technicianResponse]) => {
      if (!session.authenticated) {
        router.replace("/technician");
        return;
      }
      const data = await technicianResponse.json();
      setTechnicians(Array.isArray(data) ? data : []);
      const saved = Number(window.localStorage.getItem("hagar-technician-id"));
      if (data.some((item: Technician) => item.id === saved)) setSelectedId(saved);
      setLoading(false);
    }).catch(() => {
      setError("The calendar could not be loaded.");
      setLoading(false);
    });
  }, [router]);

  const range = useMemo(() => {
    if (view === "day") return { from: cursor, to: cursor };
    if (view === "week") return { from: startOfWeek(cursor), to: endOfWeek(cursor) };
    return { from: startOfMonth(cursor), to: endOfMonth(cursor) };
  }, [cursor, view]);

  const loadAppointments = useCallback(async () => {
    if (!selectedId) return;
    const requestId = ++requestSequence.current;
    setCalendarBusy(true);
    setError("");
    try {
      const query = new URLSearchParams({
        technicianId: String(selectedId),
        from: format(range.from, "yyyy-MM-dd"),
        to: format(range.to, "yyyy-MM-dd"),
      });
      const response = await fetch(`/api/technician/appointments?${query}`, { cache: "no-store" });
      if (response.status === 401) { router.replace("/technician"); return; }
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (requestId === requestSequence.current) setAppointments(data);
    } catch {
      if (requestId === requestSequence.current) setError("Appointments could not be loaded. Please try again.");
    } finally {
      if (requestId === requestSequence.current) setCalendarBusy(false);
    }
  }, [range.from, range.to, router, selectedId]);

  useEffect(() => {
    // Appointment data is external server state synchronized to the selected range.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAppointments();
  }, [loadAppointments]);

  const selected = technicians.find((technician) => technician.id === selectedId);
  const grouped = useMemo(() => {
    const result = new Map<string, Appointment[]>();
    for (const appointment of appointments) {
      result.set(appointment.bookingDate, [...(result.get(appointment.bookingDate) || []), appointment]);
    }
    return [...result.entries()];
  }, [appointments]);

  function chooseTechnician(technician: Technician) {
    window.localStorage.setItem("hagar-technician-id", String(technician.id));
    setSelectedId(technician.id);
  }

  function clearTechnician() {
    window.localStorage.removeItem("hagar-technician-id");
    setSelectedId(null);
    setAppointments([]);
  }

  function move(direction: -1 | 1) {
    setCursor((date) => view === "day" ? addDays(date, direction) : view === "week" ? addWeeks(date, direction) : addMonths(date, direction));
  }

  async function logout() {
    await fetch("/api/technician/logout", { method: "POST" });
    window.localStorage.removeItem("hagar-technician-id");
    router.replace("/technician");
  }

  if (loading) return <main className="min-h-screen bg-[#f8f4f3] grid place-items-center"><p className="text-sm text-gray-400">Loading calendar…</p></main>;

  if (!selected) {
    return (
      <main className="min-h-screen bg-[#f8f4f3] px-5 py-8 sm:py-12">
        <div className="max-w-2xl mx-auto">
          <header className="flex items-center justify-between mb-12">
            <div className="relative w-40 h-12"><Image src="/hagar-lashes-logo.png" alt="Hagar Lashes" fill sizes="160px" className="object-contain object-left" /></div>
            <button onClick={logout} className="text-xs text-gray-500 hover:text-black">Sign out</button>
          </header>
          <section className="bg-white border border-[#eadfdb] p-6 sm:p-9">
            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400 mb-3">Technician portal</p>
            <h1 className="text-3xl font-light tracking-tight">Who are you?</h1>
            <p className="text-sm text-gray-500 mt-2 mb-8">Choose your name to open your schedule.</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {technicians.map((technician) => (
                <button key={technician.id} onClick={() => chooseTechnician(technician)} className="min-h-20 border border-gray-200 px-5 py-4 text-left hover:border-black hover:bg-[#fcfaf9] transition-colors">
                  <span className="block text-lg">{technician.name}</span>
                  <span className="block text-[11px] uppercase tracking-wider text-gray-400 mt-1">{technician.category === "lashes" ? "Lash technician" : "Nail technician"}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </main>
    );
  }

  const today = startOfDay(new Date());
  const earlier = grouped.filter(([date]) => isBefore(parseISO(date), today));
  const upcoming = grouped.filter(([date]) => !isBefore(parseISO(date), today));
  const title = view === "day" ? format(cursor, "EEEE, MMMM d") : view === "week" ? `${format(range.from, "MMM d")} – ${format(range.to, "MMM d")}` : format(cursor, "MMMM yyyy");

  const renderGroups = (groups: [string, Appointment[]][]) => groups.map(([date, items]) => (
    <section key={date} className="mb-7">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-medium">{isSameDay(parseISO(date), new Date()) ? "Today" : format(parseISO(date), "EEEE, MMMM d")}</h2>
        <span className="text-xs text-gray-400">{items.length} appointment{items.length === 1 ? "" : "s"}</span>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <article key={`${date}-${item.bookingTime}-${item.service}`} className="bg-white border-l-2 border-[#2f1710] px-4 py-4 flex items-start gap-4">
            <time className="w-20 shrink-0 text-sm font-semibold tabular-nums">{formatTime12h(item.bookingTime)}</time>
            <div className="min-w-0">
              <p className="text-sm font-medium text-pretty">{item.service}</p>
              <p className="text-xs text-gray-400 mt-1">{item.duration || 60} minutes</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  ));

  return (
    <main className="min-h-screen bg-[#f8f4f3]">
      <header className="bg-white border-b border-[#eadfdb] sticky top-0 z-20">
        <div className="max-w-4xl mx-auto h-16 px-4 sm:px-6 flex items-center justify-between">
          <div><p className="font-medium leading-tight">{selected.name}</p><p className="text-[11px] text-gray-400">Private schedule</p></div>
          <div className="flex items-center gap-4"><button onClick={clearTechnician} className="text-xs text-gray-500 hover:text-black">Change name</button><button onClick={logout} className="text-xs text-gray-500 hover:text-black">Sign out</button></div>
        </div>
      </header>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-9">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div><p className="text-[11px] uppercase tracking-[0.16em] text-gray-400 mb-1">Schedule</p><h1 className="text-2xl sm:text-3xl font-light tracking-tight">{title}</h1></div>
          <div className="inline-grid grid-cols-3 bg-white border border-gray-200 p-1 self-start">
            {(["day", "week", "month"] as View[]).map((option) => <button key={option} onClick={() => setView(option)} className={`h-8 px-4 text-xs capitalize ${view === option ? "bg-black text-white" : "text-gray-500 hover:text-black"}`}>{option}</button>)}
          </div>
        </div>
        <div className="flex items-center justify-between mb-7">
          <button onClick={() => move(-1)} aria-label="Previous period" className="w-10 h-10 bg-white border border-gray-200 hover:border-black">←</button>
          <button onClick={() => setCursor(new Date())} className="h-10 px-5 bg-white border border-gray-200 text-xs hover:border-black">Today</button>
          <button onClick={() => move(1)} aria-label="Next period" className="w-10 h-10 bg-white border border-gray-200 hover:border-black">→</button>
        </div>
        {error && <div role="alert" className="mb-5 bg-red-50 text-red-700 px-4 py-3 text-sm flex justify-between gap-4"><span>{error}</span><button onClick={loadAppointments} className="underline">Retry</button></div>}
        {calendarBusy ? <div className="py-16 text-center text-sm text-gray-400">Loading appointments…</div> : appointments.length === 0 ? (
          <div className="bg-white border border-[#eadfdb] px-6 py-16 text-center"><p className="text-lg font-light">No appointments</p><p className="text-sm text-gray-400 mt-2">Your schedule is clear for this period.</p></div>
        ) : (
          <div>{upcoming.length > 0 && <div>{renderGroups(upcoming)}</div>}{earlier.length > 0 && <div className="mt-10 opacity-70"><p className="text-[11px] uppercase tracking-[0.16em] text-gray-400 mb-4">Earlier appointments</p>{renderGroups(earlier)}</div>}</div>
        )}
        <p className="text-xs leading-relaxed text-gray-400 mt-9 border-t border-[#e5d9d5] pt-5">For client details, cancellations, or schedule changes, contact the salon administrator.</p>
      </div>
    </main>
  );
}
