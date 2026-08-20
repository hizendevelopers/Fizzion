import assert from "node:assert/strict";
import { test } from "vitest";

import { buildOohDemoAssets, getOohDemoAreas } from "@/lib/ooh/demo-data";

test("OOH demo seed builds exactly 200 assets with the required city and media split", () => {
  const assets = buildOohDemoAssets();
  assert.equal(assets.length, 200);

  const karachi = assets.filter((asset) => asset.city === "Karachi");
  const baghdad = assets.filter((asset) => asset.city === "Baghdad");
  assert.equal(karachi.length, 100);
  assert.equal(baghdad.length, 100);
  assert.equal(karachi.filter((asset) => asset.mediaType === "BILLBOARD").length, 70);
  assert.equal(karachi.filter((asset) => asset.mediaType === "DIGITAL_SCREEN").length, 30);
  assert.equal(baghdad.filter((asset) => asset.mediaType === "BILLBOARD").length, 70);
  assert.equal(baghdad.filter((asset) => asset.mediaType === "DIGITAL_SCREEN").length, 30);
});

test("every OOH area has exactly ten deterministic assets with valid coordinates and primary images", () => {
  const assets = buildOohDemoAssets();
  const areas = getOohDemoAreas();

  for (const area of areas) {
    const areaAssets = assets.filter((asset) => asset.areaSlug === area.slug);
    assert.equal(areaAssets.length, 10);
    assert.equal(areaAssets.filter((asset) => asset.mediaType === "BILLBOARD").length, 7);
    assert.equal(areaAssets.filter((asset) => asset.mediaType === "DIGITAL_SCREEN").length, 3);

    for (const asset of areaAssets) {
      assert.ok(asset.latitude >= -90 && asset.latitude <= 90);
      assert.ok(asset.longitude >= -180 && asset.longitude <= 180);
      assert.match(asset.siteImagePath, /^\/demo\/ooh\/sites\/.+\.svg$/);
      assert.match(asset.creativeImagePath, /^\/demo\/ooh\/creatives\/.+\.svg$/);
    }
  }
});
