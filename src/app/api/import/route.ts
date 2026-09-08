import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { computeGrade, computeTotal, type ModuleScore } from "@/lib/grading";
import type { ParticipantData, SendMode } from "@/lib/types";

const FIXED_COLUMNS = new Set([
  "no.",
  "id",
  "nama",
  "email",
  "sendmode",
  "judul",
  "batch",
  "pelaksanaan",
  "photo_url",
  "total",
  "grade",
]);

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buf, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  if (rows.length === 0) {
    return NextResponse.json({ participants: [] });
  }

  const headerKeys = Object.keys(rows[0]);
  const moduleKeys = headerKeys.filter(
    (k) => !FIXED_COLUMNS.has(k.trim().toLowerCase())
  );

  const bobotRowIndex = rows.findIndex((r) =>
    String(r["No."] ?? "").trim().toLowerCase() === "bobot"
  );
  const weights: Record<string, number> = {};
  if (bobotRowIndex >= 0) {
    for (const key of moduleKeys) {
      const v = Number(rows[bobotRowIndex][key]);
      weights[key] = Number.isFinite(v) ? v : 0;
    }
  } else {
    for (const key of moduleKeys) weights[key] = 1 / moduleKeys.length;
  }

  const participants: ParticipantData[] = [];

  for (const row of rows) {
    const nama = String(row["nama"] ?? "").trim();
    if (!nama || String(row["No."] ?? "").trim().toLowerCase() === "bobot") continue;

    const modules: ModuleScore[] = moduleKeys
      .map((key) => {
        const raw = row[key];
        const score = Number(raw);
        return { module: key.replace(/\s+/g, " ").trim(), weight: weights[key] ?? 0, score };
      })
      .filter((m) => Number.isFinite(m.score) && m.weight > 0);

    const total = modules.length > 0 ? computeTotal(modules) : Number(row["Total"]) || 0;
    const grade = modules.length > 0 ? computeGrade(total) : String(row["Grade"] ?? "");

    const sendModeRaw = String(row["sendMode"] ?? "").trim().toLowerCase();
    const sendMode: SendMode = sendModeRaw === "performance" ? "performance" : "certificate";

    participants.push({
      id: String(row["id"] ?? ""),
      nama,
      email: String(row["email"] ?? "").trim(),
      judul: String(row["judul"] ?? "").trim(),
      batch: String(row["batch"] ?? "").trim(),
      pelaksanaan: String(row["pelaksanaan"] ?? "").trim(),
      photoUrl: String(row["photo_url"] ?? "").trim() || undefined,
      sendMode,
      modules,
      total,
      grade,
    });
  }

  return NextResponse.json({ participants });
}
