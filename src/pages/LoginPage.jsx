import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { AuthLayout } from '../components/auth/AuthLayout.jsx';
import { FormError } from '../components/auth/FormError.jsx';
import { PasswordField } from '../components/auth/PasswordField.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Field } from '../components/ui/Field.jsx';
import { inputClasses } from '../components/ui/styles.js';
import { useAuth } from '../context/AuthContext.jsx';
import { DEMO_CREDENTIALS } from '../services/authService.js';
import { hasErrors, validateLoginInput } from '../utils/validation.js';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from && location.state.from !== '/login' ? location.state.from : '/';

  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(null);

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

  const finishLogin = (user) => {
    navigate(user.collegeSetupComplete ? redirectTo : '/setup', { replace: true });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validateLoginInput(values);
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) return;

    setSubmitting('form');
    setFormError('');
    try {
      const user = await login(values);
      finishLogin(user);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Sign-in failed. Try again.');
    } finally {
      setSubmitting(null);
    }
  };

  const handleDemoLogin = async () => {
    setSubmitting('demo');
    setFormError('');
    setValues({ email: DEMO_CREDENTIALS.email, password: DEMO_CREDENTIALS.password });
    try {
      const user = await login(DEMO_CREDENTIALS);
      finishLogin(user);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Demo sign-in failed. Try again.');
    } finally {
      setSubmitting(null);
    }
  };

  const busy = Boolean(submitting);

  return (
    <AuthLayout>
      <div className="animate-fade-in">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-forest-600">
          Sustainability office access
        </p>
        <h1 className="mt-2 font-display text-[28px] font-[650] tracking-[-0.025em] text-ink-900 sm:text-[32px]">
          Sign in to GreenCampus
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-500">
          Use the account for your college sustainability office to manage consumption records,
          emissions and reports.
        </p>

        <div className="mt-7 space-y-4">
          <FormError>{formError}</FormError>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <Field label="Work email" htmlFor="login-email" error={errors.email}>
              <input
                id="login-email"
                name="email"
                type="email"
                value={values.email}
                onChange={handleChange}
                placeholder="you@college.edu"
                autoComplete="username"
                autoFocus
                disabled={busy}
                className={inputClasses(Boolean(errors.email))}
                aria-invalid={Boolean(errors.email)}
              />
            </Field>

            <PasswordField
              id="login-password"
              name="password"
              label="Password"
              value={values.password}
              onChange={handleChange}
              error={errors.password}
              autoComplete="current-password"
              placeholder="At least 8 characters"
              disabled={busy}
              required={false}
            />

            <Button
              type="submit"
              size="lg"
              className="w-full"
              isLoading={submitting === 'form'}
              disabled={busy}
            >
              Sign in
              {submitting !== 'form' ? (
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              ) : null}
            </Button>
          </form>

          <div className="flex items-center gap-3 py-1" aria-hidden="true">
            <span className="h-px flex-1 bg-line" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
              or
            </span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <div className="rounded-2xl border border-forest-100 bg-forest-50/70 p-4">
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-forest-600 shadow-sm">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-[13px] font-medium text-ink-900">Explore the demo workspace</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-ink-500">
                  Sign in as the sample Northfield administrator with twelve months of illustrative
                  records already loaded.
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="md"
              className="mt-3 w-full bg-white"
              onClick={handleDemoLogin}
              isLoading={submitting === 'demo'}
              disabled={busy}
            >
              Continue with demo account
            </Button>
            <p className="mt-2 text-[11px] leading-relaxed text-ink-400">
              Demo login: <code className="text-ink-500">demo@greencampus.app</code> ·{' '}
              <code className="text-ink-500">demo1234</code>
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-[13px] text-ink-500">
          New to GreenCampus?{' '}
          <Link
            to="/register"
            className="font-medium text-forest-700 underline decoration-forest-200 underline-offset-2 transition hover:text-forest-800"
          >
            Create an administrator account
          </Link>
        </p>

        <p className="mt-5 border-t border-line pt-4 text-[11px] leading-relaxed text-ink-400">
          Prototype sign-in: the mock account and session are stored only in this browser.
          Production authentication is not implemented.
        </p>
      </div>
    </AuthLayout>
  );
}
