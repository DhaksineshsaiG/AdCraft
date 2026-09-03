import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, CheckCircle2, Mail, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import BackendReadinessNotice from '@components/auth/BackendReadinessNotice';
import { useBackendReadiness } from '@hooks/useBackendReadiness';
import { extractApiError, forgotPassword } from '@services/auth.service';

const genericMessage =
  'If an eligible account exists, password reset instructions have been sent.';

export default function ForgotPasswordPage() {
  const backendReadiness = useBackendReadiness();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return setError('Email is required.');
    if (!/\S+@\S+\.\S+/.test(normalizedEmail)) return setError('Enter a valid email address.');
    if (!backendReadiness.isReady) return;

    setError('');
    setSubmitting(true);
    try {
      await forgotPassword({ email: normalizedEmail });
      setSubmitted(true);
      toast.success('Reset instructions requested.');
    } catch (requestError) {
      const apiError = extractApiError(requestError);
      setError(apiError.message);
      toast.error(apiError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden bg-gradient-to-br from-violet-600 via-brand-500 to-cyan-500">
        <div className="relative flex flex-col items-center justify-center w-full p-16 text-center">
          <Sparkles className="h-14 w-14 text-white mb-5" />
          <h2 className="text-2xl font-bold text-white">Back to creating, securely</h2>
          <p className="mt-3 max-w-sm text-sm text-white/75">
            We protect account privacy by returning the same result for every email address.
          </p>
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-10 xl:px-16">
        <motion.main
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto w-full max-w-[400px]"
        >
          <Link to="/" className="mb-8 inline-flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500">
              <Sparkles className="h-4.5 w-4.5 text-white" />
            </span>
            <span className="text-lg font-bold">PosterAI</span>
          </Link>

          {submitted ? (
            <div className="text-center">
              <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
              <h1 className="mt-5 text-2xl font-bold">Check your email</h1>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{genericMessage}</p>
              <Link to="/login" className="btn btn-primary btn-lg mt-7 w-full">
                Back to login
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold tracking-tight">Forgot your password?</h1>
              <p className="mt-1.5 mb-7 text-sm text-slate-500 dark:text-slate-400">
                Enter your email and we’ll send reset instructions if the account is eligible.
              </p>
              <BackendReadinessNotice status={backendReadiness.status} onRetry={backendReadiness.retry} />
              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                <div>
                  <label htmlFor="reset-email" className="label">Email address</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="reset-email"
                      type="email"
                      autoComplete="email"
                      autoFocus
                      value={email}
                      onChange={(event) => { setEmail(event.target.value); setError(''); }}
                      className={`input pl-10 ${error ? 'input-error' : ''}`}
                      placeholder="you@example.com"
                      aria-invalid={Boolean(error)}
                    />
                  </div>
                  {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
                </div>
                <button
                  type="submit"
                  disabled={submitting || !backendReadiness.isReady}
                  className={`btn btn-primary btn-lg w-full ${submitting ? 'btn-loading' : ''}`}
                >
                  {!submitting && <>Send reset instructions <ArrowRight className="h-4 w-4" /></>}
                </button>
              </form>
              <Link to="/login" className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-brand-600">
                <ArrowLeft className="h-4 w-4" /> Back to login
              </Link>
            </>
          )}
        </motion.main>
      </div>
    </div>
  );
}
