import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Download,
  FileText,
  History,
  Printer,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-react';
import { useCampus } from '../context/CampusContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Badge, PriorityBadge, ScopeBadge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Callout } from '../components/ui/Callout.jsx';
import { Card } from '../components/ui/Card.jsx';
import { ErrorState } from '../components/ui/ErrorState.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { CATEGORY_META, SCOPE_META } from '../data/options.js';
import {
  deleteReport,
  downloadReport,
  generateReport,
  listReports,
  saveReport,
} from '../services/reportService.js';
import { scopeShares } from '../utils/analytics.js';
import { buildActivityCsv, buildReportCsv, downloadCsv } from '../utils/csv.js';
import { formatDateTime, getRecentMonths, monthLabel, monthRangeLabel } from '../utils/dates.js';
import {
  formatKwh,
  formatNumber,
  formatPercent,
  formatSignedPercent,
  formatTonnes,
  formatWater,
  formatWeight,
} from '../utils/format.js';

const CATEGORY_SCOPE = { electricity: 2, fuel: 1, waste: 3, commuting: 3 };

/**
 * Indian financial year for a month key: 1 April – 31 March.
 * Returns e.g. "FY 2025-26" for 2025-11.
 */
function financialYearOf(monthKey) {
  if (!monthKey) return '';
  const [year, month] = String(monthKey).split('-').map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return '';
  const startYear = month >= 4 ? year : year - 1;
  return `FY ${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
}

function ReportSection({ index, title, description, children }) {
  return (
    <section className="print-avoid-break">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 font-display text-[11px] font-semibold tracking-wide text-ink-400">
          {String(index).padStart(2, '0')}
        </span>
        <div>
          <h3 className="font-display text-base font-semibold text-ink-900">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function ReportTable({ columns, rows, getRowKey, emptyLabel = 'No records for this period.' }) {
  if (!rows.length) {
    return (
      <p className="rounded-lg border border-dashed border-line px-4 py-5 text-xs text-ink-400">
        {emptyLabel}
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-left">
        <thead>
          <tr className="border-b border-line bg-sand-50">
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-400 ${
                  column.align === 'right' ? 'text-right' : ''
                }`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row, index) => (
            <tr key={getRowKey ? getRowKey(row) : index}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`px-3 py-2.5 text-[13px] text-ink-700 ${
                    column.align === 'right' ? 'text-right tabular-nums' : ''
                  } ${column.className ?? ''}`}
                >
                  {column.render ? column.render(row) : row[column.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatResourceValue(row) {
  if (!row) return '—';
  if (row.unit === 'kWh') return formatKwh(row.value);
  if (row.unit === 'kL') return formatWater(row.value);
  if (row.unit === 'kg') return formatWeight(row.value);
  if (row.unit === 'passenger-km') return `${formatNumber(row.value)} passenger-km`;
  return `${formatNumber(row.value, { digits: row.value >= 100 ? 0 : 1 })} ${row.unit ?? ''}`.trim();
}

function formatResourceChange(change) {
  if (change === null || change === undefined) return 'No baseline';
  return formatSignedPercent(change, { digits: 1 });
}

function ReportSkeleton() {
  return (
    <Card className="p-6 sm:p-8">
      <Skeleton className="h-3 w-40" />
      <Skeleton className="mt-3 h-8 w-72 max-w-full" />
      <Skeleton className="mt-2 h-4 w-56 max-w-full" />
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-20 w-full rounded-xl" />
        ))}
      </div>
      <div className="mt-8 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-11/12" />
        <Skeleton className="h-3 w-4/5" />
      </div>
      <div className="mt-8 space-y-3">
        {[0, 1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-9 w-full" />
        ))}
      </div>
    </Card>
  );
}

