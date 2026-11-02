export const VERIFY_BASE_URL = "https://intelligo.id/cek-sertifikat";

export function buildVerifyUrl(certificateId: string): string {
  return `${VERIFY_BASE_URL}/${encodeURIComponent(certificateId)}`;
}
