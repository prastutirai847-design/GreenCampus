import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Database,
  Info,
  Leaf,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  UserRound,
} from 'lucide-react';
import { useCampus } from '../context/CampusContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Badge, ScopeBadge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Callout } from '../components/ui/Callout.jsx';
import { Card, CardHeader } from '../components/ui/Card.jsx';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.jsx';
import { Field } from '../components/ui/Field.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { inputClasses } from '../components/ui/styles.js';
import { COLLEGE_TYPES } from '../data/options.js';
import {
  DEFAULT_FACTORS,
  FACTOR_GROUPS,
  factorStatus,
  factorValues,
} from '../data/emissionFactors.js';
import { formatNumber } from '../utils/format.js';
import { hasErrors, validateProfileInput } from '../utils/validation.js';

const SECTIONS = [
  { id: 'profile', label: 'College profile', icon: UserRound },
  { id: 'factors', label: 'Emission factors', icon: SlidersHorizontal },
  { id: 'data', label: 'Data & workspace', icon: Database },
  { id: 'about', label: 'About this pilot', icon: Info },
];

const DIALOGS = {
  sample: {
    title: 'Restore the sample dataset?',
    description:
      'This replaces your buildings, activity records, profile and emission factors with the original demo dataset. Anything you recorded locally will be removed.',
    confirmLabel: 'Restore sample data',
    tone: 'primary',
  },
  clear: {
    title: 'Delete all activity records?',
    description:
      'Every electricity, water, fuel, waste and commuting record will be deleted. Buildings, profile and factor settings are kept.',
    confirmLabel: 'Delete records',
    tone: 'danger',
  },
  reset: {
    title: 'Reset the whole workspace?',
    description:
      'All local data — buildings, records, profile and customised factors — will be cleared and the original demo workspace reloaded.',
    confirmLabel: 'Reset workspace',
    tone: 'danger',
  },
  factors: {
    title: 'Restore default emission factors?',
    description:
      'Your custom factor values will be replaced with the indicative defaults from the reference factor set.',
    confirmLabel: 'Restore defaults',
    tone: 'primary',
  },
};

function toDraft(profile) {
  return {
    name: profile?.name ?? '',
    shortName: profile?.shortName ?? '',
    city: profile?.city ?? '',
    type: profile?.type ?? 'Engineering',
    students: profile?.students === undefined || profile?.students === null ? '' : String(profile.students),
    staff: profile?.staff === undefined || profile?.staff === null ? '' : String(profile.staff),
    campusBuildings:
      profile?.campusBuildings === undefined || profile?.campusBuildings === null
        ? ''
        : String(profile.campusBuildings),
    campusAreaAcres:
      profile?.campusAreaAcres === undefined || profile?.campusAreaAcres === null
        ? ''
        : String(profile.campusAreaAcres),
    academicYear: profile?.academicYear ?? '',
    sustainabilityLead: profile?.sustainabilityLead ?? '',
    contactEmail: profile?.contactEmail ?? '',
  };
}

function factorDraftFrom(factors) {
  if (!factors) return {};
  return Object.fromEntries(
    Object.entries(factors).map(([key, definition]) => [key, String(definition.value)]),
  );
}

