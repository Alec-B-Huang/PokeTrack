const express = require("express");
const path = require("path");

const { findCardByNameAndSetName } = require("../services/cardService");
const {
  createOrUpdateSalesSnapshotsFromImport,
  getSalesSnapshots,
  getSoldSales,
  getSoldSalesSummary
} = require("../services/externalSalesService");
const {
  buildImportRows,
  requiredColumns,
  validateImportRecord
} = require("../utils/csvSoldSalesImport");

const router = express.Router();
const templatePath = path.join(__dirname, "..", "..", "data", "external_sold_sales_import_template.csv");

function buildSalesViewModel(overrides = {}) {
  return {
    errors: [],
    importSummary: null,
    pageTitle: "Sales",
    pastedCsv: "",
    requiredColumns,
    salesSnapshots: getSalesSnapshots(),
    soldSales: getSoldSales(),
    soldSalesSummary: getSoldSalesSummary(),
    successMessage: "",
    ...overrides
  };
}

router.get("/sales", (req, res) => {
  return res.render("sales", buildSalesViewModel());
});

router.get("/sales/import/template", (req, res) => {
  return res.download(templatePath, "external_sold_sales_import_template.csv");
});

router.post("/sales/import", (req, res) => {
  const pastedCsv = req.body.csvText || "";
  const importRowsResult = buildImportRows(pastedCsv);

  if (importRowsResult.errorMessage) {
    return res.status(400).render("sales", buildSalesViewModel({
      errors: [importRowsResult.errorMessage],
      pastedCsv
    }));
  }

  const validationErrors = [];
  const matchedCards = [];
  const groupedImports = new Map();

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

    const groupKey = `${matchedCard.id}::${normalizedRecord.source}::${normalizedRecord.snapshotDate}`;
    const existingGroup = groupedImports.get(groupKey) || {
      cardId: matchedCard.id,
      source: normalizedRecord.source,
      snapshotDate: normalizedRecord.snapshotDate,
      saleRows: []
    };

    existingGroup.saleRows.push({
      currency: normalizedRecord.currency,
      externalItemId: normalizedRecord.externalItemId,
      listingCondition: normalizedRecord.listingCondition,
      listingFormat: normalizedRecord.listingFormat,
      listingUrl: normalizedRecord.listingUrl,
      notes: normalizedRecord.notes,
      salePrice: normalizedRecord.salePrice,
      sellerUsername: normalizedRecord.sellerUsername,
      soldDate: normalizedRecord.soldDate,
      title: normalizedRecord.title
    });

    groupedImports.set(groupKey, existingGroup);
    matchedCards.push(`${matchedCard.name} (${matchedCard.setName})`);
  });

  if (validationErrors.length > 0) {
    return res.status(400).render("sales", buildSalesViewModel({
      errors: validationErrors,
      pastedCsv
    }));
  }

  const saveResults = createOrUpdateSalesSnapshotsFromImport(Array.from(groupedImports.values()));
  const insertedCount = saveResults.filter((result) => result.action === "inserted").length;
  const updatedCount = saveResults.filter((result) => result.action === "updated").length;
  const importedRows = saveResults.reduce((sum, result) => sum + result.importedRows, 0);
  const successMessageParts = [];

  if (insertedCount > 0) {
    successMessageParts.push(`added ${insertedCount} snapshot group(s)`);
  }

  if (updatedCount > 0) {
    successMessageParts.push(`updated ${updatedCount} snapshot group(s)`);
  }

  const successMessage = successMessageParts.length > 0
    ? `Imported ${importedRows} sold sale row(s) successfully: ${successMessageParts.join(" and ")}.`
    : `Imported ${importedRows} sold sale row(s) successfully.`;

  return res.render("sales", buildSalesViewModel({
    importSummary: {
      groupCount: groupedImports.size,
      matchedCards: [...new Set(matchedCards)],
      rowCount: importedRows
    },
    pastedCsv: "",
    successMessage
  }));
});

module.exports = router;
