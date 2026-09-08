import type { Browser } from "puppeteer-core";

async function launchBrowser(): Promise<Browser> {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    const chromium = (await import("@sparticuz/chromium")).default;
    const puppeteer = await import("puppeteer-core");
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    }) as unknown as Promise<Browser>;
  }
  const puppeteer = await import("puppeteer");
  return puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  }) as unknown as Promise<Browser>;
}

export type PdfKind = "certificate" | "performance";

const PAGE_SIZE: Record<PdfKind, { width: string; height: string }> = {
  certificate: { width: "10in", height: "7.5in" },
  performance: { width: "8.27in", height: "11.69in" },
};

export async function renderPdf(baseUrl: string, kind: PdfKind, encoded: string): Promise<Buffer> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    const url = `${baseUrl}/print/${kind}?d=${encoded}`;
    await page.goto(url, { waitUntil: "networkidle0" });
    const { width, height } = PAGE_SIZE[kind];
    const pdf = await page.pdf({
      width,
      height,
      printBackground: true,
      margin: { top: "0", bottom: "0", left: "0", right: "0" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
