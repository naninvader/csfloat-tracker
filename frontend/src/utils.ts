export const formatCents = (cents: number) => {
  const value = cents / 100;
  return value.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
};
