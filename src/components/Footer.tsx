import { SITE } from "@/lib/site";

export default function Footer({ wide = false }: { wide?: boolean }) {
  return (
    <footer className="border-t border-gray-100 py-5 mt-auto bg-white">
      <div className={`${wide ? "max-w-6xl lg:px-8" : "max-w-2xl"} mx-auto px-5 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2`}>
        <p className="text-xs text-gray-400">© {new Date().getFullYear()} {SITE.name}</p>
        <a href={SITE.mapsUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-gray-600 transition-colors duration-150">
          {SITE.location} →
        </a>
      </div>
    </footer>
  );
}
