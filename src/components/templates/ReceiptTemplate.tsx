import type { CSSProperties } from "react";
import type { ReceiptData } from "@/lib/types";
import { terbilangRupiah } from "@/lib/terbilang";

function formatRupiah(n: number): string {
  return "Rp" + Math.round(n || 0).toLocaleString("id-ID");
}

export function ReceiptTemplate({ data }: { data: ReceiptData }) {
  return (
    <div
      style={{
        position: "relative",
        width: "8.27in",
        height: "5.83in",
        background: "#ffffff",
        fontFamily: "'Rubik', Arial, Helvetica, sans-serif",
        color: "#111827",
        fontSize: "10pt",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "#023047",
          padding: "0.2in 0.4in",
          display: "flex",
          alignItems: "center",
          gap: "0.2in",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-mark-white.png" alt="" style={{ height: "0.42in", flexShrink: 0 }} />
        <div style={{ flex: 1, textAlign: "right", color: "#ffffff" }}>
          <div style={{ fontSize: "11pt", fontWeight: 700, letterSpacing: "0.3px" }}>
            CV. PAHAM DATA INDONESIA (INTELLIGO ID)
          </div>
          <div style={{ fontSize: "7.5pt", opacity: 0.85, marginTop: "1px" }}>
            Jl. K.H. Ahmad Dahlan No.20, Malabar, Kec. Lengkong, Kota Bandung, Jawa Barat 40262
          </div>
        </div>
      </div>
      <div style={{ background: "#FF5400", height: "0.07in" }} />

      <div style={{ padding: "0.28in 0.4in" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ fontSize: "20pt", fontWeight: 700, color: "#023047", letterSpacing: "1px" }}>
            BUKTI PEMBAYARAN
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 700 }}>No: {data.receiptNo}</div>
            <div>Tanggal : {data.date}</div>
            {data.relatedInvoiceNo && <div>Ref. Invoice : {data.relatedInvoiceNo}</div>}
          </div>
        </div>

        <table style={{ width: "100%", marginTop: "0.28in", borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <td style={labelCell}>Sudah terima dari</td>
              <td style={colonCell}>:</td>
              <td style={valueCell}>
                <strong>{data.receivedFrom}</strong>
              </td>
            </tr>
            <tr>
              <td style={labelCell}>Jumlah uang</td>
              <td style={colonCell}>:</td>
              <td style={valueCell}>
                <strong style={{ fontSize: "13pt", color: "#023047" }}>{formatRupiah(data.amount)}</strong>
              </td>
            </tr>
            <tr>
              <td style={labelCell}>Terbilang</td>
              <td style={colonCell}>:</td>
              <td style={{ ...valueCell, fontStyle: "italic" }}>{terbilangRupiah(data.amount)}</td>
            </tr>
            <tr>
              <td style={labelCell}>Untuk pembayaran</td>
              <td style={colonCell}>:</td>
              <td style={{ ...valueCell, whiteSpace: "pre-line" }}>{data.forPayment}</td>
            </tr>
            <tr>
              <td style={labelCell}>Metode pembayaran</td>
              <td style={colonCell}>:</td>
              <td style={valueCell}>{data.paymentMethod}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.4in" }}>
          <div style={{ textAlign: "center", width: "2.2in" }}>
            <div>Bandung, {data.date}</div>
            <div style={{ height: "0.55in" }} />
            <div style={{ borderTop: "1px solid #111827", paddingTop: "4px", fontWeight: 700 }}>
              {data.signerName}
            </div>
            <div style={{ fontSize: "8.5pt", color: "#6B7280" }}>{data.signerTitle}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const labelCell: CSSProperties = {
  padding: "4px 0",
  width: "1.8in",
  verticalAlign: "top",
  color: "#374151",
};
const colonCell: CSSProperties = { padding: "4px 6px", width: "0.15in", verticalAlign: "top" };
const valueCell: CSSProperties = { padding: "4px 0", verticalAlign: "top" };
