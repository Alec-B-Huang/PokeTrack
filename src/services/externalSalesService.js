const { getDb } = require("../db");
const { calculateAverage, calculateMedian } = require("../utils/calculations");

const SEARCH_QUERY_IMPORTED_CSV = "CSV import";

function summarizeSalePrices(saleRows) {
  const prices = saleRows
    .map((row) => Number(row.salePrice))
    .filter((value) => Number.isFinite(value))
    .sort((firstValue, secondValue) => firstValue - secondValue);

  return {
    saleCount: prices.length,
    lowestSalePrice: prices.length > 0 ? prices[0] : null,
    medianSalePrice: calculateMedian(prices),
    averageSalePrice: calculateAverage(prices),
    highestSalePrice: prices.length > 0 ? prices[prices.length - 1] : null
  };
}

function buildSnapshotRowFromRecord(record) {
  return {
    averageSalePrice: record.averageSalePrice,
    cardId: record.cardId,
    createdAt: record.createdAt,
    highestSalePrice: record.highestSalePrice,
    id: record.id,
    lowestSalePrice: record.lowestSalePrice,
    medianSalePrice: record.medianSalePrice,
    notes: record.notes,
    saleCount: record.saleCount,
    searchQuery: record.searchQuery,
    snapshotDate: record.snapshotDate,
    source: record.source
  };
}

