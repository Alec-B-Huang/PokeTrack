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
      'Damaged',
      'Graded'
    )
  ),
  owned_quantity INTEGER NOT NULL DEFAULT 0 CHECK (owned_quantity >= 0),
  average_buy_price REAL NOT NULL DEFAULT 0 CHECK (average_buy_price >= 0),
  grading_company TEXT CHECK (grading_company IS NULL OR grading_company = 'PSA'),
  grade INTEGER CHECK (grade IS NULL OR grade BETWEEN 1 AND 10),
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

CREATE TABLE IF NOT EXISTS external_sales_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id INTEGER NOT NULL,
  source TEXT NOT NULL,
  snapshot_date TEXT NOT NULL,
  search_query TEXT NOT NULL,
  sale_count INTEGER NOT NULL DEFAULT 0 CHECK (sale_count >= 0),
  lowest_sale_price REAL CHECK (lowest_sale_price IS NULL OR lowest_sale_price >= 0),
  median_sale_price REAL CHECK (median_sale_price IS NULL OR median_sale_price >= 0),
  average_sale_price REAL CHECK (average_sale_price IS NULL OR average_sale_price >= 0),
  highest_sale_price REAL CHECK (highest_sale_price IS NULL OR highest_sale_price >= 0),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_external_sales_snapshots_card_source_date
  ON external_sales_snapshots (card_id, source, snapshot_date DESC);

CREATE TABLE IF NOT EXISTS external_sold_sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  snapshot_id INTEGER NOT NULL,
  external_item_id TEXT,
  title TEXT NOT NULL,
  sale_price REAL NOT NULL CHECK (sale_price >= 0),
  currency TEXT NOT NULL,
  sold_date TEXT NOT NULL,
  listing_condition TEXT,
  listing_format TEXT,
  listing_url TEXT,
  seller_username TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (snapshot_id) REFERENCES external_sales_snapshots(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_external_sold_sales_snapshot_id
  ON external_sold_sales (snapshot_id);

CREATE INDEX IF NOT EXISTS idx_external_sold_sales_external_item_id
  ON external_sold_sales (external_item_id);
