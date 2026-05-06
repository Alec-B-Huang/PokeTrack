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

CREATE TABLE IF NOT EXISTS external_price_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id INTEGER NOT NULL,
  source TEXT NOT NULL,
  snapshot_date TEXT NOT NULL,
  search_query TEXT NOT NULL,
  listing_count INTEGER NOT NULL DEFAULT 0 CHECK (listing_count >= 0),
  lowest_price REAL CHECK (lowest_price IS NULL OR lowest_price >= 0),
  median_price REAL CHECK (median_price IS NULL OR median_price >= 0),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_external_price_snapshots_card_source_date
  ON external_price_snapshots (card_id, source, snapshot_date DESC);

CREATE TABLE IF NOT EXISTS ebay_active_listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  snapshot_id INTEGER NOT NULL,
  external_item_id TEXT,
  title TEXT NOT NULL,
  price REAL CHECK (price IS NULL OR price >= 0),
  currency TEXT,
  listing_condition TEXT,
  listing_url TEXT,
  seller_username TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (snapshot_id) REFERENCES external_price_snapshots(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ebay_active_listings_snapshot_id
  ON ebay_active_listings (snapshot_id);

CREATE INDEX IF NOT EXISTS idx_ebay_active_listings_external_item_id
  ON ebay_active_listings (external_item_id);
