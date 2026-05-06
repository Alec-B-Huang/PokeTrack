const { getDb } = require("../db");

const SOURCE_EBAY = "eBay";
const SEARCH_QUERY_IMPORTED_CSV = "CSV import";

function createExternalPriceSnapshot(snapshotData) {
  const db = getDb();
  const statement = db.prepare(`
    INSERT INTO external_price_snapshots (
      card_id,
      source,
      snapshot_date,
      search_query,
      listing_count,
      lowest_price,
      median_price,
      notes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = statement.run(
    snapshotData.cardId,
    snapshotData.source,
    snapshotData.snapshotDate,
    snapshotData.searchQuery,
    snapshotData.listingCount,
    snapshotData.lowestPrice,
    snapshotData.medianPrice,
    snapshotData.notes
  );

  db.close();
  return result.lastInsertRowid;
}

function createExternalPriceSnapshots(snapshotRows) {
  const db = getDb();
  const insertSnapshot = db.prepare(`
    INSERT INTO external_price_snapshots (
      card_id,
      source,
      snapshot_date,
      search_query,
      listing_count,
      lowest_price,
      median_price,
      notes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((rows) => {
    for (const row of rows) {
      insertSnapshot.run(
        row.cardId,
        row.source,
        row.snapshotDate,
        row.searchQuery,
        row.listingCount,
        row.lowestPrice,
        row.medianPrice,
        row.notes
      );
    }
  });

  insertMany(snapshotRows);
  db.close();
}

function getSnapshotsForCard(cardId, source = null) {
  const db = getDb();
  const statement = source
    ? db.prepare(`
      SELECT
        id,
        card_id AS cardId,
        source,
        snapshot_date AS snapshotDate,
        search_query AS searchQuery,
        listing_count AS listingCount,
        lowest_price AS lowestPrice,
        median_price AS medianPrice,
        notes,
        created_at AS createdAt
      FROM external_price_snapshots
      WHERE card_id = ? AND source = ?
      ORDER BY snapshot_date DESC, id DESC
    `)
    : db.prepare(`
      SELECT
        id,
        card_id AS cardId,
        source,
        snapshot_date AS snapshotDate,
        search_query AS searchQuery,
        listing_count AS listingCount,
        lowest_price AS lowestPrice,
        median_price AS medianPrice,
        notes,
        created_at AS createdAt
      FROM external_price_snapshots
      WHERE card_id = ?
      ORDER BY snapshot_date DESC, id DESC
    `);

  const snapshots = source ? statement.all(cardId, source) : statement.all(cardId);
  db.close();
  return snapshots;
}

function getLatestSnapshotForCard(cardId, source = SOURCE_EBAY) {
  const db = getDb();
  const statement = db.prepare(`
    SELECT
      id,
      card_id AS cardId,
      source,
      snapshot_date AS snapshotDate,
      search_query AS searchQuery,
      listing_count AS listingCount,
      lowest_price AS lowestPrice,
      median_price AS medianPrice,
      notes,
      created_at AS createdAt
    FROM external_price_snapshots
    WHERE card_id = ? AND source = ?
    ORDER BY snapshot_date DESC, id DESC
    LIMIT 1
  `);

  const snapshot = statement.get(cardId, source) || null;
  db.close();
  return snapshot;
}

module.exports = {
  SEARCH_QUERY_IMPORTED_CSV,
  SOURCE_EBAY,
  createExternalPriceSnapshot,
  createExternalPriceSnapshots,
  getLatestSnapshotForCard,
  getSnapshotsForCard
};
