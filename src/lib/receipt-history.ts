import { isDbConfigured, recordReceiptSendAttempt } from "./db";
import type { ReceiptData } from "./types";

export async function saveReceiptAttempt(
  data: ReceiptData,
  status: "pending" | "sent" | "failed",
  error?: string
): Promise<void> {
  if (!isDbConfigured()) return;
  try {
    await recordReceiptSendAttempt({
      receiptNo: data.receiptNo,
      receivedFrom: data.receivedFrom,
      clientEmail: data.receivedEmail,
      amount: data.amount,
      data,
      status,
      error,
    });
  } catch (e) {
    console.error("Failed to record receipt history:", e);
  }
}
