import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Sparkles } from 'lucide-react';
import BackendReadinessNotice from '@components/auth/BackendReadinessNotice';
import GoogleAuthButton from '@components/auth/GoogleAuthButton';
import { useAuth, useRedirectIfAuthenticated, usePostLoginRedirect } from '@hooks/useAuth';
import { useBackendReadiness } from '@hooks/useBackendReadiness';
import { extractApiError } from '@services/auth.service';
import axios from 'axios';

// ─── Animation variants ───────────────────────────────────────────────────────

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } },
};

// ─── Field-level error display ────────────────────────────────────────────────

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

// ─── LoginPage ────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const { login, googleAuth, isLoading, error: authError } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const redirectAfterLogin = usePostLoginRedirect();
  const backendReadiness = useBackendReadiness();

  // Redirect if already authenticated
  useRedirectIfAuthenticated('/dashboard');

  // Form state
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [showPw,     setShowPw]     = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors,     setErrors]     = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [googleError, setGoogleError] = useState('');

  // ── Client-side validation ─────────────────────────────────────────────────
  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!email.trim())                  e['email']    = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(email)) e['email']  = 'Enter a valid email address.';
    if (!password)                      e['password'] = 'Password is required.';
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
      const ok = await login({ email: email.trim().toLowerCase(), password });
      if (ok) redirectAfterLogin(from);
    } catch (error) {
      // Map backend field-level validation errors into the form
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
      if (ok) redirectAfterLogin(from);
    } finally {
      setGoogleSubmitting(false);
    }
  }

  const busy =
    isLoading ||
    submitting ||
    googleSubmitting ||
    !backendReadiness.isReady;
  //const busy = false;

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel — form ─────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-10 xl:px-16">
        <motion.div
          className="mx-auto w-full max-w-[400px]"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {/* Logo */}
          <motion.div variants={item} className="mb-8">
            <Link to="/" className="inline-flex items-center gap-3 group">
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
          </motion.div>

          {/* Heading */}
          <motion.div variants={item} className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              Sign in to your account to continue
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
            {/* Email */}
            <div>
              <label htmlFor="email" className="label">Email address</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: '' })); }}
                  placeholder="you@example.com"
                  className={`input pl-10 ${errors['email'] ? 'input-error' : ''}`}
                  aria-invalid={!!errors['email']}
                  aria-describedby={errors['email'] ? 'email-error' : undefined}
                />
              </div>
              <FieldError message={errors['email']} />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="label mb-0">Password</label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: '' })); }}
                  placeholder="Enter your password"
                  className={`input pl-10 pr-11 ${errors['password'] ? 'input-error' : ''}`}
                  aria-invalid={!!errors['password']}
                  aria-describedby={errors['password'] ? 'password-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  {showPw
                    ? <EyeOff className="h-4 w-4" />
                    : <Eye    className="h-4 w-4" />
                  }
                </button>
              </div>
              <FieldError message={errors['password']} />
            </div>

            {/* Remember me */}
            <div className="flex items-center gap-2.5">
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500 cursor-pointer"
              />
              <label htmlFor="remember" className="text-sm text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                Keep me signed in
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={busy}
              className={`btn btn-primary btn-lg w-full mt-2 ${busy ? 'btn-loading' : ''}`}
            >
              {!busy && (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </motion.form>

          {/* Divider */}
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

          <motion.div variants={item} className="divider-text text-xs my-6">
            Don't have an account?
          </motion.div>

          {/* Register link */}
          <motion.div variants={item}>
            <Link
              to="/register"
              className="btn btn-secondary btn-lg w-full"
            >
              Create a free account
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {/* ── Right panel — decorative (hidden on mobile) ───────────────────── */}
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-500 to-violet-600">
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        {/* Floating cards */}
        <div className="relative flex flex-col items-center justify-center w-full p-16 gap-5">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            className="card-glass w-full max-w-xs p-5"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">AI Content Generated</p>
                <p className="text-xs text-white/60">Marketing copy ready</p>
              </div>
            </div>
            <div className="space-y-1.5">
              {['Headline', 'Tagline', 'CTA', 'Description'].map((t, i) => (
                <div key={t} className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <div
                    className="h-2 rounded bg-white/20"
                    style={{ width: `${65 + i * 7}%` }}
                  />
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            className="w-full max-w-xs p-5 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.18)' }}
          >
            <p className="text-xs font-semibold text-white mb-2">Poster Ready</p>
            <div
              className="w-full h-32 rounded-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="h-8 w-24 bg-white/20 rounded-lg mx-auto mb-2" />
                  <div className="h-2 w-16 bg-white/15 rounded mx-auto" />
                </div>
              </div>
            </div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-center text-sm text-white/60 max-w-xs"
          >
            Generate stunning AI-powered product posters from your Shopify or WooCommerce store in seconds.
          </motion.p>
        </div>
      </div>
    </div>
  );
}
