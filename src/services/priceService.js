const { getDb } = require("../db");
const {
  addDaysToDateString,
  calculatePercentChange,
  calculateProfitLoss
} = require("../utils/calculations");

function createPriceEntry(priceData) {
  const db = getDb();
  const statement = db.prepare(`
    INSERT INTO price_entries (
      card_id,
      entry_date,
      raw_price,
      psa9_price,
      psa10_price,
      notes
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const result = statement.run(
    priceData.cardId,
    priceData.entryDate,
    priceData.rawPrice,
    priceData.psa9Price,
    priceData.psa10Price,
    priceData.notes
  );

  db.close();
  return result.lastInsertRowid;
}

function deletePriceEntry(priceEntryId) {
  const db = getDb();
  const getCardStatement = db.prepare(`
    SELECT
      id,
      card_id AS cardId
    FROM price_entries
    WHERE id = ?
  `);
  const deleteStatement = db.prepare(`
    DELETE FROM price_entries
    WHERE id = ?
  `);

  const existingEntry = getCardStatement.get(priceEntryId) || null;

  if (!existingEntry) {
    db.close();
    return null;
  }

  deleteStatement.run(priceEntryId);
  db.close();
  return existingEntry.cardId;
}

function compareDashboardCards(cardA, cardB) {
  const latestDateA = cardA.latestActivityDate;
  const latestDateB = cardB.latestActivityDate;

  if (latestDateA && latestDateB && latestDateA !== latestDateB) {
    return latestDateB.localeCompare(latestDateA);
  }

  if (latestDateA && !latestDateB) {
    return -1;
  }

  if (!latestDateA && latestDateB) {
    return 1;
  }

  const nameComparison = cardA.name.localeCompare(cardB.name);

  if (nameComparison !== 0) {
    return nameComparison;
  }

  return cardA.id - cardB.id;
}

function getDashboardCards() {
  const db = getDb();

  const cards = db.prepare(`
    SELECT
      id,
      name,
      set_name AS setName,
      card_number AS cardNumber,
      card_condition AS condition,
      grading_company AS gradingCompany,
      grade,
      owned_quantity AS ownedQuantity,
      average_buy_price AS averageBuyPrice
    FROM cards
    ORDER BY name ASC, set_name ASC, card_number ASC
  `).all();

  const priceEntries = db.prepare(`
    SELECT
      id,
      card_id AS cardId,
      entry_date AS entryDate,
      raw_price AS rawPrice,
      psa9_price AS psa9Price,
      psa10_price AS psa10Price,
      notes
    FROM price_entries
    ORDER BY entry_date DESC, id DESC
  `).all();

  const externalSnapshots = db.prepare(`
    SELECT
      id,
      card_id AS cardId,
      source,
      snapshot_date AS snapshotDate,
      listing_count AS listingCount,
      median_price AS medianPrice
    FROM external_price_snapshots
    ORDER BY snapshot_date DESC, id DESC
  `).all();

  db.close();

  const pricesByCard = new Map();
  const snapshotsByCard = new Map();
  const latestEbaySnapshotsByCard = new Map();

  for (const entry of priceEntries) {
    const existingEntries = pricesByCard.get(entry.cardId) || [];
    existingEntries.push(entry);
    pricesByCard.set(entry.cardId, existingEntries);
  }

  for (const snapshot of externalSnapshots) {
    const existingSnapshots = snapshotsByCard.get(snapshot.cardId) || [];
    existingSnapshots.push(snapshot);
    snapshotsByCard.set(snapshot.cardId, existingSnapshots);

    if (snapshot.source === "eBay" && !latestEbaySnapshotsByCard.has(snapshot.cardId)) {
      latestEbaySnapshotsByCard.set(snapshot.cardId, snapshot);
    }
  }

  return cards.map((card) => {
    const cardEntries = pricesByCard.get(card.id) || [];
    const cardSnapshots = snapshotsByCard.get(card.id) || [];
    const latestEntry = cardEntries[0] || null;
    const latestExternalSnapshot = cardSnapshots[0] || null;
    const latestEbaySnapshot = latestEbaySnapshotsByCard.get(card.id) || null;
    const comparisonDate = latestEntry ? addDaysToDateString(latestEntry.entryDate, -7) : null;
    const sevenDayEntry = comparisonDate
      ? cardEntries.find((entry) => entry.entryDate === comparisonDate) || null
      : null;
    const sevenDayChange = latestEntry && sevenDayEntry
      ? calculatePercentChange(sevenDayEntry.rawPrice, latestEntry.rawPrice)
      : null;
    const profitLoss = latestEntry
      ? calculateProfitLoss(latestEntry.rawPrice, card.averageBuyPrice, card.ownedQuantity)
      : null;
    const latestActivityDate = [latestEntry ? latestEntry.entryDate : null, latestExternalSnapshot ? latestExternalSnapshot.snapshotDate : null]
      .filter(Boolean)
      .sort((dateA, dateB) => dateB.localeCompare(dateA))[0] || null;

    return {
      ...card,
      latestActivityDate,
      latestEntry,
      latestEbaySnapshot,
      sevenDayChange,
      profitLoss
    };
  }).sort(compareDashboardCards);
}

module.exports = {
  createPriceEntry,
  deletePriceEntry,
  getDashboardCards
};
