# PokeTrack

PokeTrack is a local Pokemon card market-tracking web app built with Express, EJS, and SQLite.

It combines:

* manual collection tracking
* eBay active listing snapshots
* graded PSA card support
* sold-sales CSV imports
* historical market snapshot storage

while keeping all data stored locally on your machine.

The app is intentionally beginner-friendly and server-rendered, so everything runs locally without needing a frontend framework.

---

# Features

## Watchlist Tracking

* Add Pokemon cards to a local watchlist
* Track:

  * card name
  * set name
  * card number
  * condition
  * owned quantity
  * average buy price
* Support for:

  * raw cards
  * PSA graded cards

---

## Manual Price Tracking

* Add daily manual/raw price entries
* Dashboard automatically calculates:

  * latest raw price
  * exact 7-day percentage change
  * profit/loss based on owned quantity and average buy
* Historical manual entries are stored separately from external market snapshots

---

## eBay Active Listing Snapshots

Fetch and store active eBay listings for tracked cards using the eBay Browse API.

Features include:

* active listing snapshot history
* median and lowest listing calculations
* individual listing storage
* graded-card-aware filtering
* raw-card-specific filtering
* same-day snapshot deduplication
* market signal indicators

Snapshots are stored separately from manual price entries.

---

## Graded PSA Card Support

Graded cards can include:

* grading company
* PSA grade (1 to 10)

The eBay snapshot system:

* detects graded-card mode automatically
* includes PSA grade information in search queries
* ranks exact grade matches first
* ranks nearby grades after exact matches

---

## Sold Sales Import

Sold/completed sales are handled separately from active listings.

You can import sold sales manually through CSV from sources such as:

* eBay sold exports
* ALT notes
* Fanatics records
* PriceCharting exports
* personal spreadsheets

Imported sold sales are grouped into separate sold-sales snapshots.

---

# Tech Stack

* Node.js
* Express
* EJS
* SQLite
* better-sqlite3
* Chart.js

---

# Project Structure

```text
PokeTrack/
  .env.example
  package.json
  README.md
  .gitignore

  src/
    app.js
    db.js

    config/
      env.js

    routes/
      cards.js
      dashboard.js
      externalSnapshots.js
      prices.js
      sales.js

    views/
      partials/
        footer.ejs
        header.ejs

      add-card.ejs
      add-price.ejs
      card-detail.ejs
      dashboard.ejs
      import-snapshots.ejs
      listings.ejs
      sales.ejs

    public/
      styles.css

    services/
      cardService.js
      ebayService.js
      externalSalesService.js
      externalSnapshotService.js
      priceService.js

    utils/
      calculations.js
      csvSnapshotImport.js
      csvSoldSalesImport.js
      ebayMapper.js

  data/
    external_snapshot_import_template.csv
    external_sold_sales_import_template.csv
    schema.sql
    seed.sql

  scripts/
    initDb.js
    seedChartTestData.js
    seedDb.js
```

---

# Setup

## 1. Open the project folder

```bash
cd /Users/alechuang/Documents/CODEX/PokeTrack
```

---

## 2. Install dependencies

```bash
npm install
```

---

## 3. Create your `.env` file

```bash
cp .env.example .env
```

---

## 4. Add eBay credentials

```env
EBAY_CLIENT_ID=your_ebay_client_id
EBAY_CLIENT_SECRET=your_ebay_client_secret
EBAY_ENVIRONMENT=production
EBAY_MARKETPLACE_ID=EBAY_US
```

Notes:

* Do not commit real API keys
* Invalid or missing credentials show friendly errors instead of crashing the app

---

## 5. Initialize the database

```bash
npm run init-db
```

---

## 6. Seed sample data

```bash
npm run seed-db
```

---

## 7. Start the app

```bash
npm start
```

For development with automatic restarts:

```bash
npm run dev
```

---

## 8. Open the app

```text
http://localhost:3000
```

---

# Main Pages

| Route                                      | Purpose                              |
| ------------------------------------------ | ------------------------------------ |
| `/`                                        | Dashboard                            |
| `/cards/new`                               | Add watched cards                    |
| `/prices/new`                              | Add manual price entries             |
| `/cards/:id`                               | View one tracked card                |
| `/cards/:id/external-snapshots/ebay/fetch` | Fetch eBay active listings           |
| `/external-snapshots/import`               | Import external snapshot CSV data    |
| `/sales`                                   | Import sold/completed sales CSV data |
| `/listings`                                | Listings section                     |

---

# Database Overview

## Core Tables

### `cards`

Stores tracked cards.

---

### `price_entries`

Stores manual/raw daily price entries.

---

