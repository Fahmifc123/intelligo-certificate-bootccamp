import { PerformanceReportTemplate } from "@/components/templates/PerformanceReportTemplate";
import { decodeParticipant } from "@/lib/encode";

export default async function PerformancePrintPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  const { d } = await searchParams;
  if (!d) return null;
  const data = decodeParticipant(d);
  return <PerformanceReportTemplate data={data} />;
}
