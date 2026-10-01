import { PerformanceReportTemplate } from "@/components/templates/PerformanceReportTemplate";
import { decodeParticipant } from "@/lib/encode";
import type { ParticipantData } from "@/lib/types";

type Props = { searchParams: Promise<{ d?: string }> };

export async function generateMetadata({ searchParams }: Props) {
  const { d } = await searchParams;
  if (!d) return { title: "Performance Report" };
  const data = decodeParticipant<ParticipantData>(d);
  return { title: `${data.nama} - Performance Report` };
}

export default async function PerformancePrintPage({ searchParams }: Props) {
  const { d } = await searchParams;
  if (!d) return null;
  const data = decodeParticipant(d);
  return <PerformanceReportTemplate data={data} />;
}
