"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { encodeParticipantClient } from "@/lib/encode-client";
import { readErrorMessage } from "@/lib/fetch-error";
import { formatIndonesianDate, makeInvoiceNo, nextAvailableSeq, todayInputValue } from "@/lib/invoice-number";
import { PreviewCard } from "./PreviewCard";
import type { InvoiceData, InvoiceItem, InvoiceTermin } from "@/lib/types";
import { invoiceTotal } from "@/lib/types";

function emptyInvoice(): InvoiceData {
  const dateInput = todayInputValue();
  return {
    invoiceNo: makeInvoiceNo("CT", dateInput, 1),
    date: formatIndonesianDate(dateInput),
    paymentMethod: "Transfer Bank BCA",
    clientName: "",
    clientPIC: "",
    clientAddress: "",
    clientEmail: "",
    items: [{ description: "", qty: 1, unitPrice: 0 }],
    totalLabel: "Total Tagihan",
    termins: [],
    bankName: "Bank BCA",
    accountNumber: "2820297663",
    accountName: "Muhammad Fahmi",
    notes: ["Mohon konfirmasi pembayaran ke tim Intelligo ID."],
  };
}

function formatRupiah(n: number): string {
  return "Rp" + Math.round(n || 0).toLocaleString("id-ID");
}

type InvoiceRecord = {
  invoice_no: string;
  client_name: string;
  client_email: string | null;
  total: string | number;
  data: InvoiceData;
  created_at: string;
  sent_at: string | null;
  sent_status: "pending" | "sent" | "failed";
  sent_error: string | null;
};

type Tab = "form" | "history";

