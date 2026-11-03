import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { AuthLayout } from '../components/auth/AuthLayout.jsx';
import { FormError } from '../components/auth/FormError.jsx';
import { PasswordField } from '../components/auth/PasswordField.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Field } from '../components/ui/Field.jsx';
import { inputClasses } from '../components/ui/styles.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { hasErrors, validateRegistrationInput } from '../utils/validation.js';

export function RegisterPage() {
  const { register } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();

  const [values, setValues] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
    const nextErrors = validateRegistrationInput(values);
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) return;

    setSubmitting(true);
    setFormError('');
    try {
      await register(values);
      push({
        tone: 'success',
        title: 'Account created',
        description: 'Add your college details to finish setting up the workspace.',
      });
      navigate('/setup', { replace: true });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not create the account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="animate-fade-in">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-forest-600">
          Administrator account
        </p>
        <h1 className="mt-2 font-display text-[28px] font-[650] tracking-[-0.025em] text-ink-900 sm:text-[32px]">
          Create your account
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-500">
          Start a local administrator account for your college. College profile details come next.
        </p>

        <div className="mt-7 space-y-4">
          <FormError>{formError}</FormError>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <Field label="Full name" htmlFor="register-name" error={errors.name}>
              <input
                id="register-name"
                name="name"
                type="text"
                value={values.name}
                onChange={handleChange}
                placeholder="e.g. Ananya Rao"
                autoComplete="name"
                autoFocus
                disabled={submitting}
                className={inputClasses(Boolean(errors.name))}
                aria-invalid={Boolean(errors.name)}
              />
            </Field>

            <Field
              label="Work email"
              htmlFor="register-email"
              error={errors.email}
              hint="Use the address your college will recognise."
            >
              <input
                id="register-email"
                name="email"
                type="email"
                value={values.email}
                onChange={handleChange}
                placeholder="you@college.edu"
                autoComplete="username"
                disabled={submitting}
                className={inputClasses(Boolean(errors.email))}
                aria-invalid={Boolean(errors.email)}
              />
            </Field>

            <PasswordField
              id="register-password"
              name="password"
              label="Password"
              value={values.password}
              onChange={handleChange}
              error={errors.password}
              hint="At least 8 characters."
              autoComplete="new-password"
              placeholder="Create a password"
              disabled={submitting}
              required={false}
            />

            <PasswordField
              id="register-confirm-password"
              name="confirmPassword"
              label="Confirm password"
              value={values.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              autoComplete="new-password"
              placeholder="Repeat the password"
              disabled={submitting}
              required={false}
            />

            <Button type="submit" size="lg" className="w-full" isLoading={submitting}>
              Create account
              {!submitting ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-[13px] text-ink-500">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium text-forest-700 underline decoration-forest-200 underline-offset-2 transition hover:text-forest-800"
          >
            Sign in
          </Link>
        </p>

        <p className="mt-5 border-t border-line pt-4 text-[11px] leading-relaxed text-ink-400">
          Prototype registration: the account is stored only in this browser and is not production
          authentication.
        </p>
      </div>
    </AuthLayout>
  );
}
