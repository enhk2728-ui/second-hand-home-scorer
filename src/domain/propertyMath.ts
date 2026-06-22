/**
 * Calculate unit price in 元/m² from total price in 万 and area in m².
 * Returns empty string for invalid inputs.
 */
export function calculateUnitPriceYuanPerSqm(
  totalPriceWan: number | "",
  areaSqm: number | "",
): number | "" {
  if (totalPriceWan === "" || areaSqm === "") return "";
  const price = Number(totalPriceWan);
  const area = Number(areaSqm);
  if (!Number.isFinite(price) || !Number.isFinite(area) || area <= 0 || price <= 0) return "";
  return Math.round((price * 10000 / area) * 100) / 100;
}
