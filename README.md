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
    public/
      styles.css
    services/
      cardService.js
      ebayService.js
      externalSnapshotService.js
      priceService.js
    utils/
      calculations.js
      ebayMapper.js
  data/
    schema.sql
    seed.sql
  scripts/
    initDb.js
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
- Some eBay account or production-access details may still need to be finalized with your own developer account.

## Main Pages

- `/` dashboard
- `/cards/new` add a watched card
- `/prices/new` add a daily price entry
- `/cards/:id` view one card and its price history
- `/cards/:id/external-snapshots/ebay/fetch` fetch and save an eBay snapshot for one card

## Notes for Beginners

- Card data lives in the `cards` table.
- Daily prices live in the `price_entries` table.
- Dashboard calculations are kept in `src/utils/calculations.js`.
- Database access is separated into small service files to keep routes easier to follow.
- eBay credentials are loaded from `.env` through `src/config/env.js`.

## Assumptions in This MVP

- Profit/loss uses the latest raw price only.
- The 7-day percentage change only appears when there is an entry exactly 7 days before the latest one.
- PSA 9 and PSA 10 prices are optional so you can still log raw prices when graded prices are unavailable.
- eBay snapshots currently target USD marketplace data and store a simple aggregated snapshot instead of full listing records.

## Next Ideas

- Edit and delete cards
- Edit and delete price entries
- Charts for price history
- Filters by set, condition, or profit/loss
- CSV import and export
