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
cp .env.example .env.local   # isi semua variable di bawah
npm run dev
```

Buka http://localhost:3000 — akan redirect ke `/login`. Login dengan password dari
`ADMIN_PASSWORD` di `.env.local`.

## Keamanan & Autentikasi

Seluruh halaman dan API di tool ini **wajib login** (session cookie, HMAC-signed),
kecuali satu endpoint publik read-only: `GET /api/public/verify/[id]` (untuk halaman
verifikasi sertifikat publik di `intelligo.id/cek-sertifikat`, repo terpisah).

- Auth digerbangi oleh `src/proxy.ts` (Next.js Proxy/Middleware). Request API tanpa login
  dibalas `401` JSON; request halaman di-redirect ke `/login?next=...`.
- Endpoint `/print/*` (dipakai Puppeteer untuk render PDF server-to-server) menerima
  `?key=INTERNAL_RENDER_SECRET` sebagai alternatif cookie, karena Puppeteer tidak punya
  cookie login.
- Endpoint verifikasi publik tidak pernah mengembalikan email, no. telepon, skor, foto,
  invoice, atau data pembayaran — hanya `certificate_id, name, program, batch, period,
  issued_at, type, status`. Opsional dilindungi header `X-Verify-Key` (lihat
  `CERTIFICATE_VERIFY_KEY` di bawah) dan dibatasi rate limit (~60 req/menit).
  **Catatan**: jika halaman publik di `intelligo.id/cek-sertifikat` memanggil endpoint ini
  langsung dari browser (client-side), `X-Verify-Key` akan terlihat di network tab /
  bundle JS — tidak benar-benar rahasia. Supaya key ini efektif, panggil endpoint ini dari
  server-side (API route / server action) di repo landing page, bukan langsung dari client.
- Semua endpoint pengiriman email (`/api/send`, `/api/invoice/send`, `/api/receipt/send`)
  dan generate PDF (`/api/pdf`) dibatasi rate limit per-IP (in-memory, best-effort — tidak
  terjamin akurat across multiple serverless instances, tapi cukup untuk mencegah abuse
  kasar).
- `robots.txt` men-disallow semua crawling, dan setiap response diberi header
  `X-Robots-Tag: noindex, nofollow`.
- Certificate ID bersifat permanen setelah diterbitkan: `/api/send` menolak (409) kalau ID
  sudah dipakai peserta lain; import Excel otomatis generate ID yang kosong & mengganti ID
  yang duplikat (dengan warning).
- Sertifikat tidak pernah di-hard-delete — hanya bisa "Cabut" (revoke) dengan alasan,
  tercatat waktu & status `revoked`, dan bisa diaktifkan kembali.

**Jika password/API key sempat terekspos sebelum PR ini di-deploy** (app sebelumnya publik
tanpa login), sebaiknya rotasi `RESEND_API_KEY` dan credential `DATABASE_URL` setelah
deploy, untuk jaga-jaga.

## Environment Variables

| Variable                 | Wajib? | Keterangan                                                                 |
| ------------------------- | ------ | --------------------------------------------------------------------------- |
| `ADMIN_PASSWORD`          | Ya     | Password login tunggal untuk tool ini.                                      |
| `SESSION_SECRET`          | Ya     | Random secret untuk sign session cookie. `openssl rand -hex 32`.            |
| `INTERNAL_RENDER_SECRET`  | Ya     | Random secret untuk bypass login khusus Puppeteer render PDF. `openssl rand -hex 24`. |
| `CERTIFICATE_VERIFY_KEY`  | Opsional | Kalau diisi, endpoint verifikasi publik wajib header `X-Verify-Key` yang cocok. |
| `DATABASE_URL`            | Opsional (tapi perlu untuk histori/verifikasi/revoke) | Connection string Postgres. |
| `RESEND_API_KEY`          | Ya (untuk kirim email) | API key dari [Resend](https://resend.com). |
| `EMAIL_FROM`              | Ya (untuk kirim email) | Alamat pengirim (harus dari domain yang sudah diverifikasi). |

Lihat `.env.example` untuk template lengkap.

## Deploy ke Vercel

1. Push repo ini ke GitHub (sudah dilakukan).
2. Import project di [vercel.com/new](https://vercel.com/new), pilih repo ini.
3. Set semua environment variables di atas (tabel "Environment Variables") di Vercel
   project settings. Generate `SESSION_SECRET`, `INTERNAL_RENDER_SECRET`, dan
   `CERTIFICATE_VERIFY_KEY` dengan `openssl rand -hex 32` / `openssl rand -hex 24` —
   jangan pakai ulang value dari `.env.local` development.
4. Deploy. PDF generation memakai `@sparticuz/chromium` + `puppeteer-core` yang kompatibel
   dengan Vercel serverless functions.

## Struktur

- `src/components/templates/` — komponen React untuk desain sertifikat & performance report.
- `src/app/print/*` — halaman "cetak" (dipakai Puppeteer untuk render ke PDF), bukan untuk diakses langsung.
- `src/app/api/pdf` — generate & download 1 PDF.
- `src/app/api/send` — generate PDF + kirim email via Resend.
- `src/app/api/import` — parse file Excel yang diupload jadi data peserta.
- `src/app/api/public/verify/[id]` — endpoint publik read-only untuk verifikasi sertifikat.
- `src/app/api/certificates/[id]/revoke` — cabut/aktifkan kembali sertifikat.
- `src/proxy.ts` — gerbang autentikasi (Next.js Proxy/Middleware) untuk seluruh app.
- `src/lib/auth.ts` — logic session cookie & password (Web Crypto, Edge-compatible).
- `src/lib/rate-limit.ts` — rate limiter in-memory per-IP.
- `src/lib/grading.ts` — perhitungan Total & Grade dari bobot modul.

Deployed on Vercel.
