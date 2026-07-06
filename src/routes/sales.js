const express = require("express");
const multer = require("multer");
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
const csvUploadLimitBytes = 1024 * 1024;
const allowedCsvMimeTypes = new Set([
  "application/csv",
  "application/octet-stream",
  "application/vnd.ms-excel",
  "text/csv",
  "text/plain"
]);
const upload = multer({
  limits: {
    fileSize: csvUploadLimitBytes
  },
  storage: multer.memoryStorage(),
  fileFilter: (req, file, callback) => {
    const lowerCaseName = (file.originalname || "").toLowerCase();
    const isCsvFile = lowerCaseName.endsWith(".csv");
    const mimeType = (file.mimetype || "").toLowerCase();
    const hasAllowedMimeType = !mimeType || allowedCsvMimeTypes.has(mimeType);

    if (!isCsvFile) {
      return callback(new Error("Please upload a .csv file."));
    }

    if (!hasAllowedMimeType) {
      return callback(new Error("Please upload a valid CSV file."));
    }

    return callback(null, true);
  }
});

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

function buildGroupedImports(importRowsResult) {
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

  return {
    groupedImports,
    matchedCards,
    validationErrors
  };
}

router.get("/sales", (req, res) => {
  return res.render("sales", buildSalesViewModel());
});

router.get("/sales/import/template", (req, res) => {
  return res.download(templatePath, "external_sold_sales_import_template.csv");
});

router.post("/sales/import", (req, res) => {
  upload.single("csvFile")(req, res, (uploadError) => {
    if (uploadError) {
      const uploadErrorMessage = uploadError.code === "LIMIT_FILE_SIZE"
        ? "CSV uploads must be 1 MB or smaller."
        : uploadError.message || "Unable to upload that CSV file.";

      return res.status(400).render("sales", buildSalesViewModel({
        errors: [uploadErrorMessage],
        pastedCsv: req.body?.csvText || ""
      }));
    }

    const pastedCsv = (req.body.csvText || "").trim();
    const uploadedCsvText = req.file ? req.file.buffer.toString("utf8") : "";
    const csvText = uploadedCsvText || pastedCsv;

    if (!csvText) {
      return res.status(400).render("sales", buildSalesViewModel({
        errors: ["Provide pasted CSV text or select a .csv file to import."],
        pastedCsv
      }));
    }

    const importRowsResult = buildImportRows(csvText);

    if (importRowsResult.errorMessage) {
      return res.status(400).render("sales", buildSalesViewModel({
        errors: [importRowsResult.errorMessage],
        pastedCsv
      }));
    }

    const {
      groupedImports,
      matchedCards,
      validationErrors
    } = buildGroupedImports(importRowsResult);

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
});

module.exports = router;
