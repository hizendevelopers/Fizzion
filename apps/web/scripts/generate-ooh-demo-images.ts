import fs from "node:fs/promises";
import path from "node:path";

import { buildOohDemoAssets } from "../src/lib/ooh/demo-data";

const ROOT = path.resolve(process.cwd(), "public", "demo", "ooh");
const CREATIVES = path.join(ROOT, "creatives");
const SITES = path.join(ROOT, "sites");

const PALETTES = [
  ["#F40009", "#FFB347", "#1E293B"],
  ["#2563EB", "#7DD3FC", "#0F172A"],
  ["#7C3AED", "#F472B6", "#111827"],
  ["#059669", "#FACC15", "#0B1324"],
  ["#EA580C", "#FB7185", "#172554"],
  ["#0F766E", "#22C55E", "#1F2937"],
];

function escapeText(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function paletteFor(index: number) {
  return PALETTES[index % PALETTES.length];
}

function creativeSvg(index: number, asset: ReturnType<typeof buildOohDemoAssets>[number]) {
  const [primary, accent, dark] = paletteFor(index);
  const title = escapeText(asset.brandName);
  const slogan = escapeText(asset.campaignSlogan);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900" role="img" aria-labelledby="title desc">
  <title id="title">${title} creative for ${asset.assetCode}</title>
  <desc id="desc">${escapeText(asset.brandName)} campaign creative for ${asset.city} ${asset.area}</desc>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${primary}"/>
      <stop offset="100%" stop-color="${dark}"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#bg)"/>
  <circle cx="1280" cy="190" r="150" fill="${accent}" opacity="0.28"/>
  <circle cx="250" cy="760" r="220" fill="${accent}" opacity="0.18"/>
  <rect x="120" y="120" width="160" height="14" rx="7" fill="${accent}"/>
  <text x="120" y="280" fill="#FFFFFF" font-size="120" font-family="Arial, Helvetica, sans-serif" font-weight="700">${title}</text>
  <text x="120" y="390" fill="#F8FAFC" font-size="52" font-family="Arial, Helvetica, sans-serif">${slogan}</text>
  <text x="120" y="735" fill="#E2E8F0" font-size="34" font-family="Arial, Helvetica, sans-serif">${escapeText(asset.city)} · ${escapeText(asset.area)} · ${asset.assetCode}</text>
  <rect x="120" y="510" width="420" height="150" rx="34" fill="rgba(255,255,255,0.12)"/>
  <text x="160" y="585" fill="#FFFFFF" font-size="42" font-family="Arial, Helvetica, sans-serif">${escapeText(asset.brandCategory)}</text>
  <text x="160" y="635" fill="#FFFFFF" font-size="30" font-family="Arial, Helvetica, sans-serif">${asset.mediaType === "BILLBOARD" ? "Outdoor Billboard" : "Digital Screen"}</text>
</svg>`;
}

function siteSvg(index: number, asset: ReturnType<typeof buildOohDemoAssets>[number]) {
  const [primary, accent, dark] = paletteFor(index);
  const frameFill = asset.mediaType === "BILLBOARD" ? "#111827" : "#0F172A";
  const displayX = 410;
  const displayY = 170;
  const displayWidth = 780;
  const displayHeight = 380;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900" role="img" aria-labelledby="title desc">
  <title id="title">${escapeText(asset.assetCode)} site mockup</title>
  <desc id="desc">${escapeText(asset.locationName)} in ${escapeText(asset.city)} ${escapeText(asset.area)}</desc>
  <rect width="1600" height="900" fill="#F8FAFC"/>
  <rect y="0" width="1600" height="540" fill="#E0F2FE"/>
  <rect y="540" width="1600" height="360" fill="#D6D3D1"/>
  <path d="M0 610C180 560 340 570 510 620C640 658 760 662 930 620C1080 582 1260 566 1600 640V900H0Z" fill="#CBD5E1"/>
  <rect x="${displayX - 20}" y="${displayY - 20}" width="${displayWidth + 40}" height="${displayHeight + 40}" rx="28" fill="${frameFill}"/>
  <rect x="${displayX}" y="${displayY}" width="${displayWidth}" height="${displayHeight}" rx="18" fill="${primary}"/>
  <circle cx="${displayX + 640}" cy="${displayY + 85}" r="72" fill="${accent}" opacity="0.28"/>
  <text x="${displayX + 54}" y="${displayY + 120}" fill="#FFFFFF" font-size="58" font-family="Arial, Helvetica, sans-serif" font-weight="700">${escapeText(asset.brandName)}</text>
  <text x="${displayX + 54}" y="${displayY + 185}" fill="#F8FAFC" font-size="30" font-family="Arial, Helvetica, sans-serif">${escapeText(asset.campaignSlogan)}</text>
  <text x="${displayX + 54}" y="${displayY + 320}" fill="#FFFFFF" font-size="24" font-family="Arial, Helvetica, sans-serif">${asset.assetCode}</text>
  <text x="${displayX + 54}" y="${displayY + 360}" fill="#E2E8F0" font-size="22" font-family="Arial, Helvetica, sans-serif">${escapeText(asset.city)} · ${escapeText(asset.area)} · ${escapeText(asset.mediaType.replaceAll("_", " "))}</text>
  <rect x="${displayX + 54}" y="${displayY + 230}" width="240" height="58" rx="29" fill="rgba(255,255,255,0.16)"/>
  <text x="${displayX + 84}" y="${displayY + 268}" fill="#FFFFFF" font-size="24" font-family="Arial, Helvetica, sans-serif">${escapeText(asset.brandCategory)}</text>
  <rect x="${displayX + 310}" y="550" width="24" height="170" fill="#6B7280"/>
  <rect x="${displayX + 1086}" y="550" width="24" height="170" fill="#6B7280"/>
  <path d="M1080 690H1460" stroke="#64748B" stroke-width="12" stroke-linecap="round"/>
  <path d="M120 710H580" stroke="#475569" stroke-width="18" stroke-linecap="round"/>
  <path d="M780 710H1020" stroke="#475569" stroke-width="18" stroke-linecap="round"/>
  <circle cx="1260" cy="710" r="16" fill="${dark}"/>
  <circle cx="1320" cy="710" r="16" fill="${dark}"/>
  <text x="90" y="830" fill="#1F2937" font-size="28" font-family="Arial, Helvetica, sans-serif">${escapeText(asset.locationName)}</text>
  <text x="90" y="868" fill="#475569" font-size="22" font-family="Arial, Helvetica, sans-serif">${escapeText(asset.address)}</text>
</svg>`;
}

async function main() {
  const assets = buildOohDemoAssets();
  await fs.mkdir(CREATIVES, { recursive: true });
  await fs.mkdir(SITES, { recursive: true });

  await Promise.all(
    assets.flatMap((asset, index) => [
      fs.writeFile(path.join(CREATIVES, `${asset.assetCode}.svg`), creativeSvg(index, asset), "utf8"),
      fs.writeFile(path.join(SITES, `${asset.assetCode}.svg`), siteSvg(index, asset), "utf8"),
    ]),
  );

  console.log(`Generated ${assets.length} creative SVGs and ${assets.length} site SVGs.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
