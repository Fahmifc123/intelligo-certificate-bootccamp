"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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

type Tab = "manual" | "bulk" | "history";

type CertificateRecord = {
  id: string;
  nama: string;
  email: string;
  judul: string;
  batch: string;
  pelaksanaan: string;
  photo_url: string | null;
  send_mode: string;
  total: string | number;
  grade: string;
  modules: ModuleScore[];
  created_at: string;
  sent_at: string | null;
  sent_status: "pending" | "sent" | "failed";
  sent_error: string | null;
};

function recordToParticipant(r: CertificateRecord): ParticipantData {
  return {
    id: r.id,
    nama: r.nama,
    email: r.email,
    judul: r.judul,
    batch: r.batch,
    pelaksanaan: r.pelaksanaan,
    photoUrl: r.photo_url ?? undefined,
    sendMode: r.send_mode === "performance" ? "performance" : "certificate",
    modules: r.modules,
    total: Number(r.total),
    grade: r.grade,
  };
}

export function AdminApp() {
  const [tab, setTab] = useState<Tab>("manual");
  const [form, setForm] = useState<FormState>(emptyForm());
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [bulkRows, setBulkRows] = useState<ParticipantData[]>([]);
  const [bulkSelected, setBulkSelected] = useState<Set<number>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<string>("");
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [bulkSearch, setBulkSearch] = useState("");
  const [sendStatus, setSendStatus] = useState<
    Record<number, { state: "sending" | "ok" | "err"; message?: string }>
  >({});

  const filteredBulkRows = useMemo(() => {
    const q = bulkSearch.trim().toLowerCase();
    return bulkRows
      .map((row, i) => ({ row, i }))
      .filter(
        ({ row }) =>
          !q ||
          row.nama.toLowerCase().includes(q) ||
          row.email.toLowerCase().includes(q) ||
          row.batch.toLowerCase().includes(q)
      );
  }, [bulkRows, bulkSearch]);

  const [historyRows, setHistoryRows] = useState<CertificateRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyConfigured, setHistoryConfigured] = useState(true);
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<"all" | "sent" | "failed" | "pending">("all");
  const [historyPreview, setHistoryPreview] = useState<CertificateRecord | null>(null);

  const participant = useMemo(() => toParticipant(form), [form]);
  const encoded = useMemo(() => encodeParticipantClient(participant), [participant]);

  function updateModule(index: number, patch: Partial<ModuleScore>) {
    setForm((f) => {
      const modules = f.modules.slice();
      modules[index] = { ...modules[index], ...patch };
      return { ...f, modules };
    });
  }

  function addModule() {
    setForm((f) => ({ ...f, modules: [...f.modules, { module: "", weight: 0, score: 0 }] }));
  }

  function removeModule(index: number) {
    setForm((f) => ({ ...f, modules: f.modules.filter((_, i) => i !== index) }));
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
      setSendStatus({});
      setBulkSearch("");
      setBulkProgress(`${json.participants.length} peserta ditemukan.`);
    } catch (e) {
      setBulkProgress(`Gagal: ${(e as Error).message}`);
    } finally {
      setBulkBusy(false);
    }
  }

  async function sendOne(index: number) {
    const row = bulkRows[index];
    setSendStatus((s) => ({ ...s, [index]: { state: "sending" } }));
    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(row.id ? row : { ...row, id: makeCertificateId() }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Gagal mengirim");
      setSendStatus((s) => ({ ...s, [index]: { state: "ok" } }));
      return true;
    } catch (e) {
      setSendStatus((s) => ({ ...s, [index]: { state: "err", message: (e as Error).message } }));
      return false;
    }
  }

  async function handleBulkSend() {
    setBulkBusy(true);
    const indices = Array.from(bulkSelected).sort((a, b) => a - b);
    let ok = 0;
    let fail = 0;
    for (const index of indices) {
      const row = bulkRows[index];
      setBulkProgress(`Mengirim ke ${row.nama} (${row.email})...`);
      const success = await sendOne(index);
      if (success) ok++;
      else fail++;
    }
    setBulkProgress(`Selesai. Berhasil: ${ok}, gagal: ${fail}.`);
    setBulkBusy(false);
  }

  async function loadHistory() {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await fetch("/api/certificates");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memuat riwayat");
      setHistoryConfigured(json.configured);
      setHistoryRows(json.certificates);
    } catch (e) {
      setHistoryError((e as Error).message);
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    if (tab === "history") loadHistory();
  }, [tab]);

  async function handleResend(record: CertificateRecord) {
    const p = recordToParticipant(record);
    setHistoryRows((rows) =>
      rows.map((r) => (r.id === record.id ? { ...r, sent_status: "pending" as const } : r))
    );
    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p),
      });
      if (!res.ok) throw new Error();
    } catch {
      // ignore, loadHistory() below will reflect the true persisted status
    }
    await loadHistory();
  }

  const filteredHistory = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    return historyRows.filter((r) => {
      if (historyStatusFilter !== "all" && r.sent_status !== historyStatusFilter) return false;
      if (!q) return true;
      return (
        r.nama.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.batch.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
      );
    });
  }, [historyRows, historySearch, historyStatusFilter]);

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
          <button
            onClick={() => setTab("history")}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              tab === "history" ? "bg-[#FF5400] text-white" : "bg-white text-gray-600 border"
            }`}
          >
            Riwayat Sertifikat
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
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700">Skor Modul</h3>
                  <button type="button" className="text-xs text-[#FF5400] hover:underline" onClick={addModule}>
                    + Tambah Modul
                  </button>
                </div>
                <div className="grid grid-cols-[1fr_5rem_5rem_1.5rem] gap-2 mb-1 text-xs text-gray-400">
                  <span>Nama Modul</span>
                  <span>Bobot</span>
                  <span>Skor</span>
                  <span></span>
                </div>
                <div className="space-y-2">
                  {form.modules.map((m, i) => (
                    <div key={i} className="grid grid-cols-[1fr_5rem_5rem_1.5rem] gap-2 items-center">
                      <input
                        className="input"
                        placeholder="Nama modul"
                        value={m.module}
                        onChange={(e) => updateModule(i, { module: e.target.value })}
                      />
                      <input
                        type="number"
                        className="input"
                        value={m.weight}
                        step={0.05}
                        onChange={(e) => updateModule(i, { weight: Number(e.target.value) })}
                        title="Bobot (0-1)"
                      />
                      <input
                        type="number"
                        className="input"
                        value={m.score}
                        onChange={(e) => updateModule(i, { score: Number(e.target.value) })}
                        title="Skor (0-100)"
                      />
                      <button
                        type="button"
                        className="text-gray-400 hover:text-red-600 text-lg leading-none"
                        onClick={() => removeModule(i)}
                        title="Hapus modul ini"
                        disabled={form.modules.length <= 1}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Total: <strong>{participant.total.toFixed(2)}</strong> &middot; Grade:{" "}
                  <strong>{participant.grade}</strong>
                  {Math.abs(form.modules.reduce((s, m) => s + m.weight, 0) - 1) > 0.001 && (
                    <span className="text-amber-600">
                      {" "}
                      &middot; total bobot: {form.modules.reduce((s, m) => s + m.weight, 0).toFixed(2)} (idealnya 1.00)
                    </span>
                  )}
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
              <PreviewCard title="Certificate" src={`/print/certificate?d=${encoded}`} kind="certificate" />
              {form.sendMode === "performance" && (
                <PreviewCard title="Performance Report" src={`/print/performance?d=${encoded}`} kind="performance" />
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
              <label className="flex flex-col items-center justify-center gap-1 border-2 border-dashed border-gray-300 rounded-lg py-8 cursor-pointer hover:border-[#FF5400] hover:bg-orange-50/40 transition-colors">
                <span className="text-sm font-medium text-gray-700">
                  Klik untuk pilih file, atau drag & drop ke sini
                </span>
                <span className="text-xs text-gray-400">.xlsx, .xls, atau .csv</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImport(f);
                  }}
                />
              </label>
              {bulkProgress && <p className="text-sm text-gray-500 mt-2">{bulkProgress}</p>}
            </div>

            {bulkRows.length > 0 && (
              <>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <input
                    className="input max-w-xs"
                    placeholder="Cari nama, email, atau batch..."
                    value={bulkSearch}
                    onChange={(e) => setBulkSearch(e.target.value)}
                  />
                  <span className="text-xs text-gray-500">
                    {bulkSelected.size} dari {bulkRows.length} peserta dipilih
                    {bulkSearch && ` · menampilkan ${filteredBulkRows.length} hasil pencarian`}
                  </span>
                </div>

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
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 pr-4">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBulkRows.map(({ row, i }) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
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
                            <StatusBadge status={sendStatus[i]} />
                          </td>
                          <td className="py-2 pr-4 whitespace-nowrap">
                            <button
                              className="text-[#023047] hover:underline mr-3"
                              onClick={() => setPreviewIndex(i)}
                            >
                              Preview
                            </button>
                            <button
                              className="text-[#FF5400] hover:underline"
                              onClick={() => downloadPdf("certificate", row)}
                            >
                              PDF
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredBulkRows.length === 0 && (
                        <tr>
                          <td colSpan={9} className="py-6 text-center text-gray-400">
                            Tidak ada peserta yang cocok dengan pencarian.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <button className="btn-primary" disabled={bulkBusy || bulkSelected.size === 0} onClick={handleBulkSend}>
                  {bulkBusy ? "Mengirim..." : `Kirim Email ke ${bulkSelected.size} Peserta Terpilih`}
                </button>
              </>
            )}
          </div>
        )}

        {tab === "history" && (
          <div className="bg-white rounded-lg border p-5 space-y-4">
            {!historyConfigured && (
              <div className="text-sm rounded-md px-3 py-2 bg-amber-50 text-amber-800">
                Database belum terhubung (env <code>DATABASE_URL</code> belum diset), jadi riwayat
                pengiriman sertifikat belum bisa disimpan/ditampilkan. Setelah database disambungkan,
                riwayat akan otomatis tercatat di sini.
              </div>
            )}
            {historyError && (
              <div className="text-sm rounded-md px-3 py-2 bg-red-50 text-red-700">{historyError}</div>
            )}

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  className="input max-w-xs"
                  placeholder="Cari nama, email, batch, atau ID..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                />
                <select
                  className="input w-40"
                  value={historyStatusFilter}
                  onChange={(e) => setHistoryStatusFilter(e.target.value as typeof historyStatusFilter)}
                >
                  <option value="all">Semua status</option>
                  <option value="sent">Terkirim</option>
                  <option value="failed">Gagal</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <button className="btn" onClick={loadHistory} disabled={historyLoading}>
                {historyLoading ? "Memuat..." : "Refresh"}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-2 pr-4">Certificate ID</th>
                    <th className="py-2 pr-4">Nama</th>
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">Batch</th>
                    <th className="py-2 pr-4">Grade</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Tanggal Kirim</th>
                    <th className="py-2 pr-4">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((r) => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-2 pr-4 font-mono text-xs">{r.id}</td>
                      <td className="py-2 pr-4">{r.nama}</td>
                      <td className="py-2 pr-4">{r.email}</td>
                      <td className="py-2 pr-4">{r.batch}</td>
                      <td className="py-2 pr-4">{r.grade}</td>
                      <td className="py-2 pr-4">
                        <HistoryStatusBadge status={r.sent_status} error={r.sent_error} />
                      </td>
                      <td className="py-2 pr-4 text-xs text-gray-500">
                        {r.sent_at ? new Date(r.sent_at).toLocaleString("id-ID") : "—"}
                      </td>
                      <td className="py-2 pr-4 whitespace-nowrap">
                        <button
                          className="text-[#023047] hover:underline mr-3"
                          onClick={() => setHistoryPreview(r)}
                        >
                          Preview
                        </button>
                        <button className="text-[#FF5400] hover:underline" onClick={() => handleResend(r)}>
                          Kirim Ulang
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredHistory.length === 0 && !historyLoading && (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-gray-400">
                        Belum ada riwayat sertifikat.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {historyPreview && (
        <PreviewModal
          row={recordToParticipant(historyPreview)}
          onClose={() => setHistoryPreview(null)}
          onSend={async () => {
            await handleResend(historyPreview);
            setHistoryPreview(null);
          }}
        />
      )}

      {previewIndex !== null && bulkRows[previewIndex] && (
        <PreviewModal
          row={bulkRows[previewIndex]}
          onClose={() => setPreviewIndex(null)}
          onSend={async () => {
            const row = bulkRows[previewIndex];
            setBulkProgress(`Mengirim ke ${row.nama} (${row.email})...`);
            const success = await sendOne(previewIndex);
            setBulkProgress(
              success ? `Email berhasil dikirim ke ${row.nama}.` : `Gagal mengirim ke ${row.nama}.`
            );
            setPreviewIndex(null);
          }}
        />
      )}
    </div>
  );
}

function PreviewModal({
  row,
  onClose,
  onSend,
}: {
  row: ParticipantData;
  onClose: () => void;
  onSend: () => void;
}) {
  const encoded = useMemo(() => encodeParticipantClient(row), [row]);
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-3 border-b sticky top-0 bg-white">
          <div>
            <h3 className="font-semibold text-gray-800">{row.nama}</h3>
            <p className="text-xs text-gray-500">
              {row.email} &middot; Total {row.total.toFixed(2)} &middot; {row.grade}
            </p>
          </div>
          <button className="btn" onClick={onClose}>
            Tutup
          </button>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <PreviewCard title="Certificate" src={`/print/certificate?d=${encoded}`} kind="certificate" />
          {row.sendMode === "performance" && (
            <PreviewCard title="Performance Report" src={`/print/performance?d=${encoded}`} kind="performance" />
          )}
        </div>
        <div className="px-5 pb-5 flex justify-end">
          <button className="btn-primary" onClick={onSend} disabled={!row.email}>
            Kirim Email ke Peserta Ini
          </button>
        </div>
      </div>
    </div>
  );
}

function HistoryStatusBadge({
  status,
  error,
}: {
  status: "pending" | "sent" | "failed";
  error?: string | null;
}) {
  if (status === "sent") {
    return <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">Terkirim</span>;
  }
  if (status === "failed") {
    return (
      <span className="text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full" title={error ?? undefined}>
        Gagal
      </span>
    );
  }
  return <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">Pending</span>;
}

function StatusBadge({ status }: { status?: { state: "sending" | "ok" | "err"; message?: string } }) {
  if (!status) return <span className="text-gray-300 text-xs">—</span>;
  if (status.state === "sending") {
    return <span className="text-xs font-medium text-amber-600">Mengirim...</span>;
  }
  if (status.state === "ok") {
    return <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">Terkirim</span>;
  }
  return (
    <span
      className="text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full"
      title={status.message}
    >
      Gagal
    </span>
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

const CONTENT_PX: Record<"certificate" | "performance", { w: number; h: number }> = {
  certificate: { w: 960, h: 720 }, // 10in x 7.5in @96dpi
  performance: { w: 794, h: 1122 }, // 8.27in x 11.69in @96dpi
};

function PreviewCard({ title, src, kind }: { title: string; src: string; kind: "certificate" | "performance" }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const { w: contentW, h: contentH } = CONTENT_PX[kind];

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / contentW);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [contentW]);

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="px-4 py-2 border-b text-sm font-medium text-gray-700">{title}</div>
      <div
        ref={containerRef}
        className="bg-gray-100 overflow-hidden relative"
        style={{ height: contentH * scale }}
      >
        <iframe
          src={src}
          className="border-0"
          style={{
            width: contentW,
            height: contentH,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        />
      </div>
    </div>
  );
}
