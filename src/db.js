const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const dataDirectory = path.join(__dirname, "..", "data");
const dbPath = path.join(dataDirectory, "poketrack.sqlite");
const schemaPath = path.join(dataDirectory, "schema.sql");

let schemaInitialized = false;

function ensureDataDirectory() {
  if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(dataDirectory, { recursive: true });
  }
}

function getTableColumns(db, tableName) {
  return db.prepare(`PRAGMA table_info(${tableName})`).all().map((column) => column.name);
}

function ensureCardsGradingSchema(db) {
  const cardColumns = getTableColumns(db, "cards");
  const hasGradingCompany = cardColumns.includes("grading_company");
  const hasGrade = cardColumns.includes("grade");

  if (hasGradingCompany && hasGrade) {
    return;
  }

  db.exec("PRAGMA foreign_keys = OFF");
  db.exec(`
    CREATE TABLE cards_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      set_name TEXT NOT NULL,
      card_number TEXT NOT NULL,
      card_condition TEXT NOT NULL CHECK (
        card_condition IN (
          'Raw/Near Mint',
          'Lightly Played',
          'Moderately Played',
          'Heavily Played',
          'Damaged',
          'Graded'
        )
      ),
      owned_quantity INTEGER NOT NULL DEFAULT 0 CHECK (owned_quantity >= 0),
      average_buy_price REAL NOT NULL DEFAULT 0 CHECK (average_buy_price >= 0),
      grading_company TEXT CHECK (grading_company IS NULL OR grading_company = 'PSA'),
      grade INTEGER CHECK (grade IS NULL OR grade BETWEEN 1 AND 10),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    INSERT INTO cards_new (
      id,
      name,
      set_name,
      card_number,
      card_condition,
      owned_quantity,
      average_buy_price,
      grading_company,
      grade,
      created_at
    )
    SELECT
      id,
      name,
      set_name,
      card_number,
      card_condition,
      owned_quantity,
      average_buy_price,
      NULL,
      NULL,
      created_at
    FROM cards
  `);

  db.exec("DROP TABLE cards");
  db.exec("ALTER TABLE cards_new RENAME TO cards");
  db.exec("PRAGMA foreign_keys = ON");
}

function getDb() {
  ensureDataDirectory();

  const db = new Database(dbPath);
  db.pragma("foreign_keys = ON");

  if (!schemaInitialized && fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, "utf8");
    db.exec(schemaSql);
    ensureCardsGradingSchema(db);
    schemaInitialized = true;
  }

  return db;
}

module.exports = {
  dbPath,
  getDb
};
