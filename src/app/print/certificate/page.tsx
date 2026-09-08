import { CertificateTemplate } from "@/components/templates/CertificateTemplate";
import { decodeParticipant } from "@/lib/encode";

export default async function CertificatePrintPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  const { d } = await searchParams;
  if (!d) return null;
  const data = decodeParticipant(d);
  return <CertificateTemplate data={data} />;
}
