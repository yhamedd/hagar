import Image from "next/image";
import Link from "next/link";

const LINKS = [
  { href: "/", label: "Book an Appointment", description: "Start a new booking for lashes or nails" },
  { href: "/technician", label: "Technician Portal", description: "Shared calendar login for the team" },
  { href: "/admin", label: "Admin Dashboard", description: "Manage bookings, clients & schedules" },
];

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center px-5 sm:px-6 py-16 text-center">
        <div className="relative w-32 h-11 mb-10">
          <Image src="/hagar-lashes-logo.png" alt="Hagar Lashes" fill sizes="128px" className="object-contain" priority />
        </div>

        <p className="text-xs uppercase tracking-[0.2em] text-gray-400 mb-3">Error 404</p>
        <h1 className="text-4xl sm:text-5xl font-light tracking-tight mb-3">Page not found</h1>
        <p className="text-sm sm:text-base text-gray-500 max-w-sm mx-auto mb-10 font-light leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or may have moved. Here&apos;s where you probably meant to go:
        </p>

        <div className="w-full max-w-sm space-y-2 mb-10">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-center justify-between gap-3 border border-gray-200 px-5 py-4 text-left hover:border-black transition-colors duration-150"
            >
              <span>
                <span className="block text-sm font-medium group-hover:text-black">{link.label}</span>
                <span className="block text-xs text-gray-400 mt-0.5">{link.description}</span>
              </span>
              <svg className="w-4 h-4 text-gray-300 group-hover:text-black group-hover:translate-x-0.5 transition-all shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>

        <Link href="/" className="inline-flex items-center justify-center h-12 px-8 bg-black text-white text-sm font-medium tracking-wide hover:bg-gray-800 active:bg-gray-900 transition-colors duration-150">
          Back to Homepage
        </Link>
      </main>
    </div>
  );
}
