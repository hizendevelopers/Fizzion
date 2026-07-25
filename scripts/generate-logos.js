const fs = require("fs");
const path = require("path");

const logos = {
  "coca-cola": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60">
  <path d="M5 8h20c8 0 14 2 18 6s6 9 6 16c0 7-2 13-6 17s-10 6-18 6H15v16h18l14 16h-30l-12-14H3v14H0V8h5zm18 10v16h10c4 0 7-1.5 9-4.5s3-6.5 3-10.5-1-7.5-3-10-5-3.5-9-3.5H23z" fill="#F40009"/>
</svg>`,
  "pepsi": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60">
  <circle cx="100" cy="30" r="28" fill="#005CB4"/>
  <path d="M100 2c-15 0-28 13-28 28 0 9 4 16 10 21l18-49 18 49c6-5 10-12 10-21 0-15-13-28-28-28z" fill="#FFFFFF"/>
  <path d="M100 2c-10 0-19 5-24 14l24 8 24-8c-5-9-14-14-24-14z" fill="#FFFFFF"/>
</svg>`,
  "7up": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60">
  <circle cx="100" cy="30" r="28" fill="#16A34A"/>
  <text x="100" y="38" text-anchor="middle" fill="#FFFFFF" font-family="Arial" font-size="28" font-weight="bold">7UP</text>
</svg>`,
  "mountain-dew": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60">
  <path d="M10 52h180l-20-44H30l-20 44z" fill="#78BE20"/>
  <text x="100" y="36" text-anchor="middle" fill="#FFFFFF" font-family="Arial" font-size="14" font-weight="bold">Mountain Dew</text>
</svg>`,
  "rc-cola": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60">
  <rect x="10" y="8" width="180" height="44" rx="8" fill="#7A1F2B"/>
  <text x="100" y="38" text-anchor="middle" fill="#FFFFFF" font-family="Arial" font-size="28" font-weight="bold">RC Cola</text>
</svg>`,
  "mirinda": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60">
  <circle cx="100" cy="30" r="28" fill="#F58220"/>
  <text x="100" y="38" text-anchor="middle" fill="#FFFFFF" font-family="Arial" font-size="24" font-weight="bold">Mirinda</text>
</svg>`,
};

const outputDir = "D:/Fizzion/apps/web/public/assets/brands";
fs.mkdirSync(outputDir, { recursive: true });

for (const [slug, svg] of Object.entries(logos)) {
  const filePath = path.join(outputDir, `${slug}.svg`);
  fs.writeFileSync(filePath, svg.trim(), "utf-8");
  console.log("Created " + filePath);
}

