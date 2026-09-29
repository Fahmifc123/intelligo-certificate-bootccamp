const ROMAN_MONTHS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const ID_MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

/** dateStr: "YYYY-MM-DD" (from an <input type="date">) */
export function makeInvoiceNo(categoryCode: string, dateStr: string, seq: number): string {
  const [year, month] = dateStr.split("-").map(Number);
  const roman = ROMAN_MONTHS[(month || 1) - 1] ?? "I";
  const seqStr = String(seq).padStart(3, "0");
  return `INTL/INV/${categoryCode.trim().toUpperCase() || "CT"}/${roman}/${year}_${seqStr}`;
}

/** dateStr: "YYYY-MM-DD" -> "1 Agustus 2026" */
export function formatIndonesianDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const name = ID_MONTHS[(month || 1) - 1] ?? "";
  return `${day} ${name} ${year}`;
}

export function todayInputValue(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}
