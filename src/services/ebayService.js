const { ebayConfig } = require("../config/env");
const { calculateMedian } = require("../utils/calculations");
const {
  buildEbaySearchQuery,
  buildEbaySnapshotNotes,
  extractUsdPrices,
  filterSpecificCardListings,
  normalizeEbayItems
} = require("../utils/ebayMapper");

let tokenCache = {
  accessToken: null,
  expiresAt: 0
};

class EbayIntegrationError extends Error {
  constructor(userMessage, details) {
    super(details || userMessage);
    this.name = "EbayIntegrationError";
    this.userMessage = userMessage;
  }
}

function hasValidCachedToken() {
  return Boolean(
    tokenCache.accessToken &&
    tokenCache.expiresAt &&
    Date.now() < tokenCache.expiresAt - 60_000
  );
}

async function getApplicationAccessToken() {
  if (!ebayConfig.isConfigured) {
    throw new EbayIntegrationError(
      "eBay credentials are missing. Add EBAY_CLIENT_ID and EBAY_CLIENT_SECRET to your .env file first."
    );
  }

  if (hasValidCachedToken()) {
    return tokenCache.accessToken;
  }

  const credentials = Buffer
    .from(`${ebayConfig.clientId}:${ebayConfig.clientSecret}`)
    .toString("base64");

  const response = await fetch(ebayConfig.tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: ebayConfig.scope
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new EbayIntegrationError(
      "Unable to authenticate with eBay right now. Double-check your credentials and environment.",
      `eBay token request failed with status ${response.status}: ${errorBody}`
    );
  }

  const payload = await response.json();

  if (!payload.access_token) {
    throw new EbayIntegrationError(
      "eBay authentication did not return an access token.",
      "Missing access_token in eBay OAuth response."
    );
  }

  const expiresInSeconds = Number(payload.expires_in) || 7200;
  tokenCache = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + (expiresInSeconds * 1000)
  };

  return tokenCache.accessToken;
}

async function fetchEbayBrowseSearch(searchQuery) {
  const accessToken = await getApplicationAccessToken();
  const url = new URL(ebayConfig.browseSearchUrl);

  url.searchParams.set("q", searchQuery);
  url.searchParams.set("limit", String(ebayConfig.searchLimit));

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      "X-EBAY-C-MARKETPLACE-ID": ebayConfig.marketplaceId
    }
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new EbayIntegrationError(
      "eBay search failed. Check your app credentials, environment, and marketplace settings.",
      `eBay Browse search failed with status ${response.status}: ${errorBody}`
    );
  }

  return response.json();
}

async function fetchEbayActiveListingSnapshot(card) {
  const searchQuery = buildEbaySearchQuery(card);
  const payload = await fetchEbayBrowseSearch(searchQuery);
  const normalizedItems = normalizeEbayItems(payload.itemSummaries || []);
  const filteredItems = filterSpecificCardListings(card, normalizedItems);
  const usdPrices = extractUsdPrices(filteredItems);
  const activeListings = filteredItems
    .filter((item) => item.currency === "USD" && Number.isFinite(item.priceValue))
    .map((item) => ({
      currency: item.currency,
      externalItemId: item.externalItemId,
      listingCondition: item.condition,
      listingUrl: item.listingUrl,
      price: item.priceValue,
      sellerUsername: item.sellerUsername,
      title: item.title
    }));
  const lowestPrice = usdPrices.length > 0 ? usdPrices[0] : null;
  const medianPrice = calculateMedian(usdPrices);

  return {
    activeListings,
    source: "eBay",
    snapshotDate: new Date().toISOString().slice(0, 10),
    searchQuery,
    listingCount: usdPrices.length,
    lowestPrice,
    medianPrice,
    notes: buildEbaySnapshotNotes({
      filteredUsdResults: usdPrices.length,
      keptListings: filteredItems.length,
      marketplaceId: ebayConfig.marketplaceId,
      environment: ebayConfig.environment,
      returnedListings: normalizedItems.length
    })
  };
}

module.exports = {
  EbayIntegrationError,
  fetchEbayActiveListingSnapshot
};
