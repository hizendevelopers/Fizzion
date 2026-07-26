import fs from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright";

import { WEB_DEMO_BRAND_SOURCES, WEB_DEMO_WEBSITES } from "@/lib/web-demo-seed";

const ROOT = path.resolve(process.cwd(), "public", "demo", "web");
const BRAND_DIR = path.join(ROOT, "brands");
const WEBSITE_DIR = path.join(ROOT, "websites");

type CaptureTarget = {
  key: string;
  label: string;
  url: string;
  outputPath: string;
  accent: string;
  kind: "brand" | "website";
};

const BRAND_ACCENTS = [
  "#F40009",
  "#005CB4",
  "#16A34A",
  "#F58220",
  "#7B2CBF",
  "#1428A0",
  "#DC2626",
  "#0F766E",
  "#F97316",
  "#1A1F71",
];

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

function buildTargets(): CaptureTarget[] {
  const brandTargets = Object.entries(WEB_DEMO_BRAND_SOURCES).map(([slug, source], index) => ({
    key: slug,
    label: slug.replaceAll("-", " "),
    url: source.homepageUrl,
    outputPath: path.join(BRAND_DIR, `${slug}.jpg`),
    accent: BRAND_ACCENTS[index % BRAND_ACCENTS.length] ?? "#F40009",
    kind: "brand" as const,
  }));

  const websiteTargets = WEB_DEMO_WEBSITES.map((website, index) => ({
    key: website.domain,
    label: website.name,
    url: website.homepageUrl,
    outputPath: path.join(WEBSITE_DIR, `${website.domain}.jpg`),
    accent: BRAND_ACCENTS[index % BRAND_ACCENTS.length] ?? "#7C3AED",
    kind: "website" as const,
  }));

  return [...brandTargets, ...websiteTargets];
}

async function softDismissOverlays(page: import("playwright").Page) {
  const labels = [
    "Accept",
    "I Agree",
    "Allow all",
    "Accept all",
    "Got it",
    "Continue",
  ];

  for (const label of labels) {
    const button = page.getByRole("button", { name: new RegExp(`^${label}$`, "i") }).first();
    try {
      if (await button.isVisible({ timeout: 600 })) {
        await button.click({ timeout: 600 });
        return;
      }
    } catch {
      // Best-effort only.
    }
  }
}

async function writeFallback(page: import("playwright").Page, target: CaptureTarget, errorMessage: string) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.setContent(
    `<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(target.label)}</title>
        <style>
          body {
            margin: 0;
            font-family: Arial, Helvetica, sans-serif;
            background:
              radial-gradient(circle at top right, rgba(255,255,255,0.18), transparent 34%),
              linear-gradient(135deg, ${target.accent} 0%, #111827 100%);
            color: white;
          }
          .frame {
            width: 1440px;
            height: 900px;
            padding: 84px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .eyebrow {
            letter-spacing: 0.4em;
            font-size: 18px;
            opacity: 0.72;
            text-transform: uppercase;
          }
          h1 {
            font-size: 92px;
            line-height: 1;
            margin: 20px 0 24px;
            max-width: 820px;
          }
          .meta {
            max-width: 920px;
            font-size: 28px;
            line-height: 1.45;
            color: rgba(255,255,255,0.86);
          }
          .url {
            display: inline-flex;
            align-items: center;
            margin-top: 34px;
            padding: 14px 20px;
            border-radius: 999px;
            background: rgba(255,255,255,0.12);
            font-size: 24px;
          }
          .footer {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            gap: 24px;
          }
          .note {
            font-size: 22px;
            line-height: 1.5;
            color: rgba(255,255,255,0.72);
            max-width: 860px;
          }
          .badge {
            border-radius: 20px;
            padding: 14px 18px;
            background: rgba(255,255,255,0.14);
            font-size: 22px;
            font-weight: 700;
          }
        </style>
      </head>
      <body>
        <div class="frame">
          <div>
            <div class="eyebrow">${target.kind === "brand" ? "Brand Website Capture" : "Publisher Website Capture"}</div>
            <h1>${escapeHtml(target.label)}</h1>
            <div class="meta">Live page capture fallback prepared for the Web ad gallery so the platform still shows screenshot evidence cleanly.</div>
            <div class="url">${escapeHtml(target.url)}</div>
          </div>
          <div class="footer">
            <div class="note">${escapeHtml(errorMessage)}</div>
            <div class="badge">${target.kind === "brand" ? "Brand creative source" : "Website source"}</div>
          </div>
        </div>
      </body>
    </html>`,
    { waitUntil: "load" },
  );

  await page.screenshot({
    path: target.outputPath,
    type: "jpeg",
    quality: 86,
  });
}

async function captureTarget(page: import("playwright").Page, target: CaptureTarget) {
  try {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(target.url, { waitUntil: "domcontentloaded", timeout: 12_000 });
    await page.waitForTimeout(1_500);
    await softDismissOverlays(page);
    await page.waitForTimeout(600);
    await page.screenshot({
      path: target.outputPath,
      type: "jpeg",
      quality: 84,
      fullPage: false,
    });
    return { target: target.key, mode: "live" as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown capture error.";
    await writeFallback(page, target, message);
    return { target: target.key, mode: "fallback" as const, reason: message };
  }
}

async function main() {
  await fs.mkdir(BRAND_DIR, { recursive: true });
  await fs.mkdir(WEBSITE_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "en-US",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
  });
  const fallbackOnly = process.env.WEB_DEMO_CAPTURE_STRATEGY === "fallback";
  const results = [];
  for (const target of buildTargets()) {
    try {
      await fs.access(target.outputPath);
      results.push({ target: target.key, mode: "skipped" as const });
      continue;
    } catch {
      // File does not exist yet.
    }

    const page = await context.newPage();
    const result = fallbackOnly
      ? await (async () => {
          await writeFallback(page, target, "Branded website preview prepared for the Web ad gallery.");
          return { target: target.key, mode: "fallback-static" as const };
        })()
      : await captureTarget(page, target);
    results.push(result);
    await page.close();
  }

  await browser.close();

  const liveCount = results.filter((result) => result.mode === "live").length;
  const fallbackCount = results.length - liveCount;
  console.log(JSON.stringify({ status: "ok", generated: results.length, liveCount, fallbackCount, results }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
