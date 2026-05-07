const { getDb } = require("../db");

function getCards() {
  const db = getDb();
  const statement = db.prepare(`
    SELECT
      id,
      name,
      set_name AS setName,
      card_number AS cardNumber,
      card_condition AS condition,
      grading_company AS gradingCompany,
      grade,
      owned_quantity AS ownedQuantity,
      average_buy_price AS averageBuyPrice,
      created_at AS createdAt
    FROM cards
    ORDER BY name ASC, set_name ASC, card_number ASC
  `);

  const cards = statement.all();
  db.close();
  return cards;
}

function getCardById(cardId) {
  const db = getDb();
  const statement = db.prepare(`
    SELECT
      id,
      name,
      set_name AS setName,
      card_number AS cardNumber,
      card_condition AS condition,
      grading_company AS gradingCompany,
      grade,
      owned_quantity AS ownedQuantity,
      average_buy_price AS averageBuyPrice,
      created_at AS createdAt
    FROM cards
    WHERE id = ?
  `);

  const card = statement.get(cardId) || null;
  db.close();
  return card;
}

function findCardByNameAndSetName(cardName, setName) {
  const db = getDb();
  const statement = db.prepare(`
    SELECT
      id,
      name,
      set_name AS setName,
      card_number AS cardNumber,
      card_condition AS condition,
      owned_quantity AS ownedQuantity,
      average_buy_price AS averageBuyPrice,
      created_at AS createdAt
    FROM cards
    WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
      AND LOWER(TRIM(set_name)) = LOWER(TRIM(?))
    LIMIT 1
  `);

  const card = statement.get(cardName, setName) || null;
  db.close();
  return card;
}

function createCard(cardData) {
  const db = getDb();
  const statement = db.prepare(`
    INSERT INTO cards (
      name,
      set_name,
      card_number,
      card_condition,
      grading_company,
      grade,
      owned_quantity,
      average_buy_price
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = statement.run(
    cardData.name,
    cardData.setName,
    cardData.cardNumber,
    cardData.condition,
    cardData.gradingCompany,
    cardData.grade,
    cardData.ownedQuantity,
    cardData.averageBuyPrice
  );

  db.close();
  return result.lastInsertRowid;
}

function deleteCard(cardId) {
  const db = getDb();
  const getCardStatement = db.prepare(`
    SELECT
      id,
      name
    FROM cards
    WHERE id = ?
  `);
  const deleteCardStatement = db.prepare(`
    DELETE FROM cards
    WHERE id = ?
  `);

  const existingCard = getCardStatement.get(cardId) || null;

  if (!existingCard) {
    db.close();
    return null;
  }

  deleteCardStatement.run(cardId);
  db.close();
  return existingCard;
}

function getCardWithPriceHistory(cardId) {
  const db = getDb();
  const cardStatement = db.prepare(`
    SELECT
      id,
      name,
      set_name AS setName,
      card_number AS cardNumber,
      card_condition AS condition,
      grading_company AS gradingCompany,
      grade,
      owned_quantity AS ownedQuantity,
      average_buy_price AS averageBuyPrice,
      created_at AS createdAt
    FROM cards
    WHERE id = ?
  `);

  const priceStatement = db.prepare(`
    SELECT
      id,
      card_id AS cardId,
      entry_date AS entryDate,
      raw_price AS rawPrice,
      psa9_price AS psa9Price,
      psa10_price AS psa10Price,
      notes
    FROM price_entries
    WHERE card_id = ?
    ORDER BY entry_date DESC, id DESC
  `);

  const card = cardStatement.get(cardId);

  if (!card) {
    db.close();
    return null;
  }

  const priceHistory = priceStatement.all(cardId);
  db.close();

  return {
    ...card,
    priceHistory
  };
}

module.exports = {
  createCard,
  deleteCard,
  findCardByNameAndSetName,
  getCardById,
  getCards,
  getCardWithPriceHistory
};
