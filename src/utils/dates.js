const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pad(value) {
  return String(value).padStart(2, '0');
}

export function toMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function currentMonthKey() {
  return toMonthKey(new Date());
}

export function lastCompleteMonthKey() {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() - 1);
  return toMonthKey(date);
}

export function isValidMonthKey(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}$/.test(value)) return false;
  const month = Number(value.slice(5, 7));
  return month >= 1 && month <= 12;
}

export function toDateValue(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayDateValue() {
  return toDateValue(new Date());
}

export function isValidDateValue(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  return toDateValue(date) === value;
}

export function monthEndDateValue(monthKey) {
  return toDateValue(periodEndDate(monthKey));
}

export function parseMonthKey(key) {
  if (!isValidMonthKey(key)) return null;
  const [year, month] = key.split('-').map(Number);
  return { year, month };
}

export function addMonths(monthKey, delta) {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) return monthKey;
  const date = new Date(parsed.year, parsed.month - 1 + delta, 1);
  return toMonthKey(date);
}

export function compareMonths(a, b) {
  return String(a).localeCompare(String(b));
}

export function monthLabel(monthKey, style = 'long') {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) return monthKey ?? '—';
  if (style === 'short') return MONTH_SHORT[parsed.month - 1];
  if (style === 'compact') return `${MONTH_SHORT[parsed.month - 1]} '${String(parsed.year).slice(2)}`;
  return `${MONTH_NAMES[parsed.month - 1]} ${parsed.year}`;
}

export function monthsInRange(from, to) {
  if (!isValidMonthKey(from) || !isValidMonthKey(to) || compareMonths(from, to) > 0) return [];
  const months = [];
  let cursor = from;
  let guard = 0;
  while (compareMonths(cursor, to) <= 0 && guard < 240) {
    months.push(cursor);
    cursor = addMonths(cursor, 1);
    guard += 1;
  }
  return months;
}

export function getRecentMonths(count = 12, endMonth = lastCompleteMonthKey()) {
  if (!Number.isFinite(count) || count < 1) return [];
  const months = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    months.push(addMonths(endMonth, -i));
  }
  return months;
}

export function monthRangeLabel(from, to) {
  if (!from || !to) return '—';
  if (from === to) return monthLabel(from);
  const fromParsed = parseMonthKey(from);
  const toParsed = parseMonthKey(to);
  if (!fromParsed || !toParsed) return `${from} – ${to}`;
  if (fromParsed.year === toParsed.year) {
    return `${MONTH_SHORT[fromParsed.month - 1]} – ${MONTH_SHORT[toParsed.month - 1]} ${toParsed.year}`;
  }
  return `${monthLabel(from, 'compact')} – ${monthLabel(to, 'compact')}`;
}

export function formatDate(value, options = {}) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  // Indian reporting convention: DD/MM/YYYY in IST.
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
    ...options,
  }).format(date);
}

export function formatDateTime(value, { hour12 = true } = {}) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const formatted = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12,
    timeZone: 'Asia/Kolkata',
  }).format(date);
  return hour12 ? formatted.replace(/\b(am|pm)\b/i, (marker) => marker.toUpperCase()) : formatted;
}

export function periodEndDate(monthKey) {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) return new Date();
  return new Date(parsed.year, parsed.month, 0, 12, 0, 0);
}
