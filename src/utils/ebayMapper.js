const conditionSearchTerms = {
  "Raw/Near Mint": "near mint",
  "Lightly Played": "lightly played",
  "Moderately Played": "moderately played",
  "Heavily Played": "heavily played",
  "Damaged": "damaged"
};

const gradedDetectionTerms = [
  "psa",
  "graded",
  "slab"
];

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

function getStoredPsaGrade(card) {
  const grade = Number(card.grade);
  return card.gradingCompany === "PSA" && Number.isInteger(grade) ? grade : null;
}

function getDetectedGradingTerms(card) {
  const combinedText = `${normalizeText(card.name)} ${normalizeText(card.condition)}`.trim();

  return gradedDetectionTerms.filter((term) => combinedText.includes(term));
}

function detectCardMode(card) {
  if (getStoredPsaGrade(card) !== null) {
    return "graded-card mode";
  }

  return getDetectedGradingTerms(card).length > 0 ? "graded-card mode" : "raw-card mode";
}

function uniqueSearchParts(parts) {
  const seen = new Set();

  return parts.filter((part) => {
    const normalizedPart = normalizeText(part);

    if (!normalizedPart || seen.has(normalizedPart)) {
      return false;
    }

    seen.add(normalizedPart);
    return true;
  });
}

function buildEbaySearchQuery(card, cardMode) {
  const searchParts = [
    card.name,
    card.setName,
    card.cardNumber,
    "Pokemon card"
  ];

  if (cardMode === "graded-card mode") {
    if (card.gradingCompany === "PSA") {
      searchParts.push(card.gradingCompany);
    } else if (normalizeText(card.name).includes("psa")) {
      searchParts.push("PSA");
    }

    if (getStoredPsaGrade(card) !== null) {
      searchParts.push(String(card.grade));
    }
  } else {
    searchParts.push(conditionSearchTerms[card.condition] || card.condition);
  }

  return uniqueSearchParts(searchParts).join(" ");
}

function titleIncludesAnyTerm(title, terms) {
  return terms.some((term) => title.includes(term));
}

function parsePsaGradeFromText(text) {
  const normalizedText = normalizeText(text);
  const match = normalizedText.match(/\bpsa\s*(10|[1-9])\b/);

  return match ? Number(match[1]) : null;
}

function filterSpecificCardListings(card, items, cardMode) {
  const exclusionTerms = specificCardExclusionRules[getSpecificCardRuleKey(card)] || [];
  const normalizedCardName = normalizeText(card.name);
  const normalizedSetName = normalizeText(card.setName);
  const normalizedCardNumber = normalizeText(card.cardNumber);
  const storedPsaGrade = getStoredPsaGrade(card);

  const nameTokens = normalizedCardName
    .split(" ")
    .filter((token) => token.length > 1)
    .filter((token) => !gradedDetectionTerms.includes(token))
    .filter((token) => !/^\d+(\.\d+)?$/.test(token));

  const hasSetName = Boolean(normalizedSetName);
  const hasCardNumber = Boolean(normalizedCardNumber);

  return items.filter((item) => {
    const normalizedTitle = normalizeText(item.title);
    const matchesExclusionTerm = exclusionTerms.some((term) => normalizedTitle.includes(term));

    if (matchesExclusionTerm) {
      return false;
    }

    const matchesCardName = nameTokens.every((token) => normalizedTitle.includes(token));

    if (!matchesCardName) {
      return false;
    }

    if (cardMode === "raw-card mode") {
      const requiredMatchTerms = getRequiredMatchTerms(card);
      return requiredMatchTerms.every((term) => normalizedTitle.includes(term));
    }

    const matchesSetName = hasSetName ? normalizedTitle.includes(normalizedSetName) : false;
    const matchesCardNumber = hasCardNumber ? normalizedTitle.includes(normalizedCardNumber) : false;
    const hasPsaTerm = normalizedTitle.includes("psa");
    const listingPsaGrade = parsePsaGradeFromText(item.title);

    if (matchesSetName && matchesCardNumber) {
      return true;
    }

    if (storedPsaGrade !== null && listingPsaGrade === storedPsaGrade) {
      return true;
    }

    if (hasPsaTerm && (matchesSetName || matchesCardNumber)) {
      return true;
    }

    return false;
  });
}

function sortActiveListingsForCard(card, listings) {
  const cardMode = detectCardMode(card);
  const storedPsaGrade = getStoredPsaGrade(card);

  if (cardMode !== "graded-card mode" || storedPsaGrade === null) {
    return listings;
  }

  return [...listings].sort((firstListing, secondListing) => {
    const firstGrade = parsePsaGradeFromText(firstListing.title);
    const secondGrade = parsePsaGradeFromText(secondListing.title);

    const getRank = (grade) => {
      if (grade === storedPsaGrade) {
        return 0;
      }

      if (grade !== null) {
        return 1;
      }

      return 2;
    };

    const rankDifference = getRank(firstGrade) - getRank(secondGrade);

    if (rankDifference !== 0) {
      return rankDifference;
    }

    if (firstGrade !== null && secondGrade !== null && firstGrade !== secondGrade) {
      const gradeDistanceDifference = Math.abs(firstGrade - storedPsaGrade) - Math.abs(secondGrade - storedPsaGrade);

      if (gradeDistanceDifference !== 0) {
        return gradeDistanceDifference;
      }
    }

    const firstPrice = firstListing.price === null || firstListing.price === undefined ? Number.POSITIVE_INFINITY : Number(firstListing.price);
    const secondPrice = secondListing.price === null || secondListing.price === undefined ? Number.POSITIVE_INFINITY : Number(secondListing.price);

    if (firstPrice !== secondPrice) {
      return firstPrice - secondPrice;
    }

    return String(firstListing.title).localeCompare(String(secondListing.title));
  });
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

function extractUsdPrices(items) {
  return items
    .filter((item) => item.currency === "USD" && Number.isFinite(item.priceValue))
    .map((item) => item.priceValue)
    .sort((firstValue, secondValue) => firstValue - secondValue);
}

function buildEbaySnapshotNotes({
  cardMode,
  filteredUsdResults,
  keptListings,
  marketplaceId,
  returnedListings,
  environment
}) {
  return [
    `Auto-generated Browse API snapshot for ${marketplaceId} (${environment}).`,
    `Fetch mode: ${cardMode}.`,
    "Intended for active fixed-price listings only when supported by the returned data.",
    `Returned ${returnedListings} listing(s) from eBay and kept ${keptListings} listing(s) after specific-card filtering.`,
    `Summary metrics use ${filteredUsdResults} kept USD listing(s).`
  ].join(" ");
}

module.exports = {
  buildEbaySearchQuery,
  buildEbaySnapshotNotes,
  detectCardMode,
  extractUsdPrices,
  filterSpecificCardListings,
  normalizeEbayItems,
  parsePsaGradeFromText,
  sortActiveListingsForCard
};
