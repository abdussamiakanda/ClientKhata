/**
 * Utility functions for client-related operations
 */

/**
 * Check if a client has monthly salary configured
 * @param {import('../schema/clientSchema').Client} client
 * @returns {boolean}
 */
export function hasMonthlySalary(client) {
  return client &&
         typeof client.monthlySalary === 'number' &&
         client.monthlySalary > 0;
}

/**
 * Get the monthly salary amount for a client
 * @param {import('../schema/clientSchema').Client} client
 * @returns {number|null}
 */
export function getMonthlySalaryAmount(client) {
  return hasMonthlySalary(client) ? client.monthlySalary : null;
}

/**
 * Get the monthly salary currency for a client
 * @param {import('../schema/clientSchema').Client} client
 * @returns {string|null}
 */
export function getMonthlySalaryCurrency(client) {
  return hasMonthlySalary(client) ? client.monthlySalaryCurrency || 'BDT' : null;
}