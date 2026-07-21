"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import StepHeader from "./StepHeader";

const LASH_IMG = "/lashes-booking.jpg";
const NAIL_IMG = "/nails-booking.jpg";

const CATEGORIES = [
  { id: "lashes", title: "Lashes", description: "Extensions, lifts & more", image: LASH_IMG },
  { id: "nails", title: "Nails", description: "Gel, acrylic, manicure, pedicure & designs", image: NAIL_IMG },
] as const;

interface Props {
  onSelect: (category: string) => void;
  onBack: () => void;
}

export default function CategorySelect({ onSelect, onBack }: Props) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <StepHeader
        step={1}
        totalSteps={6}
        title="Choose a Category"
        subtitle="What would you like to book today?"
        onBack={onBack}
      />

      <main className="flex-1 max-w-2xl mx-auto w-full px-5 sm:px-6 py-6 sm:py-8">
        <div className="grid sm:grid-cols-2 gap-5 sm:gap-6">
          {CATEGORIES.map((cat, index) => (
            <motion.button
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              onClick={() => onSelect(cat.id)}
              className="group text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 mb-3 sm:mb-4">
                <Image
                  src={cat.image}
                  alt={cat.title}
                  fill
                  sizes="(min-width: 640px) 320px, 100vw"
                  className="w-full h-full object-cover transition-transform duration-400 group-hover:scale-[1.03]"
                />
              </div>
              <h3 className="text-lg sm:text-xl font-medium tracking-tight group-hover:text-gray-600 transition-colors duration-150 mb-0.5">
                {cat.title}
              </h3>
              <p className="text-sm text-gray-400 font-light">
                {cat.description}
              </p>
            </motion.button>
          ))}
        </div>
      </main>
    </div>
  );
}
