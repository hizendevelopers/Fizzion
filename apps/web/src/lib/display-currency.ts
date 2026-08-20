const USD_EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  PKR: 277.67,
  IQD: 1310.17,
};

function normalizeCurrency(currency: string | null | undefined) {
  return (currency ?? "USD").trim().toUpperCase() || "USD";
}

export function convertAmountToUsd(value: number, currency: string | null | undefined) {
  const normalizedCurrency = normalizeCurrency(currency);
  const rate = USD_EXCHANGE_RATES[normalizedCurrency];
  if (!Number.isFinite(value)) return 0;
  if (!rate) return value;
  return value / rate;
}

export function formatUsdFromCurrency(value: number, currency: string | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(convertAmountToUsd(value, currency));
}

export function formatCompactUsdFromCurrency(value: number, currency: string | null | undefined) {
  const converted = convertAmountToUsd(value, currency);
  if (converted === 0) return "$0";
  return `$${new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: converted >= 1_000_000 ? 1 : 0,
  }).format(converted)}`;
}
