import { useLayoutEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Eye, EyeOff, Lock, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import BackendReadinessNotice from '@components/auth/BackendReadinessNotice';
import { useBackendReadiness } from '@hooks/useBackendReadiness';
import { extractApiError, resetPassword } from '@services/auth.service';

const passwordChecks = (password: string) => [
  ['8–128 characters', password.length >= 8 && password.length <= 128],
  ['Uppercase letter', /[A-Z]/.test(password)],
  ['Lowercase letter', /[a-z]/.test(password)],
  ['Number', /\d/.test(password)],
  ['Special character', /[^A-Za-z0-9]/.test(password)],
] as const;

export default function ResetPasswordPage() {
  const [token] = useState(() => new URLSearchParams(window.location.search).get('token') ?? '');
  const backendReadiness = useBackendReadiness();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  useLayoutEffect(() => {
    if (window.location.search) {
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.hash}`);
    }
  }, []);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!token) next.token = 'This password reset link is invalid or incomplete.';
    if (!passwordChecks(password).every(([, passed]) => passed)) {
      next.password = 'Password must meet every strength requirement.';
    }
    if (!confirmPassword) next.confirmPassword = 'Please confirm your password.';
    else if (password !== confirmPassword) next.confirmPassword = 'Passwords do not match.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!validate() || !backendReadiness.isReady) return;
    setSubmitting(true);
    try {
      await resetPassword({ token, password, confirmPassword });
      setSucceeded(true);
      setPassword('');
      setConfirmPassword('');
      toast.success('Password reset successfully.');
    } catch (requestError) {
      const apiError = extractApiError(requestError);
      setErrors({ form: apiError.message });
      toast.error(apiError.message);
    } finally {
      setSubmitting(false);
    }
  }

  const checks = passwordChecks(password);
  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:flex-1 items-center justify-center bg-gradient-to-br from-violet-600 via-brand-500 to-cyan-500 p-16 text-center">
        <div>
          <Sparkles className="mx-auto h-14 w-14 text-white" />
          <h2 className="mt-5 text-2xl font-bold text-white">Choose a strong new password</h2>
          <p className="mt-3 max-w-sm text-sm text-white/75">Your reset link is single-use and expires automatically.</p>
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-center overflow-y-auto px-6 py-12 lg:px-10 xl:px-16">
        <motion.main initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto w-full max-w-[400px]">
          <Link to="/" className="mb-8 inline-flex items-center gap-3 group">
            <div className="brand-logo-wrapper brand-logo-glow-subtle shrink-0">
              <img
                src="/brand/adcraft-icon.png"
                alt="AdCraft"
                className="brand-logo h-9 w-9 object-contain group-hover:scale-105 transition-transform"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                AdCraft
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500 leading-tight">
                Ideas Into Impact
              </span>
            </div>
          </Link>
          {succeeded ? (
            <div className="text-center">
              <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
              <h1 className="mt-5 text-2xl font-bold">Password reset</h1>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Your password has been updated. Sign in with your new password.</p>
              <Link to="/login" className="btn btn-primary btn-lg mt-7 w-full">Go to login</Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold">Reset your password</h1>
              <p className="mb-7 mt-1.5 text-sm text-slate-500 dark:text-slate-400">Enter and confirm your new password.</p>
              <BackendReadinessNotice status={backendReadiness.status} onRetry={backendReadiness.retry} />
              {errors.token && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30">{errors.token}</p>}
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {[
                  { id: 'new-password', label: 'New password', value: password, setter: setPassword, shown: showPassword, toggle: setShowPassword, field: 'password' },
                  { id: 'confirm-new-password', label: 'Confirm password', value: confirmPassword, setter: setConfirmPassword, shown: showConfirm, toggle: setShowConfirm, field: 'confirmPassword' },
                ].map((input) => (
                  <div key={input.id}>
                    <label htmlFor={input.id} className="label">{input.label}</label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        id={input.id}
                        type={input.shown ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={input.value}
                        onChange={(event) => { input.setter(event.target.value); setErrors((current) => ({ ...current, [input.field]: '', form: '' })); }}
                        className={`input pl-10 pr-11 ${errors[input.field] ? 'input-error' : ''}`}
                        aria-invalid={Boolean(errors[input.field])}
                      />
                      <button type="button" onClick={() => input.toggle((shown) => !shown)} aria-label={input.shown ? `Hide ${input.label}` : `Show ${input.label}`} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400">
                        {input.shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors[input.field] && <p className="mt-1.5 text-xs text-red-500">{errors[input.field]}</p>}
                  </div>
                ))}
                {password && (
                  <div className="grid grid-cols-2 gap-1">
                    {checks.map(([label, passed]) => <span key={label} className={`text-xs ${passed ? 'text-emerald-600' : 'text-slate-400'}`}>{passed ? '✓' : '○'} {label}</span>)}
                  </div>
                )}
                {errors.form && <p className="text-sm text-red-500">{errors.form}</p>}
                <button type="submit" disabled={submitting || !backendReadiness.isReady || !token} className={`btn btn-primary btn-lg w-full ${submitting ? 'btn-loading' : ''}`}>
                  {!submitting && 'Reset password'}
                </button>
              </form>
              <Link to="/login" className="mt-6 block text-center text-sm font-medium text-brand-600">Back to login</Link>
            </>
          )}
        </motion.main>
      </div>
    </div>
  );
}
