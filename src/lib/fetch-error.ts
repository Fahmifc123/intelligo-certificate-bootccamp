export async function readErrorMessage(res: Response): Promise<string> {
  try {
    const text = await res.text();
    if (!text) return `${res.status} ${res.statusText || "Unknown error"}`;
    try {
      const json = JSON.parse(text);
      return json.error || text;
    } catch {
      return text;
    }
  } catch {
    return `${res.status} ${res.statusText || "Unknown error"}`;
  }
}
