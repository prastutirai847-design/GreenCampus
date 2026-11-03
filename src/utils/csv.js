import { CATEGORY_META, SCOPE_META, getCommuteMode, getDisposalMethod, getFuelType, getWasteCategory } from '../data/options.js';
import { monthLabel } from './dates.js';
import { calculateActivityEmissions } from './emissions.js';
import { describeActivity } from './activityLabels.js';
import { formatNumber } from './format.js';

function escapeCell(value) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsv(columns, rows) {
  const header = columns.map((column) => escapeCell(column.label)).join(',');
  const body = rows
    .map((row) =>
      columns
        .map((column) => escapeCell(typeof column.value === 'function' ? column.value(row) : row[column.key]))
        .join(','),
    )
    .join('\n');
  return `${header}\n${body}`;
}

export function downloadCsv(filename, csvContent) {
  const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function buildActivityCsv(activities, { buildingMap = {}, factors }) {
  const columns = [
    { label: 'Record ID', key: 'id' },
    { label: 'Month', key: 'period' },
    { label: 'Date', value: (row) => row.date ?? '' },
    { label: 'Category', value: (row) => CATEGORY_META[row.category]?.label ?? row.category },
    {
      label: 'Description',
      value: (row) => {
        const info = describeActivity(row, buildingMap);
        return `${info.title} — ${info.subtitle}`;
      },
    },
    { label: 'Building', value: (row) => (row.buildingId ? buildingMap[row.buildingId]?.name ?? row.buildingId : 'Campus-wide') },
    {
      label: 'Fuel type',
      value: (row) => getFuelType(row.fuelType)?.label ?? '',
    },
    {
      label: 'Waste category',
      value: (row) => getWasteCategory(row.wasteCategory)?.label ?? '',
    },
    {
      label: 'Disposal method',
      value: (row) => getDisposalMethod(row.disposal)?.label ?? '',
    },
    {
      label: 'Travel mode',
      value: (row) => getCommuteMode(row.mode)?.label ?? '',
    },
    {
      label: 'Recorded quantity',
      value: (row) => {
        if (row.category === 'electricity') return row.kwh ?? '';
        if (row.category === 'water') return row.cubicMeters ?? '';
        if (row.category === 'fuel') return row.quantity ?? '';
        if (row.category === 'waste') return row.weightKg ?? '';
        if (row.category === 'commuting') return row.commuters ?? '';
        return '';
      },
    },
    {
      label: 'Unit',
      value: (row) => {
        if (row.category === 'electricity') return 'kWh';
        if (row.category === 'water') return 'kL';
        if (row.category === 'fuel') return getFuelType(row.fuelType)?.unit ?? '';
        if (row.category === 'waste') return 'kg';
        if (row.category === 'commuting') return 'commuters';
        return '';
      },
    },
    {
      label: 'Fuel purpose',
      value: (row) => (row.category === 'fuel' ? row.purpose ?? '' : ''),
    },
    {
      label: 'Department',
      value: (row) => (row.category === 'fuel' ? row.department ?? '' : ''),
    },
    {
      label: 'Bill amount (INR)',
      value: (row) => row.billAmount ?? '',
    },
    {
      label: 'Provider',
      value: (row) => row.provider ?? '',
    },
    {
      label: 'One-way distance (km)',
      value: (row) => (row.category === 'commuting' ? row.distanceKm ?? '' : ''),
    },
    {
      label: 'Round trips / month',
      value: (row) => (row.category === 'commuting' ? row.tripsPerMonth ?? '' : ''),
    },
    { label: 'GHG scope', value: (row) => {
        const scope = calculateActivityEmissions(row, factors).scope;
        return scope ? SCOPE_META[scope]?.label : 'Not classified';
      },
    },
    {
      label: 'Data quality',
      value: (row) => {
        const quality = calculateActivityEmissions(row, factors).dataQuality;
        return quality ?? '';
      },
    },
    { label: 'Source reference', value: (row) => row.sourceReference ?? '' },
    {
      label: 'Scope 3 category',
      value: (row) => {
        const category = calculateActivityEmissions(row, factors).scope3Category;
        return category ? `${category.id} — ${category.label}` : '';
      },
    },
    {
      label: 'Estimated emissions (kgCO2e)',
      value: (row) => formatNumber(calculateActivityEmissions(row, factors).kg, { digits: 2 }),
    },
    {
      label: 'Factor applied',
      value: (row) => {
        const calc = calculateActivityEmissions(row, factors);
        return calc.factorKey ? `${calc.factorKey} (${calc.factorValue} ${calc.factorUnit})` : '';
      },
    },
    { label: 'Notes', key: 'notes' },
  ];
  return toCsv(columns, activities);
}

export function buildMonthlyCsv(summary) {
  const columns = [
    { label: 'Month', value: (row) => `${monthLabel(row.period)} (${row.period})` },
    { label: 'Scope 1 (tCO2e)', value: (row) => formatNumber(row.scope1 / 1000, { digits: 2 }) },
    { label: 'Scope 2 (tCO2e)', value: (row) => formatNumber(row.scope2 / 1000, { digits: 2 }) },
    { label: 'Scope 3 (tCO2e)', value: (row) => formatNumber(row.scope3 / 1000, { digits: 2 }) },
    { label: 'Total (tCO2e)', value: (row) => formatNumber(row.total / 1000, { digits: 2 }) },
    { label: 'Electricity (kWh)', value: (row) => formatNumber(row.electricityKwh) },
    { label: 'Water (kL)', value: (row) => formatNumber(row.waterM3) },
    { label: 'Waste (kg)', value: (row) => formatNumber(row.wasteKg ?? 0) },
  ];
  return toCsv(columns, summary.byMonth ?? []);
}

export function buildYearlyCsv(yearly) {
  const columns = [
    { label: 'Year', key: 'year' },
    { label: 'Scope 1 (tCO2e)', value: (row) => formatNumber(row.scope1 / 1000, { digits: 2 }) },
    { label: 'Scope 2 (tCO2e)', value: (row) => formatNumber(row.scope2 / 1000, { digits: 2 }) },
    { label: 'Scope 3 (tCO2e)', value: (row) => formatNumber(row.scope3 / 1000, { digits: 2 }) },
    { label: 'Total (tCO2e)', value: (row) => formatNumber(row.total / 1000, { digits: 2 }) },
    { label: 'Electricity (kWh)', value: (row) => formatNumber(row.electricityKwh) },
    { label: 'Water (kL)', value: (row) => formatNumber(row.waterM3) },
    { label: 'Waste (kg)', value: (row) => formatNumber(row.wasteKg ?? 0) },
    { label: 'Records', value: (row) => formatNumber(row.entryCount ?? 0) },
  ];
  return toCsv(columns, yearly ?? []);
}

export function buildBuildingCsv(buildings) {
  const columns = [
    { label: 'Building', key: 'name' },
    { label: 'Type', value: (row) => row.type ?? '' },
    {
      label: 'Scope 1 (tCO2e)',
      value: (row) => formatNumber((row.byScope?.[1] ?? 0) / 1000, { digits: 2 }),
    },
    {
      label: 'Scope 2 (tCO2e)',
      value: (row) => formatNumber((row.byScope?.[2] ?? 0) / 1000, { digits: 2 }),
    },
    {
      label: 'Scope 3 (tCO2e)',
      value: (row) => formatNumber((row.byScope?.[3] ?? 0) / 1000, { digits: 2 }),
    },
    { label: 'Total (tCO2e)', value: (row) => formatNumber(row.kg / 1000, { digits: 2 }) },
    { label: 'Share of footprint (%)', value: (row) => formatNumber(row.share, { digits: 1 }) },
    {
      label: 'Intensity (kgCO2e/m2)',
      value: (row) =>
        row.intensityKgPerSqm === null ? '' : formatNumber(row.intensityKgPerSqm, { digits: 1 }),
    },
    { label: 'Floor area (m2)', value: (row) => formatNumber(row.areaSqm ?? 0) },
    { label: 'Occupants', value: (row) => formatNumber(row.occupants ?? 0) },
    { label: 'Electricity (kWh)', value: (row) => formatNumber(row.electricityKwh ?? 0) },
    { label: 'Water (kL)', value: (row) => formatNumber(row.waterM3 ?? 0) },
    { label: 'Waste (kg)', value: (row) => formatNumber(row.wasteKg ?? 0) },
    { label: 'Records', value: (row) => formatNumber(row.entryCount ?? 0) },
  ];
  return toCsv(columns, buildings ?? []);
}

export function buildScopeCsv(scopes) {
  const columns = [
    { label: 'Scope', value: (row) => row.label ?? `Scope ${row.scope}` },
    { label: 'Name', value: (row) => row.name ?? '' },
    { label: 'Estimated emissions (tCO2e)', value: (row) => formatNumber(row.kg / 1000, { digits: 2 }) },
    { label: 'Share of emissions (%)', value: (row) => formatNumber(row.percent, { digits: 1 }) },
    {
      label: 'Previous period (tCO2e)',
      value: (row) =>
        row.previousKg === null || row.previousKg === undefined
          ? ''
          : formatNumber(row.previousKg / 1000, { digits: 2 }),
    },
    {
      label: 'Change (%)',
      value: (row) =>
        row.change === null || row.change === undefined ? 'No baseline' : formatNumber(row.change, { digits: 1 }),
    },
  ];
  return toCsv(columns, scopes ?? []);
}

/**
 * A single machine-readable export of the full sustainability report. The
 * section column keeps scope, resource, building and narrative content in one
 * file while remaining easy to filter in a spreadsheet.
 */
export function buildReportCsv(report) {
  if (!report) return '';
  const meta = report.meta ?? {};
  const summary = report.summary ?? {};
  const rows = [];
  const add = (section, metric, detail, value, unit, previous, change) => {
    rows.push({
      section,
      metric,
      detail: detail ?? '',
      value: value ?? '',
      unit: unit ?? '',
      previous: previous ?? '',
      change: change ?? '',
    });
  };
  const signed = (value) =>
    value === null || value === undefined ? 'No baseline' : `${formatNumber(value, { digits: 1 })}%`;

  add('Report', 'College', meta.college?.name ?? '', '', '', '', '');
  add('Report', 'Reporting period', meta.periodLabel ?? '', '', '', '', '');
  if (meta.reportingYear) add('Report', 'Reporting year', meta.reportingYear, '', '', '', '');
  add('Report', 'Generated at', meta.generatedAt ?? '', '', '', '', '');
  add('Report', 'Report ID', meta.id ?? '', '', '', '', '');
  add(
    'Report',
    'Data basis',
    meta.isSample ? 'Sample demo data (illustrative)' : 'Recorded workspace data',
    '',
    '',
    '',
    '',
  );

  const methodology = report.methodology ?? {};
  add('Methodology', 'Accounting standard', methodology.standard ?? '', '', '', '', '');
  add('Methodology', 'Scope 3 standard', methodology.scope3Standard ?? '', '', '', '', '');
  add('Methodology', 'Consolidation approach', methodology.consolidation ?? '', '', '', '', '');
  add('Methodology', 'Organisational boundary', methodology.boundary ?? '', '', '', '', '');
  add('Methodology', 'Base year', methodology.baseYear ?? '', '', '', '', '');
  add('Methodology', 'Reporting-year basis', methodology.reportingYearBasis ?? '', '', '', '', '');
  add('Methodology', 'Global warming potentials', methodology.gwp ?? '', '', '', '', '');
  add('Methodology', 'Double-counting control', methodology.doubleCounting ?? '', '', '', '', '');
  add('Methodology', 'Disclaimer', methodology.disclaimer ?? '', '', '', '', '');
  (methodology.scope2Methods ?? []).forEach((method) => {
    add('Methodology — Scope 2', method.label, method.description ?? '', '', '', '', '');
  });
  (methodology.boundaries ?? []).forEach((boundary) => {
    add(
      'Boundary',
      boundary.label ?? `Scope ${boundary.scope}`,
      `Included: ${(boundary.included ?? []).join('; ')} | Excluded: ${(
        boundary.excluded ?? []
      ).join('; ')} | Method: ${boundary.method ?? ''}`,
      '',
      '',
      '',
      '',
    );
  });

  add('Summary', 'Total estimated emissions', 'Scope 1–3', formatNumber(summary.totalKg / 1000, { digits: 2 }), 'tCO2e', '', '');
  add('Summary', 'Activity records', 'Records in period', formatNumber(summary.entryCount ?? 0), 'records', '', '');
  add(
    'Summary',
    'Average per month',
    meta.monthCount ? `${meta.monthCount} months` : '',
    formatNumber((summary.totalKg ?? 0) / 1000 / Math.max(1, meta.monthCount ?? 1), { digits: 2 }),
    'tCO2e/month',
    '',
    '',
  );

  if (report.intensity) {
    add(
      'Summary',
      'Emissions per student',
      `${formatNumber(report.intensity.students)} students recorded`,
      report.intensity.tco2ePerStudent === null
        ? ''
        : formatNumber(report.intensity.tco2ePerStudent, { digits: 3 }),
      'tCO2e/student',
      '',
      '',
    );
    add(
      'Summary',
      'Area-based carbon intensity',
      `${formatNumber(report.intensity.floorAreaSqm)} m2 of recorded floor area`,
      report.intensity.kgPerSqm === null
        ? ''
        : formatNumber(report.intensity.kgPerSqm, { digits: 2 }),
      'kgCO2e/m2',
      '',
      '',
    );
    add(
      'Summary',
      'Electricity intensity',
      '',
      report.intensity.kwhPerStudent === null
        ? ''
        : formatNumber(report.intensity.kwhPerStudent, { digits: 1 }),
      'kWh/student',
      '',
      '',
    );
  }

  if (report.scope2) {
    add(
      'Scope 2 — dual reporting',
      'Location-based',
      'CEA grid-average factor',
      formatNumber(report.scope2.locationKg / 1000, { digits: 2 }),
      'tCO2e',
      '',
      '',
    );
    add(
      'Scope 2 — dual reporting',
      'Market-based',
      report.scope2.note ?? '',
      formatNumber(report.scope2.marketKg / 1000, { digits: 2 }),
      'tCO2e',
      '',
      '',
    );
  }

  (report.scopes ?? []).forEach((scope) => {
    add(
      'Scope',
      scope.label ?? `Scope ${scope.scope}`,
      scope.name ?? '',
      formatNumber(scope.kg / 1000, { digits: 2 }),
      'tCO2e',
      scope.previousKg === null || scope.previousKg === undefined
        ? ''
        : formatNumber(scope.previousKg / 1000, { digits: 2 }),
      signed(scope.change),
    );
  });

  (report.scope3?.rows ?? []).forEach((row) => {
    add(
      'Scope 3 register',
      `${row.id}. ${row.label}`,
      `${row.statusLabel}${row.note ? ` — ${row.note}` : ''}`,
      row.quantified ? formatNumber(row.kg / 1000, { digits: 2 }) : '',
      row.quantified ? 'tCO2e' : '',
      '',
      '',
    );
  });

  (report.dataQuality ?? []).forEach((quality) => {
    add(
      'Data quality',
      quality.label,
      `${formatNumber(quality.entryCount)} records`,
      formatNumber(quality.kg / 1000, { digits: 2 }),
      'tCO2e',
      '',
      '',
    );
  });

  (report.factors ?? []).forEach((factor) => {
    add(
      'Emission factor provenance',
      factor.label ?? factor.key,
      `${factor.source ?? ''}${factor.version ? ` | Version ${factor.version}` : ''}${
        factor.gasCoverage ? ` | Gases: ${factor.gasCoverage}` : ''
      }${factor.methodology ? ` | Method: ${factor.methodology}` : ''}`,
      formatNumber(factor.value, { digits: factor.value >= 100 ? 0 : 3 }),
      factor.unit ?? '',
      factor.year ?? '',
      factor.status ?? '',
    );
  });

  (report.resources ?? []).forEach((resource) => {
    add(
      'Resource',
      resource.label,
      resource.detail ?? '',
      formatNumber(resource.value, { digits: resource.unit === 'kL' || resource.unit === 'kWh' ? 0 : 2 }),
      resource.unit,
      resource.previous === null || resource.previous === undefined
        ? ''
        : formatNumber(resource.previous, {
            digits: resource.unit === 'kL' || resource.unit === 'kWh' ? 0 : 2,
          }),
      signed(resource.change),
    );
  });

  ['electricity', 'fuel', 'waste', 'commuting'].forEach((category) => {
    const kg = summary.byCategory?.[category] ?? 0;
    if (kg <= 0) return;
    add(
      'Source',
      CATEGORY_META[category].label,
      SCOPE_META[CATEGORY_META[category].scope]?.label ?? '',
      formatNumber(kg / 1000, { digits: 2 }),
      'tCO2e',
      '',
      '',
    );
  });

  (report.buildings ?? [])
    .filter((building) => building.entryCount > 0)
    .forEach((building) => {
      add(
        'Building',
        building.name,
        building.intensityKgPerSqm === null
          ? 'No floor area recorded'
          : `${formatNumber(building.intensityKgPerSqm, { digits: 1 })} kgCO2e/m2`,
        formatNumber(building.kg / 1000, { digits: 2 }),
        'tCO2e',
        '',
        '',
      );
    });

  (summary.byMonth ?? []).forEach((month) => {
    add(
      'Monthly inventory',
      monthLabel(month.period),
      `S1 ${formatNumber(month.scope1 / 1000, { digits: 2 })} | S2 ${formatNumber(
        month.scope2 / 1000,
        { digits: 2 },
      )} | S3 ${formatNumber(month.scope3 / 1000, { digits: 2 })}`,
      formatNumber(month.total / 1000, { digits: 2 }),
      'tCO2e',
      '',
      '',
    );
  });

  (report.observations ?? []).forEach((observation, index) => {
    add('Observation', `${index + 1}. ${observation.title}`, observation.detail ?? '', '', '', '', '');
  });

  (report.limitations ?? []).forEach((limitation, index) => {
    add('Limitation', `${index + 1}`, limitation, '', '', '', '');
  });

  const columns = [
    { label: 'Section', key: 'section' },
    { label: 'Metric', key: 'metric' },
    { label: 'Detail', key: 'detail' },
    { label: 'Value', key: 'value' },
    { label: 'Unit', key: 'unit' },
    { label: 'Previous period', key: 'previous' },
    { label: 'Change', key: 'change' },
  ];
  return toCsv(columns, rows);
}
