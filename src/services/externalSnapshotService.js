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

function deleteExternalSnapshot(snapshotId) {
  const db = getDb();
  const getSnapshotStatement = db.prepare(`
    SELECT
      id,
      card_id AS cardId
    FROM external_price_snapshots
    WHERE id = ?
  `);
  const deleteSnapshotStatement = db.prepare(`
    DELETE FROM external_price_snapshots
    WHERE id = ?
  `);

  const existingSnapshot = getSnapshotStatement.get(snapshotId) || null;

  if (!existingSnapshot) {
    db.close();
    return null;
  }

  deleteSnapshotStatement.run(snapshotId);
  db.close();
  return existingSnapshot.cardId;
}

function resetExternalSnapshotsForCard(cardId) {
  const db = getDb();
  const deleteSnapshotsStatement = db.prepare(`
    DELETE FROM external_price_snapshots
    WHERE card_id = ?
  `);

  const result = deleteSnapshotsStatement.run(cardId);
  db.close();
  return result.changes;
}

function createExternalPriceSnapshotWithListings(snapshotData, listingRows) {
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

  const insertListing = db.prepare(`
    INSERT INTO ebay_active_listings (
      snapshot_id,
      external_item_id,
      title,
      price,
      currency,
      listing_condition,
      listing_url,
      seller_username
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const saveSnapshotAndListings = db.transaction((snapshot, listings) => {
    const snapshotResult = insertSnapshot.run(
      snapshot.cardId,
      snapshot.source,
      snapshot.snapshotDate,
      snapshot.searchQuery,
      snapshot.listingCount,
      snapshot.lowestPrice,
      snapshot.medianPrice,
      snapshot.notes
    );

    const snapshotId = Number(snapshotResult.lastInsertRowid);

    for (const listing of listings) {
      insertListing.run(
        snapshotId,
        listing.externalItemId,
        listing.title,
        listing.price,
        listing.currency,
        listing.listingCondition,
        listing.listingUrl,
        listing.sellerUsername
      );
    }

    return snapshotId;
  });

  const snapshotId = saveSnapshotAndListings(snapshotData, listingRows);
  db.close();
  return snapshotId;
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

function getActiveListingsForSnapshot(snapshotId) {
  const db = getDb();
  const statement = db.prepare(`
    SELECT
      id,
      snapshot_id AS snapshotId,
      external_item_id AS externalItemId,
      title,
      price,
      currency,
      listing_condition AS listingCondition,
      listing_url AS listingUrl,
      seller_username AS sellerUsername,
      created_at AS createdAt
    FROM ebay_active_listings
    WHERE snapshot_id = ?
    ORDER BY
      CASE WHEN price IS NULL THEN 1 ELSE 0 END ASC,
      price ASC,
      id ASC
  `);

  const listings = statement.all(snapshotId);
  db.close();
  return listings;
}

module.exports = {
  SEARCH_QUERY_IMPORTED_CSV,
  SOURCE_EBAY,
  createExternalPriceSnapshotWithListings,
  createExternalPriceSnapshot,
  createExternalPriceSnapshots,
  deleteExternalSnapshot,
  getActiveListingsForSnapshot,
  getLatestSnapshotForCard,
  getSnapshotsForCard,
  resetExternalSnapshotsForCard
};
