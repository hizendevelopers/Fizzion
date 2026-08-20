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

const BEVERAGE_CATEGORY_KEYWORDS = ["cola", "carbonated", "soft drink", "soda", "sparkling"];

function normalizeBrandToken(value: string | null | undefined) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function isBeverageScopedBrand(input: {
  name?: string | null;
  slug?: string | null;
  category?: string | null;
}) {
  const slugToken = normalizeBrandToken(input.slug);
  if (slugToken && BEVERAGE_BRAND_TOKENS.has(slugToken)) {
    return true;
  }

  const nameToken = normalizeBrandToken(input.name);
  if (nameToken.length > 0 && BEVERAGE_BRAND_TOKENS.has(nameToken)) {
    return true;
  }

  const normalizedCategory = (input.category ?? "").trim().toLowerCase();
  if (normalizedCategory !== BEVERAGE_CATEGORY) {
    return false;
  }

  const normalizedName = (input.name ?? "").trim().toLowerCase();
  const normalizedSlug = (input.slug ?? "").trim().toLowerCase();

  return BEVERAGE_CATEGORY_KEYWORDS.some((keyword) =>
    normalizedName.includes(keyword) || normalizedSlug.includes(keyword),
  );
}
