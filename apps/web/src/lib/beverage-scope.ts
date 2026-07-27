const BEVERAGE_CATEGORY = "beverages";

const BEVERAGE_BRAND_TOKENS = new Set([
  "cocacola",
  "cocacolazerosugar",
  "sprite",
  "fanta",
  "pepsi",
  "7up",
  "mirinda",
  "mountaindew",
  "rccola",
]);

function normalizeBrandToken(value: string | null | undefined) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function isBeverageScopedBrand(input: {
  name?: string | null;
  slug?: string | null;
  category?: string | null;
}) {
  if ((input.category ?? "").trim().toLowerCase() === BEVERAGE_CATEGORY) {
    return true;
  }

  const slugToken = normalizeBrandToken(input.slug);
  if (slugToken && BEVERAGE_BRAND_TOKENS.has(slugToken)) {
    return true;
  }

  const nameToken = normalizeBrandToken(input.name);
  return nameToken.length > 0 && BEVERAGE_BRAND_TOKENS.has(nameToken);
}
