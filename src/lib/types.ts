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
