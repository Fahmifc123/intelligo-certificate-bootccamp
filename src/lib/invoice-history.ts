import { isDbConfigured, recordInvoiceSendAttempt } from "./db";
import { invoiceTotal, type InvoiceData } from "./types";

export async function saveInvoiceAttempt(
  data: InvoiceData,
  status: "pending" | "sent" | "failed",
  error?: string
): Promise<void> {
  if (!isDbConfigured()) return;
  try {
    await recordInvoiceSendAttempt({
      invoiceNo: data.invoiceNo,
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      total: invoiceTotal(data),
      data,
      status,
      error,
    });
  } catch (e) {
    console.error("Failed to record invoice history:", e);
  }
}
