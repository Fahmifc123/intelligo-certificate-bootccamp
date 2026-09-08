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
};

export async function listCertificates(): Promise<CertificateRecord[]> {
  await ensureSchema();
  const { rows } = await getPool().query<CertificateRecord>(
    "SELECT * FROM certificates ORDER BY created_at DESC LIMIT 500"
  );
  return rows;
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
  status: "sent" | "failed";
  error?: string;
}): Promise<void> {
  await ensureSchema();
  await getPool().query(
    `INSERT INTO certificates
      (id, nama, email, judul, batch, pelaksanaan, photo_url, send_mode, total, grade, modules, sent_at, sent_status, sent_error)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now(), $12, $13)
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
       sent_at = now(),
       sent_status = EXCLUDED.sent_status,
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
      params.status,
      params.error ?? null,
    ]
  );
}
