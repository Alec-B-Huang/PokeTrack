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

function calculateMedian(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }

  const sortedValues = [...values]
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
    .sort((firstValue, secondValue) => firstValue - secondValue);

  if (sortedValues.length === 0) {
    return null;
  }

  const middleIndex = Math.floor(sortedValues.length / 2);

  if (sortedValues.length % 2 === 1) {
    return sortedValues[middleIndex];
  }

  return (sortedValues[middleIndex - 1] + sortedValues[middleIndex]) / 2;
}

module.exports = {
  addDaysToDateString,
  calculateMedian,
  calculatePercentChange,
  calculateProfitLoss
};
