# PokeTrack

PokeTrack is a beginner-friendly local web app for manually tracking Pokemon card prices. It uses server-rendered pages with Express, EJS, and SQLite, so you can run everything on your own machine without APIs or scraping.

## What This MVP Does

- Add Pokemon cards to a watchlist
- Record daily price entries for each card
- View a dashboard with:
  - latest raw price
  - exact 7-day percentage change when that comparison exists
  - profit or loss based on your average buy price and owned quantity
- Fetch and store eBay active-listing snapshot data for a watched card
- Store the individual active eBay listings behind each fetched eBay snapshot

## Tech Stack

- Node.js
- Express
- EJS
- SQLite with `better-sqlite3`

## Project Structure

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
    views/
      partials/
        footer.ejs
        header.ejs
      add-card.ejs
      add-price.ejs
      card-detail.ejs
      dashboard.ejs
      import-snapshots.ejs
    public/
      styles.css
    services/
      cardService.js
      ebayService.js
      externalSnapshotService.js
      priceService.js
    utils/
      calculations.js
      csvSnapshotImport.js
      ebayMapper.js
  data/
    external_snapshot_import_template.csv
    schema.sql
    seed.sql
  scripts/
    initDb.js
    seedChartTestData.js
    seedDb.js
```

## Setup

1. Open a terminal in the project root:

   ```bash
   cd /Users/alechuang/Documents/CODEX/PokeTrack
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy the environment example and add your eBay credentials when you are ready:

   ```bash
   cp .env.example .env
   ```

4. Create the SQLite database and tables:

   ```bash
   npm run init-db
   ```

5. Load sample data:

   ```bash
   npm run seed-db
   ```

6. Start the app:

   ```bash
   npm start
   ```

7. For development with automatic restarts:

   ```bash
   npm run dev
   ```

8. Open your browser to:

   [http://localhost:3000](http://localhost:3000)

## Chart Test Data

For temporary chart testing only, you can add extra eBay snapshot history for `Charizard` from `Base Set`:

```bash
npm run seed-chart-test-data
```

Notes:

- This is **test data only** for local chart development.
- It looks up the target card by `name = Charizard` and `set_name = Base Set`.
- Run `npm run seed-db` first so the target card exists.
- The script replaces existing eBay snapshots for that one card with several chart-friendly sample points across multiple dates.

## eBay Environment Variables

Add these values to your local `.env` file:

```env
EBAY_CLIENT_ID=your_ebay_client_id
EBAY_CLIENT_SECRET=your_ebay_client_secret
EBAY_ENVIRONMENT=production
EBAY_MARKETPLACE_ID=EBAY_US
```

Notes:

- Do not commit real API keys.
- If eBay credentials are missing or invalid, the app will show a friendly error instead of crashing.
- The current implementation targets the eBay Browse API and stores snapshot history in SQLite.
- Active eBay listings are stored separately from snapshot summary rows.
- eBay active-listing filtering is intentionally conservative and runs before median/lowest snapshot calculations.
- eBay fetching now uses either raw-card mode or graded-card mode depending on the watched card.
- eBay snapshot charts use Chart.js through a browser CDN include, so no extra local install is needed.
- Some eBay account or production-access details may still need to be finalized with your own developer account.

## Main Pages

- `/` dashboard
- `/cards/new` add a watched card
- `/prices/new` add a daily price entry
- `/cards/:id` view one card and its price history
- `/cards/:id/external-snapshots/ebay/fetch` fetch and save an eBay snapshot for one card
- `/external-snapshots/import` paste CSV data to import external snapshots

## Notes for Beginners

- Card data lives in the `cards` table.
- Daily prices live in the `price_entries` table.
- External snapshot imports and eBay snapshots both live in `external_price_snapshots`.
- Individual eBay active listings live in `ebay_active_listings` and are tied to one saved eBay snapshot.
- Manual price entries and external snapshots can be deleted safely from the card detail page, with confirmation prompts.
- Cards themselves can be deleted from the card detail page, which also deletes their related price and snapshot records.
- Dashboard calculations are kept in `src/utils/calculations.js`.
- Database access is separated into small service files to keep routes easier to follow.
- eBay credentials are loaded from `.env` through `src/config/env.js`.
- The eBay chart on each card page is built from saved `external_price_snapshots` data.
- `npm run seed-chart-test-data` is available for temporary local chart testing only.

## CSV Snapshot Import

Paste CSV data with this exact header:

```csv
card_name,set_name,source,snapshot_date,listing_count,lowest_price,median_price,notes
```

Example:

```csv
card_name,set_name,source,snapshot_date,listing_count,lowest_price,median_price,notes
Charizard,Base Set,eBay,2026-05-05,11,238.25,255.00,Manual import test
Pikachu,Jungle,ALT,2026-05-05,4,8.10,9.40,Imported from spreadsheet
Umbreon,Neo Discovery,PriceCharting,2026-05-05,0,,,No current pricing collected that day
```

Rules:

- `notes` column must exist, but notes cells may be blank.
- `lowest_price` and `median_price` may be blank and will display as `N/A` in the UI.
- Imported rows match cards by `card_name` and `set_name`.
- Invalid or unmatched rows are rejected with clear errors before anything is imported.
- Imported snapshots appear in the existing external chart and history table on the card detail page.

## Assumptions in This MVP

- Profit/loss uses the latest raw price only.
- The 7-day percentage change only appears when there is an entry exactly 7 days before the latest one.
- PSA 9 and PSA 10 prices are optional so you can still log raw prices when graded prices are unavailable.
- eBay snapshots currently target USD marketplace data and store a simple aggregated snapshot instead of full listing records.
- Active listings only are stored for eBay snapshots in this phase. Sold/completed sales are not included.
- The eBay listing filter currently aims to keep the same card and exclude obvious unrelated variants like Celebrations or Evolutions for Base Set Charizard.
- Graded watched cards can use a looser slab-aware filter while raw-card searches remain strict.
- PSA-graded watched cards can include PSA grade information in the eBay query and sort matching listings by grade closeness.

## Next Ideas

- Edit and delete cards
- Edit and delete price entries
- Charts for price history
- Filters by set, condition, or profit/loss
- CSV import and export
