import { Pool } from "pg";

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes("localhost") ? undefined : { rejectUnauthorized: false },
    });
  }
  return pool;
}

async function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = getPool().query(`
      CREATE TABLE IF NOT EXISTS certificates (
        id TEXT PRIMARY KEY,
        nama TEXT NOT NULL,
        email TEXT NOT NULL,
        judul TEXT NOT NULL,
        batch TEXT NOT NULL,
        pelaksanaan TEXT NOT NULL,
        photo_url TEXT,
        send_mode TEXT NOT NULL,
        total NUMERIC NOT NULL,
        grade TEXT NOT NULL,
        modules JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        sent_at TIMESTAMPTZ,
        sent_status TEXT NOT NULL DEFAULT 'pending',
        sent_error TEXT
      );

      CREATE TABLE IF NOT EXISTS invoices (
        invoice_no TEXT PRIMARY KEY,
        client_name TEXT NOT NULL,
        client_email TEXT,
        total NUMERIC NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        sent_at TIMESTAMPTZ,
        sent_status TEXT NOT NULL DEFAULT 'pending',
        sent_error TEXT
      );

      CREATE TABLE IF NOT EXISTS receipts (
        receipt_no TEXT PRIMARY KEY,
        received_from TEXT NOT NULL,
        client_email TEXT,
        amount NUMERIC NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        sent_at TIMESTAMPTZ,
        sent_status TEXT NOT NULL DEFAULT 'pending',
        sent_error TEXT
      );

      ALTER TABLE certificates ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'valid';
      ALTER TABLE certificates ADD COLUMN IF NOT EXISTS revoke_reason TEXT;
      ALTER TABLE certificates ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;
      ALTER TABLE certificates ADD COLUMN IF NOT EXISTS certificate_type TEXT NOT NULL DEFAULT 'PARTICIPANT';
      ALTER TABLE certificates ADD COLUMN IF NOT EXISTS location TEXT NOT NULL DEFAULT '';

      CREATE TABLE IF NOT EXISTS final_documents (
        row_key TEXT PRIMARY KEY,
        timestamp_raw TEXT NOT NULL DEFAULT '',
        email TEXT NOT NULL,
        nama TEXT NOT NULL,
        judul_final_project TEXT NOT NULL DEFAULT '',
        status_saat_ini TEXT NOT NULL DEFAULT '',
        batch TEXT NOT NULL DEFAULT '',
        sertif_done_raw TEXT NOT NULL DEFAULT '',
        certificate_id TEXT,
        synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      ALTER TABLE final_documents ADD COLUMN IF NOT EXISTS kelas TEXT NOT NULL DEFAULT '';
    `).then(() => undefined);
  }
  await schemaReady;
}

export type CertificateRecord = {
  id: string;
  nama: string;
  email: string;
  judul: string;
  batch: string;
  pelaksanaan: string;
  photo_url: string | null;
  send_mode: string;
  total: number;
  grade: string;
  modules: unknown;
  created_at: string;
  sent_at: string | null;
  sent_status: "pending" | "sent" | "failed";
  sent_error: string | null;
  status: "valid" | "revoked";
  revoke_reason: string | null;
  revoked_at: string | null;
  certificate_type: string;
  location: string;
};

export async function listCertificates(): Promise<CertificateRecord[]> {
  await ensureSchema();
  const { rows } = await getPool().query<CertificateRecord>(
    "SELECT * FROM certificates ORDER BY created_at DESC LIMIT 500"
  );
  return rows;
}

/** Case-insensitive, trimmed lookup — used by the public verification endpoint. */
export async function getCertificateById(id: string): Promise<CertificateRecord | null> {
  await ensureSchema();
  const { rows } = await getPool().query<CertificateRecord>(
    "SELECT * FROM certificates WHERE upper(id) = upper($1) LIMIT 1",
    [id.trim()]
  );
  return rows[0] ?? null;
}

export async function revokeCertificate(id: string, reason: string): Promise<boolean> {
  await ensureSchema();
  const { rowCount } = await getPool().query(
    `UPDATE certificates SET status = 'revoked', revoke_reason = $2, revoked_at = now() WHERE upper(id) = upper($1)`,
    [id.trim(), reason]
  );
  return (rowCount ?? 0) > 0;
}

export async function unrevokeCertificate(id: string): Promise<boolean> {
  await ensureSchema();
  const { rowCount } = await getPool().query(
    `UPDATE certificates SET status = 'valid', revoke_reason = NULL, revoked_at = NULL WHERE upper(id) = upper($1)`,
    [id.trim()]
  );
  return (rowCount ?? 0) > 0;
}

