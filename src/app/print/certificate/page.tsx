import QRCode from "qrcode";
import { CertificateTemplate } from "@/components/templates/CertificateTemplate";
import { decodeParticipant } from "@/lib/encode";
import { buildVerifyUrl } from "@/lib/verify-link";
import type { ParticipantData } from "@/lib/types";

type Props = { searchParams: Promise<{ d?: string }> };

export async function generateMetadata({ searchParams }: Props) {
  const { d } = await searchParams;
  if (!d) return { title: "Certificate" };
  const data = decodeParticipant<ParticipantData>(d);
  return { title: `${data.nama} - Certificate` };
}

export default async function CertificatePrintPage({ searchParams }: Props) {
  const { d } = await searchParams;
  if (!d) return null;
  const data = decodeParticipant<ParticipantData>(d);
  const verifyUrl = buildVerifyUrl(data.id);
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 0, width: 200 });
  return <CertificateTemplate data={data} qrDataUrl={qrDataUrl} verifyUrl={verifyUrl} />;
}
