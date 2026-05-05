const conditionSearchTerms = {
  "Raw/Near Mint": "near mint",
  "Lightly Played": "lightly played",
  "Moderately Played": "moderately played",
  "Heavily Played": "heavily played",
  "Damaged": "damaged"
};

function buildEbaySearchQuery(card) {
  return [
    card.name,
    card.setName,
    card.cardNumber,
    "Pokemon card",
    conditionSearchTerms[card.condition] || card.condition
  ]
    .filter(Boolean)
    .join(" ");
}

function normalizeEbayItems(itemSummaries) {
  return itemSummaries
    .filter(Boolean)
    .filter((item) => {
      if (!Array.isArray(item.buyingOptions) || item.buyingOptions.length === 0) {
        return true;
      }

      return item.buyingOptions.includes("FIXED_PRICE");
    })
    .map((item) => ({
      title: item.title || "",
      buyingOptions: Array.isArray(item.buyingOptions) ? item.buyingOptions : [],
      currency: item.price && item.price.currency ? item.price.currency : null,
      priceValue: item.price && item.price.value ? Number(item.price.value) : null
    }));
}

function extractUsdPrices(items) {
  return items
    .filter((item) => item.currency === "USD" && Number.isFinite(item.priceValue))
    .map((item) => item.priceValue)
    .sort((firstValue, secondValue) => firstValue - secondValue);
}

function buildEbaySnapshotNotes({ marketplaceId, environment, totalResults, usdResults }) {
  return [
    `Auto-generated Browse API snapshot for ${marketplaceId} (${environment}).`,
    "Intended for active fixed-price listings only when supported by the returned data.",
    `Kept ${usdResults} USD listing(s) from ${totalResults} returned result(s).`
  ].join(" ");
}

module.exports = {
  buildEbaySearchQuery,
  buildEbaySnapshotNotes,
  extractUsdPrices,
  normalizeEbayItems
};
