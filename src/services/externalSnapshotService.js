const { getDb } = require("../db");

const SOURCE_EBAY = "eBay";
const SEARCH_QUERY_IMPORTED_CSV = "CSV import";

function stringifyImageUrls(imageUrls) {
  return JSON.stringify(Array.isArray(imageUrls) ? imageUrls.filter(Boolean) : []);
}

function parseImageUrls(imageUrlsJson) {
  if (!imageUrlsJson) {
    return [];
  }

  try {
    const parsedUrls = JSON.parse(imageUrlsJson);
    return Array.isArray(parsedUrls) ? parsedUrls.filter(Boolean) : [];
  } catch (error) {
    return [];
  }
}

function buildSnapshotRowFromRecord(record) {
  return {
    cardId: record.cardId,
    createdAt: record.createdAt,
    id: record.id,
    listingCount: record.listingCount,
    lowestPrice: record.lowestPrice,
    medianPrice: record.medianPrice,
    notes: record.notes,
    searchQuery: record.searchQuery,
    snapshotDate: record.snapshotDate,
    source: record.source
  };
}

function upsertSnapshot(db, snapshotData) {
  const getExistingSnapshot = db.prepare(`
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
    WHERE card_id = ? AND source = ? AND snapshot_date = ?
    LIMIT 1
  `);

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

  const updateSnapshot = db.prepare(`
    UPDATE external_price_snapshots
    SET
      search_query = ?,
      listing_count = ?,
      lowest_price = ?,
      median_price = ?,
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
      snapshotData.listingCount,
      snapshotData.lowestPrice,
      snapshotData.medianPrice,
      snapshotData.notes,
      existingSnapshot.id
    );

    return {
      action: "updated",
      snapshot: {
        ...buildSnapshotRowFromRecord(existingSnapshot),
        listingCount: snapshotData.listingCount,
        lowestPrice: snapshotData.lowestPrice,
        medianPrice: snapshotData.medianPrice,
        notes: snapshotData.notes,
        searchQuery: snapshotData.searchQuery
      }
    };
  }

  const insertResult = insertSnapshot.run(
    snapshotData.cardId,
    snapshotData.source,
    snapshotData.snapshotDate,
    snapshotData.searchQuery,
    snapshotData.listingCount,
    snapshotData.lowestPrice,
    snapshotData.medianPrice,
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

function createExternalPriceSnapshot(snapshotData) {
  const db = getDb();
  const result = upsertSnapshot(db, snapshotData);
  db.close();
  return result;
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
  const insertListing = db.prepare(`
    INSERT INTO ebay_active_listings (
      snapshot_id,
      external_item_id,
      title,
      price,
      currency,
      listing_condition,
      listing_url,
      primary_image_url,
      additional_image_urls,
      seller_username
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const deleteListingsForSnapshot = db.prepare(`
    DELETE FROM ebay_active_listings
    WHERE snapshot_id = ?
  `);

  const saveSnapshotAndListings = db.transaction((snapshot, listings) => {
    const snapshotResult = upsertSnapshot(db, snapshot);
    const snapshotId = snapshotResult.snapshot.id;

    deleteListingsForSnapshot.run(snapshotId);

    for (const listing of listings) {
      insertListing.run(
        snapshotId,
        listing.externalItemId,
        listing.title,
        listing.price,
        listing.currency,
        listing.listingCondition,
        listing.listingUrl,
        listing.primaryImageUrl,
        stringifyImageUrls(listing.additionalImageUrls),
        listing.sellerUsername
      );
    }

    return snapshotResult;
  });

  const result = saveSnapshotAndListings(snapshotData, listingRows);
  db.close();
  return result;
}

function createExternalPriceSnapshots(snapshotRows) {
  const db = getDb();

  const upsertMany = db.transaction((rows) => {
    const results = [];

    for (const row of rows) {
      results.push(upsertSnapshot(db, row));
    }

    return results;
  });

  const results = upsertMany(snapshotRows);
  db.close();
  return results;
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

function getLatestValidMedianSnapshotsForCard(cardId, source = SOURCE_EBAY, limit = 2) {
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
    WHERE card_id = ?
      AND source = ?
      AND median_price IS NOT NULL
    ORDER BY snapshot_date DESC, id DESC
    LIMIT ?
  `);

  const snapshots = statement.all(cardId, source, limit);
  db.close();
  return snapshots;
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
      primary_image_url AS primaryImageUrl,
      additional_image_urls AS additionalImageUrlsJson,
      seller_username AS sellerUsername,
      created_at AS createdAt
    FROM ebay_active_listings
    WHERE snapshot_id = ?
    ORDER BY
      CASE WHEN price IS NULL THEN 1 ELSE 0 END ASC,
      price ASC,
      id ASC
  `);

  const listings = statement.all(snapshotId).map((listing) => {
    const {
      additionalImageUrlsJson,
      ...listingFields
    } = listing;

    return {
      ...listingFields,
      additionalImageUrls: parseImageUrls(additionalImageUrlsJson)
    };
  });
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
  getLatestValidMedianSnapshotsForCard,
  getLatestSnapshotForCard,
  getSnapshotsForCard,
  resetExternalSnapshotsForCard
};
