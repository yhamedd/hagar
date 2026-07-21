"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function TechnicianLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/technician/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((session) => { if (session.authenticated) router.replace("/technician/calendar"); })
      .catch(() => undefined);
  }, [router]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/technician/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error || "Login failed");
        setBusy(false);
        return;
      }
      router.replace("/technician/calendar");
    } catch {
      setError("Connection failed. Please try again.");
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f8f4f3] px-5 py-10 flex items-center justify-center">
      <section className="w-full max-w-sm bg-white px-6 sm:px-8 py-9 border border-[#eadfdb]">
        <div className="relative w-48 h-14 mx-auto mb-8">
          <Image src="/hagar-lashes-logo.png" alt="Hagar Lashes" fill sizes="192px" className="object-contain" priority />
        </div>
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-light tracking-tight">Technician calendar</h1>
          <p className="text-sm text-gray-400 mt-2">Sign in to view your appointments</p>
        </div>
        <form onSubmit={submit} className="space-y-5">
          <div>
            <label htmlFor="portal-username" className="block text-[11px] uppercase tracking-[0.16em] text-gray-500 mb-2">Username</label>
            <input id="portal-username" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required className="w-full h-12 border-b border-gray-200 focus:border-black outline-none" />
          </div>
          <div>
            <label htmlFor="portal-password" className="block text-[11px] uppercase tracking-[0.16em] text-gray-500 mb-2">Password</label>
            <input id="portal-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required className="w-full h-12 border-b border-gray-200 focus:border-black outline-none" />
          </div>
          {error && <p role="alert" className="text-sm text-red-700 bg-red-50 px-4 py-3">{error}</p>}
          <button disabled={busy} className="w-full h-12 bg-black text-white text-sm font-medium hover:bg-[#2f211d] disabled:bg-gray-200 disabled:text-gray-500 transition-colors">
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
