import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Sparkles, CheckCircle2, XCircle } from 'lucide-react';
import BackendReadinessNotice from '@components/auth/BackendReadinessNotice';
import GoogleAuthButton from '@components/auth/GoogleAuthButton';
import { useAuth, useRedirectIfAuthenticated, usePostLoginRedirect } from '@hooks/useAuth';
import { useBackendReadiness } from '@hooks/useBackendReadiness';
import { extractApiError } from '@services/auth.service';
import axios from 'axios';

// ─── Animation variants ───────────────────────────────────────────────────────

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.4, 0, 0.2, 1] } },
};

// ─── Password strength logic ──────────────────────────────────────────────────

interface StrengthResult {
  score:  0 | 1 | 2 | 3 | 4;
  label:  string;
  color:  string;
  checks: Array<{ label: string; passed: boolean }>;
}

function evaluatePasswordStrength(password: string): StrengthResult {
  const checks = [
    { label: 'At least 8 characters',         passed: password.length >= 8 },
    { label: 'One uppercase letter (A–Z)',     passed: /[A-Z]/.test(password) },
    { label: 'One lowercase letter (a–z)',     passed: /[a-z]/.test(password) },
    { label: 'One number (0–9)',               passed: /[0-9]/.test(password) },
    { label: 'One special character (!@#…)',   passed: /[^A-Za-z0-9]/.test(password) },
  ];

  const passed = checks.filter((c) => c.passed).length as 0 | 1 | 2 | 3 | 4;

  const scoreMap: Array<{ label: string; color: string }> = [
    { label: '',         color: 'bg-slate-200 dark:bg-slate-700' },
    { label: 'Weak',     color: 'bg-red-500' },
    { label: 'Fair',     color: 'bg-orange-500' },
    { label: 'Good',     color: 'bg-yellow-500' },
    { label: 'Strong',   color: 'bg-emerald-500' },
  ];

  const capped = Math.min(passed, 4) as 0 | 1 | 2 | 3 | 4;
  const { label, color } = scoreMap[capped] ?? scoreMap[0]!;

  return { score: capped, label, color, checks };
}

// ─── Field error component ────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <motion.p
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="field-error"
    >
      <svg className="h-3 w-3 shrink-0" viewBox="0 0 12 12" fill="currentColor">
        <path d="M6 1a5 5 0 110 10A5 5 0 016 1zm0 3a.75.75 0 00-.75.75v2.5a.75.75 0 001.5 0v-2.5A.75.75 0 006 4zm0 5.5a.75.75 0 100-1.5.75.75 0 000 1.5z" />
      </svg>
      {message}
    </motion.p>
  );
}

// ─── Password strength indicator ─────────────────────────────────────────────

