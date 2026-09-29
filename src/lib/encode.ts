import type { ParticipantData } from "./types";

export function encodeParticipant<T = ParticipantData>(data: T): string {
  return Buffer.from(JSON.stringify(data), "utf-8").toString("base64url");
}

export function decodeParticipant<T = ParticipantData>(encoded: string): T {
  return JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8"));
}
