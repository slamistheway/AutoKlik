type SavedAd = {
  category: string | null;
  subcategory: string | null;
  brand: string | null;
  model: string | null;
  fuel: string | null;
  price: string | null;
};

export const recommendationWeights = {
  category: 2,
  subcategory: 3,
  brand: 5,
  model: 7,
  fuel: 1,
} as const;

export function buildRecommendationPreferences(saved: SavedAd[]) {
  const signals = (
    Object.keys(recommendationWeights) as (keyof typeof recommendationWeights)[]
  ).flatMap((field) => {
    const counts = new Map<string, number>();
    for (const ad of saved) {
      const value = ad[field]?.trim().toLowerCase();
      if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return [...counts].map(([value, count]) => ({
      field,
      value,
      weight: (recommendationWeights[field] * count) / saved.length,
    }));
  });
  const prices = saved
    .map((ad) => Number(ad.price))
    .filter((price) => Number.isFinite(price) && price > 0)
    .sort((a, b) => a - b);
  const middle = Math.floor(prices.length / 2);
  const price = prices.length
    ? prices.length % 2
      ? prices[middle]
      : (prices[middle - 1] + prices[middle]) / 2
    : null;
  return { signals, price };
}