export function ReportsPage() {
  const { activities, buildingMap, factors } = useCampus();
  const { push } = useToast();

  const defaultMonths = useMemo(() => getRecentMonths(12), []);
  const availableMonths = useMemo(() => {
    const set = new Set([...defaultMonths, ...activities.map((activity) => activity.period)]);
    return [...set].sort().reverse();
  }, [activities, defaultMonths]);

  const reportingYears = useMemo(() => {
    const set = new Set(availableMonths.map((month) => financialYearOf(month)).filter(Boolean));
    return [...set].sort().reverse();
  }, [availableMonths]);

  const [from, setFrom] = useState(defaultMonths[0]);
  const [to, setTo] = useState(defaultMonths[defaultMonths.length - 1]);
  // Only suggest a reporting year when the whole period sits inside one Indian
  // financial year (April–March); a cross-FY range stays "Not specified".
  const [reportingYear, setReportingYear] = useState(() => {
    const first = financialYearOf(defaultMonths[0]);
    const last = financialYearOf(defaultMonths[defaultMonths.length - 1]);
    return first && first === last ? first : '';
  });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const requestRef = useRef(0);

  const [savedReports, setSavedReports] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(null);
  const [saving, setSaving] = useState(false);

  const rangeValid = Boolean(from && to && from <= to);

  const loadReport = useCallback(async () => {
    if (!from || !to) return;
    if (from > to) {
      setError('The start month must be on or before the end month.');
      setReport(null);
      setLoading(false);
      return;
    }
    requestRef.current += 1;
    const requestId = requestRef.current;
    setLoading(true);
    setError(null);
    try {
      const data = await generateReport({ from, to, reportingYear });
      if (requestId === requestRef.current) setReport(data);
    } catch (loadError) {
      if (requestId === requestRef.current) {
        setError(loadError instanceof Error ? loadError.message : 'Report generation failed.');
        setReport(null);
      }
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [from, to, reportingYear]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const entries = await listReports();
      setSavedReports(entries ?? []);
    } catch (historyLoadError) {
      setSavedReports([]);
      setHistoryError(
        historyLoadError instanceof Error
          ? historyLoadError.message
          : 'Saved reports could not be loaded.',
      );
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const summary = report?.summary;
  const shares = useMemo(() => (summary ? scopeShares(summary) : []), [summary]);
  const people = report ? (report.meta.college.students ?? 0) + (report.meta.college.staff ?? 0) : 0;
  const perPerson = summary && people > 0 ? summary.totalKg / people : null;

  const categoryRows = useMemo(() => {
    if (!summary) return [];
    return ['electricity', 'fuel', 'waste', 'commuting']
      .map((category) => ({
        category,
        label: CATEGORY_META[category].label,
        scope: CATEGORY_SCOPE[category],
        kg: summary.byCategory[category] ?? 0,
        share:
          summary.totalKg > 0 ? ((summary.byCategory[category] ?? 0) / summary.totalKg) * 100 : 0,
      }))
      .filter((row) => row.kg > 0)
      .sort((a, b) => b.kg - a.kg);
  }, [summary]);

  const handleExportSummary = () => {
    if (!report) return;
    const prefix = report.meta.isSample ? 'greencampus-sample-report' : 'greencampus-report';
    downloadCsv(`${prefix}-${from}-to-${to}.csv`, buildReportCsv(report));
    push({
      title: 'Report CSV exported',
      description: `${monthRangeLabel(from, to)}${
        reportingYear ? ` · ${reportingYear}` : ''
      } — scope, resource, building, methodology and narrative sections.`,
    });
  };

  const handleSaveReport = async () => {
    if (!report) return;
    setSaving(true);
    try {
      await saveReport(report);
      await loadHistory();
      push({
        title: 'Report saved',
        description: `${report.meta.periodLabel}${
          report.meta.reportingYear ? ` · ${report.meta.reportingYear}` : ''
        } is available in saved reports on this device.`,
      });
    } catch (saveError) {
      push({
        title: 'Report could not be saved',
        description:
          saveError instanceof Error ? saveError.message : 'The saved report could not be written.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadSaved = async (entry) => {
    try {
      const file = await downloadReport(entry.id);
      downloadCsv(file.filename, file.content);
      push({ title: 'Saved report downloaded', description: entry.periodLabel });
    } catch (downloadError) {
      push({
        title: 'Download failed',
        description:
          downloadError instanceof Error
            ? downloadError.message
            : 'The saved report could not be downloaded.',
      });
    }
  };

  const handleDeleteSaved = async (entry) => {
    if (!window.confirm(`Delete the saved report for ${entry.periodLabel}?`)) return;
    try {
      await deleteReport(entry.id);
      await loadHistory();
      push({ title: 'Saved report deleted', description: entry.periodLabel });
    } catch (deleteError) {
      push({
        title: 'Delete failed',
        description:
          deleteError instanceof Error ? deleteError.message : 'The saved report could not be deleted.',
      });
    }
  };

  const handleUseSavedPeriod = (entry) => {
    setFrom(entry.from);
    setTo(entry.to);
    setReportingYear(entry.reportingYear || '');
    push({
      title: 'Period loaded',
      description: `${entry.periodLabel}${
        entry.reportingYear ? ` · ${entry.reportingYear}` : ''
      } will be regenerated from the current workspace records.`,
    });
  };

  const handleExportActivities = () => {
    const records = activities.filter(
      (activity) => activity.period >= from && activity.period <= to,
    );
    if (!records.length) return;
    downloadCsv(
      `greencampus-activity-data-${from}-to-${to}.csv`,
      buildActivityCsv(records, { buildingMap, factors }),
    );
    push({
      title: 'Activity data exported',
      description: `${records.length} records with calculated emissions.`,
    });
  };

  const actionsDisabled = loading || !report || !rangeValid;

  return (
    <div className="space-y-5">
      <PageHeader
        className="no-print"
        eyebrow="Reporting"
        title="Sustainability reports"
        description="Generate a report from the same activity data, emission engine and factors used by the dashboard and analytics pages."
        actions={
          <>
            <Button variant="secondary" onClick={handleExportSummary} disabled={actionsDisabled}>
              <Download className="h-4 w-4" aria-hidden="true" />
              Report CSV
            </Button>
            <Button variant="secondary" onClick={handleExportActivities} disabled={actionsDisabled}>
              <Download className="h-4 w-4" aria-hidden="true" />
              Activity CSV
            </Button>
            <Button
              variant="secondary"
              onClick={handleSaveReport}
              disabled={actionsDisabled || saving}
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              {saving ? 'Saving' : 'Save report'}
            </Button>
            <Button variant="primary" onClick={() => window.print()} disabled={actionsDisabled}>
              <Printer className="h-4 w-4" aria-hidden="true" />
              Print / Save as PDF
            </Button>
          </>
        }
      />

      <Card className="no-print p-4 sm:p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label
              htmlFor="report-from"
              className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400"
            >
              From
            </label>
            <select
              id="report-from"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="h-10 rounded-xl border border-line bg-white px-3 text-[13px] font-medium text-ink-700 shadow-sm outline-none hover:border-forest-200 focus:border-forest-600 focus:ring-2 focus:ring-forest-600/15"
            >
              {availableMonths.map((month) => (
                <option key={month} value={month}>
                  {monthLabel(month)}
                </option>
              ))}
            </select>
          </div>
          <span className="pb-2.5 text-xs text-ink-400">to</span>
          <div>
            <label
              htmlFor="report-to"
              className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400"
            >
              To
            </label>
            <select
              id="report-to"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="h-10 rounded-xl border border-line bg-white px-3 text-[13px] font-medium text-ink-700 shadow-sm outline-none hover:border-forest-200 focus:border-forest-600 focus:ring-2 focus:ring-forest-600/15"
            >
              {availableMonths.map((month) => (
                <option key={month} value={month}>
                  {monthLabel(month)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="report-year"
              className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400"
            >
              Reporting year
            </label>
            <select
              id="report-year"
              value={reportingYear}
              onChange={(event) => setReportingYear(event.target.value)}
              className="h-10 rounded-xl border border-line bg-white px-3 text-[13px] font-medium text-ink-700 shadow-sm outline-none hover:border-forest-200 focus:border-forest-600 focus:ring-2 focus:ring-forest-600/15"
            >
              {reportingYears.map((year) => (
                <option key={year} value={year}>
                  {year} (Apr–Mar)
                </option>
              ))}
              <option value="">Not specified</option>
            </select>
            {financialYearOf(from) && financialYearOf(from) !== financialYearOf(to) ? (
              <p className="mt-1 text-[10px] leading-relaxed text-amber-700">
                Selected period spans two financial years (Apr–Mar).
              </p>
            ) : null}
          </div>
          <Button variant="soft" onClick={loadReport} disabled={loading || !rangeValid}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            {loading ? 'Generating' : 'Regenerate'}
          </Button>
          <div className="ml-auto hidden text-right text-[11px] leading-relaxed text-ink-400 sm:block">
            <p>Same records, engine and factors as Dashboard and Analytics.</p>
            <p>Figures are estimates, not a verified inventory.</p>
          </div>
        </div>
        {!rangeValid ? (
          <p className="mt-3 text-xs text-danger-700" role="alert">
            The start month must be on or before the end month.
          </p>
        ) : null}
      </Card>

      {historyError ? (
        <Callout
          tone="warning"
          title="Saved reports could not be loaded"
          action={
            <Button variant="secondary" size="sm" onClick={loadHistory} isLoading={historyLoading}>
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Try again
            </Button>
          }
        >
          {historyError} New reports can still be generated and exported; only the saved history is
          unavailable right now.
        </Callout>
      ) : null}

      {!historyLoading && savedReports.length ? (
        <Card className="no-print p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-ink-400" aria-hidden="true" />
              <h2 className="font-display text-[16px] font-semibold leading-snug text-ink-900">Saved reports</h2>
              <Badge tone="neutral">{savedReports.length}</Badge>
            </div>
            <p className="text-[11px] text-ink-400">
              Snapshots stored on this device · newest first · up to 20
            </p>
          </div>
          <ul className="mt-3 divide-y divide-line">
            {savedReports.slice(0, 8).map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[13px] font-medium text-ink-900">{entry.periodLabel}</p>
                    {entry.reportingYear ? (
                      <Badge tone="neutral">{entry.reportingYear}</Badge>
                    ) : null}
                    {entry.isSample ? <Badge tone="blue">Sample</Badge> : null}
                  </div>
                  <p className="mt-0.5 text-[11px] text-ink-400">
                    Saved {formatDateTime(entry.savedAt)} · {formatTonnes(entry.totalKg, { digits: 0 })}{' '}
                    · {formatNumber(entry.entryCount)} records
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button variant="ghost" size="sm" onClick={() => handleUseSavedPeriod(entry)}>
                    Use period
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDownloadSaved(entry)}>
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    CSV
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteSaved(entry)}
                    aria-label={`Delete saved report for ${entry.periodLabel}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {error && !loading ? (
        <ErrorState title="Report could not be generated" message={error} onRetry={loadReport} />
      ) : null}

      {loading ? <ReportSkeleton /> : null}

      {!loading && !error && report ? (
        <>
          {summary.entryCount === 0 ? (
            <Callout tone="warning" title="No records in this reporting period">
              The report below is empty for {monthRangeLabel(from, to)}. Choose a different range or
              add records in Consumption.
            </Callout>
          ) : null}

          {report.meta.isSample ? (
            <Callout tone="warning" title="Sample report — demo data">
              This report is generated from the sample dataset included with the prototype. The
              workspace still contains {formatNumber(report.meta.sampleRecordCount)} demo records, so
              this report does not describe measured performance for a real college.
            </Callout>
          ) : null}

          <article className="print-card overflow-hidden rounded-2xl border border-line bg-white shadow-card">
            <header className="border-b border-line bg-sand-50/60 px-6 py-6 sm:px-8 sm:py-7">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-forest-600">
                    GreenCampus · Sustainability report
                    {report.meta.isSample ? ' · sample data' : ''}
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink-900">
                    {report.meta.college.name}
                  </h2>
                  <p className="mt-1 text-sm text-ink-500">
                    Estimated greenhouse gas inventory & resource use summary
                  </p>
                  {report.meta.college.city ? (
                    <p className="mt-1 text-xs text-ink-400">{report.meta.college.city}</p>
                  ) : null}
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">
                    Reporting period
                  </p>
                  <p className="mt-1 font-display text-sm font-semibold text-ink-900">
                    {monthRangeLabel(from, to)}
                  </p>
                  <p className="mt-1 text-[11px] text-ink-400">
                    Reporting year: {report.meta.reportingYear || 'Not specified'}
                  </p>
                  <p className="mt-1 text-[11px] text-ink-400">
                    Generated {formatDateTime(report.meta.generatedAt)}
                  </p>
                  <p className="mt-1 text-[11px] text-ink-400">
                    Data basis: {report.meta.dataBasis ?? 'Recorded workspace data'}
                  </p>
                  <Badge
                    tone={report.meta.isSample ? 'blue' : 'neutral'}
                    className="mt-2"
                  >
                    {report.meta.isSample ? 'Sample report' : 'Prototype estimate'}
                  </Badge>
                  <p className="mt-1 text-[10px] text-ink-400">Report {report.meta.id ?? '—'}</p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-line bg-white p-3.5">
                  <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-ink-400">
                    Total footprint
                  </p>
                  <p className="mt-1 font-display text-base font-semibold text-ink-900">
                    {formatTonnes(summary.totalKg, { digits: summary.totalKg >= 100000 ? 0 : 1 })}
                  </p>
                  <p className="mt-0.5 text-[10px] text-ink-400">
                    {report.meta.previous
                      ? `${formatSignedPercent(report.meta.previous.change, { digits: 1 })} vs ${report.meta.previous.label}`
                      : 'No prior-period baseline'}
                  </p>
                </div>
                <div className="rounded-xl border border-line bg-white p-3.5">
                  <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-ink-400">
                    tCO₂e per student
                  </p>
                  <p className="mt-1 font-display text-base font-semibold text-ink-900">
                    {report.intensity?.tco2ePerStudent === null ||
                    report.intensity?.tco2ePerStudent === undefined
                      ? '—'
                      : formatNumber(report.intensity.tco2ePerStudent, { digits: 3 })}
                  </p>
                  <p className="mt-0.5 text-[10px] text-ink-400">
                    {report.intensity?.students
                      ? `${formatNumber(report.intensity.students)} students recorded`
                      : 'Student count not recorded'}
                  </p>
                </div>
                <div className="rounded-xl border border-line bg-white p-3.5">
                  <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-ink-400">
                    Intensity
                  </p>
                  <p className="mt-1 font-display text-base font-semibold text-ink-900">
                    {report.intensity?.kgPerSqm === null ||
                    report.intensity?.kgPerSqm === undefined
                      ? '—'
                      : `${formatNumber(report.intensity.kgPerSqm, { digits: 1 })} kg/m²`}
                  </p>
                  <p className="mt-0.5 text-[10px] text-ink-400">
                    {report.intensity?.floorAreaSqm
                      ? `${formatNumber(report.intensity.floorAreaSqm)} m² floor area`
                      : 'Floor area not recorded'}
                  </p>
                </div>
                <div className="rounded-xl border border-line bg-white p-3.5">
                  <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-ink-400">
                    Electricity
                  </p>
                  <p className="mt-1 font-display text-base font-semibold text-ink-900">
                    {formatNumber(summary.metrics.electricityKwh / 1000, { digits: 1 })} MWh
                  </p>
                  <p className="mt-0.5 text-[10px] text-ink-400">
                    {report.intensity?.kwhPerStudent
                      ? `${formatNumber(report.intensity.kwhPerStudent)} kWh/student`
                      : 'No student count recorded'}
                  </p>
                </div>
                <div className="rounded-xl border border-line bg-white p-3.5">
                  <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-ink-400">
                    Water
                  </p>
                  <p className="mt-1 font-display text-base font-semibold text-ink-900">
                    {formatWater(summary.metrics.waterM3)}
                  </p>
                </div>
              </div>
            </header>

            <div className="space-y-8 px-6 py-6 sm:px-8 sm:py-7">
              <ReportSection
                index={1}
                title="Executive summary"
                description="A narrative summary of the recorded period."
              >
                {summary.entryCount === 0 ? (
                  <p className="text-sm leading-relaxed text-ink-500">
                    No activity records were available for this period, so no emissions estimate can
                    be produced.
                  </p>
                ) : (
                  <div className="space-y-2.5 text-[13px] leading-relaxed text-ink-700">
                    <p>
                      {from === to ? 'In' : 'Between'} {monthRangeLabel(from, to)},{' '}
                      {report.meta.college.name} recorded{' '}
                      {formatNumber(summary.entryCount)} activity entries across{' '}
                      {report.meta.buildingCount} buildings and campus-wide sources. Estimated
                      emissions totalled{' '}
                      <strong className="font-semibold text-ink-900">
                        {formatTonnes(summary.totalKg, { digits: 1 })}
                      </strong>
                      {perPerson !== null ? (
                        <>
                          , or about {formatNumber(perPerson, { digits: 0 })} kgCO₂e per student and
                          staff member
                        </>
                      ) : null}
                      .
                    </p>
                    <p>
                      Scope 1 contributed{' '}
                      {formatPercent(shares.find((share) => share.scope === 1)?.percent ?? 0, {
                        digits: 0,
                        alreadyPercent: true,
                      })}
                      , Scope 2{' '}
                      {formatPercent(shares.find((share) => share.scope === 2)?.percent ?? 0, {
                        digits: 0,
                        alreadyPercent: true,
                      })}{' '}
                      and Scope 3{' '}
                      {formatPercent(shares.find((share) => share.scope === 3)?.percent ?? 0, {
                        digits: 0,
                        alreadyPercent: true,
                      })}
                      . Purchased electricity accounted for{' '}
                      {formatPercent(
                        summary.totalKg > 0
                          ? (summary.byCategory.electricity / summary.totalKg) * 100
                          : 0,
                        { digits: 0, alreadyPercent: true },
                      )}{' '}
                      of the footprint, while staff and student commuting accounted for{' '}
                      {formatPercent(
                        summary.totalKg > 0
                          ? (summary.byCategory.commuting / summary.totalKg) * 100
                          : 0,
                        { digits: 0, alreadyPercent: true },
                      )}
                      .
                    </p>
                    <p>
                      Waste diversion (recycling and composting) stood at{' '}
                      {formatPercent(summary.metrics.diversionRate, { digits: 0 })} of{' '}
                      {formatWeight(summary.metrics.wasteKg)} of recorded waste. Water use was{' '}
                      {formatWater(summary.metrics.waterM3)} and is reported as a resource metric,
                      not a GHG scope.
                    </p>
                  </div>
                )}
              </ReportSection>

              <ReportSection
                index={2}
                title="Resource consumption summary"
                description="Recorded quantities for the period. These are measurements, not emission estimates."
              >
                <ReportTable
                  rows={report.resources ?? []}
                  getRowKey={(row) => row.id}
                  emptyLabel="No resource records in this period."
                  columns={[
                    {
                      key: 'label',
                      header: 'Resource',
                      render: (row) => (
                        <div>
                          <p className="font-medium text-ink-900">{row.label}</p>
                          {row.detail ? (
                            <p className="mt-0.5 text-[11px] text-ink-400">{row.detail}</p>
                          ) : null}
                        </div>
                      ),
                    },
                    {
                      key: 'value',
                      header: 'Recorded quantity',
                      align: 'right',
                      render: (row) => formatResourceValue(row),
                    },
                    {
                      key: 'previous',
                      header: 'Previous period',
                      align: 'right',
                      render: (row) =>
                        row.previous === null || row.previous === undefined
                          ? '—'
                          : formatResourceValue({ ...row, value: row.previous }),
                    },
                    {
                      key: 'change',
                      header: 'Change',
                      align: 'right',
                      render: (row) => formatResourceChange(row.change),
                    },
                  ]}
                />
                <p className="mt-2 text-[10px] text-ink-400">
                  Change compares with {report.meta.previous?.label ?? 'the prior period'}. Water is a
                  resource metric and is not assigned to a GHG scope.
                </p>
              </ReportSection>

              <ReportSection
                index={3}
                title="GHG Protocol scope summary"
                description="Estimated emissions classified as Scope 1, 2 or 3."
              >
                <ReportTable
                  rows={[1, 2, 3]}
                  getRowKey={(row) => row}
                  columns={[
                    {
                      key: 'scope',
                      header: 'Scope',
                      render: (scope) => (
                        <div>
                          <ScopeBadge scope={scope} />
                          <p className="mt-1 text-xs font-medium text-ink-900">
                            {SCOPE_META[scope].name}
                          </p>
                        </div>
                      ),
                    },
                    {
                      key: 'sources',
                      header: 'Sources included',
                      render: (scope) => (
                        <span className="text-xs text-ink-500">{SCOPE_META[scope].description}</span>
                      ),
                    },
                    {
                      key: 'value',
                      header: 'Estimated emissions',
                      align: 'right',
                      render: (scope) =>
                        formatTonnes(summary.byScope[scope], {
                          digits: summary.byScope[scope] >= 10000 ? 0 : 1,
                        }),
                    },
                    {
                      key: 'share',
                      header: 'Share',
                      align: 'right',
                      render: (scope) =>
                        formatPercent(
                          shares.find((share) => share.scope === scope)?.percent ?? 0,
                          { digits: 0, alreadyPercent: true },
                        ),
                    },
                  ]}
                />
                <div className="mt-4 rounded-xl border border-line bg-sand-50/50 p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[12px] font-semibold text-ink-900">Scope 2 dual reporting</p>
                    <Badge tone="blue">Market-based is a proxy</Badge>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-lg border border-line bg-white px-3 py-2">
                      <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-ink-400">
                        Location-based · applied
                      </p>
                      <p className="mt-0.5 font-display text-base font-semibold text-ink-900">
                        {formatTonnes(report.scope2?.locationKg ?? 0, { digits: 2 })}
                      </p>
                      <p className="text-[10px] text-ink-400">CEA grid-average factor</p>
                    </div>
                    <div className="rounded-lg border border-line bg-white px-3 py-2">
                      <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-ink-400">
                        Market-based · proxy
                      </p>
                      <p className="mt-0.5 font-display text-base font-semibold text-ink-900">
                        {formatTonnes(report.scope2?.marketKg ?? 0, { digits: 2 })}
                      </p>
                      <p className="text-[10px] text-ink-400">
                        {report.scope2?.marketFactorVerified
                          ? 'Verified contractual instruments'
                          : 'No verified instruments recorded'}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-[10px] leading-relaxed text-ink-400">{report.scope2?.note}</p>
                </div>
              </ReportSection>

              <ReportSection
                index={4}
                title="Emissions by source"
                description="Activity categories behind the footprint."
              >
                <ReportTable
                  rows={categoryRows}
                  getRowKey={(row) => row.category}
                  emptyLabel="No scope-classified records in this period."
                  columns={[
                    {
                      key: 'label',
                      header: 'Source',
                      render: (row) => (
                        <div>
                          <p className="font-medium text-ink-900">{row.label}</p>
                          <p className="mt-0.5 text-[11px] text-ink-400">
                            {CATEGORY_META[row.category].description}
                          </p>
                        </div>
                      ),
                    },
                    {
                      key: 'scope',
                      header: 'Scope',
                      render: (row) => <ScopeBadge scope={row.scope} />,
                    },
                    {
                      key: 'value',
                      header: 'Estimated emissions',
                      align: 'right',
                      render: (row) => formatTonnes(row.kg, { digits: row.kg >= 10000 ? 0 : 1 }),
                    },
                    {
                      key: 'share',
                      header: 'Share',
                      align: 'right',
                      render: (row) =>
                        formatPercent(row.share, { digits: 0, alreadyPercent: true }),
                    },
                  ]}
                />
                <p className="mt-2 text-[10px] text-ink-400">
                  Water consumption is excluded from this table because it is not classified as a GHG
                  source.
                </p>
              </ReportSection>

              <ReportSection
                index={5}
                title="Building performance"
                description="Estimated emissions and intensity by building."
              >
                <ReportTable
                  rows={report.buildings.filter((building) => building.entryCount > 0)}
                  getRowKey={(row) => row.id}
                  emptyLabel="No building-level records in this period."
                  columns={[
                    {
                      key: 'name',
                      header: 'Building',
                      render: (row) => (
                        <div>
                          <p className="font-medium text-ink-900">{row.name}</p>
                          <p className="mt-0.5 text-[11px] text-ink-400">{row.type}</p>
                        </div>
                      ),
                    },
                    {
                      key: 'emissions',
                      header: 'Estimated emissions',
                      align: 'right',
                      render: (row) => formatTonnes(row.kg, { digits: row.kg >= 10000 ? 0 : 1 }),
                    },
                    {
                      key: 'intensity',
                      header: 'Intensity',
                      align: 'right',
                      render: (row) =>
                        row.intensityKgPerSqm === null
                          ? '—'
                          : `${formatNumber(row.intensityKgPerSqm, { digits: 1 })} kg/m²`,
                    },
                    {
                      key: 'electricity',
                      header: 'Electricity',
                      align: 'right',
                      render: (row) => `${formatNumber(row.electricityKwh / 1000, { digits: 1 })} MWh`,
                    },
                    {
                      key: 'water',
                      header: 'Water',
                      align: 'right',
                      render: (row) => formatWater(row.waterM3),
                    },
                  ]}
                />
              </ReportSection>

              <ReportSection
                index={6}
                title="Monthly inventory"
                description="Estimated scope totals for each month in the period."
              >
                <ReportTable
                  rows={summary.byMonth}
                  getRowKey={(row) => row.period}
                  columns={[
                    {
                      key: 'month',
                      header: 'Month',
                      render: (row) => monthLabel(row.period),
                    },
                    {
                      key: 'scope1',
                      header: 'Scope 1',
                      align: 'right',
                      render: (row) => formatNumber(row.scope1 / 1000, { digits: 1 }),
                    },
                    {
                      key: 'scope2',
                      header: 'Scope 2',
                      align: 'right',
                      render: (row) => formatNumber(row.scope2 / 1000, { digits: 1 }),
                    },
                    {
                      key: 'scope3',
                      header: 'Scope 3',
                      align: 'right',
                      render: (row) => formatNumber(row.scope3 / 1000, { digits: 1 }),
                    },
                    {
                      key: 'total',
                      header: 'Total tCO₂e',
                      align: 'right',
                      render: (row) => (
                        <span className="font-semibold text-ink-900">
                          {formatNumber(row.total / 1000, { digits: 1 })}
                        </span>
                      ),
                    },
                    {
                      key: 'electricity',
                      header: 'Electricity',
                      align: 'right',
                      render: (row) => `${formatNumber(row.electricityKwh / 1000, { digits: 1 })} MWh`,
                    },
                    {
                      key: 'water',
                      header: 'Water',
                      align: 'right',
                      render: (row) => formatWater(row.waterM3),
                    },
                  ]}
                />
              </ReportSection>

              <ReportSection
                index={7}
                title="Scope 3 value-chain register"
                description="Applicability of all 15 GHG Protocol Scope 3 categories. Only categories with linked activity records are quantified."
              >
                <ReportTable
                  rows={report.scope3?.rows ?? []}
                  getRowKey={(row) => row.id}
                  columns={[
                    {
                      key: 'category',
                      header: 'Category',
                      render: (row) => (
                        <div>
                          <p className="font-medium text-ink-900">
                            {row.id}. {row.label}
                          </p>
                          <p className="mt-0.5 max-w-[320px] text-[10px] leading-relaxed text-ink-400">
                            {row.relevance}
                          </p>
                          {row.deviation ? (
                            <p className="mt-0.5 text-[10px] font-medium text-info-700">
                              Student commuting included in this category by convention.
                            </p>
                          ) : null}
                        </div>
                      ),
                    },
                    {
                      key: 'status',
                      header: 'Applicability',
                      render: (row) => <Badge tone={row.statusTone}>{row.statusLabel}</Badge>,
                    },
                    {
                      key: 'kg',
                      header: 'Quantified emissions',
                      align: 'right',
                      render: (row) =>
                        row.entryCount
                          ? formatTonnes(row.kg, { digits: 2 })
                          : <span className="text-[11px] text-ink-400">Not quantified</span>,
                    },
                  ]}
                />
                <p className="mt-2 text-[10px] text-ink-400">
                  Quantified categories: {report.scope3?.measuredCount ?? 0} of{' '}
                  {report.scope3?.totalCategories ?? 15}. Relevant but not yet quantified:{' '}
                  {report.scope3?.applicableNotQuantified ?? 0}; assessed not relevant:{' '}
                  {report.scope3?.excludedCount ?? 0}; not yet assessed:{' '}
                  {report.scope3?.notAssessedCount ?? 0}. Notes for each category are recorded in the
                  Scope 3 register on the Emissions page.
                </p>
              </ReportSection>

              <ReportSection
                index={8}
                title="Activity data quality"
                description="How the recorded inputs behind this estimate were obtained. Data quality describes the input, not the factor."
              >
                <ReportTable
                  rows={(report.dataQuality ?? []).filter((row) => row.entryCount > 0)}
                  getRowKey={(row) => row.id}
                  emptyLabel="No data-quality classifications recorded for this period."
                  columns={[
                    {
                      key: 'quality',
                      header: 'Classification',
                      render: (row) => <Badge tone={row.tone}>{row.label}</Badge>,
                    },
                    {
                      key: 'records',
                      header: 'Records',
                      align: 'right',
                      render: (row) => formatNumber(row.entryCount),
                    },
                    {
                      key: 'emissions',
                      header: 'Estimated emissions',
                      align: 'right',
                      render: (row) => formatTonnes(row.kg, { digits: 2 }),
                    },
                    {
                      key: 'share',
                      header: 'Share of total',
                      align: 'right',
                      render: (row) =>
                        formatPercent(row.share, { digits: 1, alreadyPercent: true }),
                    },
                  ]}
                />
                <p className="mt-2 text-[10px] text-ink-400">
                  Records marked estimated, spend-based or missing still count towards the total and
                  are flagged so a reviewer can see where primary data is needed.
                </p>
              </ReportSection>

              <ReportSection
                index={9}
                title="Emission intensity indicators"
                description="Normalised indicators for comparing performance over time; they do not change the absolute footprint."
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-line bg-sand-50/50 p-3.5">
                    <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-ink-400">
                      tCO₂e per student
                    </p>
                    <p className="mt-1 font-display text-lg font-semibold text-ink-900">
                      {report.intensity?.tco2ePerStudent === null ||
                      report.intensity?.tco2ePerStudent === undefined
                        ? '—'
                        : formatNumber(report.intensity.tco2ePerStudent, { digits: 3 })}
                    </p>
                    <p className="mt-0.5 text-[10px] text-ink-400">
                      {report.intensity?.students
                        ? `${formatNumber(report.intensity.students)} students recorded`
                        : 'Student count not recorded'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-line bg-sand-50/50 p-3.5">
                    <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-ink-400">
                      kgCO₂e per m²
                    </p>
                    <p className="mt-1 font-display text-lg font-semibold text-ink-900">
                      {report.intensity?.kgPerSqm === null ||
                      report.intensity?.kgPerSqm === undefined
                        ? '—'
                        : formatNumber(report.intensity.kgPerSqm, { digits: 1 })}
                    </p>
                    <p className="mt-0.5 text-[10px] text-ink-400">
                      {report.intensity?.floorAreaSqm
                        ? `${formatNumber(report.intensity.floorAreaSqm)} m² recorded floor area`
                        : 'Floor area not recorded'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-line bg-sand-50/50 p-3.5">
                    <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-ink-400">
                      kWh per student
                    </p>
                    <p className="mt-1 font-display text-lg font-semibold text-ink-900">
                      {report.intensity?.kwhPerStudent === null ||
                      report.intensity?.kwhPerStudent === undefined
                        ? '—'
                        : formatNumber(report.intensity.kwhPerStudent)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-ink-400">
                      Purchased electricity only
                    </p>
                  </div>
                </div>
              </ReportSection>

              <ReportSection
                index={10}
                title="Key observations"
                description="Rule-based highlights derived from the same records and calculations as the tables above."
              >
                {report.observations?.length ? (
                  <ol className="space-y-2">
                    {report.observations.map((observation, index) => (
                      <li
                        key={observation.id ?? index}
                        className="rounded-lg border border-line bg-sand-50/50 p-3"
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-forest-100 text-[10px] font-semibold text-forest-700">
                            {index + 1}
                          </span>
                          <div>
                            <p className="text-[13px] font-medium text-ink-900">
                              {observation.title}
                            </p>
                            <p className="mt-0.5 text-xs leading-relaxed text-ink-500">
                              {observation.detail}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-xs text-ink-400">No observations for this period.</p>
                )}
              </ReportSection>

              <ReportSection
                index={11}
                title="Data limitations"
                description="What this report does not cover, and how the estimates should be read."
              >
                <ol className="list-decimal space-y-1.5 pl-5 text-xs leading-relaxed text-ink-600">
                  {(report.limitations ?? []).map((limitation, index) => (
                    <li key={index}>{limitation}</li>
                  ))}
                </ol>
              </ReportSection>

              <ReportSection
                index={12}
                title="Methodology, boundaries and standards"
                description="The accounting choices a reader needs in order to interpret the estimates correctly."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-line bg-sand-50/50 p-3.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-400">
                      Standards referenced
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-700">
                      {report.methodology?.standard}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-700">
                      {report.methodology?.scope3Standard}
                    </p>
                    <p className="mt-1.5 text-[10px] leading-relaxed text-ink-400">
                      GWP basis: {report.methodology?.gwp}
                    </p>
                  </div>
                  <div className="rounded-xl border border-line bg-sand-50/50 p-3.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-400">
                      Boundary and reporting year
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-700">
                      {report.methodology?.boundary}
                    </p>
                    <p className="mt-1.5 text-[11px] text-ink-500">
                      Consolidation approach: {report.methodology?.consolidation}
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink-500">
                      Base year: {report.methodology?.baseYear}
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink-500">
                      Reporting year: {report.meta.reportingYear || 'Not specified'} —{' '}
                      {report.methodology?.reportingYearBasis}
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-400">
                    Scope boundaries
                  </p>
                  <div className="mt-1.5">
                    <ReportTable
                      rows={report.methodology?.boundaries ?? []}
                      getRowKey={(row) => row.scope}
                      columns={[
                        {
                          key: 'scope',
                          header: 'Scope',
                          render: (row) => <ScopeBadge scope={row.scope} />,
                        },
                        {
                          key: 'boundary',
                          header: 'Boundary',
                          render: (row) => (
                            <div>
                              <p className="text-xs font-medium text-ink-900">{row.name}</p>
                              <p className="mt-0.5 text-[10px] leading-relaxed text-ink-400">
                                {row.boundary}
                              </p>
                            </div>
                          ),
                        },
                        {
                          key: 'included',
                          header: 'Included',
                          render: (row) => (
                            <span className="text-[11px] leading-relaxed text-ink-500">
                              {(row.included ?? []).join('; ')}
                            </span>
                          ),
                        },
                        {
                          key: 'excluded',
                          header: 'Excluded / not quantified',
                          render: (row) => (
                            <span className="text-[11px] leading-relaxed text-ink-500">
                              {(row.excluded ?? []).join('; ')}
                            </span>
                          ),
                        },
                      ]}
                    />
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-line p-3.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-400">
                      Scope 2 methods
                    </p>
                    <div className="mt-2 space-y-2">
                      {(report.methodology?.scope2Methods ?? []).map((method) => (
                        <div key={method.id}>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="text-[11px] font-medium text-ink-700">{method.label}</p>
                            <Badge tone={method.applied ? 'green' : 'blue'}>
                              {method.applied ? 'Applied' : 'Proxy only'}
                            </Badge>
                          </div>
                          <p className="mt-0.5 text-[10px] leading-relaxed text-ink-400">
                            {method.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-line p-3.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-400">
                      Scope 1 source coverage
                    </p>
                    <div className="mt-2 space-y-1.5">
                      {(report.methodology?.scope1Sources ?? []).map((source) => (
                        <div key={source.id} className="flex items-start justify-between gap-3">
                          <p className="text-[11px] text-ink-600">{source.label}</p>
                          <span className="shrink-0 text-[10px] text-ink-400">{source.activity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <p className="mt-3 rounded-lg border border-line bg-sand-50/50 p-3 text-[10px] leading-relaxed text-ink-500">
                  <strong className="font-semibold text-ink-700">No double counting:</strong>{' '}
                  {report.methodology?.doubleCounting}
                </p>
                <p className="mt-2 text-[10px] leading-relaxed text-ink-400">
                  {report.methodology?.disclaimer}
                </p>
              </ReportSection>

              <ReportSection
                index={13}
                title="Emission factor provenance"
                description="Every estimate is activity quantity × factor. Each factor records its source, applicable year, gas coverage and methodology."
              >
                <ReportTable
                  rows={report.factors}
                  getRowKey={(row) => row.key}
                  columns={[
                    {
                      key: 'factor',
                      header: 'Factor',
                      render: (row) => (
                        <div>
                          <p className="font-medium text-ink-900">{row.label}</p>
                          <p className="mt-0.5 text-[10px] leading-relaxed text-ink-400">
                            {row.source}
                          </p>
                          {row.methodology ? (
                            <p className="mt-0.5 text-[10px] leading-relaxed text-ink-400">
                              {row.methodology}
                            </p>
                          ) : null}
                        </div>
                      ),
                    },
                    {
                      key: 'year',
                      header: 'Applicable year',
                      render: (row) => (
                        <div>
                          <p className="text-[11px] text-ink-600">{row.year || 'Not stated'}</p>
                          {row.version ? (
                            <p className="mt-0.5 text-[10px] text-ink-400">{row.version}</p>
                          ) : null}
                        </div>
                      ),
                    },
                    {
                      key: 'gas',
                      header: 'Gas coverage',
                      render: (row) => (
                        <span className="text-[11px] text-ink-500">{row.gasCoverage || 'Not stated'}</span>
                      ),
                    },
                    {
                      key: 'value',
                      header: 'Value',
                      align: 'right',
                      render: (row) =>
                        formatNumber(row.value, {
                          digits: row.value >= 10 ? 0 : row.value >= 1 ? 2 : 3,
                        }),
                    },
                    {
                      key: 'unit',
                      header: 'Unit',
                      render: (row) => <span className="text-[11px] text-ink-500">{row.unit}</span>,
                    },
                    {
                      key: 'scope',
                      header: 'Scope',
                      render: (row) => (row.scope ? <ScopeBadge scope={row.scope} /> : '—'),
                    },
                  ]}
                />
                <div className="mt-3 space-y-1 text-[10px] leading-relaxed text-ink-400">
                  <p>
                    Electricity = kWh × CEA grid-average factor (0.675 kgCO₂/kWh, v22.0, FY 2025-26 in
                    the default factor set). Fuel = quantity × fuel-specific factor; refrigerant top-ups
                    use AR4 100-year GWPs. Waste = kg ÷ 1,000 × disposal-method factor. Commuting =
                    commuters × one-way distance × 2 × round trips × mode factor.
                  </p>
                  <p>
                    Market-based Scope 2 uses the location-based factor only as a labelled proxy. No
                    renewable energy certificates or supplier-specific factors are recorded, so no
                    contractual instrument is treated as zero.
                  </p>
                </div>
              </ReportSection>

              {report.recommendations.length ? (
                <ReportSection
                  index={14}
                  title="Priority opportunities"
                  description={`Rule-based opportunities for ${report.meta.periodLabel}.`}
                >
                  <div className="space-y-2">
                    {report.recommendations.map((recommendation) => (
                      <div
                        key={recommendation.id}
                        className="rounded-lg border border-line bg-sand-50/50 p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[13px] font-medium text-ink-900">
                            {recommendation.title}
                          </p>
                          <PriorityBadge priority={recommendation.priority} />
                        </div>
                        <p className="mt-1 text-[11px] text-ink-500">
                          {recommendation.category}
                          {recommendation.expectedBenefit
                            ? ` · Potential benefit ${recommendation.expectedBenefit.display}`
                            : ' · Benefit not estimated from current data'}
                        </p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-[10px] text-ink-400">
                    These are rule-based prompts for investigation, not audited savings or guaranteed
                    emission reductions. See Recommendations for the evidence, actions and assumptions.
                  </p>
                </ReportSection>
              ) : null}
            </div>

            <footer className="border-t border-line bg-sand-50/50 px-6 py-4 text-[10px] leading-relaxed text-ink-400 sm:px-8">
              <p>
                Prepared with GreenCampus on {formatDateTime(report.meta.generatedAt)}. Emissions are
                estimates derived from locally recorded data and configurable reference factors. This
                report is not a verified carbon inventory or an assurance statement.
              </p>
              <p className="mt-1">
                Report {report.meta.id ?? '—'} · Data basis:{' '}
                {report.meta.dataBasis ?? 'Recorded workspace data'}.
                {report.meta.isSample
                  ? ' This is a sample report generated from demo data, not measured college performance.'
                  : ''}
              </p>
            </footer>
          </article>
        </>
      ) : null}
    </div>
  );
}
