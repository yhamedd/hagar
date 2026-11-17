"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { EASE_OUT } from "./Motion";
import { TOTAL_BOOKING_STEPS } from "@/lib/site";

interface Props {
  step: number;
  title: string;
  subtitle?: string;
  onBack?: () => void;
}

export default function StepHeader({ step, title, subtitle, onBack }: Props) {
  const totalSteps = TOTAL_BOOKING_STEPS;
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-2xl mx-auto px-5 sm:px-6 pt-4 pb-5 sm:pt-5 sm:pb-6">
        {/* Back + Progress */}
        <div className="grid grid-cols-3 items-baseline mb-4 sm:mb-5">
          <div className="justify-self-start">
            {onBack && (
              <button
                onClick={onBack}
                className="group inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-black active:text-black transition-colors duration-150 -ml-1 py-1 px-1"
                aria-label="Go back"
              >
                <svg className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back</span>
              </button>
            )}
          </div>
          <Image src="/hagar-lashes-logo.png" alt="Hagar Lashes" width={830} height={238} priority className="h-10 sm:h-11 w-auto justify-self-center" />
          <span className="justify-self-end text-xs text-gray-400 uppercase tracking-wider tabular-nums">{step}/{totalSteps}</span>
        </div>

        {/* Progress bar: grows from the previous step's position to this one. */}
        <div
          className="w-full h-1 bg-gray-100 mb-5 sm:mb-6 overflow-hidden"
          role="progressbar"
          aria-valuenow={step}
          aria-valuemin={1}
          aria-valuemax={totalSteps}
        >
          <motion.div
            className="h-full bg-black origin-left"
            initial={{ scaleX: Math.max(0, step - 1) / totalSteps }}
            animate={{ scaleX: step / totalSteps }}
            transition={{ duration: 0.7, delay: 0.15, ease: EASE_OUT }}
          />
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-light tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm sm:text-base text-gray-400 font-light mt-1.5">{subtitle}</p>}
      </div>
    </header>
  );
}
