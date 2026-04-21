const { format, parseISO, isValid, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } = require('date-fns');

function formatDate(date, formatStr = 'yyyy-MM-dd') {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isValid(d) ? format(d, formatStr) : null;
}

function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount);
}

function formatNumber(num) {
  return new Intl.NumberFormat('en-US').format(num);
}

function getDateRange(range) {
  const now = new Date();

  switch (range) {
    case 'today':
      return { start: new Date(now.setHours(0, 0, 0, 0)), end: new Date() };
    case 'week':
      return { start: subDays(now, 7), end: new Date() };
    case 'month':
      return { start: subDays(now, 30), end: new Date() };
    case 'quarter':
      return { start: subDays(now, 90), end: new Date() };
    case 'year':
      return { start: subDays(now, 365), end: new Date() };
    case 'this_week':
      return { start: startOfWeek(now), end: endOfWeek(now) };
    case 'this_month':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    default:
      return { start: subDays(now, 30), end: new Date() };
  }
}

function calculatePercentageChange(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

module.exports = {
  formatDate,
  formatCurrency,
  formatNumber,
  getDateRange,
  calculatePercentageChange
};