### `external_price_snapshots`

Stores summary-level external listing snapshots.

Examples:

* eBay active listing snapshots
* imported external market snapshots

---

### `ebay_active_listings`

Stores individual eBay active listings tied to a saved snapshot.

---

### `external_sales_snapshots`

Stores summary-level sold-sales snapshots.

---

### `external_sold_sales`

Stores individual sold sales tied to a sold snapshot.

---

# eBay Snapshot Behavior

## Same-Day Deduplication

External snapshots are deduplicated by:

```text
card_id + source + snapshot_date
```

If a snapshot already exists for the same day:

* the snapshot is updated
* active listing rows are replaced
* duplicates are avoided

---

## Raw Card Filtering

Raw-card mode uses stricter filtering to reduce unrelated listings.

Examples of excluded keywords:

* celebrations
* classic collection
* evolutions
* proxy
* metal
* jumbo

---

## Graded Card Filtering

Graded-card mode:

* expands search queries with PSA grading information
* prioritizes exact grade matches
* ranks nearby grades afterward

---

# Market Signal Indicators

Cards with at least two valid eBay snapshots can display:

* positive market signals
* negative market signals

Signals are based on percentage movement between recent eBay median listing snapshots.

These indicators are intentionally conservative and do not claim confirmed sold-price movement.

---

# CSV Snapshot Import

Paste CSV data using this header:

```csv
card_name,set_name,source,snapshot_date,listing_count,lowest_price,median_price,notes
```

Example:

```csv
card_name,set_name,source,snapshot_date,listing_count,lowest_price,median_price,notes
Charizard,Base Set,eBay,2026-05-05,11,238.25,255.00,Manual import test
Pikachu,Jungle,ALT,2026-05-05,4,8.10,9.40,Imported from spreadsheet
```

Rules:

* cards match by `card_name + set_name`
* invalid rows are rejected before import
* same-day rows update existing snapshots instead of duplicating them

---

# Sold Sales CSV Import

The `Sales` page accepts either an uploaded `.csv` file or pasted CSV text.

Required CSV header:

```csv
card_name,set_name,source,snapshot_date,sold_date,title,sale_price,currency,listing_condition,listing_format,listing_url,external_item_id,seller_username,notes
```

Example:

```csv
card_name,set_name,source,snapshot_date,sold_date,title,sale_price,currency,listing_condition,listing_format,listing_url,external_item_id,seller_username,notes
Charizard,Base Set,eBay Sold,2026-05-10,2026-05-08,Charizard Base Set 4/102 PSA 10,8450.00,USD,Graded,FIXED_PRICE,https://example.com/item1,1234567890,seller_a,Manual sold comp
```

Import behavior:

* rows group into sold-sales snapshots
* summary metrics are calculated automatically
* re-importing the same snapshot replaces existing child sold-sale rows
* upload and pasted-text imports use the same parser, validation, and dedup flow

---

# Utility Scripts

## Seed Chart Test Data

```bash
npm run seed-chart-test-data
```

This script:

* creates temporary chart-friendly snapshot history
* replaces existing test snapshots for one target card
* is intended only for local development/testing

---

# Current Limitations

* eBay integration currently focuses on active listings only
* sold/completed sales are manual CSV imports for now
* market signals are based on active listing movement, not confirmed sold prices
* PSA grading support currently targets PSA only
* auction/sold APIs are not yet integrated directly

---

# Future Ideas

* sold-sales charts
* automated snapshot scheduling
* weighted median calculations
* volatility indicators
* liquidity scoring
* multi-marketplace aggregation
* advanced filtering
* portfolio analytics
* authentication/user accounts
* export tools

---

# Notes

* All app data is stored locally in SQLite
* Database access is separated into service files for readability
* The project intentionally favors clarity and maintainability over heavy abstraction
* The app is designed as a learning-focused full-stack project and local collection tool

## Long-Term Vision

PokeTrack is evolving from a simple price tracker into a card market intelligence tool.

The long-term goal is to help evaluate raw and graded Pokémon cards more accurately, especially Japanese cards where condition-based comps are difficult. Many marketplace listings rely on seller-provided condition labels, but raw card condition often depends heavily on image details such as whitening, corner wear, edge wear, and back-surface quality.

Future development will explore:

- collecting seller listing images from eBay API results
- separating canonical card images from seller listing photos
- building a manual condition-review workflow
- labeling front/back card images for reviewed condition
- comparing seller-listed condition against reviewed condition
- developing condition-adjusted market estimates
- eventually experimenting with AI-assisted condition classification

The goal is not to replace professional grading, but to create a practical tool for better market research and condition-aware comping.