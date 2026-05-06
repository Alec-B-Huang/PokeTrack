const express = require("express");
const { ebayConfig } = require("../config/env");

const {
  createCard,
  getCardById,
  getCards,
  getCardWithPriceHistory
} = require("../services/cardService");
const {
  getActiveListingsForSnapshot,
  getLatestSnapshotForCard,
  getSnapshotsForCard
} = require("../services/externalSnapshotService");

const router = express.Router();

function buildEbayChartData(snapshots) {
  const sortedSnapshots = [...snapshots].sort((firstSnapshot, secondSnapshot) => {
    const dateComparison = firstSnapshot.snapshotDate.localeCompare(secondSnapshot.snapshotDate);

    if (dateComparison !== 0) {
      return dateComparison;
    }

    return firstSnapshot.id - secondSnapshot.id;
  });

  return {
    labels: sortedSnapshots.map((snapshot) => snapshot.snapshotDate),
    sources: sortedSnapshots.map((snapshot) => snapshot.source),
    medianPrices: sortedSnapshots.map((snapshot) => snapshot.medianPrice),
    lowestPrices: sortedSnapshots.map((snapshot) => snapshot.lowestPrice),
    listingCounts: sortedSnapshots.map((snapshot) => snapshot.listingCount)
  };
}

function validateCardForm(formData, conditionOptions) {
  const errors = [];

  if (!formData.name.trim()) {
    errors.push("Card name is required.");
  }

  if (!formData.setName.trim()) {
    errors.push("Set name is required.");
  }

  if (!formData.cardNumber.trim()) {
    errors.push("Card number is required.");
  }

  if (!conditionOptions.includes(formData.condition)) {
    errors.push("Please choose a valid condition.");
  }

  if (!Number.isInteger(Number(formData.ownedQuantity)) || Number(formData.ownedQuantity) < 0) {
    errors.push("Owned quantity must be a whole number that is 0 or higher.");
  }

  if (formData.averageBuyPrice === "" || Number(formData.averageBuyPrice) < 0) {
    errors.push("Average buy price must be 0 or higher.");
  }

  return errors;
}

router.get("/cards", (req, res) => {
  const cards = getCards();

  res.render("dashboard", {
    dashboardCards: cards.map((card) => ({
      ...card,
      latestEntry: null,
      sevenDayChange: null,
      profitLoss: null
    })),
    pageTitle: "All Cards",
    successMessage: req.query.success || ""
  });
});

router.get("/cards/new", (req, res) => {
  res.render("add-card", {
    errors: [],
    formData: {
      name: "",
      setName: "",
      cardNumber: "",
      condition: req.app.locals.conditionOptions[0],
      ownedQuantity: 1,
      averageBuyPrice: ""
    },
    pageTitle: "Add Card"
  });
});

router.post("/cards", (req, res) => {
  const formData = {
    name: req.body.name || "",
    setName: req.body.setName || "",
    cardNumber: req.body.cardNumber || "",
    condition: req.body.condition || "",
    ownedQuantity: req.body.ownedQuantity || "",
    averageBuyPrice: req.body.averageBuyPrice || ""
  };

  const errors = validateCardForm(formData, req.app.locals.conditionOptions);

  if (errors.length > 0) {
    return res.status(400).render("add-card", {
      errors,
      formData,
      pageTitle: "Add Card"
    });
  }

  createCard({
    name: formData.name.trim(),
    setName: formData.setName.trim(),
    cardNumber: formData.cardNumber.trim(),
    condition: formData.condition,
    ownedQuantity: Number(formData.ownedQuantity),
    averageBuyPrice: Number(formData.averageBuyPrice)
  });

  return res.redirect("/?success=Card added to your watchlist.");
});

router.get("/cards/:id", (req, res) => {
  const cardId = Number(req.params.id);

  if (!Number.isInteger(cardId)) {
    return res.status(404).send("Card not found.");
  }

  const card = getCardWithPriceHistory(cardId);

  if (!card) {
    return res.status(404).send("Card not found.");
  }

  const externalSnapshotHistory = getSnapshotsForCard(cardId);
  const latestEbaySnapshot = getLatestSnapshotForCard(cardId);
  const latestEbayActiveListings = latestEbaySnapshot
    ? getActiveListingsForSnapshot(latestEbaySnapshot.id)
    : [];

  return res.render("card-detail", {
    card,
    externalChartData: buildEbayChartData(externalSnapshotHistory),
    ebayConfigured: ebayConfig.isConfigured,
    externalSnapshotHistory,
    errorMessage: req.query.error || "",
    latestEbayActiveListings,
    latestEbaySnapshot,
    pageTitle: `${card.name} Details`,
    successMessage: req.query.success || ""
  });
});

router.get("/cards/:id/prices/new", (req, res) => {
  const cardId = Number(req.params.id);
  const selectedCard = getCardById(cardId);

  if (!selectedCard) {
    return res.status(404).send("Card not found.");
  }

  return res.redirect(`/prices/new?cardId=${cardId}`);
});

module.exports = router;
