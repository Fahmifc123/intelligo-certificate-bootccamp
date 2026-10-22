"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { encodeParticipantClient } from "@/lib/encode-client";
import { readErrorMessage } from "@/lib/fetch-error";
import { formatIndonesianDate, makeReceiptNo, nextAvailableReceiptSeq, todayInputValue } from "@/lib/invoice-number";
import { terbilangRupiah } from "@/lib/terbilang";
import { PreviewCard } from "./PreviewCard";
import type { InvoiceData, ReceiptData } from "@/lib/types";
import { invoiceTotal } from "@/lib/types";

function emptyReceipt(): ReceiptData {
  const dateInput = todayInputValue();
  return {
    receiptNo: makeReceiptNo(dateInput, 1),
    date: formatIndonesianDate(dateInput),
    receivedFrom: "",
    receivedEmail: "",
    amount: 0,
    forPayment: "",
    paymentMethod: "Transfer Bank BCA",
    relatedInvoiceNo: "",
    signerName: "Muhammad Fahmi",
    signerTitle: "Head of Learning",
  };
}

function formatRupiah(n: number): string {
  return "Rp" + Math.round(n || 0).toLocaleString("id-ID");
}

type ReceiptRecord = {
  receipt_no: string;
  received_from: string;
  client_email: string | null;
  amount: string | number;
  data: ReceiptData;
  created_at: string;
  sent_at: string | null;
  sent_status: "pending" | "sent" | "failed";
  sent_error: string | null;
};

type InvoiceRecord = {
  invoice_no: string;
  client_name: string;
  client_email: string | null;
  data: InvoiceData;
};

type Tab = "form" | "history";

