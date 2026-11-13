// AI-assisted: see docs/AI_LOG.md #22
// Fare logic for UberClone Driver
// Commissions: 20% for UberClone, 80% for the driver.

export const COMMISSIONS = {
  UBERCLONE: 0.2, // 20%
  DRIVER: 0.8,    // 80%
};

/**
 * Calculates the breakdown of a fare.
 * @param {number} totalFare Total fare in COP.
 * @returns {object} Breakdown of the fare.
 */
export function calculateFareBreakdown(totalFare) {
  const uberCloneCommission = Math.round(totalFare * COMMISSIONS.UBERCLONE);
  const driverEarnings = totalFare - uberCloneCommission;

  return {
    totalFare,
    uberCloneCommission,
    driverEarnings,
    currency: 'COP',
  };
}

/**
 * Formats a currency value to COP.
 * @param {number} value Value to format.
 * @returns {string} Formatted currency string.
 */
export function formatCurrency(value) {
  if (typeof value !== 'number') return '$0';
  return `$${Math.round(value).toLocaleString('es-CO')}`;
}
