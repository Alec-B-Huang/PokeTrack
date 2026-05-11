const requiredColumns = [
  "card_name",
  "set_name",
  "source",
  "snapshot_date",
  "sold_date",
  "title",
  "sale_price",
  "currency",
  "listing_condition",
  "listing_format",
  "listing_url",
  "external_item_id",
  "seller_username",
  "notes"
];

function parseCsvText(csvText) {
  const rows = [];
  let currentCell = "";
  let currentRow = [];
  let insideQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const character = csvText[index];
    const nextCharacter = csvText[index + 1];

    if (character === "\"") {
      if (insideQuotes && nextCharacter === "\"") {
        currentCell += "\"";
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }

      continue;
    }

    if (character === "," && !insideQuotes) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !insideQuotes) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }

      currentRow.push(currentCell);
      currentCell = "";

      if (currentRow.some((cell) => cell.trim() !== "")) {
        rows.push(currentRow);
      }

      currentRow = [];
      continue;
    }

    currentCell += character;
  }

  if (currentCell !== "" || currentRow.length > 0) {
    currentRow.push(currentCell);

    if (currentRow.some((cell) => cell.trim() !== "")) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function normalizeHeaderRow(headerRow) {
  return headerRow.map((header) => header.trim());
}

function validateRequiredHeaders(headers) {
  const missingHeaders = requiredColumns.filter((column) => !headers.includes(column));

  if (missingHeaders.length > 0) {
    return `Missing required column(s): ${missingHeaders.join(", ")}`;
  }

  return null;
}

function isValidDateString(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function buildImportRows(csvText) {
  const parsedRows = parseCsvText(csvText);

  if (parsedRows.length === 0) {
    return {
      errorMessage: "CSV input is empty. Paste the header row and at least one data row.",
      headers: [],
      rows: []
    };
  }

  const headers = normalizeHeaderRow(parsedRows[0]);
  const headerError = validateRequiredHeaders(headers);

  if (headerError) {
    return {
      errorMessage: headerError,
      headers,
      rows: []
    };
  }

  const rows = parsedRows.slice(1).map((row) => {
    const record = {};

    headers.forEach((header, index) => {
      record[header] = typeof row[index] === "string" ? row[index].trim() : "";
    });

    return record;
  });

  if (rows.length === 0) {
    return {
      errorMessage: "CSV input does not contain any data rows.",
      headers,
      rows: []
    };
  }

  return {
    errorMessage: "",
    headers,
    rows
  };
}

function validateImportRecord(record, rowNumber) {
  const errors = [];
  const salePrice = Number(record.sale_price);

  if (!record.card_name) {
    errors.push(`Row ${rowNumber}: card_name is required.`);
  }

  if (!record.set_name) {
    errors.push(`Row ${rowNumber}: set_name is required.`);
  }

  if (!record.source) {
    errors.push(`Row ${rowNumber}: source is required.`);
  }

  if (!record.snapshot_date || !isValidDateString(record.snapshot_date)) {
    errors.push(`Row ${rowNumber}: snapshot_date must use YYYY-MM-DD.`);
  }

  if (!record.sold_date || !isValidDateString(record.sold_date)) {
    errors.push(`Row ${rowNumber}: sold_date must use YYYY-MM-DD.`);
  }

  if (!record.title) {
    errors.push(`Row ${rowNumber}: title is required.`);
  }

  if (!Number.isFinite(salePrice) || salePrice < 0) {
    errors.push(`Row ${rowNumber}: sale_price must be 0 or higher.`);
  }

  if (!record.currency) {
    errors.push(`Row ${rowNumber}: currency is required.`);
  }

  return {
    errors,
    normalizedRecord: {
      cardName: record.card_name,
      setName: record.set_name,
      source: record.source,
      snapshotDate: record.snapshot_date,
      soldDate: record.sold_date,
      title: record.title,
      salePrice,
      currency: record.currency,
      listingCondition: record.listing_condition || "",
      listingFormat: record.listing_format || "",
      listingUrl: record.listing_url || "",
      externalItemId: record.external_item_id || "",
      sellerUsername: record.seller_username || "",
      notes: record.notes || ""
    }
  };
}

module.exports = {
  buildImportRows,
  requiredColumns,
  validateImportRecord
};
