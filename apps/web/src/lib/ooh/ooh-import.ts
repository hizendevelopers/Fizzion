import * as XLSX from "xlsx";

import {
  assignOohAssetCoordinates,
  buildOohImportAssetInput,
  createOohAsset,
  estimateImportAudience,
  listOohAreas,
} from "./ooh-data";

type ImportSection = "BILLBOARD" | "DIGITAL_SCREEN";

export type OohImportPreviewRow = {
  sourceSheet: string;
  sourceRow: number;
  region: string;
  city: string;
  locationName: string;
  assetCode: string;
  mediaType: ImportSection;
  width: number | null;
  height: number | null;
  dimensionUnit: "METER" | "PIXEL" | "THREE_D";
  numberOfFaces: number;
  totalSqm: number | null;
  warnings: string[];
  rawData: Record<string, unknown>;
};

export type OohImportPreview = {
  sheets: string[];
  rows: OohImportPreviewRow[];
  warningCount: number;
  skippedCount: number;
};

const CITY_NORMALIZATION: Record<string, string> = {
  mosul: "Mosul",
  mousel: "Mosul",
  musil: "Mosul",
  baghdad: "Baghdad",
  karachi: "Karachi",
  erbil: "Erbil",
  basra: "Basra",
  najaf: "Najaf",
};

function normalizeCell(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

function cleanSiteCode(value: string) {
  return value
    .replace(/[–—−]/g, "-")
    .replace(/\t+/g, "")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s+/g, "")
    .toUpperCase();
}

function normalizeCity(value: string) {
  const normalized = normalizeCell(value);
  if (!normalized) return "";
  return CITY_NORMALIZATION[normalized.toLowerCase()] ?? normalized;
}

function parseNumber(value: string) {
  const normalized = value.replace(/,/g, "").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function detectSection(label: string, previous: ImportSection) {
  const normalized = label.toLowerCase();
  if (normalized.includes("digital") || normalized.includes("led")) {
    return "DIGITAL_SCREEN";
  }
  if (normalized.includes("billboard") || normalized.includes("static")) {
    return "BILLBOARD";
  }
  return previous;
}

function isHeaderOrTotalRow(cells: string[]) {
  const joined = cells.join(" ").toLowerCase();
  if (!joined.trim()) return true;
  return (
    joined.includes("grand total") ||
    joined.includes("total sqm") ||
    joined.includes("number of faces") ||
    joined.includes("site code") ||
    joined.includes("description") ||
    joined.includes("duration") ||
    joined === "summary"
  );
}

function inferDimensionUnit(section: ImportSection, widthRaw: string, heightRaw: string) {
  const combined = `${widthRaw} ${heightRaw}`.toLowerCase();
  if (combined.includes("3d")) return "THREE_D" as const;
  if (section === "DIGITAL_SCREEN" || combined.includes("pixel")) return "PIXEL" as const;
  return "METER" as const;
}

function buildLocationName(city: string, description: string, assetCode: string) {
  return description || `${city} ${assetCode}`;
}

export function previewOohWorkbook(buffer: Buffer, requestedSheets?: string[]) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheets = requestedSheets?.length ? requestedSheets : workbook.SheetNames.filter((name) => name.toLowerCase() !== "summary");
  const rows: OohImportPreviewRow[] = [];
  let warningCount = 0;
  let skippedCount = 0;

  for (const sheetName of sheets) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;
    const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(worksheet, {
      header: 1,
      raw: false,
      blankrows: false,
      defval: "",
    });

    let activeRegion = "";
    let activeCity = "";
    let activeSection: ImportSection = /led|digital/i.test(sheetName) ? "DIGITAL_SCREEN" : "BILLBOARD";

    for (let index = 0; index < matrix.length; index += 1) {
      const row = matrix[index] ?? [];
      const cells = row.map((value) => normalizeCell(value));
      const joined = cells.join(" ").trim();

      if (!joined) {
        skippedCount += 1;
        continue;
      }

      activeSection = detectSection(joined, activeSection);

      if (isHeaderOrTotalRow(cells)) {
        skippedCount += 1;
        continue;
      }

      if (cells[0]) activeRegion = cells[0];
      if (cells[1]) activeCity = normalizeCity(cells[1]);

      const description = cells[2] || cells[3];
      const assetCode = cleanSiteCode(cells[3] || cells[4] || "");
      const widthRaw = cells[4] || cells[5] || "";
      const heightRaw = cells[5] || cells[6] || "";
      const facesRaw = cells[7] || cells[8] || "1";
      const sqmRaw = cells[8] || cells[9] || "";

      if (!assetCode || !description) {
        skippedCount += 1;
        continue;
      }

      const width = parseNumber(widthRaw);
      const height = parseNumber(heightRaw);
      const numberOfFaces = parseNumber(facesRaw) ?? 1;
      const totalSqm = parseNumber(sqmRaw);
      const warnings: string[] = [];

      if (!activeRegion) warnings.push("Region was blank and could not be filled down.");
      if (!activeCity) warnings.push("City was blank and could not be filled down.");
      if (width === null || height === null) warnings.push("Dimension value is ambiguous.");
      if (normalizeCity(activeCity) !== activeCity) warnings.push(`City normalized to ${normalizeCity(activeCity)}.`);

      warningCount += warnings.length;

      rows.push({
        sourceSheet: sheetName,
        sourceRow: index + 1,
        region: activeRegion,
        city: activeCity,
        locationName: buildLocationName(activeCity, description, assetCode),
        assetCode,
        mediaType: activeSection,
        width,
        height,
        dimensionUnit: inferDimensionUnit(activeSection, widthRaw, heightRaw),
        numberOfFaces,
        totalSqm,
        warnings,
        rawData: {
          region: activeRegion,
          city: activeCity,
          cells,
          section: activeSection,
        },
      });
    }
  }

  return {
    sheets,
    rows,
    warningCount,
    skippedCount,
  } satisfies OohImportPreview;
}

