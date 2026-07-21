"use client";

import { useEffect, useMemo, useState } from "react";
import StepHeader from "./StepHeader";
import type { BookingData } from "./BookingApp";
import type { ServiceCatalogItem } from "@/lib/serviceCatalog";

interface Props { bookingData: BookingData; updateBooking: (data: Partial<BookingData>) => void; onContinue: () => void; onBack: () => void }

// Services that stay in their category but can be combined with another pick
// from the same category rather than exclusively replacing it.
const COMBINABLE_SERVICE_NAMES = ["Brow Lamination"];

export default function ServiceSelect({ bookingData, updateBooking, onContinue, onBack }: Props) {
  const [catalog, setCatalog] = useState<ServiceCatalogItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/services")
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then(setCatalog)
      .catch(() => setError("Services could not be loaded. Please try again."))
      .finally(() => setLoading(false));
  }, [bookingData.category]);

  // Nails is fully multi-select: clients commonly combine several nail services in one visit.
  // Extras (e.g. Eyebrows & Moustache) are only offered alongside nails, not lashes.
  const isMultiCategory = bookingData.category === "nails";
  const categoryServices = catalog.filter((item) => item.category === bookingData.category);
  const mainServices = isMultiCategory ? [] : categoryServices.filter((item) => !COMBINABLE_SERVICE_NAMES.includes(item.name));
  const addOns = [
    ...(isMultiCategory ? categoryServices : categoryServices.filter((item) => COMBINABLE_SERVICE_NAMES.includes(item.name))),
    ...(isMultiCategory ? catalog.filter((item) => item.category === "extras") : []),
  ];

  const selectedNames = useMemo(() => [bookingData.service, ...bookingData.extras].filter(Boolean), [bookingData.service, bookingData.extras]);
  const selected = useMemo(() => catalog.filter((item) => selectedNames.includes(item.name)), [catalog, selectedNames]);
  const summary = useMemo(() => ({
    price: selected.reduce((sum, item) => sum + (item.price || 0), 0),
    estimate: selected.some((item) => item.priceMax !== null),
  }), [selected]);
  // Eyebrows & Moustache (and any other pure add-on) can never stand alone as the booking's service.
  const hasCoreService = selected.some((item) => item.category !== "extras");

  const commitSelection = (names: string[]) => {
    const items = catalog.filter((item) => names.includes(item.name));
    // A genuine service (not an "extras" category add-on) always becomes the
    // primary "service" field, regardless of click order, so an add-on can
    // never end up standing in as the booking's core service.
    const core = items.filter((item) => item.category !== "extras").map((item) => item.name);
    const addOnNames = items.filter((item) => item.category === "extras").map((item) => item.name);
    const [service, ...restCore] = core;
    updateBooking({ service: service || "", extras: [...restCore, ...addOnNames], estimatedPrice: items.reduce((sum, item) => sum + (item.price || 0), 0), priceIsEstimate: items.some((item) => item.priceMax !== null), duration: items.reduce((sum, item) => sum + item.duration, 0), date: "", time: "" });
  };
  // Exclusive pick among mainServices; anything already toggled on (add-ons/extras) is kept.
  const selectMain = (name: string) => {
    const mainNames = new Set(mainServices.map((item) => item.name));
    const rest = selectedNames.filter((item) => item !== name && !mainNames.has(item));
    commitSelection([name, ...rest]);
  };
  const toggleSelection = (name: string) => commitSelection(selectedNames.includes(name) ? selectedNames.filter((item) => item !== name) : [...selectedNames, name]);

  return <div className="min-h-screen bg-white flex flex-col">
    <StepHeader step={3} totalSteps={6} title="Choose Your Service" subtitle="Your service length determines the times available" onBack={onBack} />
    <main className="flex-1 max-w-2xl mx-auto w-full px-5 sm:px-6 py-6 sm:py-8 space-y-6">
      {loading && <p className="text-sm text-gray-400">Loading services…</p>}
      {error && <p role="alert" className="text-sm text-red-600 bg-red-50 p-3">{error}</p>}
      {mainServices.length > 0 && <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{mainServices.map((service) => <button key={service.id} type="button" onClick={() => selectMain(service.name)} className={`min-h-16 text-left border px-4 py-3 ${bookingData.service === service.name ? "border-black bg-black text-white" : "border-gray-200 hover:border-gray-500"}`}><span className="block text-sm font-medium">{service.name}</span><span className={`text-xs ${bookingData.service === service.name ? "text-gray-300" : "text-gray-500"}`}>{service.priceLabel}</span></button>)}</div>}
      {isMultiCategory && addOns.length > 0 && (
        <div><p className="text-xs uppercase tracking-wider text-gray-500 mb-3">Select Services <span className="normal-case text-gray-400">(choose one or more)</span></p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{addOns.map((service) => <button key={service.id} type="button" onClick={() => toggleSelection(service.name)} className={`min-h-16 text-left border px-4 py-3 ${selectedNames.includes(service.name) ? "border-black bg-black text-white" : "border-gray-200 hover:border-gray-500"}`}><span className="block text-sm font-medium">{service.name}</span><span className={`text-xs ${selectedNames.includes(service.name) ? "text-gray-300" : "text-gray-500"}`}>{service.priceLabel}</span></button>)}</div>
        </div>
      )}
      {!isMultiCategory && addOns.length > 0 && <div><p className="text-xs uppercase tracking-wider text-gray-500 mb-3">Extras <span className="normal-case text-gray-400">(optional)</span></p><div className="flex flex-wrap gap-2">{addOns.map((extra) => <button key={extra.id} type="button" onClick={() => toggleSelection(extra.name)} className={`min-h-11 border px-4 text-sm ${selectedNames.includes(extra.name) ? "border-black bg-black text-white" : "border-gray-200"}`}>{extra.name} · {extra.priceLabel}</button>)}</div></div>}
      {bookingData.service && <div className="bg-gray-50 p-4 text-sm flex items-center justify-between"><span className="text-gray-600">Subtotal</span><span className="font-medium">{summary.estimate ? "Estimated from " : ""}{summary.price.toLocaleString()} EGP</span></div>}
      {bookingData.service && !hasCoreService && <p className="text-sm text-amber-600">Eyebrows & Moustache must be booked together with another service.</p>}
      <button type="button" disabled={!bookingData.service || !hasCoreService || loading} onClick={onContinue} className="w-full h-12 bg-black text-white text-sm font-medium disabled:bg-gray-100 disabled:text-gray-400">Choose Date & Time</button>
    </main>
  </div>;
}
