/**
 * Get work item identifier from a direct work item URL.
 * @param {string} workItemUrl Direct work item URL.
 * @returns {number} Work item identifier.
 */
const getWorkItemIdFromUrl = (workItemUrl) =>
    parseInt(workItemUrl.substring(workItemUrl.lastIndexOf('/') + 1), 10);

/**
 * Get date string from a Date in the format of 'YYYY-MM-DD'.
 * @param {Date} date Input date.
 * @returns {String} Date string in the format of 'YYYY-MM-DD'.
 */
const getDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};