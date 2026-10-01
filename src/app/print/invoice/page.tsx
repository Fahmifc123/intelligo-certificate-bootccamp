import { InvoiceTemplate } from "@/components/templates/InvoiceTemplate";
import { decodeParticipant } from "@/lib/encode";
import type { InvoiceData } from "@/lib/types";

type Props = { searchParams: Promise<{ d?: string }> };

export async function generateMetadata({ searchParams }: Props) {
  const { d } = await searchParams;
  if (!d) return { title: "Invoice" };
  const data = decodeParticipant<InvoiceData>(d);
  return { title: `Invoice ${data.invoiceNo} - ${data.clientName}` };
}

export default async function InvoicePrintPage({ searchParams }: Props) {
  const { d } = await searchParams;
  if (!d) return null;
  const data = decodeParticipant<InvoiceData>(d);
  return <InvoiceTemplate data={data} />;
}
