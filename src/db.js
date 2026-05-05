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

function getDb() {
  ensureDataDirectory();

  const db = new Database(dbPath);
  db.pragma("foreign_keys = ON");

  if (!schemaInitialized && fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, "utf8");
    db.exec(schemaSql);
    schemaInitialized = true;
  }

  return db;
}

module.exports = {
  dbPath,
  getDb
};
