import { DISPOSAL_METHODS, getFuelType } from '../data/options.js';
import { describeActivity } from './activityLabels.js';
import { calculateActivityEmissions } from './emissions.js';
import {
  formatCompact,
  formatCurrency,
  formatEmissions,
  formatKwh,
  formatNumber,
  formatPercent,
  formatWater,
  formatWeight,
} from './format.js';

export function recordSearchText(activity, buildingMap = {}) {
  const info = describeActivity(activity, buildingMap);
  return [
    info.title,
    info.subtitle,
    activity.notes,
    activity.provider,
    activity.department,
    activity.date,
    activity.period,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function filterConsumptionRecords(
  records,
  { search = '', buildingId = 'all', period = 'all', buildingMap = {} } = {},
) {
  const term = String(search).trim().toLowerCase();
  return (records ?? []).filter((activity) => {
    if (buildingId === '__none' && activity.buildingId) return false;
    if (buildingId !== 'all' && buildingId !== '__none' && activity.buildingId !== buildingId) {
      return false;
    }
    if (period !== 'all' && activity.period !== period) return false;
    if (term && !recordSearchText(activity, buildingMap).includes(term)) return false;
    return true;
  });
}

export function availablePeriods(records) {
  return [...new Set((records ?? []).map((activity) => activity.period).filter(Boolean))].sort(
    (a, b) => b.localeCompare(a),
  );
}

export function filterBills(bills, { search = '', buildingId = 'all', period = 'all' } = {}) {
  const term = String(search).trim().toLowerCase();
  return (bills ?? []).filter((bill) => {
    if (buildingId === '__none' && bill.buildingId) return false;
    if (buildingId !== 'all' && buildingId !== '__none' && bill.buildingId !== buildingId) {
      return false;
    }
    if (period !== 'all' && bill.period !== period) return false;
    if (!term) return true;
    return [bill.title, bill.fileName, bill.provider, bill.billNumber, bill.notes]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term));
  });
}

export function sortBills(bills) {
  return [...(bills ?? [])].sort((a, b) =>
    String(b.uploadedAt ?? '').localeCompare(String(a.uploadedAt ?? '')),
  );
}

export function summarizeConsumption(category, records, factors, bills = []) {
  const entries = records ?? [];
  const totalKg = entries.reduce(
    (sum, activity) => sum + calculateActivityEmissions(activity, factors).kg,
    0,
  );
  const billTotal = (bills ?? []).reduce((sum, bill) => {
    const amount = Number(bill.amount) || 0;
    if (!amount) return sum;
    // A manually entered amount on the linked record takes precedence over the attachment.
    const linked = bill.activityId ? entries.find((activity) => activity.id === bill.activityId) : null;
    if (linked && Number(linked.billAmount) > 0) return sum;
    return sum + amount;
  }, 0) + entries.reduce((sum, activity) => sum + (Number(activity.billAmount) || 0), 0);

  const base = [
    {
      label: 'Records',
      value: formatNumber(entries.length),
      hint: entries.length === 1 ? '1 entry in view' : 'entries in view',
    },
  ];

  if (category === 'electricity') {
    const kwh = entries.reduce((sum, activity) => sum + (Number(activity.kwh) || 0), 0);
    return {
      items: [
        ...base,
        { label: 'Electricity', value: formatKwh(kwh), hint: 'Purchased grid electricity' },
        {
          label: 'Estimated emissions',
          value: formatEmissions(totalKg),
          hint: 'Scope 2 · factor-based estimate',
        },
        {
          label: 'Billed amount',
          value: billTotal > 0 ? formatCurrency(billTotal) : '—',
          hint: `${formatNumber(bills.length)} bill${bills.length === 1 ? '' : 's'} on file`,
        },
      ],
      totalKg,
      billTotal,
    };
  }

  if (category === 'water') {
    const cubicMeters = entries.reduce(
      (sum, activity) => sum + (Number(activity.cubicMeters) || 0),
      0,
    );
    return {
      items: [
        ...base,
        { label: 'Water consumed', value: formatWater(cubicMeters), hint: 'Normalised to kilolitres' },
        {
          label: 'Bills on file',
          value: formatNumber(bills.length),
          hint: 'PDF or image attachments',
        },
        {
          label: 'Billed amount',
          value: billTotal > 0 ? formatCurrency(billTotal) : '—',
          hint: 'Entered manually from each bill',
        },
      ],
      totalKg,
      billTotal,
    };
  }

  if (category === 'fuel') {
    const litres = entries
      .filter((activity) => getFuelType(activity.fuelType)?.unit === 'L')
      .reduce((sum, activity) => sum + (Number(activity.quantity) || 0), 0);
    const lpgKg = entries
      .filter((activity) => getFuelType(activity.fuelType)?.unit === 'kg')
      .reduce((sum, activity) => sum + (Number(activity.quantity) || 0), 0);
    return {
      items: [
        ...base,
        {
          label: 'Liquid fuel',
          value: `${formatNumber(litres)} L`,
          hint: 'Diesel and petrol',
        },
        { label: 'LPG', value: `${formatNumber(lpgKg)} kg`, hint: 'Kitchen and lab cylinders' },
        {
          label: 'Estimated emissions',
          value: formatEmissions(totalKg),
          hint: 'Scope 1 · factor-based estimate',
        },
      ],
      totalKg,
      billTotal,
    };
  }

  if (category === 'waste') {
    const wasteKg = entries.reduce((sum, activity) => sum + (Number(activity.weightKg) || 0), 0);
    const divertedKg = entries.reduce((sum, activity) => {
      const method = DISPOSAL_METHODS.find((item) => item.id === activity.disposal);
      return sum + (method?.diverted ? Number(activity.weightKg) || 0 : 0);
    }, 0);
    return {
      items: [
        ...base,
        { label: 'Waste generated', value: formatWeight(wasteKg), hint: 'All categories in view' },
        {
          label: 'Diverted',
          value: wasteKg > 0 ? formatPercent(divertedKg / wasteKg, { digits: 0 }) : '—',
          hint: 'Recycled or composted',
        },
        {
          label: 'Estimated emissions',
          value: formatEmissions(totalKg),
          hint: 'Scope 3 · disposal-based estimate',
        },
      ],
      totalKg,
      billTotal,
    };
  }

  const commuters = entries.reduce((sum, activity) => sum + (Number(activity.commuters) || 0), 0);
  const passengerKm = entries.reduce(
    (sum, activity) =>
      sum +
      (Number(activity.distanceKm) || 0) *
        2 *
        (Number(activity.tripsPerMonth) || 0) *
        (Number(activity.commuters) || 0),
    0,
  );
  return {
    items: [
      ...base,
      { label: 'Commuters', value: formatNumber(commuters), hint: 'Reported in survey groups' },
      {
        label: 'Passenger travel',
        value: `${formatCompact(passengerKm)} pkm`,
        hint: 'Distance × trips × people',
      },
      {
        label: 'Estimated emissions',
        value: formatEmissions(totalKg),
        hint: 'Scope 3 · factor-based estimate',
      },
    ],
    totalKg,
    billTotal,
  };
}
