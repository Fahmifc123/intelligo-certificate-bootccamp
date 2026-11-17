"use client";

import { useEffect, useState } from "react";
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

type CertificateRecord = {
  id: string;
  nama: string;
  email: string;
  judul: string;
  batch: string;
  pelaksanaan: string;
  photo_url: string | null;
  send_mode: string;
  modules: ParticipantData["modules"];
  total: string | number;
  grade: string;
  certificate_type: string | null;
  location: string | null;
};

function certificateRecordToParticipant(r: CertificateRecord): ParticipantData {
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
    certificateType: r.certificate_type ?? undefined,
    location: r.location ?? undefined,
  };
}

export function FinalDocumentsApp({
  onEditInManual,
}: {
  onEditInManual: (row: {
    row_key: string;
    nama: string;
    email: string;
    kelas: string;
    batch: string;
    certificate_id: string | null;
  }) => void;
}) {
  const [rows, setRows] = useState<FinalDocumentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [busyRowKey, setBusyRowKey] = useState<string | null>(null);

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

  async function fetchParticipant(certificateId: string): Promise<ParticipantData> {
    const res = await fetch(`/api/certificates/${encodeURIComponent(certificateId)}`);
    if (!res.ok) throw new Error(await readErrorMessage(res));
    const { certificate } = (await res.json()) as { certificate: CertificateRecord };
    return certificateRecordToParticipant(certificate);
  }

  async function handleDownload(row: FinalDocumentRow) {
    if (!row.certificate_id) return;
    setBusyRowKey(row.row_key);
    try {
      const participant = await fetchParticipant(row.certificate_id);
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
    if (!row.certificate_id) return;
    setBusyRowKey(row.row_key);
    try {
      const participant = await fetchParticipant(row.certificate_id);
      if (!confirm(`Kirim sertifikat ke ${participant.email}?`)) return;
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
            Data ditarik dari Google Form/Sheet final project. Sync untuk ambil response terbaru, lalu klik Edit
            untuk membuka data peserta di form Input Manual (bisa atur skor, Kirim Sebagai, tanggal, dll persis
            seperti input manual biasa).
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
              filteredRows.map((row) => {
                const hasCertificate = row.certificate_id !== null && row.certificate_sent_status !== null;
                return (
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
                        hasCertificate={hasCertificate}
                        sentStatus={row.certificate_sent_status}
                        status={row.certificate_status}
                      />
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      <button
                        className="text-[#FF5400] hover:underline mr-3"
                        disabled={busyRowKey === row.row_key}
                        onClick={() => onEditInManual(row)}
                      >
                        Edit
                      </button>
                      {hasCertificate && (
                        <>
                          <button
                            className="text-[#023047] hover:underline mr-3"
                            disabled={busyRowKey === row.row_key}
                            onClick={() => handleDownload(row)}
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
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CertStatusBadge({
  hasCertificate,
  sentStatus,
  status,
}: {
  hasCertificate: boolean;
  sentStatus: "pending" | "sent" | "failed" | null;
  status: "valid" | "revoked" | null;
}) {
  if (!hasCertificate) {
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