export function InvoiceApp() {
  const [tab, setTab] = useState<Tab>("form");
  const [invoice, setInvoice] = useState<InvoiceData>(emptyInvoice());
  const [dateInput, setDateInput] = useState(todayInputValue());
  const [categoryCode, setCategoryCode] = useState("CT");
  const [seq, setSeq] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [historyRows, setHistoryRows] = useState<InvoiceRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyConfigured, setHistoryConfigured] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyPreview, setHistoryPreview] = useState<InvoiceData | null>(null);
  const [knownInvoiceNos, setKnownInvoiceNos] = useState<string[]>([]);

  const total = useMemo(() => invoiceTotal(invoice), [invoice]);
  const encoded = useMemo(() => encodeParticipantClient(invoice), [invoice]);
  const isDuplicateNo = knownInvoiceNos.includes(invoice.invoiceNo);

  // On first load, pull existing invoice numbers so the suggested number
  // doesn't collide with one that was already sent (even after a refresh).
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/invoices");
        const json = await res.json();
        if (!res.ok || !json.configured) return;
        const nos: string[] = json.invoices.map((r: InvoiceRecord) => r.invoice_no);
        setKnownInvoiceNos(nos);
        const next = nextAvailableSeq(nos, categoryCode, dateInput);
        setSeq(next);
        setInvoice((inv) => ({ ...inv, invoiceNo: makeInvoiceNo(categoryCode, dateInput, next) }));
      } catch {
        // ignore — fall back to the default seq of 1
      }
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function regenerateNumber(nextSeq = seq) {
    setInvoice((inv) => ({
      ...inv,
      invoiceNo: makeInvoiceNo(categoryCode, dateInput, nextSeq),
      date: formatIndonesianDate(dateInput),
    }));
  }

  function updateItem(i: number, patch: Partial<InvoiceItem>) {
    setInvoice((inv) => {
      const items = inv.items.slice();
      items[i] = { ...items[i], ...patch };
      return { ...inv, items };
    });
  }
  function addItem() {
    setInvoice((inv) => ({ ...inv, items: [...inv.items, { description: "", qty: 1, unitPrice: 0 }] }));
  }
  function removeItem(i: number) {
    setInvoice((inv) => ({ ...inv, items: inv.items.filter((_, idx) => idx !== i) }));
  }

  function updateTermin(i: number, patch: Partial<InvoiceTermin>) {
    setInvoice((inv) => {
      const termins = inv.termins.slice();
      termins[i] = { ...termins[i], ...patch };
      return { ...inv, termins };
    });
  }
  function addTermin() {
    setInvoice((inv) => ({
      ...inv,
      termins: [...inv.termins, { termin: String(inv.termins.length + 1), keterangan: "", tanggal: "", jumlah: 0 }],
    }));
  }
  function removeTermin(i: number) {
    setInvoice((inv) => ({ ...inv, termins: inv.termins.filter((_, idx) => idx !== i) }));
  }

  function updateNote(i: number, value: string) {
    setInvoice((inv) => {
      const notes = inv.notes.slice();
      notes[i] = value;
      return { ...inv, notes };
    });
  }
  function addNote() {
    setInvoice((inv) => ({ ...inv, notes: [...inv.notes, ""] }));
  }
  function removeNote(i: number) {
    setInvoice((inv) => ({ ...inv, notes: inv.notes.filter((_, idx) => idx !== i) }));
  }

  async function handleDownload() {
    setBusy("download");
    setMessage(null);
    try {
      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "invoice", data: invoice }),
      });
      if (!res.ok) throw new Error(await readErrorMessage(res));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoice ${invoice.invoiceNo.replace(/\//g, "-")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setKnownInvoiceNos((nos) => [...nos, invoice.invoiceNo]);
      setSeq((s) => {
        const next = s + 1;
        setInvoice((inv) => ({ ...inv, invoiceNo: makeInvoiceNo(categoryCode, dateInput, next) }));
        return next;
      });
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
      const res = await fetch("/api/invoice/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invoice),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal mengirim email");
      setMessage({ type: "ok", text: `Invoice berhasil dikirim ke ${invoice.clientEmail}` });
      setKnownInvoiceNos((nos) => [...nos, invoice.invoiceNo]);
      setSeq((s) => {
        const next = s + 1;
        setInvoice((inv) => ({
          ...inv,
          invoiceNo: makeInvoiceNo(categoryCode, dateInput, next),
          clientName: "",
          clientPIC: "",
          clientAddress: "",
          clientEmail: "",
          items: [{ description: "", qty: 1, unitPrice: 0 }],
          termins: [],
        }));
        return next;
      });
    } catch (e) {
      setMessage({ type: "err", text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  async function loadHistory() {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await fetch("/api/invoices");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memuat riwayat");
      setHistoryConfigured(json.configured);
      setHistoryRows(json.invoices);
    } catch (e) {
      setHistoryError((e as Error).message);
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    if (tab !== "history") return;
    const timer = setTimeout(() => loadHistory(), 0);
    return () => clearTimeout(timer);
  }, [tab]);

  return (
    <div>
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("form")}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            tab === "form" ? "bg-[#FF5400] text-white" : "bg-white text-gray-600 border"
          }`}
        >
          Buat Invoice
        </button>
        <button
          onClick={() => setTab("history")}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            tab === "history" ? "bg-[#FF5400] text-white" : "bg-white text-gray-600 border"
          }`}
        >
          Riwayat Invoice
        </button>
      </div>

      {tab === "form" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tanggal Invoice">
                <input
                  type="date"
                  className="input"
                  value={dateInput}
                  onChange={(e) => {
                    setDateInput(e.target.value);
                    setInvoice((inv) => ({ ...inv, date: formatIndonesianDate(e.target.value) }));
                  }}
                />
              </Field>
              <Field label="Kode Kategori">
                <input
                  className="input"
                  value={categoryCode}
                  onChange={(e) => setCategoryCode(e.target.value)}
                  placeholder="CT"
                />
              </Field>
              <Field label="No. Invoice">
                <div className="flex gap-2">
                  <input
                    className={`input ${isDuplicateNo ? "border-red-400" : ""}`}
                    value={invoice.invoiceNo}
                    onChange={(e) => setInvoice({ ...invoice, invoiceNo: e.target.value })}
                  />
                  <button type="button" className="btn shrink-0" onClick={() => regenerateNumber()}>
                    Generate
                  </button>
                </div>
                {isDuplicateNo && (
                  <p className="text-xs text-red-600 mt-1">
                    Nomor ini sudah pernah dipakai (download/kirim sebelumnya) — ganti atau klik Generate.
                  </p>
                )}
              </Field>
              <Field label="Nomor Urut">
                <input
                  type="number"
                  className="input"
                  value={seq}
                  onChange={(e) => setSeq(Number(e.target.value))}
                />
              </Field>
              <Field label="Metode Pembayaran">
                <input
                  className="input"
                  value={invoice.paymentMethod}
                  onChange={(e) => setInvoice({ ...invoice, paymentMethod: e.target.value })}
                />
              </Field>
              <Field label="Label Total (mis. Total Tagihan Termin 2)">
                <input
                  className="input"
                  value={invoice.totalLabel}
                  onChange={(e) => setInvoice({ ...invoice, totalLabel: e.target.value })}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Nama Klien / Perusahaan">
                <input
                  className="input"
                  value={invoice.clientName}
                  onChange={(e) => setInvoice({ ...invoice, clientName: e.target.value })}
                />
              </Field>
              <Field label="Email Klien">
                <input
                  className="input"
                  value={invoice.clientEmail}
                  onChange={(e) => setInvoice({ ...invoice, clientEmail: e.target.value })}
                />
              </Field>
              <Field label="PIC / Jabatan (U.p. ...)">
                <input
                  className="input"
                  placeholder="U.p. Nama — Jabatan"
                  value={invoice.clientPIC}
                  onChange={(e) => setInvoice({ ...invoice, clientPIC: e.target.value })}
                />
              </Field>
              <Field label="Alamat Klien">
                <textarea
                  className="input"
                  rows={2}
                  value={invoice.clientAddress}
                  onChange={(e) => setInvoice({ ...invoice, clientAddress: e.target.value })}
                />
              </Field>
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700">Rincian Pembayaran (Item)</h3>
                <button type="button" className="text-xs text-[#FF5400] hover:underline" onClick={addItem}>
                  + Tambah Item
                </button>
              </div>
              <div className="space-y-2">
                {invoice.items.map((it, i) => (
                  <div key={i} className="border rounded-md p-2 space-y-2">
                    <textarea
                      className="input"
                      rows={2}
                      placeholder="Deskripsi item"
                      value={it.description}
                      onChange={(e) => updateItem(i, { description: e.target.value })}
                    />
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        className="input w-20"
                        title="QTY"
                        value={it.qty}
                        onChange={(e) => updateItem(i, { qty: Number(e.target.value) })}
                      />
                      <input
                        type="number"
                        className="input"
                        title="Harga Satuan"
                        value={it.unitPrice}
                        onChange={(e) => updateItem(i, { unitPrice: Number(e.target.value) })}
                      />
                      <button
                        type="button"
                        className="text-gray-400 hover:text-red-600 text-lg leading-none shrink-0"
                        onClick={() => removeItem(i)}
                        disabled={invoice.items.length <= 1}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Total: <strong>{formatRupiah(total)}</strong>
              </p>
            </div>

            {/* Termins */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700">Rincian Termin Pembayaran (opsional)</h3>
                <button type="button" className="text-xs text-[#FF5400] hover:underline" onClick={addTermin}>
                  + Tambah Termin
                </button>
              </div>
              <div className="space-y-2">
                {invoice.termins.map((t, i) => (
                  <div key={i} className="border rounded-md p-2 grid grid-cols-[3rem_1fr_1fr_7rem_1.5rem] gap-2 items-center">
                    <input
                      className="input"
                      value={t.termin}
                      onChange={(e) => updateTermin(i, { termin: e.target.value })}
                    />
                    <input
                      className="input"
                      placeholder="Keterangan"
                      value={t.keterangan}
                      onChange={(e) => updateTermin(i, { keterangan: e.target.value })}
                    />
                    <input
                      className="input"
                      placeholder="Tanggal Pembayaran"
                      value={t.tanggal}
                      onChange={(e) => updateTermin(i, { tanggal: e.target.value })}
                    />
                    <input
                      type="number"
                      className="input"
                      placeholder="Jumlah"
                      value={t.jumlah}
                      onChange={(e) => updateTermin(i, { jumlah: Number(e.target.value) })}
                    />
                    <button
                      type="button"
                      className="text-gray-400 hover:text-red-600 text-lg leading-none"
                      onClick={() => removeTermin(i)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Bank info */}
            <div className="grid grid-cols-3 gap-3">
              <Field label="Nama Bank">
                <input
                  className="input"
                  value={invoice.bankName}
                  onChange={(e) => setInvoice({ ...invoice, bankName: e.target.value })}
                />
              </Field>
              <Field label="No. Rekening / VA">
                <input
                  className="input"
                  value={invoice.accountNumber}
                  onChange={(e) => setInvoice({ ...invoice, accountNumber: e.target.value })}
                />
              </Field>
              <Field label="Atas Nama">
                <input
                  className="input"
                  value={invoice.accountName}
                  onChange={(e) => setInvoice({ ...invoice, accountName: e.target.value })}
                />
              </Field>
            </div>

            {/* Notes */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700">Catatan Kaki</h3>
                <button type="button" className="text-xs text-[#FF5400] hover:underline" onClick={addNote}>
                  + Tambah Catatan
                </button>
              </div>
              <div className="space-y-2">
                {invoice.notes.map((n, i) => (
                  <div key={i} className="flex gap-2">
                    <input className="input" value={n} onChange={(e) => updateNote(i, e.target.value)} />
                    <button
                      type="button"
                      className="text-gray-400 hover:text-red-600 text-lg leading-none shrink-0"
                      onClick={() => removeNote(i)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
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
              <button className="btn" disabled={busy !== null} onClick={handleDownload}>
                {busy === "download" ? "Membuat..." : "Download Invoice PDF"}
              </button>
              <button className="btn-primary" disabled={busy !== null || !invoice.clientEmail} onClick={handleSend}>
                {busy === "send" ? "Mengirim..." : "Kirim Invoice"}
              </button>
            </div>
          </div>

          <div>
            <PreviewCard title="Invoice" src={`/print/invoice?d=${encoded}`} kind="invoice" />
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="bg-white rounded-lg border p-5 space-y-4">
          {!historyConfigured && (
            <div className="text-sm rounded-md px-3 py-2 bg-amber-50 text-amber-800">
              Database belum terhubung (env <code>DATABASE_URL</code> belum diset), jadi riwayat invoice
              belum bisa disimpan/ditampilkan.
            </div>
          )}
          {historyError && (
            <div className="text-sm rounded-md px-3 py-2 bg-red-50 text-red-700">{historyError}</div>
          )}
          <div className="flex justify-end">
            <button className="btn" onClick={loadHistory} disabled={historyLoading}>
              {historyLoading ? "Memuat..." : "Refresh"}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-4">No. Invoice</th>
                  <th className="py-2 pr-4">Klien</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Total</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Tanggal Kirim</th>
                  <th className="py-2 pr-4">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {historyRows.map((r) => (
                  <tr key={r.invoice_no} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2 pr-4 font-mono text-xs">{r.invoice_no}</td>
                    <td className="py-2 pr-4">{r.client_name}</td>
                    <td className="py-2 pr-4">{r.client_email}</td>
                    <td className="py-2 pr-4">{formatRupiah(Number(r.total))}</td>
                    <td className="py-2 pr-4">
                      {r.sent_status === "sent" ? (
                        <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                          Terkirim
                        </span>
                      ) : r.sent_status === "failed" ? (
                        <span
                          className="text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full"
                          title={r.sent_error ?? undefined}
                        >
                          Gagal
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                          Belum Dikirim
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-xs text-gray-500">
                      {r.sent_at ? new Date(r.sent_at).toLocaleString("id-ID") : "—"}
                    </td>
                    <td className="py-2 pr-4">
                      <button
                        className="text-[#023047] hover:underline"
                        onClick={() => setHistoryPreview(r.data)}
                      >
                        Preview
                      </button>
                    </td>
                  </tr>
                ))}
                {historyRows.length === 0 && !historyLoading && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-gray-400">
                      Belum ada riwayat invoice.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {historyPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-3 border-b sticky top-0 bg-white">
              <h3 className="font-semibold text-gray-800">{historyPreview.invoiceNo}</h3>
              <button className="btn" onClick={() => setHistoryPreview(null)}>
                Tutup
              </button>
            </div>
            <div className="p-5">
              <PreviewCard
                title="Invoice"
                src={`/print/invoice?d=${encodeParticipantClient(historyPreview)}`}
                kind="invoice"
              />
            </div>
          </div>
        </div>
      )}
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