export async function recordSendAttempt(params: {
  id: string;
  nama: string;
  email: string;
  judul: string;
  batch: string;
  pelaksanaan: string;
  photoUrl?: string;
  sendMode: string;
  total: number;
  grade: string;
  modules: unknown;
  certificateType?: string;
  location?: string;
  status: "pending" | "sent" | "failed";
  error?: string;
}): Promise<void> {
  await ensureSchema();
  // A "pending" record (e.g. a PDF download without emailing) must never
  // downgrade a certificate that was already actually sent.
  await getPool().query(
    `INSERT INTO certificates
      (id, nama, email, judul, batch, pelaksanaan, photo_url, send_mode, total, grade, modules, certificate_type, location, sent_at, sent_status, sent_error)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, CASE WHEN $14 = 'pending' THEN NULL ELSE now() END, $14, $15)
     ON CONFLICT (id) DO UPDATE SET
       nama = EXCLUDED.nama,
       email = EXCLUDED.email,
       judul = EXCLUDED.judul,
       batch = EXCLUDED.batch,
       pelaksanaan = EXCLUDED.pelaksanaan,
       photo_url = EXCLUDED.photo_url,
       send_mode = EXCLUDED.send_mode,
       total = EXCLUDED.total,
       grade = EXCLUDED.grade,
       modules = EXCLUDED.modules,
       certificate_type = EXCLUDED.certificate_type,
       location = EXCLUDED.location,
       sent_at = CASE
         WHEN certificates.sent_status = 'sent' THEN certificates.sent_at
         WHEN EXCLUDED.sent_status = 'pending' THEN certificates.sent_at
         ELSE now()
       END,
       sent_status = CASE WHEN certificates.sent_status = 'sent' THEN certificates.sent_status ELSE EXCLUDED.sent_status END,
       sent_error = EXCLUDED.sent_error`,
    [
      params.id,
      params.nama,
      params.email,
      params.judul,
      params.batch,
      params.pelaksanaan,
      params.photoUrl ?? null,
      params.sendMode,
      params.total,
      params.grade,
      JSON.stringify(params.modules),
      params.certificateType?.trim() || "PARTICIPANT",
      params.location?.trim() ?? "",
      params.status,
      params.error ?? null,
    ]
  );
}

export type InvoiceRecord = {
  invoice_no: string;
  client_name: string;
  client_email: string | null;
  total: number;
  data: unknown;
  created_at: string;
  sent_at: string | null;
  sent_status: "pending" | "sent" | "failed";
  sent_error: string | null;
};

export async function listInvoices(): Promise<InvoiceRecord[]> {
  await ensureSchema();
  const { rows } = await getPool().query<InvoiceRecord>(
    "SELECT * FROM invoices ORDER BY created_at DESC LIMIT 500"
  );
  return rows;
}

export async function recordInvoiceSendAttempt(params: {
  invoiceNo: string;
  clientName: string;
  clientEmail?: string;
  total: number;
  data: unknown;
  status: "pending" | "sent" | "failed";
  error?: string;
}): Promise<void> {
  await ensureSchema();
  // Once an invoice has actually been sent, a later "pending" record (e.g. a
  // re-download) must not downgrade its status or clear sent_at.
  await getPool().query(
    `INSERT INTO invoices
      (invoice_no, client_name, client_email, total, data, sent_at, sent_status, sent_error)
     VALUES ($1,$2,$3,$4,$5, CASE WHEN $6 = 'sent' THEN now() ELSE NULL END, $6, $7)
     ON CONFLICT (invoice_no) DO UPDATE SET
       client_name = EXCLUDED.client_name,
       client_email = EXCLUDED.client_email,
       total = EXCLUDED.total,
       data = EXCLUDED.data,
       sent_at = CASE
         WHEN EXCLUDED.sent_status = 'sent' THEN now()
         WHEN invoices.sent_status = 'sent' THEN invoices.sent_at
         ELSE NULL
       END,
       sent_status = CASE WHEN invoices.sent_status = 'sent' THEN invoices.sent_status ELSE EXCLUDED.sent_status END,
       sent_error = EXCLUDED.sent_error`,
    [
      params.invoiceNo,
      params.clientName,
      params.clientEmail ?? null,
      params.total,
      JSON.stringify(params.data),
      params.status,
      params.error ?? null,
    ]
  );
}

