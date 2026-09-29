import type { ParticipantData } from "./types";

export function encodeParticipantClient<T = ParticipantData>(data: T): string {
  const json = JSON.stringify(data);
  const base64 = btoa(unescape(encodeURIComponent(json)));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
