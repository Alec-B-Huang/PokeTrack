const express = require("express");

const { getDashboardCards } = require("../services/priceService");

const router = express.Router();

router.get("/", (req, res) => {
  const dashboardCards = getDashboardCards();

  res.render("dashboard", {
    dashboardCards,
    pageTitle: "Dashboard",
    successMessage: req.query.success || ""
  });
});

module.exports = router;
