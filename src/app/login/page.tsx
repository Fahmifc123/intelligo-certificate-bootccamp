"use client";

import { useState, type FormEvent } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal login");
      const params = new URLSearchParams(window.location.search);
      window.location.href = params.get("next") || "/";
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] px-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border p-6 w-full max-w-sm space-y-4">
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.png" alt="Intelligo.ID" className="h-14 mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-[#023047]">Intelligo.ID Internal Tool</h1>
          <p className="text-xs text-gray-500">Masuk untuk mengakses Certificate & Invoice Generator</p>
        </div>
        <label className="block">
          <span className="text-xs font-medium text-gray-600 block mb-1">Password</span>
          <input
            type="password"
            className="input"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <div className="text-sm rounded-md px-3 py-2 bg-red-50 text-red-700">{error}</div>}
        <button type="submit" className="btn-primary w-full" disabled={busy || !password}>
          {busy ? "Masuk..." : "Masuk"}
        </button>
      </form>
    </div>
  );
}
