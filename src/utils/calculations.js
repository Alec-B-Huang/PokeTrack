function addDaysToDateString(dateString, dayOffset) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + dayOffset);
  return date.toISOString().slice(0, 10);
}

function calculatePercentChange(previousValue, currentValue) {
  if (
    previousValue === null ||
    previousValue === undefined ||
    currentValue === null ||
    currentValue === undefined ||
    Number(previousValue) === 0
  ) {
    return null;
  }

  return ((Number(currentValue) - Number(previousValue)) / Number(previousValue)) * 100;
}

function calculateProfitLoss(latestRawPrice, averageBuyPrice, ownedQuantity) {
  if (
    latestRawPrice === null ||
    latestRawPrice === undefined ||
    averageBuyPrice === null ||
    averageBuyPrice === undefined ||
    ownedQuantity === null ||
    ownedQuantity === undefined
  ) {
    return null;
  }

  return (Number(latestRawPrice) - Number(averageBuyPrice)) * Number(ownedQuantity);
}

module.exports = {
  addDaysToDateString,
  calculatePercentChange,
  calculateProfitLoss
};
