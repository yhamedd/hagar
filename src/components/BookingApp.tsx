"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import HeroSection from "./HeroSection";

const StepFallback = () => <div className="min-h-screen bg-white" aria-busy="true" />;
const CategorySelect = dynamic(() => import("./CategorySelect"), { loading: StepFallback });
const TechnicianSelect = dynamic(() => import("./TechnicianSelect"), { loading: StepFallback });
const ServiceSelect = dynamic(() => import("./ServiceSelect"), { loading: StepFallback });
const DateTimeSelect = dynamic(() => import("./DateTimeSelect"), { loading: StepFallback });
const QuestionnaireForm = dynamic(() => import("./QuestionnaireForm"), { loading: StepFallback });
const ConfirmationScreen = dynamic(() => import("./ConfirmationScreen"), { loading: StepFallback });
const Footer = dynamic(() => import("./Footer"));

type BookingStep =
  | "hero"
  | "category"
  | "technician"
  | "service"
  | "datetime"
  | "questionnaire"
  | "confirmation";

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
  const [step, setStep] = useState<BookingStep>("hero");
  const [bookingData, setBookingData] = useState<BookingData>(initialBookingData);
  const [bookingResult, setBookingResult] = useState<Record<string, unknown> | null>(null);

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
    const steps: BookingStep[] = [
      "hero",
      "category",
      "technician",
      "service",
      "datetime",
      "questionnaire",
    ];
    const idx = steps.indexOf(step);
    if (idx > 0) setStep(steps[idx - 1]);
  };

  const resetBooking = () => {
    setBookingData(initialBookingData);
    setBookingResult(null);
    setStep("hero");
  };

  const showFooter = step !== "hero" && step !== "confirmation";

  return (
    <div className="min-h-screen flex flex-col">
        {step === "hero" && (
          <div className="booking-step-enter">
            <HeroSection onBook={() => setStep("category")} />
          </div>
        )}

        {step === "category" && (
          <div className="booking-step-enter flex-1 flex flex-col">
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
              onBack={() => setStep("hero")}
            />
            {showFooter && <Footer />}
          </div>
        )}

        {step === "technician" && (
          <div className="booking-step-enter flex-1 flex flex-col">
            <TechnicianSelect
              category={bookingData.category}
              onSelect={(id: number, name: string) => {
                updateBooking({ technicianId: id, technicianName: name });
                setStep("service");
              }}
              onBack={goBack}
            />
            {showFooter && <Footer />}
          </div>
        )}

        {step === "service" && (
          <div className="booking-step-enter flex-1 flex flex-col">
            <ServiceSelect bookingData={bookingData} updateBooking={updateBooking} onContinue={() => setStep("datetime")} onBack={goBack} />
            {showFooter && <Footer />}
          </div>
        )}

        {step === "datetime" && bookingData.technicianId && (
          <div className="booking-step-enter flex-1 flex flex-col">
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
            {showFooter && <Footer />}
          </div>
        )}

        {step === "questionnaire" && (
          <div className="booking-step-enter flex-1 flex flex-col">
            <QuestionnaireForm
              bookingData={bookingData}
              updateBooking={updateBooking}
              onSubmit={async (result: Record<string, unknown>) => {
                setBookingResult(result);
                setStep("confirmation");
              }}
              onBack={goBack}
            />
            {showFooter && <Footer />}
          </div>
        )}

        {step === "confirmation" && (
          <div className="booking-step-enter flex-1 flex flex-col">
            <ConfirmationScreen
              bookingData={bookingData}
              bookingResult={bookingResult}
              onNewBooking={resetBooking}
            />
          </div>
        )}
    </div>
  );
}
