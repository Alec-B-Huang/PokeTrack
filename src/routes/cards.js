const express = require("express");
const { ebayConfig } = require("../config/env");
const { sortActiveListingsForCard } = require("../utils/ebayMapper");

const {
  createCard,
  deleteCard,
  getCardById,
  getCards,
  getCardWithPriceHistory
} = require("../services/cardService");
const {
  getLatestSalesSnapshotForCard,
  getSoldSalesForSnapshot
} = require("../services/externalSalesService");
const {
  getActiveListingsForSnapshot,
  getLatestValidMedianSnapshotsForCard,
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

function buildMarketSignal(cardId) {
  const validMedianSnapshots = getLatestValidMedianSnapshotsForCard(cardId);

  if (validMedianSnapshots.length < 2) {
    return null;
  }

  const [latestSnapshot, previousSnapshot] = validMedianSnapshots;
  const latestMedian = Number(latestSnapshot.medianPrice);
  const previousMedian = Number(previousSnapshot.medianPrice);

  if (!Number.isFinite(latestMedian) || !Number.isFinite(previousMedian) || previousMedian === 0) {
    return null;
  }

  const percentChange = ((latestMedian - previousMedian) / previousMedian) * 100;

  if (Math.abs(percentChange) < 10) {
    return null;
  }

  const isPositive = percentChange > 0;

  return {
    latestSnapshot,
    percentChange,
    previousSnapshot,
    tone: isPositive ? "positive" : "negative",
    title: isPositive ? "Positive Market Signal" : "Negative Market Signal",
    message: isPositive
      ? "Active listing prices increased significantly since the previous snapshot. This may suggest stronger market activity, but sold prices are not confirmed."
      : "Active listing prices decreased significantly since the previous snapshot. This may suggest weaker market activity, but sold prices are not confirmed."
  };
}

function validateCardForm(formData, conditionOptions) {
  const errors = [];
  const isGradedCard = formData.condition === "Graded";

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

  if (isGradedCard) {
    if (formData.gradingCompany !== "PSA") {
      errors.push("Graded cards must use grading company PSA for now.");
    }

    const grade = Number(formData.grade);

    if (!Number.isInteger(grade) || grade < 1 || grade > 10) {
      errors.push("Graded cards must choose a PSA grade from 1 to 10.");
    }
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
      gradingCompany: "",
      grade: "",
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
    gradingCompany: req.body.gradingCompany || "",
    grade: req.body.grade || "",
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
    gradingCompany: formData.condition === "Graded" ? formData.gradingCompany : null,
    grade: formData.condition === "Graded" ? Number(formData.grade) : null,
    ownedQuantity: Number(formData.ownedQuantity),
    averageBuyPrice: Number(formData.averageBuyPrice)
  });

  return res.redirect("/?success=Card added to your watchlist.");
});

router.post("/cards/:id/delete", (req, res) => {
  const cardId = Number(req.params.id);

  if (!Number.isInteger(cardId)) {
    return res.status(404).send("Card not found.");
  }

  const deletedCard = deleteCard(cardId);

  if (!deletedCard) {
    return res.status(404).send("Card not found.");
  }

  return res.redirect("/?success=Card deleted successfully.");
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
  const latestSoldSalesSnapshot = getLatestSalesSnapshotForCard(cardId);
  const latestSoldSalesComps = latestSoldSalesSnapshot
    ? getSoldSalesForSnapshot(latestSoldSalesSnapshot.id)
    : [];
  const marketSignal = buildMarketSignal(cardId);
  const latestEbayActiveListings = latestEbaySnapshot
    ? sortActiveListingsForCard(card, getActiveListingsForSnapshot(latestEbaySnapshot.id))
    : [];

  return res.render("card-detail", {
    card,
    externalChartData: buildEbayChartData(externalSnapshotHistory),
    ebayConfigured: ebayConfig.isConfigured,
    externalSnapshotHistory,
    errorMessage: req.query.error || "",
    latestEbayActiveListings,
    latestEbaySnapshot,
    latestSoldSalesComps,
    latestSoldSalesSnapshot,
    marketSignal,
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
