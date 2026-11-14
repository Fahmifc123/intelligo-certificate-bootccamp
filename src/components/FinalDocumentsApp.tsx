"use client";

import { useEffect, useState, type ReactNode } from "react";
import { readErrorMessage } from "@/lib/fetch-error";
import type { ParticipantData } from "@/lib/types";

type FinalDocumentRow = {
  row_key: string;
  timestamp_raw: string;
  email: string;
  nama: string;
  kelas: string;
  judul_final_project: string;
  status_saat_ini: string;
  batch: string;
  sertif_done_raw: string;
  certificate_id: string | null;
  certificate_sent_status: "pending" | "sent" | "failed" | null;
  certificate_status: "valid" | "revoked" | null;
};

type EditForm = {
  nama: string;
  email: string;
  judul: string;
  batch: string;
  pelaksanaan: string;
  certificateType: string;
  location: string;
};

function rowToEditForm(row: FinalDocumentRow): EditForm {
  return {
    nama: row.nama,
    email: row.email,
    judul: row.kelas,
    batch: row.batch,
    pelaksanaan: "",
    certificateType: "COMPLETION",
    location: "",
  };
}

export function FinalDocumentsApp() {
  const [rows, setRows] = useState<FinalDocumentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editTarget, setEditTarget] = useState<FinalDocumentRow | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [busyRowKey, setBusyRowKey] = useState<string | null>(null);
  const [lastGenerated, setLastGenerated] = useState<Record<string, ParticipantData>>({});

  async function loadRows() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/final-documents");
      if (!res.ok) throw new Error(await readErrorMessage(res));
      const json = await res.json();
      setRows(json.rows);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(loadRows, 0);
    return () => clearTimeout(timer);
  }, []);

  async function handleSync() {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/final-documents/sync", { method: "POST" });
      if (!res.ok) throw new Error(await readErrorMessage(res));
      const json = await res.json();
      setSyncMessage(`Sync selesai: ${json.total} response di sheet, ${json.new} baru.`);
      await loadRows();
    } catch (e) {
      setSyncMessage(`Gagal sync: ${(e as Error).message}`);
    } finally {
      setSyncing(false);
    }
  }

  function openEdit(row: FinalDocumentRow) {
    setEditTarget(row);
    setEditForm(rowToEditForm(row));
  }

  async function handleGenerate() {
    if (!editTarget || !editForm) return;
    setBusyRowKey(editTarget.row_key);
    try {
      const res = await fetch(`/api/final-documents/${encodeURIComponent(editTarget.row_key)}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error(await readErrorMessage(res));
      const json = await res.json();
      setLastGenerated((m) => ({ ...m, [editTarget.row_key]: json.participant }));
      downloadBase64Pdf(json.pdfBase64, `${json.participant.nama} - Certificate.pdf`);
      setEditTarget(null);
      setEditForm(null);
      await loadRows();
    } catch (e) {
      alert(`Gagal membuat sertifikat: ${(e as Error).message}`);
    } finally {
      setBusyRowKey(null);
    }
  }

  async function handleDownloadAgain(row: FinalDocumentRow) {
    const participant = lastGenerated[row.row_key];
    if (!participant) {
      openEdit(row);
      return;
    }
    setBusyRowKey(row.row_key);
    try {
      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "certificate", data: participant }),
      });
      if (!res.ok) throw new Error(await readErrorMessage(res));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${participant.nama} - Certificate.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(`Gagal download: ${(e as Error).message}`);
    } finally {
      setBusyRowKey(null);
    }
  }

  async function handleSendEmail(row: FinalDocumentRow) {
    const participant = lastGenerated[row.row_key];
    if (!participant) {
      alert('Generate dulu sertifikatnya (klik "Edit & Generate") sebelum kirim email.');
      return;
    }
    if (!confirm(`Kirim sertifikat ke ${participant.email}?`)) return;
    setBusyRowKey(row.row_key);
    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(participant),
      });
      if (!res.ok) throw new Error(await readErrorMessage(res));
      await loadRows();
    } catch (e) {
      alert(`Gagal mengirim email: ${(e as Error).message}`);
    } finally {
      setBusyRowKey(null);
    }
  }

  function downloadBase64Pdf(base64: string, filename: string) {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const q = search.trim().toLowerCase();
  const filteredRows = rows.filter(
    (r) =>
      !q ||
      r.nama.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.batch.toLowerCase().includes(q) ||
      r.kelas.toLowerCase().includes(q) ||
      r.judul_final_project.toLowerCase().includes(q)
  );

  return (
    <div className="bg-white rounded-lg border p-5 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Dokumen Akhir (Final Project Submission)</h2>
          <p className="text-xs text-gray-500 mt-1">
            Data ditarik dari Google Form/Sheet final project. Sync untuk ambil response terbaru, lalu generate
            sertifikat per peserta (bisa diedit dulu sebelum dibuat).
          </p>
        </div>
        <button className="btn-primary" disabled={syncing} onClick={handleSync}>
          {syncing ? "Sync..." : "Sync Sekarang"}
        </button>
      </div>

      {syncMessage && <p className="text-sm text-gray-600">{syncMessage}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <input
        className="input max-w-xs"
        placeholder="Cari nama, email, batch, atau judul final project..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="py-2 pr-4">Nama</th>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Kelas (Judul Program)</th>
              <th className="py-2 pr-4">Judul Final Project</th>
              <th className="py-2 pr-4">Batch</th>
              <th className="py-2 pr-4">Status Sertifikat</th>
              <th className="py-2 pr-4">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-gray-400">
                  Memuat...
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-gray-400">
                  Belum ada data. Klik &quot;Sync Sekarang&quot; untuk ambil response dari sheet.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => (
                <tr key={row.row_key} className="border-b last:border-0 hover:bg-gray-50 align-top">
                  <td className="py-2 pr-4">{row.nama}</td>
                  <td className="py-2 pr-4">{row.email}</td>
                  <td className="py-2 pr-4 max-w-xs truncate" title={row.kelas}>
                    {row.kelas || "-"}
                  </td>
                  <td className="py-2 pr-4 max-w-xs truncate" title={row.judul_final_project}>
                    {row.judul_final_project || "-"}
                  </td>
                  <td className="py-2 pr-4">{row.batch || "-"}</td>
                  <td className="py-2 pr-4">
                    <CertStatusBadge
                      certificateId={row.certificate_id}
                      sentStatus={row.certificate_sent_status}
                      status={row.certificate_status}
                    />
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    <button
                      className="text-[#FF5400] hover:underline mr-3"
                      disabled={busyRowKey === row.row_key}
                      onClick={() => openEdit(row)}
                    >
                      Edit &amp; Generate
                    </button>
                    {row.certificate_id && (
                      <>
                        <button
                          className="text-[#023047] hover:underline mr-3"
                          disabled={busyRowKey === row.row_key}
                          onClick={() => handleDownloadAgain(row)}
                        >
                          Download
                        </button>
                        <button
                          className="text-gray-600 hover:underline"
                          disabled={busyRowKey === row.row_key}
                          onClick={() => handleSendEmail(row)}
                        >
                          Kirim Email
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editTarget && editForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-3 border-b">
              <h3 className="font-semibold text-gray-800">Edit &amp; Generate Sertifikat</h3>
              <p className="text-xs text-gray-500 mt-1">
                {editTarget.nama} &middot; {editTarget.email}
                {editTarget.certificate_id && (
                  <>
                    {" "}
                    &middot; Certificate ID: <span className="font-mono">{editTarget.certificate_id}</span>
                  </>
                )}
              </p>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3">
              <Field label="Nama Lengkap">
                <input
                  className="input"
                  value={editForm.nama}
                  onChange={(e) => setEditForm({ ...editForm, nama: e.target.value })}
                />
              </Field>
              <Field label="Email">
                <input
                  className="input"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </Field>
              <Field label="Judul Program">
                <input
                  className="input"
                  value={editForm.judul}
                  onChange={(e) => setEditForm({ ...editForm, judul: e.target.value })}
                />
              </Field>
              <Field label="Batch">
                <input
                  className="input"
                  value={editForm.batch}
                  onChange={(e) => setEditForm({ ...editForm, batch: e.target.value })}
                />
              </Field>
              <Field label='Jenis Sertifikat (tulisan "OF ...")'>
                <input
                  className="input"
                  value={editForm.certificateType}
                  onChange={(e) => setEditForm({ ...editForm, certificateType: e.target.value })}
                />
              </Field>
              <Field label="Lokasi (opsional)">
                <input
                  className="input"
                  placeholder="Jakarta"
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                />
              </Field>
              <div className="col-span-2">
                <Field label="Pelaksanaan (opsional, kosongkan jika tidak perlu)">
                  <input
                    className="input"
                    placeholder="14 Oct 2026"
                    value={editForm.pelaksanaan}
                    onChange={(e) => setEditForm({ ...editForm, pelaksanaan: e.target.value })}
                  />
                </Field>
              </div>
            </div>
            <div className="px-5 pb-5 flex justify-end gap-2">
              <button
                className="btn"
                onClick={() => {
                  setEditTarget(null);
                  setEditForm(null);
                }}
              >
                Batal
              </button>
              <button
                className="btn-primary"
                disabled={busyRowKey === editTarget.row_key}
                onClick={handleGenerate}
              >
                {busyRowKey === editTarget.row_key ? "Membuat..." : "Generate & Download PDF"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CertStatusBadge({
  certificateId,
  sentStatus,
  status,
}: {
  certificateId: string | null;
  sentStatus: "pending" | "sent" | "failed" | null;
  status: "valid" | "revoked" | null;
}) {
  if (!certificateId) {
    return <span className="text-xs text-gray-400">Belum dibuat</span>;
  }
  if (status === "revoked") {
    return <span className="text-xs font-medium text-red-600">Dicabut</span>;
  }
  if (sentStatus === "sent") {
    return <span className="text-xs font-medium text-green-600">Terkirim</span>;
  }
  if (sentStatus === "failed") {
    return <span className="text-xs font-medium text-red-600">Gagal kirim</span>;
  }
  return <span className="text-xs font-medium text-amber-600">Dibuat, belum dikirim</span>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-600 block mb-1">{label}</span>
      {children}
    </label>
  );
}
