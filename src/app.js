const express = require("express");
const path = require("path");

const dashboardRoutes = require("./routes/dashboard");
const cardRoutes = require("./routes/cards");
const priceRoutes = require("./routes/prices");

const app = express();
const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || "127.0.0.1";

const conditionOptions = [
  "Raw/Near Mint",
  "Lightly Played",
  "Moderately Played",
  "Heavily Played",
  "Damaged"
];

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.locals.conditionOptions = conditionOptions;
app.locals.currentYear = new Date().getFullYear();
app.locals.formatCurrency = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "N/A";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(Number(value));
};

app.locals.formatPercent = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "N/A";
  }

  const numericValue = Number(value);
  const prefix = numericValue > 0 ? "+" : "";
  return `${prefix}${numericValue.toFixed(2)}%`;
};

app.use("/", dashboardRoutes);
app.use("/", cardRoutes);
app.use("/", priceRoutes);

app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) {
    return next(error);
  }

  return res.status(500).send("Something went wrong inside PokeTrack.");
});

if (require.main === module) {
  app.listen(port, host, () => {
    console.log(`PokeTrack is running at http://${host}:${port}`);
  });
}

module.exports = app;