export type ReceiptRecord = {
  receipt_no: string;
  received_from: string;
  client_email: string | null;
  amount: number;
  data: unknown;
  created_at: string;
  sent_at: string | null;
  sent_status: "pending" | "sent" | "failed";
  sent_error: string | null;
};

export async function listReceipts(): Promise<ReceiptRecord[]> {
  await ensureSchema();
  const { rows } = await getPool().query<ReceiptRecord>(
    "SELECT * FROM receipts ORDER BY created_at DESC LIMIT 500"
  );
  return rows;
}

export async function recordReceiptSendAttempt(params: {
  receiptNo: string;
  receivedFrom: string;
  clientEmail?: string;
  amount: number;
  data: unknown;
  status: "pending" | "sent" | "failed";
  error?: string;
}): Promise<void> {
  await ensureSchema();
  await getPool().query(
    `INSERT INTO receipts
      (receipt_no, received_from, client_email, amount, data, sent_at, sent_status, sent_error)
     VALUES ($1,$2,$3,$4,$5, CASE WHEN $6 = 'sent' THEN now() ELSE NULL END, $6, $7)
     ON CONFLICT (receipt_no) DO UPDATE SET
       received_from = EXCLUDED.received_from,
       client_email = EXCLUDED.client_email,
       amount = EXCLUDED.amount,
       data = EXCLUDED.data,
       sent_at = CASE
         WHEN EXCLUDED.sent_status = 'sent' THEN now()
         WHEN receipts.sent_status = 'sent' THEN receipts.sent_at
         ELSE NULL
       END,
       sent_status = CASE WHEN receipts.sent_status = 'sent' THEN receipts.sent_status ELSE EXCLUDED.sent_status END,
       sent_error = EXCLUDED.sent_error`,
    [
      params.receiptNo,
      params.receivedFrom,
      params.clientEmail ?? null,
      params.amount,
      JSON.stringify(params.data),
      params.status,
      params.error ?? null,
    ]
  );
}

export type FinalDocumentRow = {
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
  synced_at: string;
  created_at: string;
};

export async function upsertFinalDocumentRows(
  rows: {
    rowKey: string;
    timestampRaw: string;
    email: string;
    nama: string;
    kelas: string;
    judulFinalProject: string;
    statusSaatIni: string;
    batch: string;
    sertifDoneRaw: string;
  }[]
): Promise<void> {
  if (rows.length === 0) return;
  await ensureSchema();
  const pool = getPool();
  // Re-syncing must never clobber a certificate_id a previous sync already linked.
  for (const r of rows) {
    await pool.query(
      `INSERT INTO final_documents
        (row_key, timestamp_raw, email, nama, kelas, judul_final_project, status_saat_ini, batch, sertif_done_raw, synced_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, now())
       ON CONFLICT (row_key) DO UPDATE SET
         timestamp_raw = EXCLUDED.timestamp_raw,
         email = EXCLUDED.email,
         nama = EXCLUDED.nama,
         kelas = EXCLUDED.kelas,
         judul_final_project = EXCLUDED.judul_final_project,
         status_saat_ini = EXCLUDED.status_saat_ini,
         batch = EXCLUDED.batch,
         sertif_done_raw = EXCLUDED.sertif_done_raw,
         synced_at = now()`,
      [
        r.rowKey,
        r.timestampRaw,
        r.email,
        r.nama,
        r.kelas,
        r.judulFinalProject,
        r.statusSaatIni,
        r.batch,
        r.sertifDoneRaw,
      ]
    );
  }
}

export async function listFinalDocuments(): Promise<FinalDocumentRow[]> {
  await ensureSchema();
  const { rows } = await getPool().query<FinalDocumentRow>(
    "SELECT * FROM final_documents ORDER BY timestamp_raw DESC"
  );
  return rows;
}

export async function setFinalDocumentCertificateId(rowKey: string, certificateId: string): Promise<void> {
  await ensureSchema();
  await getPool().query("UPDATE final_documents SET certificate_id = $2 WHERE row_key = $1", [
    rowKey,
    certificateId,
  ]);
}

export async function getFinalDocumentByRowKey(rowKey: string): Promise<FinalDocumentRow | null> {
  await ensureSchema();
  const { rows } = await getPool().query<FinalDocumentRow>(
    "SELECT * FROM final_documents WHERE row_key = $1",
    [rowKey]
  );
  return rows[0] ?? null;
}
