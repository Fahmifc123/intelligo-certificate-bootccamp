# Intelligo.ID — Certificate & Performance Report Generator

Halaman internal untuk menggantikan workflow n8n "Certificate & Performance Report":
generate sertifikat & performance report bootcamp Intelligo.ID (satu per satu atau bulk
dari Excel) lalu kirim otomatis lewat email — tanpa Google Sheets, Slides, atau n8n.

## Fitur

- **Input manual**: isi data peserta + skor per modul, preview sertifikat & performance
  report langsung di browser, lalu download PDF atau kirim email.
- **Import Excel**: upload file dengan struktur kolom yang sama seperti sheet sumber data
  lama (`No.`, `id`, `nama`, `email`, `sendMode`, `judul`, `batch`, `pelaksanaan`,
  `photo_url`, kolom-kolom modul, `Total`, `Grade`, dengan baris `bobot` untuk pembobotan
  nilai) — lalu kirim email ke banyak peserta sekaligus.
- Total & Grade dihitung otomatis dari bobot tiap modul.
- Desain sertifikat & performance report mengikuti brand Intelligo.ID (template asli:
  `Template_of_Certificate_Intelligo.pptx` dan `Template_of_Performance_Report_Intelligo.pptx`).

## Menjalankan secara lokal

```bash
npm install
cp .env.example .env.local   # isi RESEND_API_KEY & EMAIL_FROM
npm run dev
```

Buka http://localhost:3000

## Environment Variables

| Variable          | Keterangan                                                        |
| ------------------ | ------------------------------------------------------------------ |
| `RESEND_API_KEY`   | API key dari [Resend](https://resend.com) untuk mengirim email.   |
| `EMAIL_FROM`       | Alamat pengirim (harus dari domain yang sudah diverifikasi).      |

## Deploy ke Vercel

1. Push repo ini ke GitHub (sudah dilakukan).
2. Import project di [vercel.com/new](https://vercel.com/new), pilih repo ini.
3. Set environment variables `RESEND_API_KEY` dan `EMAIL_FROM` di Vercel project settings.
4. Deploy. PDF generation memakai `@sparticuz/chromium` + `puppeteer-core` yang kompatibel
   dengan Vercel serverless functions.

## Struktur

- `src/components/templates/` — komponen React untuk desain sertifikat & performance report.
- `src/app/print/*` — halaman "cetak" (dipakai Puppeteer untuk render ke PDF), bukan untuk diakses langsung.
- `src/app/api/pdf` — generate & download 1 PDF.
- `src/app/api/send` — generate PDF + kirim email via Resend.
- `src/app/api/import` — parse file Excel yang diupload jadi data peserta.
- `src/lib/grading.ts` — perhitungan Total & Grade dari bobot modul.