export async function importOohWorkbookRows(preview: OohImportPreview) {
  const importedAssetIds: string[] = [];
  const importedRows: Array<{ row: OohImportPreviewRow; assetId: string }> = [];
  const areas = await listOohAreas();
  const areaLookup = new Map(areas.map((area) => [`${area.city.toLowerCase()}::${area.name.toLowerCase()}`, area.id]));

  for (const row of preview.rows) {
    const guessedAreaId =
      areaLookup.get(`${row.city.toLowerCase()}::${row.region.toLowerCase()}`) ??
      areaLookup.get(`${row.city.toLowerCase()}::${row.locationName.toLowerCase()}`) ??
      null;
    const audienceEstimate = estimateImportAudience(row.mediaType, row.city, row.width);

    const assetId = await createOohAsset({
      ...buildOohImportAssetInput({
        assetCode: row.assetCode,
        mediaType: row.mediaType,
        city: row.city || "Unknown city",
        country: /baghdad|iraq/i.test(row.city) ? "Iraq" : "Pakistan",
        areaId: guessedAreaId,
        locationName: row.locationName,
        width: row.width,
        height: row.height,
        dimensionUnit: row.dimensionUnit,
        numberOfFaces: row.numberOfFaces,
        totalSqm: row.totalSqm,
        notes: row.warnings.length > 0 ? row.warnings.join(" ") : `Imported from ${row.sourceSheet} row ${row.sourceRow}.`,
      }),
      expectedDailyAudience: audienceEstimate.expectedDailyAudience,
      estimatedDailyImpressions: audienceEstimate.estimatedDailyImpressions,
      visibilityScore: audienceEstimate.visibilityScore,
      audienceConfidence: audienceEstimate.audienceConfidence,
    });
    importedAssetIds.push(assetId);
    importedRows.push({ row, assetId });
  }

  return {
    assetIds: importedAssetIds,
    importedRows,
  };
}

export async function resolveImportedAssetCoordinates(assetId: string, latitude: number, longitude: number) {
  await assignOohAssetCoordinates(assetId, latitude, longitude);
}
