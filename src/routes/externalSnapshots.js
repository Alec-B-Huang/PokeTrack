const express = require("express");

const { getCardById } = require("../services/cardService");
const {
  SOURCE_EBAY,
  createExternalPriceSnapshot
} = require("../services/externalSnapshotService");
const {
  EbayIntegrationError,
  fetchEbayActiveListingSnapshot
} = require("../services/ebayService");

const router = express.Router();

function buildRedirectUrl(cardId, params) {
  const searchParams = new URLSearchParams(params);
  return `/cards/${cardId}?${searchParams.toString()}`;
}

router.post("/cards/:id/external-snapshots/ebay/fetch", async (req, res) => {
  const cardId = Number(req.params.id);

  if (!Number.isInteger(cardId)) {
    return res.status(404).send("Card not found.");
  }

  const card = getCardById(cardId);

  if (!card) {
    return res.status(404).send("Card not found.");
  }

  try {
    const snapshot = await fetchEbayActiveListingSnapshot(card);

    createExternalPriceSnapshot({
      cardId: card.id,
      source: SOURCE_EBAY,
      snapshotDate: snapshot.snapshotDate,
      searchQuery: snapshot.searchQuery,
      listingCount: snapshot.listingCount,
      lowestPrice: snapshot.lowestPrice,
      medianPrice: snapshot.medianPrice,
      notes: snapshot.notes
    });

    return res.redirect(buildRedirectUrl(card.id, {
      success: "Saved a new eBay snapshot for this card."
    }));
  } catch (error) {
    console.error(error);

    const userMessage = error instanceof EbayIntegrationError
      ? error.userMessage
      : "Unable to fetch an eBay snapshot right now. Check your credentials and try again.";

    return res.redirect(buildRedirectUrl(card.id, {
      error: userMessage
    }));
  }
});

module.exports = router;
