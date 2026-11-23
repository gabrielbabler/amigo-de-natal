export function buildAmazonSearchUrl(
  searchQuery: string,
  maxPriceCents?: number
): string {
  const tag = process.env.NEXT_PUBLIC_AMAZON_TAG ?? "amigodenatal-20";
  const url = new URL("https://www.amazon.com.br/s");
  url.searchParams.set("k", searchQuery.trim());
  if (maxPriceCents && maxPriceCents > 0) {
    url.searchParams.set("high-price", String(Math.ceil(maxPriceCents / 100)));
  }
  if (tag) {
    url.searchParams.set("tag", tag);
  }
  return url.toString();
}

export function buildMercadoLivreSearchUrl(
  searchQuery: string,
  maxPriceCents?: number
): string {
  const meliTag = process.env.NEXT_PUBLIC_MELI_TAG ?? "";
  const slug = encodeURIComponent(searchQuery.trim().replace(/\s+/g, "-"));
  const priceSuffix =
    maxPriceCents && maxPriceCents > 0
      ? `_PriceRange_0BRL-${Math.ceil(maxPriceCents / 100)}BRL`
      : "";
  const base = `https://lista.mercadolivre.com.br/${slug}${priceSuffix}`;
  if (!meliTag) return base;
  const url = new URL(base);
  url.searchParams.set("matt_tool", meliTag);
  return url.toString();
}
