import {
  getCommuteMode,
  getDisposalMethod,
  getFuelType,
  getWasteCategory,
} from '../data/options.js';

export function describeActivity(activity, buildingMap = {}) {
  if (!activity) {
    return { title: 'Unknown activity', subtitle: '', quantity: 0, unit: '', buildingName: '—' };
  }
  const buildingName = activity.buildingId
    ? buildingMap[activity.buildingId]?.name ?? 'Unknown building'
    : 'Campus-wide';

  if (activity.category === 'electricity') {
    return {
      title: 'Grid electricity',
      subtitle: `Metered at ${buildingName}`,
      quantity: Number(activity.kwh) || 0,
      unit: 'kWh',
      buildingName,
    };
  }

  if (activity.category === 'water') {
    return {
      title: 'Water consumption',
      subtitle: `Metered at ${buildingName}`,
      quantity: Number(activity.cubicMeters) || 0,
      unit: 'kL',
      buildingName,
    };
  }

  if (activity.category === 'fuel') {
    const fuel = getFuelType(activity.fuelType);
    const location = activity.buildingId
      ? buildingMap[activity.buildingId]?.name ?? 'Unknown building'
      : activity.department || 'Campus-wide';
    return {
      title: fuel?.label ?? 'Fuel',
      subtitle: [activity.purpose || 'Fuel combustion', location].filter(Boolean).join(' · '),
      quantity: Number(activity.quantity) || 0,
      unit: fuel?.unit ?? '',
      buildingName: location,
    };
  }

  if (activity.category === 'waste') {
    const waste = getWasteCategory(activity.wasteCategory);
    const disposal = getDisposalMethod(activity.disposal);
    const location = activity.buildingId
      ? buildingMap[activity.buildingId]?.name ?? 'Unknown building'
      : 'Campus-wide';
    return {
      title: waste?.label ?? 'Waste',
      subtitle: `Disposal: ${disposal?.label ?? 'Unknown'} · ${location}`,
      quantity: Number(activity.weightKg) || 0,
      unit: 'kg',
      buildingName: location,
    };
  }

  if (activity.category === 'commuting') {
    const mode = getCommuteMode(activity.mode);
    return {
      title: mode?.label ?? 'Commuting',
      subtitle: `${activity.commuters ?? 0} commuters · ${activity.tripsPerMonth ?? 0} round trips / month`,
      quantity: Number(activity.distanceKm) || 0,
      unit: 'km one-way',
      buildingName: 'Campus-wide',
    };
  }

  return { title: 'Record', subtitle: '', quantity: 0, unit: '', buildingName };
}

export function activitySummaryText(activity, buildingMap) {
  const info = describeActivity(activity, buildingMap);
  return `${info.title} · ${info.subtitle}`;
}
