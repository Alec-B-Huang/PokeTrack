const path = require("path");
const dotenv = require("dotenv");

dotenv.config({
  path: path.join(__dirname, "..", "..", ".env"),
  quiet: true
});

function getTrimmedEnvValue(name, fallback = "") {
  const rawValue = process.env[name];

  if (typeof rawValue !== "string") {
    return fallback;
  }

  return rawValue.trim() || fallback;
}

function getEbayEnvironment() {
  const environment = getTrimmedEnvValue("EBAY_ENVIRONMENT", "production").toLowerCase();
  return environment === "sandbox" ? "sandbox" : "production";
}

const ebayEnvironment = getEbayEnvironment();
const ebayApiBaseUrl = ebayEnvironment === "sandbox"
  ? "https://api.sandbox.ebay.com"
  : "https://api.ebay.com";

const ebayConfig = {
  clientId: getTrimmedEnvValue("EBAY_CLIENT_ID"),
  clientSecret: getTrimmedEnvValue("EBAY_CLIENT_SECRET"),
  environment: ebayEnvironment,
  marketplaceId: getTrimmedEnvValue("EBAY_MARKETPLACE_ID", "EBAY_US"),
  apiBaseUrl: ebayApiBaseUrl,
  tokenUrl: `${ebayApiBaseUrl}/identity/v1/oauth2/token`,
  browseSearchUrl: `${ebayApiBaseUrl}/buy/browse/v1/item_summary/search`,
  scope: "https://api.ebay.com/oauth/api_scope",
  searchLimit: 25
};

ebayConfig.isConfigured = Boolean(ebayConfig.clientId && ebayConfig.clientSecret);

module.exports = {
  ebayConfig
};
