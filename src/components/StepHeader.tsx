"use client";

import Image from "next/image";

interface Props {
  step: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  onBack?: () => void;
}

export default function StepHeader({
  step,
  totalSteps,
  title,
  subtitle,
  onBack,
}: Props) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
      <div className="max-w-2xl mx-auto px-5 sm:px-6 pt-4 pb-5 sm:pt-5 sm:pb-6">
        {/* Back + Progress */}
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          {onBack ? (
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-black active:text-black transition-colors duration-150 -ml-1 py-1 px-1"
              aria-label="Go back"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}
          <div className="relative w-28 h-9 overflow-hidden" aria-label="Hagar Lashes">
            <Image src="/hagar-lashes-logo.jpg" alt="Hagar Lashes" fill sizes="112px" className="object-cover object-center" priority />
          </div>
          <span className="text-xs text-gray-400 uppercase tracking-wider">{step}/{totalSteps}</span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1 bg-gray-100 mb-5 sm:mb-6 overflow-hidden">
          <div
            className="h-full bg-black transition-all duration-500 ease-out"
            style={{ width: `${(step / totalSteps) * 100}%` }}
            role="progressbar"
            aria-valuenow={step}
            aria-valuemin={1}
            aria-valuemax={totalSteps}
          />
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-light tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm sm:text-base text-gray-400 font-light mt-1.5">
            {subtitle}
          </p>
        )}
      </div>
    </header>
  );
}
