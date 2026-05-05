# PokeTrack

PokeTrack is a beginner-friendly local web app for manually tracking Pokemon card prices. It uses server-rendered pages with Express, EJS, and SQLite, so you can run everything on your own machine without APIs or scraping.

## What This MVP Does

- Add Pokemon cards to a watchlist
- Record daily price entries for each card
- View a dashboard with:
  - latest raw price
  - exact 7-day percentage change when that comparison exists
  - profit or loss based on your average buy price and owned quantity

## Tech Stack

- Node.js
- Express
- EJS
- SQLite with `better-sqlite3`

## Project Structure

```text
PokeTrack/
  package.json
  README.md
  .gitignore
  src/
    app.js
    db.js
    routes/
      cards.js
      dashboard.js
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
      priceService.js
    utils/
      calculations.js
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

3. Create the SQLite database and tables:

   ```bash
   npm run init-db
   ```

4. Load sample data:

   ```bash
   npm run seed-db
   ```

5. Start the app:

   ```bash
   npm start
   ```

6. For development with automatic restarts:

   ```bash
   npm run dev
   ```

7. Open your browser to:

   [http://localhost:3000](http://localhost:3000)

## Main Pages

- `/` dashboard
- `/cards/new` add a watched card
- `/prices/new` add a daily price entry
- `/cards/:id` view one card and its price history

## Notes for Beginners

- Card data lives in the `cards` table.
- Daily prices live in the `price_entries` table.
- Dashboard calculations are kept in `src/utils/calculations.js`.
- Database access is separated into small service files to keep routes easier to follow.

## Assumptions in This MVP

- Profit/loss uses the latest raw price only.
- The 7-day percentage change only appears when there is an entry exactly 7 days before the latest one.
- PSA 9 and PSA 10 prices are optional so you can still log raw prices when graded prices are unavailable.

## Next Ideas

- Edit and delete cards
- Edit and delete price entries
- Charts for price history
- Filters by set, condition, or profit/loss
- CSV import and export
