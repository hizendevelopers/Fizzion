import { test } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

test("web filter bar uses floating overlays without moving the main bar layout", () => {
  const source = readFileSync(join(process.cwd(), "src/components/web/web-dashboard.tsx"), "utf8");

  assert.match(source, /createPortal/);
  assert.match(source, /function FilterPopoverShell/);
  assert.match(source, /fixed inset-x-4 bottom-4 max-h-\[72vh\]/);
  assert.match(source, /const \[openFilterPanel, setOpenFilterPanel\] = useState<WebFilterPanel>\(null\)/);
  assert.match(source, /isOpen=\{openFilterPanel === "brands"\}/);
  assert.match(source, /isOpen=\{openFilterPanel === "campaigns"\}/);
  assert.match(source, /isOpen=\{openFilterPanel === "websites"\}/);
  assert.match(source, /isOpen=\{openFilterPanel === "languages"\}/);
  assert.match(source, /isOpen=\{openFilterPanel === "adFormats"\}/);
  assert.match(source, /isOpen=\{openFilterPanel === "pageTypes"\}/);
  assert.match(source, /isOpen=\{openFilterPanel === "statuses"\}/);
  assert.match(source, /setOpenFilterPanel\(null\)/);
  assert.match(source, /Select all/);
  assert.match(source, /Clear all/);
  assert.match(source, /emptyLabel="No websites found\."|emptyLabel="No brands found\."/);
});
