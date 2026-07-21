"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import StepHeader from "./StepHeader";

interface Technician {
  id: number;
  name: string;
  category: string;
}

interface Props {
  category: string;
  onSelect: (id: number, name: string) => void;
  onBack: () => void;
}

export default function TechnicianSelect({ category, onSelect, onBack }: Props) {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  const retryLoad = () => {
    setLoading(true);
    setError(false);
    setRetry((value) => value + 1);
  };

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/technicians?category=${encodeURIComponent(category)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setTechnicians(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [category, retry]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <StepHeader
        step={2}
        totalSteps={6}
        title="Choose Your Technician"
        subtitle={`Select a ${category === "lashes" ? "lash" : "nail"} technician`}
        onBack={onBack}
      />

      <main className="flex-1 max-w-2xl mx-auto w-full px-5 sm:px-6 py-6 sm:py-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-gray-100 p-5 space-y-2">
                <div className="h-4 skeleton w-1/2" />
                <div className="h-3 skeleton w-1/3" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">We couldn&apos;t load the technician list.</p>
            <button type="button" onClick={retryLoad} className="h-10 px-5 border border-gray-300 text-sm hover:border-black transition-colors">
              Try again
            </button>
          </div>
        ) : technicians.length === 0 ? (
          <p className="text-gray-400 text-center py-12">
            No technicians available for this category.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {technicians.map((tech, index) => (
              <motion.button
                key={tech.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                onClick={() => onSelect(tech.id, tech.name)}
                className="group w-full min-h-24 border border-gray-200 px-5 py-4 text-left flex items-center justify-between gap-4 hover:border-black hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 transition-colors"
              >
                <div>
                  <h3 className="text-lg font-medium tracking-tight group-hover:text-gray-600 transition-colors duration-150">
                    {tech.name}
                  </h3>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mt-1">
                    {tech.category === "lashes" ? "Lash Technician" : "Nail Technician"}
                  </p>
                </div>
                <svg className="w-5 h-5 text-gray-300 group-hover:text-black group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                </svg>
              </motion.button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
