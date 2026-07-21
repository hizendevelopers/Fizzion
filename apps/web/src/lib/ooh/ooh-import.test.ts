import assert from "node:assert/strict";
import test from "node:test";

import * as XLSX from "xlsx";

import { previewOohWorkbook } from "@/lib/ooh/ooh-import";

test("OOH import preview fills down merged cells, ignores totals, and normalizes rows", () => {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([
    ["Region", "City", "Description", "Site code", "Width", "Height", "Faces", "Total SQM"],
    ["Arabic region", "Mousel", "Main boulevard billboard", "  khi – bb - 9001 ", "14", "6", "1", "84"],
    ["", "", "Airport corridor LED", "bgd — ds - 0042", "1920", "1080", "1", ""],
    ["Grand Total", "", "", "", "", "", "", ""],
  ]);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Arabic region (OOH+ LED)");

  const preview = previewOohWorkbook(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer);

  assert.equal(preview.rows.length, 2);
  assert.equal(preview.rows[0]?.city, "Mosul");
  assert.equal(preview.rows[0]?.assetCode, "KHI-BB-9001");
  assert.equal(preview.rows[0]?.mediaType, "BILLBOARD");
  assert.equal(preview.rows[1]?.city, "Mosul");
  assert.equal(preview.rows[1]?.mediaType, "DIGITAL_SCREEN");
  assert.equal(preview.rows[1]?.dimensionUnit, "PIXEL");
  assert.ok(preview.skippedCount >= 2);
});
