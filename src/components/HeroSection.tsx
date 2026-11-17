"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import Footer from "./Footer";
import { CountUp, EASE_OUT, Marquee, Reveal, TiltCard } from "./Motion";
import { SITE } from "@/lib/site";

// WebGL scene: client-only and split into its own chunk so three.js never
// delays the first paint or the Book button.
const Hero3D = dynamic(() => import("./Hero3D"), { ssr: false });

const SERVICE_PREVIEWS = [
  { image: "/lashes-home.jpg", alt: "Professional lash extensions", title: "Lash Extensions", description: "Classic, Volume, 3D, Silk - expertly applied for a natural or dramatic look." },
  { image: "/nails-home.jpg", alt: "Luxury nail art", title: "Nail Art & Care", description: "Gel, Acrylic, French, Moroccan - plus manicure, pedicure, and custom designs." },
];

const MARQUEE_ITEMS = ["Classic Lashes", "Volume", "3D Lashes", "Silk", "Gel Nails", "Acrylic", "French", "Moroccan", "Manicure", "Pedicure", "Custom Designs"] as const;

const HEADLINE = [
  { text: "Lashes &", className: "font-light" },
  { text: "Nails", className: "font-semibold" },
];

const ArrowIcon = () => (
  <svg className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

export default function HeroSection({ onBook }: { onBook: () => void }) {
  // Gentle parallax: the 3D scene drifts up and fades as the page scrolls.
  const { scrollY } = useScroll();
  const sceneY = useTransform(scrollY, [0, 600], [0, -70]);
  const sceneOpacity = useTransform(scrollY, [0, 500], [1, 0.25]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="nav-drop fixed top-0 left-0 right-0 z-50 bg-white/85 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Image src="/hagar-lashes-logo.png" alt="Hagar Lashes" width={830} height={238} priority className="h-12 sm:h-14 w-auto" />
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href={SITE.mapsUrl}
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
            <button onClick={onBook} className="h-10 px-5 bg-black text-white text-sm font-medium tracking-wide hover:bg-gray-800 active:bg-gray-900 transition-colors duration-150">
              Book Now
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 pt-16">
        {/* Main hero */}
        <section className="relative overflow-hidden">
          <div aria-hidden="true" className="hero-glow" />
          <div className="relative max-w-6xl mx-auto px-5 sm:px-6 lg:px-8 min-h-[calc(100svh-4rem)] grid lg:grid-cols-2 items-center gap-2 lg:gap-8 py-8 lg:py-16">
            <motion.div style={{ y: sceneY, opacity: sceneOpacity }} className="order-1 lg:order-2 h-[36svh] min-h-[240px] lg:h-[560px]">
              <Hero3D className="w-full h-full" />
            </motion.div>

            <div className="order-2 lg:order-1 text-center lg:text-left pb-8 lg:pb-0">
              <motion.p
                initial={{ opacity: 0, letterSpacing: "0.5em" }}
                animate={{ opacity: 1, letterSpacing: "0.2em" }}
                transition={{ duration: 1, ease: EASE_OUT }}
                className="text-xs sm:text-sm uppercase text-gray-400 mb-4 sm:mb-6"
              >
                Cairo&apos;s Premier Beauty Studio
              </motion.p>
              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tight leading-[1.02] mb-6 sm:mb-8">
                {HEADLINE.map((line, index) => (
                  <span key={line.text} className="block overflow-hidden pb-[0.12em]">
                    <motion.span
                      className={`block ${line.className}`}
                      initial={{ y: "110%" }}
                      animate={{ y: 0 }}
                      transition={{ duration: 0.9, delay: 0.15 + index * 0.12, ease: EASE_OUT }}
                    >
                      {line.text}
                    </motion.span>
                  </span>
                ))}
              </h1>
              <motion.p
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.5, ease: EASE_OUT }}
                className="text-base sm:text-lg text-gray-500 max-w-md mx-auto lg:mx-0 mb-8 sm:mb-10 font-light leading-relaxed"
              >
                Expert technicians. Flawless results. Book your appointment in seconds.
              </motion.p>
              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.65, ease: EASE_OUT }}>
                <motion.button
                  onClick={onBook}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="cta-shine group inline-flex items-center justify-center gap-2 h-12 sm:h-14 px-8 sm:px-10 bg-black text-white text-sm sm:text-base font-medium tracking-wide"
                >
                  Book Your Appointment
                  <ArrowIcon />
                </motion.button>
              </motion.div>
            </div>
          </div>
        </section>

        <Marquee items={MARQUEE_ITEMS} />

        {/* Services preview */}
        <section className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
          <div className="grid sm:grid-cols-2 items-stretch gap-8 sm:gap-10 lg:gap-12">
            {SERVICE_PREVIEWS.map((preview, index) => (
              <Reveal key={preview.title} delay={index * 0.12}>
                <button className="group w-full h-full flex flex-col text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-4" onClick={onBook}>
                  <TiltCard className="w-full mb-4 sm:mb-5">
                    <div className="relative w-full h-72 sm:h-80 lg:h-[26rem] overflow-hidden bg-gray-100 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.35)]">
                      <Image src={preview.image} alt={preview.alt} fill priority={index === 0} sizes="(min-width: 640px) 50vw, 100vw" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.06]" />
                    </div>
                  </TiltCard>
                  <h2 className="text-xl sm:text-2xl font-light tracking-tight mb-1.5 inline-flex items-center gap-2">
                    {preview.title}
                    <span className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"><ArrowIcon /></span>
                  </h2>
                  <p className="text-sm sm:text-base text-gray-500 font-light leading-relaxed">{preview.description}</p>
                </button>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Info strip */}
        <section className="border-t border-gray-100 py-12 sm:py-16">
          <Reveal className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8 grid grid-cols-3 gap-6 sm:gap-8 text-center">
            <div>
              <p className="text-2xl sm:text-3xl font-light mb-1"><CountUp value={7} suffix="+" /></p>
              <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-widest">Technicians</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-light mb-1"><CountUp value={20} suffix="+" /></p>
              <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-widest">Services</p>
            </div>
            <a href={SITE.mapsUrl} target="_blank" rel="noopener noreferrer" className="group">
              <p className="text-2xl sm:text-3xl font-light mb-1 group-hover:text-gray-600 transition-colors duration-150">Agora</p>
              <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-widest">New Cairo</p>
            </a>
          </Reveal>
        </section>
      </main>

      <Footer wide />
    </div>
  );
}
