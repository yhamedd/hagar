"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import HeroSection from "./HeroSection";
import { EASE_OUT } from "./Motion";

const StepFallback = () => <div className="min-h-screen bg-white" aria-busy="true" />;
const CategorySelect = dynamic(() => import("./CategorySelect"), { loading: StepFallback });
const TechnicianSelect = dynamic(() => import("./TechnicianSelect"), { loading: StepFallback });
const ServiceSelect = dynamic(() => import("./ServiceSelect"), { loading: StepFallback });
const DateTimeSelect = dynamic(() => import("./DateTimeSelect"), { loading: StepFallback });
const QuestionnaireForm = dynamic(() => import("./QuestionnaireForm"), { loading: StepFallback });
const ConfirmationScreen = dynamic(() => import("./ConfirmationScreen"), { loading: StepFallback });
const Footer = dynamic(() => import("./Footer"));

const STEPS = ["hero", "category", "technician", "service", "datetime", "questionnaire", "confirmation"] as const;
type BookingStep = (typeof STEPS)[number];

export interface BookingData {
  category: string;
  technicianId: number | null;
  technicianName: string;
  date: string;
  time: string;
  firstName: string;
  lastName: string;
  clientPhone: string;
  service: string;
  extras: string[];
  notes: string;
  policyAcknowledged: boolean;
  estimatedPrice: number;
  priceIsEstimate: boolean;
  duration: number;
}

const initialBookingData: BookingData = {
  category: "",
  technicianId: null,
  technicianName: "",
  date: "",
  time: "",
  firstName: "",
  lastName: "",
  clientPhone: "",
  service: "",
  extras: [],
  notes: "",
  policyAcknowledged: false,
  estimatedPrice: 0,
  priceIsEstimate: false,
  duration: 60,
};

export default function BookingApp() {
  const [step, setStepState] = useState<BookingStep>("hero");
  const [bookingData, setBookingData] = useState<BookingData>(initialBookingData);
  const [bookingResult, setBookingResult] = useState<Record<string, unknown> | null>(null);
  // +1 when moving forward through the flow, -1 when going back: steps slide
  // in from the side the client is travelling toward.
  const [direction, setDirection] = useState(1);
  const stepRef = useRef(step);
  const reduceMotion = useReducedMotion();

  const setStep = (next: BookingStep) => {
    setDirection(STEPS.indexOf(next) >= STEPS.indexOf(stepRef.current) ? 1 : -1);
    stepRef.current = next;
    setStepState(next);
  };

  const updateBooking = (data: Partial<BookingData>) => {
    setBookingData((prev) => ({ ...prev, ...data }));
  };

  // Switching steps swaps the rendered component in place rather than
  // navigating to a new page, so the browser never resets scroll on its
  // own -- without this, staying scrolled down from the previous step
  // can push the new step's top content (e.g. the first technician's
  // name) out of view until the user manually scrolls back up.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  const goBack = () => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  };

  const resetBooking = () => {
    setBookingData(initialBookingData);
    setBookingResult(null);
    setStep("hero");
  };

  const renderStep = () => {
    switch (step) {
      case "hero":
        return <HeroSection onBook={() => setStep("category")} />;
      case "category":
        return (
          <CategorySelect
            onSelect={(cat: string) => {
              // Services are category-scoped, so a previous category's leftover
              // service/extras selection must not silently carry its price/duration
              // into a newly chosen category.
              updateBooking({
                category: cat,
                technicianId: null,
                technicianName: "",
                service: "",
                extras: [],
                estimatedPrice: 0,
                priceIsEstimate: false,
                duration: 60,
                date: "",
                time: "",
              });
              setStep("technician");
            }}
            onBack={goBack}
          />
        );
      case "technician":
        return (
          <TechnicianSelect
            category={bookingData.category}
            onSelect={(id: number, name: string) => {
              updateBooking({ technicianId: id, technicianName: name });
              setStep("service");
            }}
            onBack={goBack}
          />
        );
      case "service":
        return <ServiceSelect bookingData={bookingData} updateBooking={updateBooking} onContinue={() => setStep("datetime")} onBack={goBack} />;
      case "datetime":
        return bookingData.technicianId ? (
          <DateTimeSelect
            technicianId={bookingData.technicianId}
            technicianName={bookingData.technicianName}
            duration={bookingData.duration}
            onSelect={(date: string, time: string) => {
              updateBooking({ date, time });
              setStep("questionnaire");
            }}
            onBack={goBack}
          />
        ) : null;
      case "questionnaire":
        return (
          <QuestionnaireForm
            bookingData={bookingData}
            updateBooking={updateBooking}
            onSubmit={(result: Record<string, unknown>) => {
              setBookingResult(result);
              setStep("confirmation");
            }}
            onBack={goBack}
          />
        );
      case "confirmation":
        return <ConfirmationScreen bookingData={bookingData} bookingResult={bookingResult} onNewBooking={resetBooking} />;
    }
  };

  // The hero and confirmation screens bring their own footer / none at all.
  const showFooter = step !== "hero" && step !== "confirmation";
  const offset = reduceMotion ? 0 : 36 * direction;

  return (
    <div className="min-h-screen flex flex-col overflow-x-clip">
      <AnimatePresence mode="wait" initial={false} custom={offset}>
        <motion.div
          key={step}
          custom={offset}
          className="flex-1 flex flex-col"
          variants={{
            enter: (x: number) => ({ opacity: 0, x }),
            center: { opacity: 1, x: 0, transition: { duration: 0.38, ease: EASE_OUT } },
            exit: (x: number) => ({ opacity: 0, x: -x, transition: { duration: 0.16, ease: "easeIn" as const } }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
        >
          {renderStep()}
          {showFooter && <Footer />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
