const fs = require("fs");
const path = require("path");

const { dbPath, getDb } = require("../src/db");

const schemaPath = path.join(__dirname, "..", "data", "schema.sql");
const schemaSql = fs.readFileSync(schemaPath, "utf8");

const db = getDb();
db.exec(schemaSql);
db.close();

console.log(`Database initialized at ${dbPath}`);
