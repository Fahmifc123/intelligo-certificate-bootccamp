import type { ParticipantData } from "./types";

export function encodeParticipant(data: ParticipantData): string {
  return Buffer.from(JSON.stringify(data), "utf-8").toString("base64url");
}

export function decodeParticipant(encoded: string): ParticipantData {
  return JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8"));
}