export function SettingsPage() {
  const {
    profile,
    factors,
    buildings,
    activities,
    saveProfile,
    saveFactors,
    restoreFactors,
    loadSampleData,
    clearAllRecords,
    resetWorkspace,
  } = useCampus();
  const { push } = useToast();
  const location = useLocation();

  const [profileDraft, setProfileDraft] = useState(() => toDraft(profile));
  const [profileErrors, setProfileErrors] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);

  const [factorDraft, setFactorDraft] = useState(() => factorDraftFrom(factors));
  const [factorErrors, setFactorErrors] = useState({});
  const [savingFactors, setSavingFactors] = useState(false);

  const [dialog, setDialog] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    setProfileDraft(toDraft(profile));
    setProfileErrors({});
  }, [profile]);

  useEffect(() => {
    setFactorDraft(factorDraftFrom(factors));
    setFactorErrors({});
  }, [factors]);

  // Support deep links such as /settings#factors from other pages.
  useEffect(() => {
    const id = location.hash.replace(/^#/, '');
    if (!id) return undefined;
    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [location.hash]);

  const savedFactorValues = useMemo(() => (factors ? factorValues(factors) : {}), [factors]);

  const usingDefaultFactors = useMemo(
    () =>
      Object.keys(DEFAULT_FACTORS).every(
        (key) => Number(factors?.[key]?.value) === Number(DEFAULT_FACTORS[key].value),
      ),
    [factors],
  );

  const factorsDirty = useMemo(
    () =>
      Object.keys(savedFactorValues).some(
        (key) => Number(factorDraft[key]) !== Number(savedFactorValues[key]),
      ),
    [factorDraft, savedFactorValues],
  );

  const profileDirty = useMemo(() => {
    const saved = toDraft(profile);
    return Object.keys(saved).some((key) => String(saved[key] ?? '') !== String(profileDraft[key] ?? ''));
  }, [profile, profileDraft]);

  const profileSummary = [
    `${formatNumber(profile?.students ?? 0)} students`,
    `${formatNumber(profile?.staff ?? 0)} staff`,
    profile?.campusBuildings ? `${formatNumber(profile.campusBuildings)} buildings` : null,
    profile?.campusAreaAcres ? `${formatNumber(profile.campusAreaAcres, { digits: 1 })} acres` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfileDraft((previous) => ({ ...previous, [name]: value }));
    setProfileErrors((previous) => {
      if (!previous[name]) return previous;
      const next = { ...previous };
      delete next[name];
      return next;
    });
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    const errors = validateProfileInput(profileDraft);
    setProfileErrors(errors);
    if (hasErrors(errors)) {
      push({ tone: 'error', title: 'Check the highlighted fields', message: 'Some profile details are not valid yet.' });
      return;
    }
    setSavingProfile(true);
    try {
      await saveProfile(profileDraft);
      push({ tone: 'success', title: 'Profile saved', message: 'Your college details were updated in this workspace.' });
    } catch (error) {
      push({
        tone: 'error',
        title: 'Could not save the profile',
        message: error instanceof Error ? error.message : 'Try again in a moment.',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleFactorChange = (key, value) => {
    setFactorDraft((previous) => ({ ...previous, [key]: value }));
    setFactorErrors((previous) => {
      if (!previous[key]) return previous;
      const next = { ...previous };
      delete next[key];
      return next;
    });
  };

  const handleFactorSubmit = async (event) => {
    event.preventDefault();
    const errors = {};
    Object.keys(DEFAULT_FACTORS).forEach((key) => {
      const raw = factorDraft[key];
      const number = Number(raw);
      if (raw === '' || raw === undefined || !Number.isFinite(number) || number < 0) {
        errors[key] = 'Enter zero or a positive number.';
      }
    });
    setFactorErrors(errors);
    if (hasErrors(errors)) {
      push({
        tone: 'error',
        title: 'Some factor values need attention',
        message: 'Every factor must be a non-negative number before it can be saved.',
      });
      return;
    }
    setSavingFactors(true);
    try {
      await saveFactors(factorDraft);
      push({
        tone: 'success',
        title: 'Emission factors saved',
        message: 'All recalculated figures across the workspace now use these values.',
      });
    } catch (error) {
      push({
        tone: 'error',
        title: 'Could not save factors',
        message: error instanceof Error ? error.message : 'Try again in a moment.',
      });
    } finally {
      setSavingFactors(false);
    }
  };

  const runDialogAction = async () => {
    if (!dialog) return;
    setActionLoading(true);
    try {
      if (dialog === 'sample') {
        await loadSampleData();
        push({ tone: 'success', title: 'Sample dataset restored', message: 'The demo workspace is back in place.' });
      } else if (dialog === 'clear') {
        await clearAllRecords();
        push({ tone: 'success', title: 'Activity records deleted', message: 'Buildings, profile and factors were kept.' });
      } else if (dialog === 'reset') {
        await resetWorkspace();
        push({ tone: 'success', title: 'Workspace reset', message: 'The original demo data has been reloaded.' });
      } else if (dialog === 'factors') {
        await restoreFactors();
        push({ tone: 'success', title: 'Default factors restored', message: 'Indicative reference values are active again.' });
      }
      setDialog(null);
    } catch (error) {
      push({
        tone: 'error',
        title: 'The action could not be completed',
        message: error instanceof Error ? error.message : 'Try again in a moment.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const dialogConfig = dialog ? DIALOGS[dialog] : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace configuration"
        title="Settings"
        description="Manage the college profile, emission-factor assumptions and the local demo workspace. Changes apply immediately to every dashboard, analysis and report."
        actions={
          <Button variant="secondary" onClick={() => scrollToSection('data')}>
            <Database className="h-4 w-4" aria-hidden="true" />
            Manage data
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[196px_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="hidden lg:block">
          <div className="sticky top-24 space-y-1">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => scrollToSection(section.id)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-ink-500 transition-colors hover:bg-white hover:text-ink-900"
                >
                  <Icon className="h-4 w-4 text-forest-600" aria-hidden="true" />
                  {section.label}
                </button>
              );
            })}
            <p className="px-3 pt-3 text-[11px] leading-relaxed text-ink-400">
              Pilot workspace · data stored in this browser
            </p>
          </div>
        </nav>

        <div className="min-w-0 space-y-6">
          <section id="profile" className="scroll-mt-24">
            <Card>
              <div className="border-b border-line px-5 py-4">
                <CardHeader
                  title="College profile"
                  description="Used across dashboards and in the header of every exported report."
                  action={
                    profile ? (
                      <Badge tone="green" dot>
                        {profile.shortName || profile.name}
                      </Badge>
                    ) : null
                  }
                />
              </div>
              <form onSubmit={handleProfileSubmit} noValidate>
                <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
                  <Field
                    label="College name"
                    htmlFor="name"
                    required
                    error={profileErrors.name}
                    className="sm:col-span-2"
                  >
                    <input
                      id="name"
                      name="name"
                      className={inputClasses(Boolean(profileErrors.name))}
                      value={profileDraft.name}
                      onChange={handleProfileChange}
                      placeholder="e.g. Northfield Institute of Technology"
                      autoComplete="organization"
                    />
                  </Field>

                  <Field
                    label="Short name"
                    htmlFor="shortName"
                    hint="Appears in the sidebar and report header."
                  >
                    <input
                      id="shortName"
                      name="shortName"
                      className={inputClasses()}
                      value={profileDraft.shortName}
                      onChange={handleProfileChange}
                      placeholder="e.g. Northfield"
                    />
                  </Field>

                  <Field label="City" htmlFor="city">
                    <input
                      id="city"
                      name="city"
                      className={inputClasses()}
                      value={profileDraft.city}
                      onChange={handleProfileChange}
                      placeholder="e.g. Pune, Maharashtra"
                    />
                  </Field>

                  <Field label="College type" htmlFor="type" error={profileErrors.type}>
                    <select
                      id="type"
                      name="type"
                      className={inputClasses(Boolean(profileErrors.type))}
                      value={profileDraft.type}
                      onChange={handleProfileChange}
                    >
                      {COLLEGE_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field
                    label="Students"
                    htmlFor="students"
                    required
                    error={profileErrors.students}
                  >
                    <input
                      id="students"
                      name="students"
                      type="number"
                      min="0"
                      step="1"
                      inputMode="numeric"
                      className={inputClasses(Boolean(profileErrors.students))}
                      value={profileDraft.students}
                      onChange={handleProfileChange}
                    />
                  </Field>

                  <Field label="Staff" htmlFor="staff" required error={profileErrors.staff}>
                    <input
                      id="staff"
                      name="staff"
                      type="number"
                      min="0"
                      step="1"
                      inputMode="numeric"
                      className={inputClasses(Boolean(profileErrors.staff))}
                      value={profileDraft.staff}
                      onChange={handleProfileChange}
                    />
                  </Field>

                  <Field
                    label="Campus buildings (declared)"
                    htmlFor="campusBuildings"
                    error={profileErrors.campusBuildings}
                    hint="Count of metered blocks; add each building under Buildings."
                  >
                    <input
                      id="campusBuildings"
                      name="campusBuildings"
                      type="number"
                      min="0"
                      step="1"
                      inputMode="numeric"
                      className={inputClasses(Boolean(profileErrors.campusBuildings))}
                      value={profileDraft.campusBuildings}
                      onChange={handleProfileChange}
                    />
                  </Field>

                  <Field
                    label="Campus area (acres)"
                    htmlFor="campusAreaAcres"
                    error={profileErrors.campusAreaAcres}
                    hint="Optional. Used only for context in the pilot."
                  >
                    <input
                      id="campusAreaAcres"
                      name="campusAreaAcres"
                      type="number"
                      min="0"
                      step="0.1"
                      inputMode="decimal"
                      className={inputClasses(Boolean(profileErrors.campusAreaAcres))}
                      value={profileDraft.campusAreaAcres}
                      onChange={handleProfileChange}
                    />
                  </Field>

                  <Field label="Academic year" htmlFor="academicYear">
                    <input
                      id="academicYear"
                      name="academicYear"
                      className={inputClasses()}
                      value={profileDraft.academicYear}
                      onChange={handleProfileChange}
                      placeholder="e.g. 2025–26"
                    />
                  </Field>

                  <Field label="Sustainability lead" htmlFor="sustainabilityLead">
                    <input
                      id="sustainabilityLead"
                      name="sustainabilityLead"
                      className={inputClasses()}
                      value={profileDraft.sustainabilityLead}
                      onChange={handleProfileChange}
                      placeholder="Name of the responsible administrator"
                    />
                  </Field>

                  <Field label="Contact email" htmlFor="contactEmail">
                    <input
                      id="contactEmail"
                      name="contactEmail"
                      type="email"
                      className={inputClasses()}
                      value={profileDraft.contactEmail}
                      onChange={handleProfileChange}
                      placeholder="sustainability@college.edu"
                      autoComplete="email"
                    />
                  </Field>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-sand-50 px-5 py-3.5">
                  <p className="text-[12px] text-ink-400">{profileSummary || 'Add campus details for reporting.'}</p>
                  <div className="flex items-center gap-2">
                    {profileDirty ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setProfileDraft(toDraft(profile));
                          setProfileErrors({});
                        }}
                        disabled={savingProfile}
                      >
                        Discard changes
                      </Button>
                    ) : null}
                    <Button type="submit" size="sm" isLoading={savingProfile} disabled={!profileDirty}>
                      <Save className="h-3.5 w-3.5" aria-hidden="true" />
                      Save profile
                    </Button>
                  </div>
                </div>
              </form>
            </Card>
          </section>

          <section id="factors" className="scroll-mt-24">
            <Card>
              <div className="border-b border-line px-5 py-4">
                <CardHeader
                  title="Emission factors"
                  description="The multipliers used to convert activity data into estimated emissions."
                  action={
                    factorsDirty ? (
                      <Badge tone="amber" dot>
                        Unsaved changes
                      </Badge>
                    ) : usingDefaultFactors ? (
                      <Badge tone="neutral">Reference defaults</Badge>
                    ) : (
                      <Badge tone="green" dot>
                        Custom values active
                      </Badge>
                    )
                  }
                />
              </div>

              <div className="px-5 pt-5">
                <Callout tone="warning" title="Reference values, not verified local factors">
                  These defaults are indicative values assembled from published sources. Each row
                  shows the source version, applicable year, gas coverage and methodology. Purchased
                  electricity uses the Central Electricity Authority (CEA) grid-average factor for the
                  stated reporting year; the market-based Scope 2 view is a labelled proxy because no
                  contractual instruments are recorded. For formal reporting, replace defaults with
                  verified regional, utility or contractual factors and retain the source evidence
                  outside the app.
                </Callout>
              </div>

              <form onSubmit={handleFactorSubmit} noValidate>
                <div className="space-y-5 px-5 py-5">
                  {FACTOR_GROUPS.map((group) => {
                    const entries = Object.entries(DEFAULT_FACTORS).filter(
                      ([, definition]) => definition.group === group,
                    );
                    return (
                      <div key={group}>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">
                            {group}
                          </h3>
                          <span className="text-[11px] text-ink-400">
                            {entries.length} {entries.length === 1 ? 'factor' : 'factors'}
                          </span>
                        </div>
                        <div className="divide-y divide-line rounded-xl border border-line">
                          {entries.map(([key, definition]) => {
                            const status = factorStatus(definition);
                            return (
                            <div
                              key={key}
                              className="grid gap-3 px-4 py-3.5 sm:grid-cols-[minmax(0,1fr)_230px] sm:items-center"
                            >
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-[13px] font-medium text-ink-900">{definition.label}</p>
                                  <ScopeBadge scope={definition.scope} />
                                  <Badge tone={status.tone}>{status.shortLabel}</Badge>
                                </div>
                                <p className="mt-0.5 text-[12px] leading-relaxed text-ink-500">
                                  {definition.hint}
                                </p>
                                <p className="mt-0.5 text-[11px] leading-relaxed text-ink-400">
                                  Source: {definition.source}
                                  {definition.version ? ` · ${definition.version}` : ''}
                                </p>
                                <p className="mt-0.5 text-[11px] leading-relaxed text-ink-400">
                                  Applicable year {definition.year && definition.year !== 'Indicative' ? definition.year : '—'} · {definition.region || '—'}
                                </p>
                                {definition.gasCoverage || definition.methodology ? (
                                  <p className="mt-0.5 text-[10px] leading-relaxed text-ink-400">
                                    {definition.gasCoverage ? `Gas coverage: ${definition.gasCoverage}` : ''}
                                    {definition.gasCoverage && definition.methodology ? ' · ' : ''}
                                    {definition.methodology ? `Methodology: ${definition.methodology}` : ''}
                                  </p>
                                ) : null}
                                {definition.replacement ? (
                                  <p className="mt-0.5 text-[10px] leading-relaxed text-ink-400">
                                    Replacement: {definition.replacement}
                                  </p>
                                ) : null}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <input
                                    aria-label={`${definition.label} emission factor`}
                                    type="number"
                                    min="0"
                                    step="any"
                                    inputMode="decimal"
                                    className={inputClasses(
                                      Boolean(factorErrors[key]),
                                      'text-right tabular-nums',
                                    )}
                                    value={factorDraft[key] ?? ''}
                                    onChange={(event) => handleFactorChange(key, event.target.value)}
                                  />
                                  <span className="w-[124px] shrink-0 text-[11px] leading-tight text-ink-400">
                                    {definition.unit}
                                  </span>
                                </div>
                                {factorErrors[key] ? (
                                  <p className="mt-1 text-[11px] text-danger-700" role="alert">
                                    {factorErrors[key]}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-sand-50 px-5 py-3.5">
                  <p className="text-[12px] text-ink-400">
                    Values are stored with the workspace and applied to all calculations.
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDialog('factors')}
                      disabled={savingFactors || actionLoading}
                    >
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                      Restore defaults
                    </Button>
                    {factorsDirty ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFactorDraft(factorDraftFrom(factors))}
                        disabled={savingFactors}
                      >
                        Discard
                      </Button>
                    ) : null}
                    <Button type="submit" size="sm" isLoading={savingFactors} disabled={!factorsDirty}>
                      <Save className="h-3.5 w-3.5" aria-hidden="true" />
                      Save factors
                    </Button>
                  </div>
                </div>
              </form>
            </Card>
          </section>

          <section id="data" className="scroll-mt-24">
            <Card>
              <div className="border-b border-line px-5 py-4">
                <CardHeader
                  title="Data & workspace"
                  description="This prototype stores everything in your browser. These controls let you restore or clear the demo workspace."
                  action={
                    <div className="flex gap-1.5">
                      <Badge tone="neutral">{formatNumber(activities.length)} records</Badge>
                      <Badge tone="neutral">{buildings.length} buildings</Badge>
                    </div>
                  }
                />
              </div>

              <div className="divide-y divide-line">
                <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-forest-50 text-forest-600">
                      <Sparkles className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-[13px] font-medium text-ink-900">Restore the sample dataset</p>
                      <p className="mt-0.5 text-[12px] leading-relaxed text-ink-500">
                        Replace buildings, records, profile and factors with the original demo data.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="shrink-0"
                    onClick={() => setDialog('sample')}
                    disabled={actionLoading}
                  >
                    Restore sample
                  </Button>
                </div>

                <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-danger-50 text-danger-700">
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-[13px] font-medium text-ink-900">Delete all activity records</p>
                      <p className="mt-0.5 text-[12px] leading-relaxed text-ink-500">
                        Keep the building list, profile and factors, but remove every consumption
                        record. Use this to start a clean inventory.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="shrink-0"
                    onClick={() => setDialog('clear')}
                    disabled={actionLoading || activities.length === 0}
                  >
                    Delete records
                  </Button>
                </div>

                <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sand-100 text-ink-500">
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-[13px] font-medium text-ink-900">Reset the workspace</p>
                      <p className="mt-0.5 text-[12px] leading-relaxed text-ink-500">
                        Clear all locally stored data and reload the original demo workspace,
                        including profile and factors.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    className="shrink-0"
                    onClick={() => setDialog('reset')}
                    disabled={actionLoading}
                  >
                    Reset workspace
                  </Button>
                </div>
              </div>

              <div className="border-t border-line bg-sand-50 px-5 py-3">
                <p className="text-[11px] leading-relaxed text-ink-400">
                  Destructive actions only affect data in this browser. There is no server copy in
                  the prototype, and nothing is synced to other devices.
                </p>
              </div>
            </Card>
          </section>

          <section id="about" className="scroll-mt-24">
            <Card>
              <div className="border-b border-line px-5 py-4">
                <CardHeader
                  title="About this pilot"
                  description="What this build covers and what it deliberately leaves out."
                  action={
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest-50 text-forest-600">
                      <Leaf className="h-4 w-4" aria-hidden="true" />
                    </span>
                  }
                />
              </div>
              <div className="grid gap-x-8 gap-y-4 px-5 py-5 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                    Scope of this phase
                  </p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">
                    Frontend prototype for a single college, including administrator sign-in, college
                    setup, manual data entry, emission calculation, analytics, recommendations and
                    printable reports.
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                    Data storage
                  </p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">
                    Workspace data and the mock account/session live in this browser under the{' '}
                    <code className="text-[12px]">greencampus:v1:</code> prefix. All service calls go
                    through a replaceable service layer.
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                    GHG accounting
                  </p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">
                    Scope 1 covers owned fuel use, Scope 2 purchased electricity, Scope 3 commuting
                    and waste. Water is tracked as a resource metric and is not assigned a scope.
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                    Not included yet
                  </p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">
                    No backend, database, server-side sessions or external integrations. Sign-in is
                    mocked in the browser and must not be treated as production security. Reports
                    export as CSV or print to PDF using the browser.
                  </p>
                </div>
              </div>
              <div className="border-t border-line px-5 py-3">
                <p className="text-[11px] leading-relaxed text-ink-400">
                  GreenCampus · frontend prototype. Sample data is illustrative and must not be
                  presented as measured college performance.
                </p>
              </div>
            </Card>
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(dialog)}
        onClose={() => (actionLoading ? null : setDialog(null))}
        onConfirm={runDialogAction}
        title={dialogConfig?.title ?? ''}
        description={dialogConfig?.description}
        confirmLabel={dialogConfig?.confirmLabel}
        tone={dialogConfig?.tone}
        isLoading={actionLoading}
      />
    </div>
  );
}
