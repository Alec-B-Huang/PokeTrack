const express = require("express");

const { getCards } = require("../services/cardService");
const { getLatestSnapshotForCard } = require("../services/externalSnapshotService");

const router = express.Router();

router.get("/listings", (req, res) => {
  const cardsWithListingSummaries = getCards().map((card) => ({
    ...card,
    latestEbaySnapshot: getLatestSnapshotForCard(card.id)
  }));

  const cardsWithSavedListings = cardsWithListingSummaries.filter((card) => card.latestEbaySnapshot);

  return res.render("listings", {
    cardsWithListingSummaries,
    cardsWithSavedListings,
    pageTitle: "Listings"
  });
});

module.exports = router;
