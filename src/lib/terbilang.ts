const SATUAN = [
  "",
  "satu",
  "dua",
  "tiga",
  "empat",
  "lima",
  "enam",
  "tujuh",
  "delapan",
  "sembilan",
  "sepuluh",
  "sebelas",
];

function spell(n: number): string {
  n = Math.floor(n);
  if (n < 12) return SATUAN[n];
  if (n < 20) return `${spell(n - 10)} belas`;
  if (n < 100) {
    const sisa = n % 10;
    return `${spell(Math.floor(n / 10))} puluh${sisa ? " " + spell(sisa) : ""}`;
  }
  if (n < 200) return `seratus${n - 100 ? " " + spell(n - 100) : ""}`;
  if (n < 1000) {
    const sisa = n % 100;
    return `${spell(Math.floor(n / 100))} ratus${sisa ? " " + spell(sisa) : ""}`;
  }
  if (n < 2000) return `seribu${n - 1000 ? " " + spell(n - 1000) : ""}`;
  if (n < 1000000) {
    const sisa = n % 1000;
    return `${spell(Math.floor(n / 1000))} ribu${sisa ? " " + spell(sisa) : ""}`;
  }
  if (n < 1000000000) {
    const sisa = n % 1000000;
    return `${spell(Math.floor(n / 1000000))} juta${sisa ? " " + spell(sisa) : ""}`;
  }
  if (n < 1000000000000) {
    const sisa = n % 1000000000;
    return `${spell(Math.floor(n / 1000000000))} miliar${sisa ? " " + spell(sisa) : ""}`;
  }
  const sisa = n % 1000000000000;
  return `${spell(Math.floor(n / 1000000000000))} triliun${sisa ? " " + spell(sisa) : ""}`;
}

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** 6500000 -> "Enam juta lima ratus ribu rupiah" */
export function terbilangRupiah(amount: number): string {
  const n = Math.round(Math.abs(amount));
  if (n === 0) return "Nol rupiah";
  return capitalizeFirst(`${spell(n).replace(/\s+/g, " ").trim()} rupiah`);
}
