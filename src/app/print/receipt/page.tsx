import { ReceiptTemplate } from "@/components/templates/ReceiptTemplate";
import { decodeParticipant } from "@/lib/encode";
import type { ReceiptData } from "@/lib/types";

type Props = { searchParams: Promise<{ d?: string }> };

export async function generateMetadata({ searchParams }: Props) {
  const { d } = await searchParams;
  if (!d) return { title: "Bukti Pembayaran" };
  const data = decodeParticipant<ReceiptData>(d);
  return { title: `Bukti Pembayaran ${data.receiptNo} - ${data.receivedFrom}` };
}

export default async function ReceiptPrintPage({ searchParams }: Props) {
  const { d } = await searchParams;
  if (!d) return null;
  const data = decodeParticipant<ReceiptData>(d);
  return <ReceiptTemplate data={data} />;
}
