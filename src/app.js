const express = require("express");
const helmet = require("helmet");
const path = require("path");

require("./config/env");

const dashboardRoutes = require("./routes/dashboard");
const cardRoutes = require("./routes/cards");
const externalSnapshotRoutes = require("./routes/externalSnapshots");
const listingsRoutes = require("./routes/listings");
const priceRoutes = require("./routes/prices");
const salesRoutes = require("./routes/sales");

const app = express();
const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || "127.0.0.1";
const formBodyLimit = "1mb";

const conditionOptions = [
  "Raw/Near Mint",
  "Lightly Played",
  "Moderately Played",
  "Heavily Played",
  "Damaged",
  "Graded"
];
const gradingCompanyOptions = ["PSA"];
const gradeOptions = Array.from({ length: 10 }, (_, index) => index + 1);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(express.urlencoded({ extended: true, limit: formBodyLimit }));
app.use(express.static(path.join(__dirname, "public")));

app.locals.conditionOptions = conditionOptions;
app.locals.gradeOptions = gradeOptions;
app.locals.gradingCompanyOptions = gradingCompanyOptions;
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
app.use("/", externalSnapshotRoutes);
app.use("/", listingsRoutes);
app.use("/", priceRoutes);
app.use("/", salesRoutes);

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error.type === "entity.too.large") {
    return res.status(413).send("Submitted form data is too large.");
  }

  if (app.get("env") === "production") {
    console.error(error.message);
  } else {
    console.error(error);
  }

  return res.status(error.status || 500).send("Something went wrong inside PokeTrack.");
});

if (require.main === module) {
  app.listen(port, host, () => {
    console.log(`PokeTrack is running at http://${host}:${port}`);
  });
}

module.exports = app;
