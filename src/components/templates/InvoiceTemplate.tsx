import type { CSSProperties, ReactNode } from "react";
import type { InvoiceData } from "@/lib/types";
import { invoiceSubtotal, invoiceTotal, invoiceProgramTotal } from "@/lib/types";

function formatRupiah(n: number): string {
  return "Rp" + Math.round(n).toLocaleString("id-ID");
}

export function InvoiceTemplate({ data }: { data: InvoiceData }) {
  const total = invoiceTotal(data);
  const programTotal = invoiceProgramTotal(data);

  return (
    <div
      style={{
        position: "relative",
        width: "8.27in",
        height: "11.69in",
        background: "#ffffff",
        fontFamily: "'Rubik', Arial, Helvetica, sans-serif",
        color: "#111827",
        fontSize: "9.5pt",
      }}
    >
      {/* Header */}
      <div style={{ background: "#023047", padding: "0.28in 0.5in", display: "flex", alignItems: "center", gap: "0.25in" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-mark-white.png" alt="" style={{ height: "0.62in", flexShrink: 0 }} />
        <div style={{ flex: 1, textAlign: "right", color: "#ffffff" }}>
          <div style={{ fontSize: "14pt", fontWeight: 700, letterSpacing: "0.3px" }}>
            CV. PAHAM DATA INDONESIA (INTELLIGO ID)
          </div>
          <div style={{ fontSize: "8.5pt", opacity: 0.85, marginTop: "2px" }}>
            Jl. K.H. Ahmad Dahlan No.20, Malabar, Kec. Lengkong, Kota Bandung, Jawa Barat 40262
          </div>
          <div style={{ fontSize: "8.5pt", opacity: 0.85 }}>Website: https://www.intelligo.id/</div>
        </div>
      </div>
      <div style={{ background: "#FF5400", height: "0.08in" }} />

      <div style={{ padding: "0.35in 0.5in" }}>
        {/* From / To + Invoice info */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3in" }}>
          <div style={{ maxWidth: "3.4in" }}>
            <div style={{ color: "#6B7280" }}>Dari :</div>
            <div style={{ fontWeight: 700, fontSize: "11pt", color: "#023047", marginBottom: "0.18in" }}>
              Intelligo ID
            </div>
            <div style={{ color: "#6B7280" }}>Kepada :</div>
            <div style={{ fontWeight: 700, fontSize: "11pt", color: "#023047" }}>{data.clientName}</div>
            <div style={{ whiteSpace: "pre-line", lineHeight: 1.5 }}>{data.clientPIC}</div>
            <div style={{ whiteSpace: "pre-line", lineHeight: 1.5 }}>{data.clientAddress}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "26pt", fontWeight: 700, color: "#023047", letterSpacing: "1px" }}>
              INVOICE
            </div>
            <div style={{ fontWeight: 700, marginTop: "4px" }}>NO: {data.invoiceNo}</div>
            <div>Tanggal : {data.date}</div>
            <div style={{ marginTop: "0.18in", color: "#6B7280" }}>Metode Pembayaran :</div>
            <div style={{ fontWeight: 700 }}>{data.paymentMethod}</div>
          </div>
        </div>

        {/* Items table */}
        <SectionTitle>Rincian Pembayaran</SectionTitle>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "0.3in" }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: "left" }}>Deskripsi</th>
              <th style={{ ...th, width: "0.5in" }}>QTY</th>
              <th style={{ ...th, width: "1.1in" }}>Harga Satuan</th>
              <th style={{ ...th, width: "1.2in" }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((it, i) => (
              <tr key={i}>
                <td style={{ ...td, textAlign: "left", whiteSpace: "pre-line" }}>{it.description}</td>
                <td style={td}>{it.qty}</td>
                <td style={td}>{formatRupiah(it.unitPrice)}</td>
                <td style={{ ...td, fontWeight: 700 }}>{formatRupiah(invoiceSubtotal(it))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} style={{ ...tdTotal, textAlign: "right" }}>
                {data.totalLabel}
              </td>
              <td style={tdTotal}>{formatRupiah(total)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Termin table */}
        {data.termins.length > 0 && (
          <>
            <SectionTitle>Rincian Termin Pembayaran</SectionTitle>
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "0.3in" }}>
              <thead>
                <tr>
                  <th style={{ ...th, width: "0.6in" }}>Termin</th>
                  <th style={{ ...th, textAlign: "left" }}>Keterangan</th>
                  <th style={{ ...th, width: "1.5in" }}>Tanggal Pembayaran</th>
                  <th style={{ ...th, width: "1.2in" }}>Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {data.termins.map((t, i) => (
                  <tr key={i}>
                    <td style={td}>{t.termin}</td>
                    <td style={{ ...td, textAlign: "left" }}>{t.keterangan}</td>
                    <td style={td}>{t.tanggal}</td>
                    <td style={{ ...td, fontWeight: 700 }}>{formatRupiah(t.jumlah)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} style={{ ...tdPlainTotal, textAlign: "right" }}>
                    Total Program
                  </td>
                  <td style={tdPlainTotal}>{formatRupiah(programTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </>
        )}

        {/* Bank info */}
        <SectionTitle>Informasi Rekening Pembayaran</SectionTitle>
        <div style={{ border: "1px solid #E5E7EB", marginBottom: "0.35in" }}>
          <div style={{ background: "#023047", color: "#fff", padding: "6px 10px", fontWeight: 700 }}>
            Rekening Pembayaran
          </div>
          <div style={{ background: "#F3F4F6", padding: "0.18in 0.2in", lineHeight: 2 }}>
            <div style={{ display: "flex" }}>
              <span style={{ width: "1.6in", color: "#6B7280" }}>Bank</span>
              <span style={{ fontWeight: 700 }}>{data.bankName}</span>
            </div>
            <div style={{ display: "flex" }}>
              <span style={{ width: "1.6in", color: "#6B7280" }}>No. VA / Rekening</span>
              <span style={{ fontWeight: 700, fontSize: "11pt" }}>{data.accountNumber}</span>
            </div>
            <div style={{ display: "flex" }}>
              <span style={{ width: "1.6in", color: "#6B7280" }}>a.n.</span>
              <span style={{ fontWeight: 700 }}>{data.accountName}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ maxWidth: "3.5in", color: "#374151", fontSize: "8.5pt", lineHeight: 1.6 }}>
            {data.notes.map((n, i) => (
              <div key={i}>* {n}</div>
            ))}
          </div>
          <div style={{ textAlign: "center" }}>
            <div>Hormat kami,</div>
            <div style={{ fontWeight: 700, color: "#023047", marginTop: "0.35in" }}>CV. Paham Data Indonesia</div>
            <div style={{ fontWeight: 700, color: "#023047" }}>Intelligo ID</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontWeight: 700, color: "#023047", fontSize: "11pt", marginBottom: "0.1in" }}>{children}</div>
  );
}

const th: CSSProperties = {
  background: "#023047",
  color: "#ffffff",
  padding: "8px 10px",
  textAlign: "center",
  fontSize: "9pt",
  border: "1px solid #023047",
};

const td: CSSProperties = {
  padding: "8px 10px",
  textAlign: "center",
  border: "1px solid #E5E7EB",
  verticalAlign: "top",
};

const tdTotal: CSSProperties = {
  background: "#023047",
  color: "#ffffff",
  fontWeight: 700,
  padding: "8px 10px",
  border: "1px solid #023047",
};

const tdPlainTotal: CSSProperties = {
  fontWeight: 700,
  padding: "8px 10px",
  border: "1px solid #E5E7EB",
  color: "#023047",
};
