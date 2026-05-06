const fs = require("fs");
const path = require("path");

const { dbPath, getDb } = require("../src/db");

const schemaPath = path.join(__dirname, "..", "data", "schema.sql");

const schemaSql = fs.readFileSync(schemaPath, "utf8");
const chartTestSnapshots = [
  {
    snapshotDate: "2026-04-20",
    listingCount: 5,
    lowestPrice: 210.0,
    medianPrice: 228.5
  },
  {
    snapshotDate: "2026-04-24",
    listingCount: 7,
    lowestPrice: 218.0,
    medianPrice: 235.75
  },
  {
    snapshotDate: "2026-04-28",
    listingCount: 9,
    lowestPrice: 224.5,
    medianPrice: 242.0
  },
  {
    snapshotDate: "2026-05-02",
    listingCount: 8,
    lowestPrice: 229.99,
    medianPrice: 247.5
  },
  {
    snapshotDate: "2026-05-05",
    listingCount: 11,
    lowestPrice: 238.25,
    medianPrice: 255.0
  }
];

const db = getDb();
db.exec(schemaSql);

const targetCard = db.prepare(`
  SELECT id, name, set_name AS setName
  FROM cards
  WHERE name = ? AND set_name = ?
  LIMIT 1
`).get("Charizard", "Base Set");

if (!targetCard) {
  db.close();
  console.error("TEST DATA ONLY seed failed: could not find Charizard from Base Set. Run npm run seed-db first.");
  process.exit(1);
}

db.prepare(`
  DELETE FROM external_price_snapshots
  WHERE card_id = ? AND source = ?
`).run(targetCard.id, "eBay");

const insertSnapshot = db.prepare(`
  INSERT INTO external_price_snapshots (
    card_id,
    source,
    snapshot_date,
    search_query,
    listing_count,
    lowest_price,
    median_price,
    notes
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const snapshot of chartTestSnapshots) {
  insertSnapshot.run(
    targetCard.id,
    "eBay",
    snapshot.snapshotDate,
    "Charizard Base Set 4/102 Pokemon card near mint",
    snapshot.listingCount,
    snapshot.lowestPrice,
    snapshot.medianPrice,
    "TEST DATA ONLY: chart seeding snapshot for local chart development."
  );
}

const snapshotCount = db.prepare(`
  SELECT COUNT(*) AS count
  FROM external_price_snapshots
  WHERE card_id = ? AND source = ?
`).get(targetCard.id, "eBay");

db.close();

console.log(
  `TEST DATA ONLY: added ${snapshotCount.count} eBay chart snapshot rows for ${targetCard.name} (${targetCard.setName}) at ${dbPath}`
);
