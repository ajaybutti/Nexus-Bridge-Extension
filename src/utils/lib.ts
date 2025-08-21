export const formatDecimalAmount = (amount: string): string => {
  const num = parseFloat(amount);
  if (isNaN(num)) return amount;
  return num.toFixed(2);
};
