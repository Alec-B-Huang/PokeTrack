const express = require("express");

const { getCards, getCardById } = require("../services/cardService");
const {
  createPriceEntry,
  deletePriceEntry
} = require("../services/priceService");

const router = express.Router();

function isValidOptionalPrice(value) {
  return value === "" || Number(value) >= 0;
}

function validatePriceForm(formData, cards) {
  const errors = [];
  const cardId = Number(formData.cardId);

  if (!Number.isInteger(cardId) || !cards.find((card) => card.id === cardId)) {
    errors.push("Please choose a valid card.");
  }

  if (!formData.entryDate) {
    errors.push("Date is required.");
  }

  if (formData.rawPrice === "" || Number(formData.rawPrice) < 0) {
    errors.push("Raw price must be 0 or higher.");
  }

  if (!isValidOptionalPrice(formData.psa9Price)) {
    errors.push("PSA 9 price must be blank or 0 or higher.");
  }

  if (!isValidOptionalPrice(formData.psa10Price)) {
    errors.push("PSA 10 price must be blank or 0 or higher.");
  }

  return errors;
}

router.get("/prices/new", (req, res) => {
  const cards = getCards();
  const requestedCardId = Number(req.query.cardId);
  const selectedCard = Number.isInteger(requestedCardId) ? getCardById(requestedCardId) : null;

  if (cards.length === 0) {
    return res.redirect("/cards/new");
  }

  return res.render("add-price", {
    cards,
    errors: [],
    formData: {
      cardId: selectedCard ? selectedCard.id : cards[0].id,
      entryDate: new Date().toISOString().slice(0, 10),
      rawPrice: "",
      psa9Price: "",
      psa10Price: "",
      notes: ""
    },
    pageTitle: "Add Price Entry"
  });
});

router.post("/prices", (req, res) => {
  const cards = getCards();
  const formData = {
    cardId: req.body.cardId || "",
    entryDate: req.body.entryDate || "",
    rawPrice: req.body.rawPrice || "",
    psa9Price: req.body.psa9Price || "",
    psa10Price: req.body.psa10Price || "",
    notes: req.body.notes || ""
  };

  const errors = validatePriceForm(formData, cards);

  if (errors.length > 0) {
    return res.status(400).render("add-price", {
      cards,
      errors,
      formData,
      pageTitle: "Add Price Entry"
    });
  }

  try {
    createPriceEntry({
      cardId: Number(formData.cardId),
      entryDate: formData.entryDate,
      rawPrice: Number(formData.rawPrice),
      psa9Price: formData.psa9Price === "" ? null : Number(formData.psa9Price),
      psa10Price: formData.psa10Price === "" ? null : Number(formData.psa10Price),
      notes: formData.notes.trim()
    });
  } catch (error) {
    const duplicateEntry = error.message.includes("UNIQUE constraint failed");

    return res.status(400).render("add-price", {
      cards,
      errors: duplicateEntry
        ? ["That card already has a price entry for this date."]
        : ["Unable to save the price entry. Please try again."],
      formData,
      pageTitle: "Add Price Entry"
    });
  }

  return res.redirect(`/cards/${formData.cardId}?success=Price entry saved.`);
});

router.post("/prices/:id/delete", (req, res) => {
  const priceEntryId = Number(req.params.id);

  if (!Number.isInteger(priceEntryId)) {
    return res.status(404).send("Price entry not found.");
  }

  const cardId = deletePriceEntry(priceEntryId);

  if (!cardId) {
    return res.status(404).send("Price entry not found.");
  }

  return res.redirect(`/cards/${cardId}?success=Manual price entry deleted.`);
});

module.exports = router;
