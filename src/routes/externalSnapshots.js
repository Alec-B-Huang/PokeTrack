const express = require("express");
const path = require("path");

const {
  findCardByNameAndSetName,
  getCardById
} = require("../services/cardService");
const {
  SEARCH_QUERY_IMPORTED_CSV,
  SOURCE_EBAY,
  createExternalPriceSnapshotWithListings,
  createExternalPriceSnapshots
} = require("../services/externalSnapshotService");
const {
  EbayIntegrationError,
  fetchEbayActiveListingSnapshot
} = require("../services/ebayService");
const {
  buildImportRows,
  requiredColumns,
  validateImportRecord
} = require("../utils/csvSnapshotImport");

const router = express.Router();
const templatePath = path.join(__dirname, "..", "..", "data", "external_snapshot_import_template.csv");

function buildRedirectUrl(cardId, params) {
  const searchParams = new URLSearchParams(params);
  return `/cards/${cardId}?${searchParams.toString()}`;
}

function buildImportViewModel(overrides = {}) {
  return {
    errors: [],
    importSummary: null,
    pageTitle: "Import External Snapshots",
    pastedCsv: "",
    requiredColumns,
    successMessage: "",
    ...overrides
  };
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

    createExternalPriceSnapshotWithListings({
      cardId: card.id,
      source: SOURCE_EBAY,
      snapshotDate: snapshot.snapshotDate,
      searchQuery: snapshot.searchQuery,
      listingCount: snapshot.listingCount,
      lowestPrice: snapshot.lowestPrice,
      medianPrice: snapshot.medianPrice,
      notes: snapshot.notes
    }, snapshot.activeListings);

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

router.get("/external-snapshots/import", (req, res) => {
  return res.render("import-snapshots", buildImportViewModel());
});

router.get("/external-snapshots/import/template", (req, res) => {
  return res.download(templatePath, "external_snapshot_import_template.csv");
});

router.post("/external-snapshots/import", (req, res) => {
  const pastedCsv = req.body.csvText || "";
  const importRowsResult = buildImportRows(pastedCsv);

  if (importRowsResult.errorMessage) {
    return res.status(400).render("import-snapshots", buildImportViewModel({
      errors: [importRowsResult.errorMessage],
      pastedCsv
    }));
  }

  const validationErrors = [];
  const rowsToInsert = [];
  const matchedCards = [];

  importRowsResult.rows.forEach((record, index) => {
    const rowNumber = index + 2;
    const { errors, normalizedRecord } = validateImportRecord(record, rowNumber);

    if (errors.length > 0) {
      validationErrors.push(...errors);
      return;
    }

    const matchedCard = findCardByNameAndSetName(
      normalizedRecord.cardName,
      normalizedRecord.setName
    );

    if (!matchedCard) {
      validationErrors.push(
        `Row ${rowNumber}: could not find a watched card matching "${normalizedRecord.cardName}" in "${normalizedRecord.setName}".`
      );
      return;
    }

    rowsToInsert.push({
      cardId: matchedCard.id,
      listingCount: normalizedRecord.listingCount,
      lowestPrice: normalizedRecord.lowestPrice,
      medianPrice: normalizedRecord.medianPrice,
      notes: normalizedRecord.notes,
      searchQuery: SEARCH_QUERY_IMPORTED_CSV,
      snapshotDate: normalizedRecord.snapshotDate,
      source: normalizedRecord.source
    });

    matchedCards.push(`${matchedCard.name} (${matchedCard.setName})`);
  });

  if (validationErrors.length > 0) {
    return res.status(400).render("import-snapshots", buildImportViewModel({
      errors: validationErrors,
      pastedCsv
    }));
  }

  createExternalPriceSnapshots(rowsToInsert);

  return res.render("import-snapshots", buildImportViewModel({
    importSummary: {
      matchedCards,
      rowCount: rowsToInsert.length
    },
    pastedCsv: "",
    successMessage: `Imported ${rowsToInsert.length} external snapshot row(s) successfully.`
  }));
});

module.exports = router;
