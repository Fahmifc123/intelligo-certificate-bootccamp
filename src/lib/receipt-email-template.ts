import type { ReceiptData } from "./types";

function formatRupiah(n: number): string {
  return "Rp" + Math.round(n).toLocaleString("id-ID");
}

export function buildReceiptEmailSubject(data: ReceiptData): string {
  return `Bukti Pembayaran ${data.receiptNo} - Intelligo ID`;
}

export function buildReceiptEmailHtml(data: ReceiptData): string {
  return `
<div style="font-family:'Rubik',Arial,Helvetica,sans-serif;font-size:14px;color:#023047;line-height:1.65;background-color:#F9FAFB;padding:24px;">
  <div style="max-width:620px;margin:0 auto;background-color:#FFFFFF;border-radius:10px;box-shadow:0 4px 12px rgba(2,48,71,0.08);overflow:hidden;">
    <div style="background-color:#023047;padding:20px 24px;">
      <h1 style="margin:0;font-size:18px;font-weight:600;color:#FFFFFF;letter-spacing:0.5px;">BUKTI PEMBAYARAN</h1>
      <p style="margin:4px 0 0 0;font-size:13px;color:#E5E7EB;">Intelligo ID</p>
    </div>
    <div style="padding:24px;">
      <p style="margin:0 0 16px 0;">Yth. <strong>${data.receivedFrom}</strong>,</p>
      <p style="margin:0 0 16px 0;">Terima kasih, pembayaran Anda telah kami terima. Bukti pembayaran terlampir pada email ini.</p>
      <div style="background-color:#FFF3ED;border-left:4px solid #FF5400;padding:14px 16px;margin:0 0 20px 0;border-radius:6px;">
        <p style="margin:0;font-size:14px;">No. Bukti Pembayaran: <strong>${data.receiptNo}</strong></p>
        <p style="margin:4px 0 0 0;font-size:14px;">Jumlah: <strong>${formatRupiah(data.amount)}</strong></p>
      </div>
      <p style="margin:0 0 20px 0;">
        WhatsApp Admin:<br />
        <a href="https://www.intelligo.id/wa-mintell" style="color:#FF5400;text-decoration:none;">https://www.intelligo.id/wa-mintell</a>
      </p>
      <p style="margin:0;">Hormat kami,<br /><strong style="color:#023047;">Intelligo ID</strong></p>
    </div>
  </div>
</div>`;
}