function upsertSalesSnapshot(db, snapshotData) {
  const getExistingSnapshot = db.prepare(`
    SELECT
      id,
      card_id AS cardId,
      source,
      snapshot_date AS snapshotDate,
      search_query AS searchQuery,
      sale_count AS saleCount,
      lowest_sale_price AS lowestSalePrice,
      median_sale_price AS medianSalePrice,
      average_sale_price AS averageSalePrice,
      highest_sale_price AS highestSalePrice,
      notes,
      created_at AS createdAt
    FROM external_sales_snapshots
    WHERE card_id = ? AND source = ? AND snapshot_date = ?
    LIMIT 1
  `);

  const insertSnapshot = db.prepare(`
    INSERT INTO external_sales_snapshots (
      card_id,
      source,
      snapshot_date,
      search_query,
      sale_count,
      lowest_sale_price,
      median_sale_price,
      average_sale_price,
      highest_sale_price,
      notes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const updateSnapshot = db.prepare(`
    UPDATE external_sales_snapshots
    SET
      search_query = ?,
      sale_count = ?,
      lowest_sale_price = ?,
      median_sale_price = ?,
      average_sale_price = ?,
      highest_sale_price = ?,
      notes = ?
    WHERE id = ?
  `);

  const existingSnapshot = getExistingSnapshot.get(
    snapshotData.cardId,
    snapshotData.source,
    snapshotData.snapshotDate
  );

  if (existingSnapshot) {
    updateSnapshot.run(
      snapshotData.searchQuery,
      snapshotData.saleCount,
      snapshotData.lowestSalePrice,
      snapshotData.medianSalePrice,
      snapshotData.averageSalePrice,
      snapshotData.highestSalePrice,
      snapshotData.notes,
      existingSnapshot.id
    );

    return {
      action: "updated",
      snapshot: {
        ...buildSnapshotRowFromRecord(existingSnapshot),
        averageSalePrice: snapshotData.averageSalePrice,
        highestSalePrice: snapshotData.highestSalePrice,
        lowestSalePrice: snapshotData.lowestSalePrice,
        medianSalePrice: snapshotData.medianSalePrice,
        notes: snapshotData.notes,
        saleCount: snapshotData.saleCount,
        searchQuery: snapshotData.searchQuery
      }
    };
  }

  const insertResult = insertSnapshot.run(
    snapshotData.cardId,
    snapshotData.source,
    snapshotData.snapshotDate,
    snapshotData.searchQuery,
    snapshotData.saleCount,
    snapshotData.lowestSalePrice,
    snapshotData.medianSalePrice,
    snapshotData.averageSalePrice,
    snapshotData.highestSalePrice,
    snapshotData.notes
  );

  return {
    action: "inserted",
    snapshot: {
      id: Number(insertResult.lastInsertRowid),
      ...snapshotData
    }
  };
}

function createOrUpdateSalesSnapshotsFromImport(groupedImports) {
  const db = getDb();
  const insertSoldSale = db.prepare(`
    INSERT INTO external_sold_sales (
      snapshot_id,
      external_item_id,
      title,
      sale_price,
      currency,
      sold_date,
      listing_condition,
      listing_format,
      listing_url,
      seller_username,
      notes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const deleteSoldSalesForSnapshot = db.prepare(`
    DELETE FROM external_sold_sales
    WHERE snapshot_id = ?
  `);

  const saveGroups = db.transaction((groups) => groups.map((group) => {
    const priceSummary = summarizeSalePrices(group.saleRows);
    const snapshotResult = upsertSalesSnapshot(db, {
      cardId: group.cardId,
      source: group.source,
      snapshotDate: group.snapshotDate,
      searchQuery: SEARCH_QUERY_IMPORTED_CSV,
      saleCount: priceSummary.saleCount,
      lowestSalePrice: priceSummary.lowestSalePrice,
      medianSalePrice: priceSummary.medianSalePrice,
      averageSalePrice: priceSummary.averageSalePrice,
      highestSalePrice: priceSummary.highestSalePrice,
      notes: `CSV import with ${group.saleRows.length} sold sale row(s).`
    });

    const snapshotId = snapshotResult.snapshot.id;
    deleteSoldSalesForSnapshot.run(snapshotId);

    for (const saleRow of group.saleRows) {
      insertSoldSale.run(
        snapshotId,
        saleRow.externalItemId || null,
        saleRow.title,
        saleRow.salePrice,
        saleRow.currency,
        saleRow.soldDate,
        saleRow.listingCondition || null,
        saleRow.listingFormat || null,
        saleRow.listingUrl || null,
        saleRow.sellerUsername || null,
        saleRow.notes || null
      );
    }

    return {
      ...snapshotResult,
      importedRows: group.saleRows.length
    };
  }));

  const results = saveGroups(groupedImports);
  db.close();
  return results;
}

function getSalesSnapshots() {
  const db = getDb();
  const statement = db.prepare(`
    SELECT
      external_sales_snapshots.id,
      external_sales_snapshots.card_id AS cardId,
      cards.name AS cardName,
      cards.set_name AS setName,
      cards.card_number AS cardNumber,
      cards.card_condition AS condition,
      cards.grading_company AS gradingCompany,
      cards.grade,
      external_sales_snapshots.source,
      external_sales_snapshots.snapshot_date AS snapshotDate,
      external_sales_snapshots.search_query AS searchQuery,
      external_sales_snapshots.sale_count AS saleCount,
      external_sales_snapshots.lowest_sale_price AS lowestSalePrice,
      external_sales_snapshots.median_sale_price AS medianSalePrice,
      external_sales_snapshots.average_sale_price AS averageSalePrice,
      external_sales_snapshots.highest_sale_price AS highestSalePrice,
      external_sales_snapshots.notes,
      external_sales_snapshots.created_at AS createdAt
    FROM external_sales_snapshots
    INNER JOIN cards ON cards.id = external_sales_snapshots.card_id
    ORDER BY external_sales_snapshots.snapshot_date DESC, external_sales_snapshots.id DESC
  `);

  const snapshots = statement.all();
  db.close();
  return snapshots;
}

function getSoldSales() {
  const db = getDb();
  const statement = db.prepare(`
    SELECT
      external_sold_sales.id,
      external_sold_sales.snapshot_id AS snapshotId,
      external_sold_sales.external_item_id AS externalItemId,
      external_sold_sales.title,
      external_sold_sales.sale_price AS salePrice,
      external_sold_sales.currency,
      external_sold_sales.sold_date AS soldDate,
      external_sold_sales.listing_condition AS listingCondition,
      external_sold_sales.listing_format AS listingFormat,
      external_sold_sales.listing_url AS listingUrl,
      external_sold_sales.seller_username AS sellerUsername,
      external_sold_sales.notes,
      external_sales_snapshots.card_id AS cardId,
      cards.name AS cardName,
      cards.set_name AS setName,
      external_sales_snapshots.source,
      external_sales_snapshots.snapshot_date AS snapshotDate
    FROM external_sold_sales
    INNER JOIN external_sales_snapshots ON external_sales_snapshots.id = external_sold_sales.snapshot_id
    INNER JOIN cards ON cards.id = external_sales_snapshots.card_id
    ORDER BY external_sold_sales.sold_date DESC, external_sold_sales.id DESC
  `);

  const soldSales = statement.all();
  db.close();
  return soldSales;
}

function getSoldSalesSummary() {
  const soldSales = getSoldSales();
  const prices = soldSales.map((sale) => sale.salePrice);

  return {
    averageSalePrice: calculateAverage(prices),
    medianSalePrice: calculateMedian(prices),
    saleCount: soldSales.length
  };
}

module.exports = {
  SEARCH_QUERY_IMPORTED_CSV,
  createOrUpdateSalesSnapshotsFromImport,
  getSalesSnapshots,
  getSoldSales,
  getSoldSalesSummary
};
