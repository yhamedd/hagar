import Image from "next/image";
import Link from "next/link";

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
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>

        <Link href="/" className="inline-flex items-center justify-center h-12 px-8 bg-black text-white text-sm font-medium tracking-wide hover:bg-gray-800 active:bg-gray-900 transition-colors duration-150">
          Back to Homepage
        </Link>
      </main>
    </div>
  );
}