export function ReceiptApp() {
  const [tab, setTab] = useState<Tab>("form");
  const [receipt, setReceipt] = useState<ReceiptData>(emptyReceipt());
  const [dateInput, setDateInput] = useState(todayInputValue());
  const [seq, setSeq] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [knownReceiptNos, setKnownReceiptNos] = useState<string[]>([]);

  const [invoicePicker, setInvoicePicker] = useState(false);
  const [invoiceRows, setInvoiceRows] = useState<InvoiceRecord[]>([]);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  const [historyRows, setHistoryRows] = useState<ReceiptRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyConfigured, setHistoryConfigured] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyPreview, setHistoryPreview] = useState<ReceiptData | null>(null);

  const encoded = useMemo(() => encodeParticipantClient(receipt), [receipt]);
  const isDuplicateNo = knownReceiptNos.includes(receipt.receiptNo);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/receipts");
        const json = await res.json();
        if (!res.ok || !json.configured) return;
        const nos: string[] = json.receipts.map((r: ReceiptRecord) => r.receipt_no);
        setKnownReceiptNos(nos);
        const next = nextAvailableReceiptSeq(nos, dateInput);
        setSeq(next);
        setReceipt((r) => ({ ...r, receiptNo: makeReceiptNo(dateInput, next) }));
      } catch {
        // fall back to seq 1
      }
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function regenerateNumber() {
    setReceipt((r) => ({ ...r, receiptNo: makeReceiptNo(dateInput, seq) }));
  }

  async function openInvoicePicker() {
    setInvoicePicker(true);
    setInvoiceLoading(true);
    try {
      const res = await fetch("/api/invoices");
      const json = await res.json();
      if (res.ok && json.configured) setInvoiceRows(json.invoices);
    } finally {
      setInvoiceLoading(false);
    }
  }

  function pickInvoice(inv: InvoiceRecord) {
    const total = invoiceTotal(inv.data);
    setReceipt((r) => ({
      ...r,
      receivedFrom: inv.client_name,
      receivedEmail: inv.client_email ?? "",
      amount: total,
      relatedInvoiceNo: inv.invoice_no,
      forPayment: `Pembayaran ${inv.data.totalLabel || "invoice"} ${inv.invoice_no} - ${inv.data.items
        ?.map((it) => it.description.split("\n")[0])
        .join(", ")}`,
    }));
    setInvoicePicker(false);
  }

  async function handleDownload() {
    setBusy("download");
    setMessage(null);
    try {
      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "receipt", data: receipt }),
      });
      if (!res.ok) throw new Error(await readErrorMessage(res));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Bukti Pembayaran ${receipt.receiptNo.replace(/\//g, "-")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setKnownReceiptNos((nos) => [...nos, receipt.receiptNo]);
      setSeq((s) => {
        const next = s + 1;
        setReceipt((r) => ({ ...r, receiptNo: makeReceiptNo(dateInput, next) }));
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
      const res = await fetch("/api/receipt/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(receipt),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal mengirim email");
      setMessage({ type: "ok", text: `Bukti pembayaran berhasil dikirim ke ${receipt.receivedEmail}` });
      setKnownReceiptNos((nos) => [...nos, receipt.receiptNo]);
      setSeq((s) => {
        const next = s + 1;
        setReceipt((r) => ({
          ...r,
          receiptNo: makeReceiptNo(dateInput, next),
          receivedFrom: "",
          receivedEmail: "",
          amount: 0,
          forPayment: "",
          relatedInvoiceNo: "",
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
      const res = await fetch("/api/receipts");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memuat riwayat");
      setHistoryConfigured(json.configured);
      setHistoryRows(json.receipts);
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
          Buat Bukti Pembayaran
        </button>
        <button
          onClick={() => setTab("history")}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            tab === "history" ? "bg-[#FF5400] text-white" : "bg-white text-gray-600 border"
          }`}
        >
          Riwayat
        </button>
      </div>

      {tab === "form" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border p-5 space-y-4">
            <button type="button" className="btn w-full" onClick={openInvoicePicker}>
              Isi dari Invoice yang Sudah Ada...
            </button>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Tanggal">
                <input
                  type="date"
                  className="input"
                  value={dateInput}
                  onChange={(e) => {
                    setDateInput(e.target.value);
                    setReceipt((r) => ({
                      ...r,
                      date: formatIndonesianDate(e.target.value),
                      receiptNo: makeReceiptNo(e.target.value, seq),
                    }));
                  }}
                />
              </Field>
              <Field label="No. Bukti Pembayaran">
                <div className="flex gap-2">
                  <input
                    className={`input ${isDuplicateNo ? "border-red-400" : ""}`}
                    value={receipt.receiptNo}
                    onChange={(e) => setReceipt({ ...receipt, receiptNo: e.target.value })}
                  />
                  <button type="button" className="btn shrink-0" onClick={regenerateNumber}>
                    Generate
                  </button>
                </div>
                {isDuplicateNo && (
                  <p className="text-xs text-red-600 mt-1">Nomor ini sudah pernah dipakai.</p>
                )}
              </Field>
              <Field label="Sudah Terima Dari">
                <input
                  className="input"
                  value={receipt.receivedFrom}
                  onChange={(e) => setReceipt({ ...receipt, receivedFrom: e.target.value })}
                />
              </Field>
              <Field label="Email Penerima">
                <input
                  className="input"
                  value={receipt.receivedEmail}
                  onChange={(e) => setReceipt({ ...receipt, receivedEmail: e.target.value })}
                />
              </Field>
              <Field label="Jumlah Uang (Rp)">
                <input
                  type="number"
                  className="input"
                  value={receipt.amount}
                  onChange={(e) => setReceipt({ ...receipt, amount: Number(e.target.value) })}
                />
              </Field>
              <Field label="Metode Pembayaran">
                <input
                  className="input"
                  value={receipt.paymentMethod}
                  onChange={(e) => setReceipt({ ...receipt, paymentMethod: e.target.value })}
                />
              </Field>
            </div>
            <p className="text-xs text-gray-500 -mt-2">
              Terbilang: <em>{terbilangRupiah(receipt.amount)}</em>
            </p>

            <Field label="Untuk Pembayaran">
              <textarea
                className="input"
                rows={2}
                value={receipt.forPayment}
                onChange={(e) => setReceipt({ ...receipt, forPayment: e.target.value })}
              />
            </Field>

            <Field label="Ref. No. Invoice (opsional)">
              <input
                className="input"
                value={receipt.relatedInvoiceNo}
                onChange={(e) => setReceipt({ ...receipt, relatedInvoiceNo: e.target.value })}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Nama Penandatangan">
                <input
                  className="input"
                  value={receipt.signerName}
                  onChange={(e) => setReceipt({ ...receipt, signerName: e.target.value })}
                />
              </Field>
              <Field label="Jabatan">
                <input
                  className="input"
                  value={receipt.signerTitle}
                  onChange={(e) => setReceipt({ ...receipt, signerTitle: e.target.value })}
                />
              </Field>
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
                {busy === "download" ? "Membuat..." : "Download PDF"}
              </button>
              <button
                className="btn-primary"
                disabled={busy !== null || !receipt.receivedEmail}
                onClick={handleSend}
              >
                {busy === "send" ? "Mengirim..." : "Kirim Bukti Pembayaran"}
              </button>
            </div>
          </div>

          <div>
            <PreviewCard title="Bukti Pembayaran" src={`/print/receipt?d=${encoded}`} kind="receipt" />
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="bg-white rounded-lg border p-5 space-y-4">
          {!historyConfigured && (
            <div className="text-sm rounded-md px-3 py-2 bg-amber-50 text-amber-800">
              Database belum terhubung, riwayat belum bisa disimpan/ditampilkan.
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
                  <th className="py-2 pr-4">No.</th>
                  <th className="py-2 pr-4">Terima Dari</th>
                  <th className="py-2 pr-4">Jumlah</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Tanggal Kirim</th>
                  <th className="py-2 pr-4">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {historyRows.map((r) => (
                  <tr key={r.receipt_no} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2 pr-4 font-mono text-xs">{r.receipt_no}</td>
                    <td className="py-2 pr-4">{r.received_from}</td>
                    <td className="py-2 pr-4">{formatRupiah(Number(r.amount))}</td>
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
                    <td colSpan={6} className="py-6 text-center text-gray-400">
                      Belum ada riwayat.
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
              <h3 className="font-semibold text-gray-800">{historyPreview.receiptNo}</h3>
              <button className="btn" onClick={() => setHistoryPreview(null)}>
                Tutup
              </button>
            </div>
            <div className="p-5">
              <PreviewCard
                title="Bukti Pembayaran"
                src={`/print/receipt?d=${encodeParticipantClient(historyPreview)}`}
                kind="receipt"
              />
            </div>
          </div>
        </div>
      )}

      {invoicePicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-3 border-b sticky top-0 bg-white">
              <h3 className="font-semibold text-gray-800">Pilih Invoice</h3>
              <button className="btn" onClick={() => setInvoicePicker(false)}>
                Tutup
              </button>
            </div>
            <div className="p-5">
              {invoiceLoading && <p className="text-sm text-gray-500">Memuat...</p>}
              {!invoiceLoading && invoiceRows.length === 0 && (
                <p className="text-sm text-gray-400">Belum ada invoice tersimpan.</p>
              )}
              <div className="space-y-2">
                {invoiceRows.map((inv) => (
                  <button
                    key={inv.invoice_no}
                    type="button"
                    className="w-full text-left border rounded-md p-3 hover:bg-gray-50"
                    onClick={() => pickInvoice(inv)}
                  >
                    <div className="font-mono text-xs text-gray-500">{inv.invoice_no}</div>
                    <div className="font-medium">{inv.client_name}</div>
                    <div className="text-sm text-gray-500">
                      {formatRupiah(invoiceTotal(inv.data))}
                    </div>
                  </button>
                ))}
              </div>
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
