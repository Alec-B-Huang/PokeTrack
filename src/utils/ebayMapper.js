const conditionSearchTerms = {
  "Raw/Near Mint": "near mint",
  "Lightly Played": "lightly played",
  "Moderately Played": "moderately played",
  "Heavily Played": "heavily played",
  "Damaged": "damaged"
};

const specificCardExclusionRules = {
  "charizard|base set|4/102": [
    "celebrations",
    "classic collection",
    "evolutions",
    "metal",
    "proxy",
    "custom",
    "sticker",
    "jumbo"
  ]
};

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9/ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getSpecificCardRuleKey(card) {
  return [
    normalizeText(card.name),
    normalizeText(card.setName),
    normalizeText(card.cardNumber)
  ].join("|");
}

function getRequiredMatchTerms(card) {
  return [
    normalizeText(card.name),
    normalizeText(card.setName),
    normalizeText(card.cardNumber)
  ].filter(Boolean);
}

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
      externalItemId: item.itemId || null,
      title: item.title || "",
      buyingOptions: Array.isArray(item.buyingOptions) ? item.buyingOptions : [],
      condition: item.condition || item.conditionId || null,
      currency: item.price && item.price.currency ? item.price.currency : null,
      listingUrl: item.itemWebUrl || item.itemAffiliateWebUrl || null,
      priceValue: item.price && item.price.value ? Number(item.price.value) : null,
      sellerUsername: item.seller && item.seller.username ? item.seller.username : null
    }));
}

function filterSpecificCardListings(card, items) {
  const requiredMatchTerms = getRequiredMatchTerms(card);
  const exclusionTerms = specificCardExclusionRules[getSpecificCardRuleKey(card)] || [];

  return items.filter((item) => {
    const normalizedTitle = normalizeText(item.title);

    const matchesRequiredTerms = requiredMatchTerms.every((term) => normalizedTitle.includes(term));

    if (!matchesRequiredTerms) {
      return false;
    }

    const matchesExclusionTerm = exclusionTerms.some((term) => normalizedTitle.includes(term));

    if (matchesExclusionTerm) {
      return false;
    }

    return true;
  });
}

function extractUsdPrices(items) {
  return items
    .filter((item) => item.currency === "USD" && Number.isFinite(item.priceValue))
    .map((item) => item.priceValue)
    .sort((firstValue, secondValue) => firstValue - secondValue);
}

function buildEbaySnapshotNotes({
  filteredUsdResults,
  keptListings,
  marketplaceId,
  returnedListings,
  environment
}) {
  return [
    `Auto-generated Browse API snapshot for ${marketplaceId} (${environment}).`,
    "Intended for active fixed-price listings only when supported by the returned data.",
    `Returned ${returnedListings} listing(s) from eBay and kept ${keptListings} listing(s) after specific-card filtering.`,
    `Summary metrics use ${filteredUsdResults} kept USD listing(s).`
  ].join(" ");
}

module.exports = {
  buildEbaySearchQuery,
  buildEbaySnapshotNotes,
  extractUsdPrices,
  filterSpecificCardListings,
  normalizeEbayItems
};
