// Pulls "Dokumen Akhir" (final project / completion) submissions from a public
// Google Sheet and maps its (long, form-generated) headers to the fields this
// app needs. The sheet stays the source of truth; we only read it.

const DEFAULT_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1uZeEM3NxkFpD16M3CKR8DwW15Tj3zQl2kQE1BYvt9YY/edit?resourcekey=&gid=1924740378#gid=1924740378";

export function sheetUrlToCsvUrl(url: string): string {
  const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!idMatch) throw new Error("URL Google Sheet tidak valid.");
  const gidMatch = url.match(/[?&#]gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : "0";
  return `https://docs.google.com/spreadsheets/d/${idMatch[1]}/export?format=csv&gid=${gid}`;
}

function getSheetUrl(): string {
  return process.env.FINAL_PROJECT_SHEET_URL || DEFAULT_SHEET_URL;
}

/** Minimal RFC4180 CSV parser: handles quoted fields, embedded commas/newlines, "" escaping. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c === "\r") {
      // skip
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export type SheetRow = {
  rowKey: string;
  timestampRaw: string;
  email: string;
  nama: string;
  kelas: string;
  judulFinalProject: string;
  statusSaatIni: string;
  batch: string;
  sertifDoneRaw: string;
};

function findColumn(headers: string[], predicate: (h: string) => boolean): number {
  return headers.findIndex((h) => predicate(h.trim()));
}

export async function fetchSheetRows(): Promise<SheetRow[]> {
  const csvUrl = sheetUrlToCsvUrl(getSheetUrl());
  const res = await fetch(csvUrl, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(
      `Gagal mengambil data Google Sheet (status ${res.status}). Pastikan sheet masih "Anyone with the link can view".`
    );
  }
  const text = await res.text();
  const rows = parseCsv(text);
  if (rows.length < 2) return [];

  const headers = rows[0];
  const idx = {
    timestamp: findColumn(headers, (h) => h.startsWith("Timestamp")),
    email: findColumn(headers, (h) => h === "Email"),
    nama: findColumn(headers, (h) => h === "Nama"),
    kelas: findColumn(headers, (h) => h.startsWith("Saya sudah mengikuti kelas")),
    judul: findColumn(headers, (h) => h.startsWith("Judul Final Project")),
    status: findColumn(headers, (h) => h.startsWith("Status Saat Ini")),
    batch: findColumn(headers, (h) => h.startsWith("Pada Batch")),
    sertifDone: findColumn(headers, (h) => h.startsWith("Sertif Done")),
  };
  if (idx.email === -1 || idx.nama === -1) {
    throw new Error('Kolom "Nama" atau "Email" tidak ditemukan di sheet — format sheet mungkin berubah.');
  }

  const out: SheetRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const nama = (r[idx.nama] ?? "").trim();
    const email = (r[idx.email] ?? "").trim();
    if (!nama || !email) continue;
    const timestampRaw = (r[idx.timestamp] ?? "").trim();
    out.push({
      rowKey: `${timestampRaw}|${email.toLowerCase()}`,
      timestampRaw,
      email,
      nama,
      kelas: idx.kelas >= 0 ? (r[idx.kelas] ?? "").trim() : "",
      judulFinalProject: idx.judul >= 0 ? (r[idx.judul] ?? "").trim() : "",
      statusSaatIni: idx.status >= 0 ? (r[idx.status] ?? "").trim() : "",
      batch: idx.batch >= 0 ? (r[idx.batch] ?? "").trim() : "",
      sertifDoneRaw: idx.sertifDone >= 0 ? (r[idx.sertifDone] ?? "").trim() : "",
    });
  }
  return out;
}
