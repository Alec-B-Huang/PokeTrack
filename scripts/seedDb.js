const fs = require("fs");
const path = require("path");

const { dbPath, getDb } = require("../src/db");

const schemaPath = path.join(__dirname, "..", "data", "schema.sql");
const seedPath = path.join(__dirname, "..", "data", "seed.sql");

const schemaSql = fs.readFileSync(schemaPath, "utf8");
const seedSql = fs.readFileSync(seedPath, "utf8");

const db = getDb();
db.exec(schemaSql);
db.exec(seedSql);
db.close();

console.log(`Database seeded with sample data at ${dbPath}`);
