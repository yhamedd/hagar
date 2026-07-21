import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hagar Lashes & Nails — Book Your Appointment",
  description:
    "Premium lash extensions and nail art in Cairo. Book your appointment with our expert technicians online.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="bg-white text-black antialiased">{children}</body>
    </html>
  );
}
