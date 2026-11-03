import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, LogOut } from 'lucide-react';
import { AuthLayout } from '../components/auth/AuthLayout.jsx';
import { FormError } from '../components/auth/FormError.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Callout } from '../components/ui/Callout.jsx';
import { Field } from '../components/ui/Field.jsx';
import { inputClasses } from '../components/ui/styles.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCampus } from '../context/CampusContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { COLLEGE_TYPES } from '../data/options.js';
import { hasErrors, validateCollegeSetupInput } from '../utils/validation.js';

function deriveShortName(name) {
  const cleaned = String(name ?? '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  const first = cleaned.split(' ')[0];
  return first.length <= 24 ? first : `${first.slice(0, 23)}…`;
}

function currentAcademicYear() {
  const now = new Date();
  const startYear = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
  return `${startYear}–${String(startYear + 1).slice(-2)}`;
}

export function CollegeSetupPage() {
  const { user, completeCollegeSetup, logout } = useAuth();
  const { profile, activities, saveProfile } = useCampus();
  const { push } = useToast();
  const navigate = useNavigate();

  const [values, setValues] = useState({
    name: '',
    city: '',
    type: '',
    students: '',
    staff: '',
    campusBuildings: '',
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user?.collegeSetupComplete) {
    return <Navigate to="/" replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((previous) => ({ ...previous, [name]: value }));
    setFormError('');
    setErrors((previous) => {
      if (!previous[name]) return previous;
      const next = { ...previous };
      delete next[name];
      return next;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validateCollegeSetupInput(values);
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) return;

    setSubmitting(true);
    setFormError('');
    try {
      await saveProfile({
        name: values.name,
        shortName: deriveShortName(values.name),
        city: values.city,
        type: values.type,
        students: values.students,
        staff: values.staff,
        campusBuildings: values.campusBuildings,
        campusAreaAcres: '',
        academicYear: profile?.academicYear && profile.academicYear !== '2025–26'
          ? profile.academicYear
          : currentAcademicYear(),
        sustainabilityLead: user?.name ?? '',
        contactEmail: user?.email ?? '',
      });
      await completeCollegeSetup();
      push({
        tone: 'success',
        title: 'College profile saved',
        description: 'Your workspace is ready. You can adjust these details later in Settings.',
      });
      navigate('/', { replace: true });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not save the college profile.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <AuthLayout maxWidth="max-w-[560px]" panelLabel="Step 2 of 2 · College setup">
      <div className="animate-fade-in">
        <ol className="flex items-center gap-2 text-[11px] font-medium text-ink-400">
          <li className="flex items-center gap-1.5 text-forest-700">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-forest-700 text-white">
              <Check className="h-3 w-3" aria-hidden="true" />
            </span>
            Account
          </li>
          <span className="h-px w-5 bg-line" aria-hidden="true" />
          <li className="flex items-center gap-1.5 text-ink-900">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-forest-100 text-[10px] font-semibold text-forest-700">
              2
            </span>
            College profile
          </li>
          <span className="h-px w-5 bg-line" aria-hidden="true" />
          <li className="flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-line text-[10px]">
              3
            </span>
            Start tracking
          </li>
        </ol>

        <div className="mt-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-[28px] font-[650] tracking-[-0.025em] text-ink-900 sm:text-[32px]">
              Tell us about your college
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-500">
              These details populate the sidebar, dashboard and every exported report. You can change
              them later in Settings.
            </p>
          </div>
        </div>

        <p className="mt-3 text-[11px] text-ink-400">
          Signed in as <span className="font-medium text-ink-500">{user?.email}</span>
        </p>

        <div className="mt-6 space-y-4">
          <FormError>{formError}</FormError>

          {activities.length > 0 ? (
            <Callout tone="info" title="Sample records are still in this browser">
              Finishing setup updates the college profile only. The illustrative activity records
              remain until you clear or replace them in Settings → Data &amp; workspace.
            </Callout>
          ) : null}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <Field label="College name" htmlFor="setup-name" error={errors.name}>
              <input
                id="setup-name"
                name="name"
                type="text"
                value={values.name}
                onChange={handleChange}
                placeholder="e.g. St. Xavier's College of Engineering"
                autoComplete="organization"
                autoFocus
                disabled={submitting}
                className={inputClasses(Boolean(errors.name))}
                aria-invalid={Boolean(errors.name)}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="College location"
                htmlFor="setup-city"
                error={errors.city}
                hint="City and state or region."
              >
                <input
                  id="setup-city"
                  name="city"
                  type="text"
                  value={values.city}
                  onChange={handleChange}
                  placeholder="e.g. Pune, Maharashtra"
                  autoComplete="address-level2"
                  disabled={submitting}
                  className={inputClasses(Boolean(errors.city))}
                  aria-invalid={Boolean(errors.city)}
                />
              </Field>

              <Field label="College type" htmlFor="setup-type" error={errors.type}>
                <select
                  id="setup-type"
                  name="type"
                  value={values.type}
                  onChange={handleChange}
                  disabled={submitting}
                  className={inputClasses(Boolean(errors.type))}
                  aria-invalid={Boolean(errors.type)}
                >
                  <option value="">Select a type</option>
                  {COLLEGE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Students" htmlFor="setup-students" error={errors.students}>
                <input
                  id="setup-students"
                  name="students"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={values.students}
                  onChange={handleChange}
                  placeholder="e.g. 3200"
                  disabled={submitting}
                  className={inputClasses(Boolean(errors.students))}
                  aria-invalid={Boolean(errors.students)}
                />
              </Field>

              <Field label="Staff" htmlFor="setup-staff" error={errors.staff}>
                <input
                  id="setup-staff"
                  name="staff"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={values.staff}
                  onChange={handleChange}
                  placeholder="e.g. 410"
                  disabled={submitting}
                  className={inputClasses(Boolean(errors.staff))}
                  aria-invalid={Boolean(errors.staff)}
                />
              </Field>

              <Field
                label="Campus buildings"
                htmlFor="setup-buildings"
                error={errors.campusBuildings}
                hint="Count of blocks you meter."
              >
                <input
                  id="setup-buildings"
                  name="campusBuildings"
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={values.campusBuildings}
                  onChange={handleChange}
                  placeholder="e.g. 6"
                  disabled={submitting}
                  className={inputClasses(Boolean(errors.campusBuildings))}
                  aria-invalid={Boolean(errors.campusBuildings)}
                />
              </Field>
            </div>

            <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
              <Button type="submit" size="lg" className="sm:flex-1" isLoading={submitting}>
                Finish setup
                {!submitting ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={handleSignOut}
                disabled={submitting}
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out
              </Button>
            </div>
          </form>

          <p className="border-t border-line pt-4 text-[11px] leading-relaxed text-ink-400">
            Prototype setup: the college profile is saved to this browser only. Building-level meter
            details can be added after setup under Buildings.
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
