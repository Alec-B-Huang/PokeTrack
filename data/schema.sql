CREATE TABLE IF NOT EXISTS cards (
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
      'Damaged'
    )
  ),
  owned_quantity INTEGER NOT NULL DEFAULT 0 CHECK (owned_quantity >= 0),
  average_buy_price REAL NOT NULL DEFAULT 0 CHECK (average_buy_price >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS price_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id INTEGER NOT NULL,
  entry_date TEXT NOT NULL,
  raw_price REAL NOT NULL CHECK (raw_price >= 0),
  psa9_price REAL CHECK (psa9_price IS NULL OR psa9_price >= 0),
  psa10_price REAL CHECK (psa10_price IS NULL OR psa10_price >= 0),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
  UNIQUE (card_id, entry_date)
);
