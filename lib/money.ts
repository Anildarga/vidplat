export function normalizeMoney(value: unknown): number | null {
  const amount = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    return null;
  }

  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function calculatePercentageDiscount(
  price: number,
  percentage: number
): number {
  return Math.min(
    price,
    Math.round((price * (percentage / 100) + Number.EPSILON) * 100) / 100
  );
}
