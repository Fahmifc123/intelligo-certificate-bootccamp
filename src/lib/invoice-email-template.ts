import type { InvoiceData } from "./types";
import { invoiceTotal } from "./types";

function formatRupiah(n: number): string {
  return "Rp" + Math.round(n).toLocaleString("id-ID");
}

export function buildInvoiceEmailSubject(data: InvoiceData): string {
  return `Invoice ${data.invoiceNo} - Intelligo ID`;
}

export function buildInvoiceEmailHtml(data: InvoiceData): string {
  const total = invoiceTotal(data);
  return `
<div style="font-family:'Rubik',Arial,Helvetica,sans-serif;font-size:14px;color:#023047;line-height:1.65;background-color:#F9FAFB;padding:24px;">
  <div style="max-width:620px;margin:0 auto;background-color:#FFFFFF;border-radius:10px;box-shadow:0 4px 12px rgba(2,48,71,0.08);overflow:hidden;">
    <div style="background-color:#023047;padding:20px 24px;">
      <h1 style="margin:0;font-size:18px;font-weight:600;color:#FFFFFF;letter-spacing:0.5px;">INVOICE</h1>
      <p style="margin:4px 0 0 0;font-size:13px;color:#E5E7EB;">Intelligo ID</p>
    </div>
    <div style="padding:24px;">
      <p style="margin:0 0 16px 0;">Yth. <strong>${data.clientPIC || data.clientName}</strong>,</p>
      <p style="margin:0 0 16px 0;">Bersama email ini kami lampirkan invoice untuk <strong>${data.clientName}</strong>:</p>
      <div style="background-color:#FFF3ED;border-left:4px solid #FF5400;padding:14px 16px;margin:0 0 20px 0;border-radius:6px;">
        <p style="margin:0;font-size:14px;">Invoice No: <strong>${data.invoiceNo}</strong></p>
        <p style="margin:4px 0 0 0;font-size:14px;">Total Tagihan: <strong>${formatRupiah(total)}</strong></p>
      </div>
      <p style="margin:0 0 16px 0;">Mohon konfirmasi pembayaran ke tim Intelligo ID setelah transfer dilakukan.</p>
      <p style="margin:0 0 20px 0;">
        WhatsApp Admin:<br />
        <a href="https://www.intelligo.id/wa-mintell" style="color:#FF5400;text-decoration:none;">https://www.intelligo.id/wa-mintell</a>
      </p>
      <p style="margin:0;">Hormat kami,<br /><strong style="color:#023047;">Intelligo ID</strong></p>
    </div>
  </div>
</div>`;
}