function PasswordStrength({ password }: { password: string }) {
  const { score, label, color, checks } = useMemo(
    () => evaluatePasswordStrength(password),
    [password]
  );

  if (!password) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="mt-2.5 space-y-2"
    >
      {/* Bar */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                i <= score ? color : 'bg-slate-200 dark:bg-slate-700'
              }`}
            />
          ))}
        </div>
        {label && (
          <span className={`text-xs font-medium ${
            score === 4 ? 'text-emerald-600 dark:text-emerald-400' :
            score === 3 ? 'text-yellow-600 dark:text-yellow-400'  :
            score === 2 ? 'text-orange-600 dark:text-orange-400'  :
                          'text-red-600 dark:text-red-400'
          }`}>
            {label}
          </span>
        )}
      </div>

      {/* Check list */}
      <div className="grid grid-cols-1 gap-1">
        {checks.map(({ label: checkLabel, passed }) => (
          <div key={checkLabel} className="flex items-center gap-1.5">
            {passed
              ? <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
              : <XCircle       className="h-3 w-3 text-slate-300 dark:text-slate-600 shrink-0" />
            }
            <span className={`text-xs transition-colors ${
              passed ? 'text-slate-600 dark:text-slate-400' : 'text-slate-400 dark:text-slate-600'
            }`}>
              {checkLabel}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── RegisterPage ─────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const { register, googleAuth, isLoading, error: authError } = useAuth();
  const redirectAfterLogin = usePostLoginRedirect();
  const backendReadiness = useBackendReadiness();

  useRedirectIfAuthenticated('/dashboard');

  const [name,        setName]        = useState('');
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [confirmPw,   setConfirmPw]   = useState('');
  const [showPw,      setShowPw]      = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors,      setErrors]      = useState<Record<string, string>>({});
  const [submitting,  setSubmitting]  = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [googleError, setGoogleError] = useState('');

  // ── Validation ─────────────────────────────────────────────────────────────
  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!name.trim())
      e['name'] = 'Name is required.';
    else if (name.trim().length < 2)
      e['name'] = 'Name must be at least 2 characters.';

    if (!email.trim())
      e['email'] = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(email))
      e['email'] = 'Enter a valid email address.';

    const { score } = evaluatePasswordStrength(password);
    if (!password)
      e['password'] = 'Password is required.';
    else if (score < 3)
      e['password'] = 'Password is too weak — please use at least a "Good" strength password.';

    if (!confirmPw)
      e['confirmPassword'] = 'Please confirm your password.';
    else if (password !== confirmPw)
      e['confirmPassword'] = 'Passwords do not match.';

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!backendReadiness.isReady) return;
    if (!validate()) return;

    setSubmitting(true);
    setErrors({});

    try {
      const ok = await register({
        name:            name.trim(),
        email:           email.trim().toLowerCase(),
        password,
        confirmPassword: confirmPw,
      });
      if (ok) redirectAfterLogin();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const { details } = extractApiError(error);
        if (details?.length) {
          const fieldErrors: Record<string, string> = {};
          details.forEach(({ field, message }) => {
            fieldErrors[field] = message;
          });
          setErrors(fieldErrors);
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSuccess(credential?: string) {
    if (!backendReadiness.isReady) return;
    if (!credential) {
      setGoogleError('Google did not return a valid credential. Please try again.');
      return;
    }

    setGoogleSubmitting(true);
    setGoogleError('');
    try {
      const ok = await googleAuth({ credential });
      if (ok) redirectAfterLogin();
    } finally {
      setGoogleSubmitting(false);
    }
  }

  const busy =
    isLoading ||
    submitting ||
    googleSubmitting ||
    !backendReadiness.isReady;

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel — decorative ───────────────────────────────────────── */}
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden bg-gradient-to-br from-violet-600 via-brand-500 to-cyan-500">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative flex flex-col items-center justify-center w-full p-16 text-center gap-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 mx-auto mb-4">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Start creating today</h2>
            <p className="text-white/70 text-sm max-w-xs mx-auto">
              Connect your store, sync products, and generate professional marketing posters with AI in minutes.
            </p>
          </motion.div>

          {/* Feature bullets */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="space-y-2.5 text-left"
          >
            {[
              'Connect Shopify or WooCommerce stores',
              'AI-generated marketing copy & headlines',
              'One-click poster generation with templates',
              'Export as PNG, JPEG, WEBP or PDF',
            ].map((feat) => (
              <div key={feat} className="flex items-center gap-2.5">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20">
                  <CheckCircle2 className="h-3 w-3 text-white" />
                </div>
                <span className="text-sm text-white/80">{feat}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ── Right panel — form ─────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-10 xl:px-16 overflow-y-auto">
        <motion.div
          className="mx-auto w-full max-w-[400px]"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {/* Logo */}
          <motion.div variants={item} className="mb-8">
            <Link to="/" className="inline-flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 shadow-md group-hover:bg-brand-600 transition-colors">
                <Sparkles className="h-4.5 w-4.5 text-white" strokeWidth={1.8} />
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                PosterAI
              </span>
            </Link>
          </motion.div>

          {/* Heading */}
          <motion.div variants={item} className="mb-7">
            <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              Free forever on the Starter plan. No card required.
            </p>
          </motion.div>

          <motion.div variants={item}>
            <BackendReadinessNotice
              status={backendReadiness.status}
              onRetry={backendReadiness.retry}
            />
          </motion.div>

          {/* Form */}
          <motion.form
            variants={item}
            onSubmit={handleSubmit}
            noValidate
            className="space-y-4"
          >
            {/* Name */}
            <div>
              <label htmlFor="name" className="label">Full name</label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  autoFocus
                  value={name}
                  onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: '' })); }}
                  placeholder="Jane Smith"
                  className={`input pl-10 ${errors['name'] ? 'input-error' : ''}`}
                  aria-invalid={!!errors['name']}
                />
              </div>
              <FieldError message={errors['name']} />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="reg-email" className="label">Email address</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: '' })); }}
                  placeholder="you@example.com"
                  className={`input pl-10 ${errors['email'] ? 'input-error' : ''}`}
                  aria-invalid={!!errors['email']}
                />
              </div>
              <FieldError message={errors['email']} />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="reg-password" className="label">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="reg-password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: '' })); }}
                  placeholder="Create a strong password"
                  className={`input pl-10 pr-11 ${errors['password'] ? 'input-error' : ''}`}
                  aria-invalid={!!errors['password']}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <FieldError message={errors['password']} />
              <AnimatePresence>
                {password && <PasswordStrength password={password} />}
              </AnimatePresence>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirm-password" className="label">Confirm password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPw}
                  onChange={(e) => { setConfirmPw(e.target.value); setErrors((p) => ({ ...p, confirmPassword: '' })); }}
                  placeholder="Re-enter your password"
                  className={`input pl-10 pr-11 ${errors['confirmPassword'] ? 'input-error' : ''}`}
                  aria-invalid={!!errors['confirmPassword']}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {/* Inline match indicator */}
              {confirmPw && password && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-1.5 flex items-center gap-1 text-xs ${
                    password === confirmPw
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-500'
                  }`}
                >
                  {password === confirmPw
                    ? <><CheckCircle2 className="h-3 w-3" /> Passwords match</>
                    : <><XCircle className="h-3 w-3" /> Passwords do not match</>
                  }
                </motion.p>
              )}
              <FieldError message={errors['confirmPassword']} />
            </div>

            {/* Terms note */}
            <p className="text-xs text-slate-400 dark:text-slate-500">
              By creating an account you agree to our{' '}
              <span className="text-brand-500 cursor-pointer hover:underline">Terms of Service</span>{' '}
              and{' '}
              <span className="text-brand-500 cursor-pointer hover:underline">Privacy Policy</span>.
            </p>

            {/* Submit */}
            <button
              type="submit"
              disabled={busy}
              className={`btn btn-primary btn-lg w-full ${busy ? 'btn-loading' : ''}`}
            >
              {!busy && (
                <>
                  Create account
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </motion.form>

          <motion.div variants={item} className="divider-text text-xs my-6">
            OR
          </motion.div>

          <motion.div
            variants={item}
            className="w-full"
          >
            <GoogleAuthButton
              onCredential={(credential) => void handleGoogleSuccess(credential)}
              onError={() => setGoogleError('Google Sign-In could not be completed. Please try again.')}
              disabled={busy}
              loading={googleSubmitting}
              error={googleError || authError || undefined}
            />
          </motion.div>

          {/* Login link */}
          <motion.div variants={item} className="mt-6 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 transition-colors"
              >
                Sign in
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
