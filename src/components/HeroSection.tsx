"use client";

import Image from "next/image";
import Footer from "./Footer";

const LASH_IMG = "/lashes-home.jpg";
const NAIL_IMG = "/nails-home.jpg";
const SERVICE_PREVIEWS = [
  { image: LASH_IMG, alt: "Professional lash extensions", title: "Lash Extensions", description: "Classic, Volume, 3D, Silk - expertly applied for a natural or dramatic look." },
  { image: NAIL_IMG, alt: "Luxury nail art", title: "Nail Art & Care", description: "Gel, Acrylic, French, Moroccan - plus manicure, pedicure, and custom designs." },
];

export default function HeroSection({ onBook }: { onBook: () => void }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Image
            src="/hagar-lashes-logo.png"
            alt="Hagar Lashes"
            width={830}
            height={238}
            priority
            className="h-12 sm:h-14 w-auto"
          />
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="https://maps.app.goo.gl/EzPcSawmXD3QJhJ2A?g_st=ic"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Location"
              className="inline-flex h-10 w-10 sm:w-auto justify-center sm:justify-start px-0 sm:px-4 items-center gap-1.5 border border-gray-200 text-sm font-medium text-gray-600 hover:border-gray-400 hover:text-black transition-colors duration-150"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="hidden sm:inline">Location</span>
            </a>
            <button
              onClick={onBook}
              className="h-10 px-5 bg-black text-white text-sm font-medium tracking-wide hover:bg-gray-800 active:bg-gray-900 transition-colors duration-150"
            >
              Book Now
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Content */}
      <main className="flex-1 pt-16">
        {/* Main hero */}
        <section className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-5 sm:px-6 lg:px-8 py-16">
          <div className="max-w-3xl mx-auto text-center">
            <p
              className="hero-reveal text-xs sm:text-sm uppercase tracking-[0.2em] text-gray-400 mb-4 sm:mb-6"
            >
              Cairo&apos;s Premier Beauty Studio
            </p>
            <h2
              className="hero-reveal hero-reveal-delay-1 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light tracking-tight leading-[1.1] mb-6 sm:mb-8"
            >
              Lashes &<br />
              <span className="font-semibold">Nails</span>
            </h2>
            <p
              className="hero-reveal hero-reveal-delay-2 text-base sm:text-lg text-gray-500 max-w-md mx-auto mb-8 sm:mb-10 font-light leading-relaxed"
            >
              Expert technicians. Flawless results.
              <br className="hidden sm:block" />
              <span className="sm:hidden"> </span>
              Book your appointment in seconds.
            </p>
            <div className="hero-reveal hero-reveal-delay-3">
              <button
                onClick={onBook}
                className="group inline-flex items-center justify-center gap-2 h-12 sm:h-14 px-8 sm:px-10 bg-black text-white text-sm sm:text-base font-medium tracking-wide hover:bg-gray-800 active:bg-gray-900 transition-colors duration-150"
              >
                Book Your Appointment
                <svg
                  className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </div>
        </section>

        {/* Services preview */}
        <section className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
          <div className="grid sm:grid-cols-2 items-stretch gap-8 sm:gap-10 lg:gap-12">
            {SERVICE_PREVIEWS.map((preview, index) => (
              <button key={preview.title} className="group w-full h-full flex flex-col text-left focus:outline-none" onClick={onBook}>
                <div className="relative w-full h-72 sm:h-80 lg:h-[26rem] flex-none overflow-hidden bg-gray-100 mb-4 sm:mb-5">
                  <Image src={preview.image} alt={preview.alt} fill priority={index === 0} sizes="(min-width: 640px) 50vw, 100vw" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                </div>
                <h3 className="text-xl sm:text-2xl font-light tracking-tight mb-1.5 group-hover:text-gray-600 transition-colors duration-150">{preview.title}</h3>
                <p className="text-sm sm:text-base text-gray-500 font-light leading-relaxed">{preview.description}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Info strip */}
        <section className="border-t border-gray-100 py-12 sm:py-16">
          <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8 grid grid-cols-3 gap-6 sm:gap-8 text-center">
            <div>
              <p className="text-2xl sm:text-3xl font-light mb-1">7+</p>
              <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-widest">
                Technicians
              </p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-light mb-1">20+</p>
              <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-widest">
                Services
              </p>
            </div>
            <a
              href="https://maps.app.goo.gl/EzPcSawmXD3QJhJ2A?g_st=ic"
              target="_blank"
              rel="noopener noreferrer"
              className="group"
            >
              <p className="text-2xl sm:text-3xl font-light mb-1 group-hover:text-gray-600 transition-colors duration-150">
                Agora
              </p>
              <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-widest">
                New Cairo
              </p>
            </a>
          </div>
        </section>
      </main>

      <Footer wide />
    </div>
  );
}
