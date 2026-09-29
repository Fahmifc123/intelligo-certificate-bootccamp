import { InvoiceTemplate } from "@/components/templates/InvoiceTemplate";
import { decodeParticipant } from "@/lib/encode";
import type { InvoiceData } from "@/lib/types";

export default async function InvoicePrintPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  const { d } = await searchParams;
  if (!d) return null;
  const data = decodeParticipant<InvoiceData>(d);
  return <InvoiceTemplate data={data} />;
}
