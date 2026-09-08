"use client";

import { useMemo, useState, type ReactNode } from "react";
import { DEFAULT_MODULES, computeGrade, computeTotal, type ModuleScore } from "@/lib/grading";
import { encodeParticipantClient } from "@/lib/encode-client";
import { makeCertificateId } from "@/lib/id";
import type { ParticipantData, SendMode } from "@/lib/types";

type FormState = Omit<ParticipantData, "modules" | "total" | "grade"> & {
  modules: ModuleScore[];
};

function emptyForm(): FormState {
  return {
    id: makeCertificateId(),
    nama: "",
    email: "",
    judul: "Bootcamp Data Science Offline Jakarta",
    batch: "Batch 1",
    pelaksanaan: "",
    photoUrl: "",
    sendMode: "performance",
    modules: DEFAULT_MODULES.map((m) => ({ ...m, score: 0 })),
  };
}

function toParticipant(f: FormState): ParticipantData {
  const total = computeTotal(f.modules);
  return { ...f, total, grade: computeGrade(total) };
}

type Tab = "manual" | "bulk";

export function AdminApp() {
  const [tab, setTab] = useState<Tab>("manual");
  const [form, setForm] = useState<FormState>(emptyForm());
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [bulkRows, setBulkRows] = useState<ParticipantData[]>([]);
  const [bulkSelected, setBulkSelected] = useState<Set<number>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<string>("");

  const participant = useMemo(() => toParticipant(form), [form]);
  const encoded = useMemo(() => encodeParticipantClient(participant), [participant]);

  function updateModule(index: number, patch: Partial<ModuleScore>) {
    setForm((f) => {
      const modules = f.modules.slice();
      modules[index] = { ...modules[index], ...patch };
      return { ...f, modules };
    });
  }

  async function downloadPdf(kind: "certificate" | "performance", data: ParticipantData) {
    const res = await fetch("/api/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, data }),
    });
    if (!res.ok) throw new Error(await res.text());
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      kind === "certificate" ? `${data.nama} - Certificate.pdf` : `${data.nama} - Performance Report.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function handleDownload(kind: "certificate" | "performance") {
    setBusy(kind);
    setMessage(null);
    try {
      await downloadPdf(kind, participant);
    } catch (e) {
      setMessage({ type: "err", text: `Gagal membuat PDF: ${(e as Error).message}` });
    } finally {
      setBusy(null);
    }
  }

  async function handleSend() {
    setBusy("send");
    setMessage(null);
    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(participant),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal mengirim email");
      setMessage({ type: "ok", text: `Email berhasil dikirim ke ${participant.email}` });
    } catch (e) {
      setMessage({ type: "err", text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  async function handleImport(file: File) {
    setBulkBusy(true);
    setBulkProgress("Membaca file...");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/import", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal membaca file");
      setBulkRows(json.participants);
      setBulkSelected(new Set(json.participants.map((_: unknown, i: number) => i)));
      setBulkProgress(`${json.participants.length} peserta ditemukan.`);
    } catch (e) {
      setBulkProgress(`Gagal: ${(e as Error).message}`);
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleBulkSend() {
    setBulkBusy(true);
    const rows = bulkRows.filter((_, i) => bulkSelected.has(i));
    let ok = 0;
    let fail = 0;
    for (const row of rows) {
      setBulkProgress(`Mengirim ke ${row.nama} (${row.email})...`);
      try {
        const res = await fetch("/api/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(row.id ? row : { ...row, id: makeCertificateId() }),
        });
        if (!res.ok) throw new Error();
        ok++;
      } catch {
        fail++;
      }
    }
    setBulkProgress(`Selesai. Berhasil: ${ok}, gagal: ${fail}.`);
    setBulkBusy(false);
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <header className="bg-[#023047] text-white px-6 py-4 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo.png" alt="Intelligo.ID" className="h-9 w-9 object-contain bg-white rounded-full p-1" />
        <div>
          <h1 className="text-lg font-semibold">Certificate & Performance Report Generator</h1>
          <p className="text-xs text-white/70">Intelligo.ID internal tool</p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab("manual")}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              tab === "manual" ? "bg-[#FF5400] text-white" : "bg-white text-gray-600 border"
            }`}
          >
            Input Manual
          </button>
          <button
            onClick={() => setTab("bulk")}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              tab === "bulk" ? "bg-[#FF5400] text-white" : "bg-white text-gray-600 border"
            }`}
          >
            Import dari Excel
          </button>
        </div>

        {tab === "manual" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nama Lengkap">
                  <input className="input" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} />
                </Field>
                <Field label="Email">
                  <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </Field>
                <Field label="Judul Program">
                  <input className="input" value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} />
                </Field>
                <Field label="Batch">
                  <input className="input" value={form.batch} onChange={(e) => setForm({ ...form, batch: e.target.value })} />
                </Field>
                <Field label="Pelaksanaan">
                  <input
                    className="input"
                    placeholder="June to July 2026"
                    value={form.pelaksanaan}
                    onChange={(e) => setForm({ ...form, pelaksanaan: e.target.value })}
                  />
                </Field>
                <Field label="Certificate ID">
                  <input className="input" value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} />
                </Field>
                <Field label="Photo URL (untuk performance report)">
                  <input
                    className="input"
                    value={form.photoUrl}
                    onChange={(e) => setForm({ ...form, photoUrl: e.target.value })}
                  />
                </Field>
                <Field label="Kirim Sebagai">
                  <select
                    className="input"
                    value={form.sendMode}
                    onChange={(e) => setForm({ ...form, sendMode: e.target.value as SendMode })}
                  >
                    <option value="certificate">Certificate saja</option>
                    <option value="performance">Certificate + Performance Report</option>
                  </select>
                </Field>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Skor Modul</h3>
                <div className="space-y-2">
                  {form.modules.map((m, i) => (
                    <div key={m.module} className="flex items-center gap-2">
                      <input
                        className="input flex-1"
                        value={m.module}
                        onChange={(e) => updateModule(i, { module: e.target.value })}
                      />
                      <input
                        type="number"
                        className="input w-20"
                        value={m.weight}
                        step={0.05}
                        onChange={(e) => updateModule(i, { weight: Number(e.target.value) })}
                        title="Bobot (0-1)"
                      />
                      <input
                        type="number"
                        className="input w-20"
                        value={m.score}
                        onChange={(e) => updateModule(i, { score: Number(e.target.value) })}
                        title="Skor (0-100)"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Total: <strong>{participant.total.toFixed(2)}</strong> &middot; Grade:{" "}
                  <strong>{participant.grade}</strong>
                </p>
              </div>

              {message && (
                <div
                  className={`text-sm rounded-md px-3 py-2 ${
                    message.type === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                  }`}
                >
                  {message.text}
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                <button className="btn" disabled={busy !== null} onClick={() => handleDownload("certificate")}>
                  {busy === "certificate" ? "Membuat..." : "Download Certificate PDF"}
                </button>
                {form.sendMode === "performance" && (
                  <button className="btn" disabled={busy !== null} onClick={() => handleDownload("performance")}>
                    {busy === "performance" ? "Membuat..." : "Download Performance PDF"}
                  </button>
                )}
                <button className="btn-primary" disabled={busy !== null || !form.email} onClick={handleSend}>
                  {busy === "send" ? "Mengirim..." : "Kirim Email"}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <PreviewCard title="Certificate" src={`/print/certificate?d=${encoded}`} aspect={10 / 7.5} />
              {form.sendMode === "performance" && (
                <PreviewCard title="Performance Report" src={`/print/performance?d=${encoded}`} aspect={8.27 / 11.69} />
              )}
            </div>
          </div>
        )}

        {tab === "bulk" && (
          <div className="bg-white rounded-lg border p-5 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Upload file Excel (format sama seperti Google Sheet sumber data)
              </label>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImport(f);
                }}
              />
              {bulkProgress && <p className="text-sm text-gray-500 mt-2">{bulkProgress}</p>}
            </div>

            {bulkRows.length > 0 && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b">
                        <th className="py-2 pr-2">
                          <input
                            type="checkbox"
                            checked={bulkSelected.size === bulkRows.length}
                            onChange={(e) =>
                              setBulkSelected(
                                e.target.checked ? new Set(bulkRows.map((_, i) => i)) : new Set()
                              )
                            }
                          />
                        </th>
                        <th className="py-2 pr-4">Nama</th>
                        <th className="py-2 pr-4">Email</th>
                        <th className="py-2 pr-4">Batch</th>
                        <th className="py-2 pr-4">Total</th>
                        <th className="py-2 pr-4">Grade</th>
                        <th className="py-2 pr-4">Mode</th>
                        <th className="py-2 pr-4">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkRows.map((row, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-2 pr-2">
                            <input
                              type="checkbox"
                              checked={bulkSelected.has(i)}
                              onChange={(e) => {
                                const next = new Set(bulkSelected);
                                if (e.target.checked) next.add(i);
                                else next.delete(i);
                                setBulkSelected(next);
                              }}
                            />
                          </td>
                          <td className="py-2 pr-4">{row.nama}</td>
                          <td className="py-2 pr-4">{row.email}</td>
                          <td className="py-2 pr-4">{row.batch}</td>
                          <td className="py-2 pr-4">{row.total.toFixed(2)}</td>
                          <td className="py-2 pr-4">{row.grade}</td>
                          <td className="py-2 pr-4">{row.sendMode}</td>
                          <td className="py-2 pr-4">
                            <button
                              className="text-[#FF5400] hover:underline"
                              onClick={() => downloadPdf("certificate", row)}
                            >
                              PDF
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button className="btn-primary" disabled={bulkBusy} onClick={handleBulkSend}>
                  {bulkBusy ? "Mengirim..." : `Kirim Email ke ${bulkSelected.size} Peserta Terpilih`}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-600 block mb-1">{label}</span>
      {children}
    </label>
  );
}

function PreviewCard({ title, src, aspect }: { title: string; src: string; aspect: number }) {
  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="px-4 py-2 border-b text-sm font-medium text-gray-700">{title}</div>
      <div className="bg-gray-100" style={{ aspectRatio: aspect }}>
        <iframe src={src} className="w-full h-full border-0" />
      </div>
    </div>
  );
}
