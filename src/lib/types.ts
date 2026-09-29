import type { ModuleScore } from "./grading";

export type SendMode = "certificate" | "performance";

export type ParticipantData = {
  id: string;
  nama: string;
  email: string;
  judul: string;
  batch: string;
  pelaksanaan: string;
  photoUrl?: string;
  sendMode: SendMode;
  modules: ModuleScore[];
  total: number;
  grade: string;
};

export type InvoiceItem = {
  description: string;
  qty: number;
  unitPrice: number;
};

export type InvoiceTermin = {
  termin: string;
  keterangan: string;
  tanggal: string;
  jumlah: number;
};

export type InvoiceData = {
  invoiceNo: string;
  date: string;
  paymentMethod: string;
  clientName: string;
  clientPIC: string;
  clientAddress: string;
  clientEmail: string;
  items: InvoiceItem[];
  totalLabel: string;
  termins: InvoiceTermin[];
  bankName: string;
  accountNumber: string;
  accountName: string;
  notes: string[];
};

export function invoiceSubtotal(item: InvoiceItem): number {
  return item.qty * item.unitPrice;
}

export function invoiceTotal(data: InvoiceData): number {
  return data.items.reduce((s, it) => s + invoiceSubtotal(it), 0);
}

export function invoiceProgramTotal(data: InvoiceData): number {
  return data.termins.reduce((s, t) => s + t.jumlah, 0);
}
