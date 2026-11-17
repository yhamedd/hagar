"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import StepHeader from "./StepHeader";
import { EASE_OUT, TiltCard } from "./Motion";

const CATEGORIES = [
  { id: "lashes", title: "Lashes", description: "Extensions, lifts & more", image: "/lashes-booking.jpg" },
  { id: "nails", title: "Nails", description: "Gel, acrylic, manicure, pedicure & designs", image: "/nails-booking.jpg" },
] as const;

interface Props {
  onSelect: (category: string) => void;
  onBack: () => void;
}

export default function CategorySelect({ onSelect, onBack }: Props) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <StepHeader step={1} title="Choose a Category" subtitle="What would you like to book today?" onBack={onBack} />

      <main className="flex-1 max-w-2xl mx-auto w-full px-5 sm:px-6 py-6 sm:py-8">
        <div className="grid sm:grid-cols-2 gap-5 sm:gap-6">
          {CATEGORIES.map((cat, index) => (
            <motion.button
              key={cat.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 + index * 0.1, ease: EASE_OUT }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(cat.id)}
              className="group text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
            >
              <TiltCard className="mb-3 sm:mb-4">
                <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 shadow-[0_24px_48px_-28px_rgba(0,0,0,0.4)]">
                  <Image
                    src={cat.image}
                    alt={cat.title}
                    fill
                    sizes="(min-width: 640px) 320px, 100vw"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
                  />
                </div>
              </TiltCard>
              <h3 className="text-lg sm:text-xl font-medium tracking-tight group-hover:text-gray-600 transition-colors duration-150 mb-0.5">{cat.title}</h3>
              <p className="text-sm text-gray-400 font-light">{cat.description}</p>
            </motion.button>
          ))}
        </div>
      </main>
    </div>
  );
}
