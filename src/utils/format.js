export function classNames(...values) {
  return values.filter(Boolean).join(' ');
}

const numberFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const decimalFormatter = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const twoDecimalFormatter = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const fixedFormatters = new Map();
const compactFormatter = new Intl.NumberFormat('en-IN', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

function fixedFormatter(digits) {
  if (!fixedFormatters.has(digits)) {
    fixedFormatters.set(
      digits,
      new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }),
    );
  }
  return fixedFormatters.get(digits);
}

export function toNumber(value) {
  if (value === '' || value === null || value === undefined) return NaN;
  return Number(value);
}

export function formatNumber(value, { digits = 0, fallback = '0' } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  if (digits === 1) return decimalFormatter.format(number);
  if (digits === 2) return twoDecimalFormatter.format(number);
  if (digits > 2) return fixedFormatter(Number(digits)).format(number);
  return numberFormatter.format(number);
}

export function formatCompact(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0';
  return compactFormatter.format(number);
}

export function formatTonnes(kg, { digits = 1, unit = true } = {}) {
  const tonnes = Number(kg) / 1000;
  if (!Number.isFinite(tonnes)) return unit ? '0 tCO₂e' : '0';
  const abs = Math.abs(tonnes);
  const rendered =
    abs >= 100 ? formatNumber(tonnes, { digits: 0 }) : formatNumber(tonnes, { digits });
  return unit ? `${rendered} tCO₂e` : rendered;
}

export function formatEmissions(kg) {
  const value = Number(kg);
  if (!Number.isFinite(value) || value === 0) return '0 kgCO₂e';
  if (Math.abs(value) < 100) return `${formatNumber(value, { digits: 1 })} kgCO₂e`;
  if (Math.abs(value) < 1000) return `${formatNumber(value)} kgCO₂e`;
  return formatTonnes(value, { digits: value >= 10000 ? 0 : 1 });
}

export function formatKwh(kwh) {
  const value = Number(kwh);
  if (!Number.isFinite(value)) return '0 kWh';
  if (value >= 1000000) return `${formatNumber(value / 1000000, { digits: 1 })} GWh`;
  if (value >= 10000) return `${formatNumber(value / 1000, { digits: 1 })} MWh`;
  return `${formatNumber(value)} kWh`;
}

export function formatWater(m3) {
  const value = Number(m3);
  if (!Number.isFinite(value)) return '0 kL';
  if (value >= 10000) return `${formatNumber(value / 1000, { digits: 1 })} ML`;
  return `${formatNumber(value)} kL`;
}

export function formatWeight(kg) {
  const value = Number(kg);
  if (!Number.isFinite(value)) return '0 kg';
  if (value >= 1000) return `${formatNumber(value / 1000, { digits: 1 })} t`;
  return `${formatNumber(value)} kg`;
}

// Floor area is stored in square metres for GHG intensity reporting; sq ft is
// shown alongside it because Indian property records commonly use square feet.
export function formatArea(sqm, { digits = 0 } = {}) {
  const value = Number(sqm);
  if (!Number.isFinite(value) || value <= 0) return '—';
  return `${formatNumber(value, { digits })} m² (${formatNumber(value * 10.7639104)} sq ft)`;
}

export function formatPercent(ratio, { digits = 0, alreadyPercent = false } = {}) {
  const percent = alreadyPercent ? Number(ratio) : Number(ratio) * 100;
  if (!Number.isFinite(percent)) return '0%';
  return `${formatNumber(percent, { digits })}%`;
}

export function formatSignedPercent(value, { digits = 0 } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  const sign = number > 0 ? '+' : '';
  return `${sign}${formatNumber(number, { digits })}%`;
}

export function formatFactor(value, unit) {
  const number = Number(value);
  if (!Number.isFinite(number)) return unit ?? '';
  const digits = number >= 10 ? 0 : number >= 1 ? 2 : 3;
  return `${formatNumber(number, { digits })} ${unit ?? ''}`.trim();
}

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatCurrency(value, { fallback = '—' } = {}) {
  const number = Number(value);
  if (value === null || value === undefined || value === '' || !Number.isFinite(number)) {
    return fallback;
  }
  return currencyFormatter.format(number);
}

export function formatBytes(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) return '0 KB';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${formatNumber(value / 1024, { digits: 0 })} KB`;
  return `${formatNumber(value / (1024 * 1024), { digits: 1 })} MB`;
}

export function formatDateOnly(value, { fallback = '—' } = {}) {
  if (!value) return fallback;
  const source = /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? `${value}T12:00:00` : value;
  const date = new Date(source);
  if (Number.isNaN(date.getTime())) return fallback;
  // Indian reporting convention: DD/MM/YYYY in IST.
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(date);
}

export function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function truncate(value, max = 40) {
  const text = String(value ?? '');
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}
