import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, Check, AlertCircle, Zap } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { StorePlatform } from './StoreCard';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ConnectStoreDialogProps {
  open:     boolean;
  onClose:  () => void;
  onSubmit: (data: ConnectStoreFormData) => void | Promise<void>;
}

export interface ConnectStoreFormData {
  platform:       StorePlatform;
  storeName:      string;
  // Shopify
  shopDomain?:    string;
  accessToken?:   string;
  // WooCommerce
  storeUrl?:      string;
  consumerKey?:   string;
  consumerSecret?:string;
}

type Step = 'platform' | 'credentials';

// ─── Platform option card ─────────────────────────────────────────────────────

function PlatformOption({
  value,
  selected,
  onSelect,
  title,
  description,
  accent,
}: {
  value:       StorePlatform;
  selected:    boolean;
  onSelect:    (v: StorePlatform) => void;
  title:       string;
  description: string;
  accent:      string;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={cn(
        'relative flex items-start gap-3 w-full rounded-xl border-2 p-4 text-left',
        'transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        selected
          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/15'
          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
      )}
    >
      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold', accent)}>
        {title[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
      </div>
      {selected && (
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500">
          <Check className="h-3 w-3 text-white" />
        </div>
      )}
    </button>
  );
}

// ─── Field ─────────────────────────────────────────────────────────────────────

function Field({
  label,
  id,
  type = 'text',
  placeholder,
  value,
  onChange,
  hint,
  error,
  required,
}: {
  label:       string;
  id:          string;
  type?:       string;
  placeholder: string;
  value:       string;
  onChange:    (v: string) => void;
  hint?:       string;
  error?:      string;
  required?:   boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn('input', error && 'input-error')}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
      />
      {error && (
        <p id={`${id}-error`} className="field-error">
          <AlertCircle className="h-3 w-3" aria-hidden="true" />
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${id}-hint`} className="field-hint">{hint}</p>
      )}
    </div>
  );
}

// ─── ConnectStoreDialog ───────────────────────────────────────────────────────

export default function ConnectStoreDialog({
  open,
  onClose,
  onSubmit,
}: ConnectStoreDialogProps) {
  const [step,      setStep]      = useState<Step>('platform');
  const [platform,  setPlatform]  = useState<StorePlatform>('shopify');
  const [form,      setForm]      = useState({
    storeName:      '',
    shopDomain:     '',
    accessToken:    '',
    storeUrl:       '',
    consumerKey:    '',
    consumerSecret: '',
  });
  const [errors,    setErrors]    = useState<Record<string, string>>({});
  const [loading,   setLoading]   = useState(false);

  function updateField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  }

  function validateCredentials(): boolean {
    const e: Record<string, string> = {};
    if (!form.storeName.trim()) e['storeName'] = 'Store name is required.';

    if (platform === 'shopify') {
      if (!form.shopDomain.trim()) e['shopDomain'] = 'Shop domain is required.';
      else if (!/^[a-z0-9-]+\.myshopify\.com$/.test(form.shopDomain.trim()))
        e['shopDomain'] = 'Must be in format: your-store.myshopify.com';
      if (!form.accessToken.trim()) e['accessToken'] = 'Access token is required.';
    } else {
      if (!form.storeUrl.trim()) e['storeUrl'] = 'Store URL is required.';
      else if (!/^https?:\/\/.+/.test(form.storeUrl.trim()))
        e['storeUrl'] = 'Must be a valid URL including https://';
      if (!form.consumerKey.trim())    e['consumerKey']    = 'Consumer key is required.';
      if (!form.consumerSecret.trim()) e['consumerSecret'] = 'Consumer secret is required.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validateCredentials()) return;
    setLoading(true);
    try {
      await onSubmit({ platform, ...form });
      handleClose();
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setStep('platform');
    setPlatform('shopify');
    setForm({ storeName: '', shopDomain: '', accessToken: '', storeUrl: '', consumerKey: '', consumerSecret: '' });
    setErrors({});
    setLoading(false);
    onClose();
  }

  const dialog = (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={handleClose}
            aria-hidden="true"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="connect-store-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              key="panel"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1,    y: 0 }}
              exit={{ opacity: 0,   scale: 0.95, y: 4 }}
              transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
              className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl"
            >
              {/* Close */}
              <button
                onClick={handleClose}
                className="absolute right-4 top-4 btn btn-ghost btn-icon-sm text-slate-400"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Header */}
              <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5 mb-1">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500">
                    <Zap className="h-3.5 w-3.5 text-white" />
                  </div>
                  <h2 id="connect-store-title" className="text-base font-semibold text-slate-900 dark:text-white">
                    Connect a store
                  </h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {step === 'platform' ? 'Choose your e-commerce platform' : 'Enter your store credentials'}
                </p>

                {/* Progress dots */}
                <div className="flex items-center gap-1.5 mt-3">
                  {(['platform', 'credentials'] as Step[]).map((s) => (
                    <div
                      key={s}
                      className={cn(
                        'h-1.5 rounded-full transition-all duration-300',
                        s === step
                          ? 'w-5 bg-brand-500'
                          : step === 'credentials' && s === 'platform'
                          ? 'w-2 bg-brand-300'
                          : 'w-2 bg-slate-200 dark:bg-slate-700'
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* Body */}
              <div className="px-6 py-5">
                <AnimatePresence mode="wait">
                  {step === 'platform' ? (
                    <motion.div
                      key="platform"
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 12 }}
                      transition={{ duration: 0.18 }}
                      className="space-y-3"
                    >
                      <PlatformOption
                        value="shopify"
                        selected={platform === 'shopify'}
                        onSelect={setPlatform}
                        title="Shopify"
                        description="Connect your Shopify store with an access token"
                        accent="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      />
                      <PlatformOption
                        value="woocommerce"
                        selected={platform === 'woocommerce'}
                        onSelect={setPlatform}
                        title="WooCommerce"
                        description="Connect your WordPress / WooCommerce store"
                        accent="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="credentials"
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      transition={{ duration: 0.18 }}
                      className="space-y-4"
                    >
                      <Field
                        id="store-name" label="Store name" required
                        placeholder="My Awesome Store"
                        value={form.storeName}
                        onChange={(v) => updateField('storeName', v)}
                        error={errors['storeName']}
                      />

                      {platform === 'shopify' ? (
                        <>
                          <Field
                            id="shop-domain" label="Shop domain" required
                            placeholder="your-store.myshopify.com"
                            value={form.shopDomain}
                            onChange={(v) => updateField('shopDomain', v)}
                            error={errors['shopDomain']}
                            hint="Found in your Shopify admin URL"
                          />
                          <Field
                            id="access-token" label="Access token" required type="password"
                            placeholder="shpat_xxxxxxxxxxxxxxxxxxxx"
                            value={form.accessToken}
                            onChange={(v) => updateField('accessToken', v)}
                            error={errors['accessToken']}
                            hint="Create a private app in Shopify admin → Apps"
                          />
                        </>
                      ) : (
                        <>
                          <Field
                            id="store-url" label="Store URL" required
                            placeholder="https://my-store.com"
                            value={form.storeUrl}
                            onChange={(v) => updateField('storeUrl', v)}
                            error={errors['storeUrl']}
                          />
                          <Field
                            id="consumer-key" label="Consumer key" required
                            placeholder="ck_xxxxxxxxxxxxxxxxxxxx"
                            value={form.consumerKey}
                            onChange={(v) => updateField('consumerKey', v)}
                            error={errors['consumerKey']}
                            hint="WooCommerce → Settings → Advanced → REST API"
                          />
                          <Field
                            id="consumer-secret" label="Consumer secret" required type="password"
                            placeholder="cs_xxxxxxxxxxxxxxxxxxxx"
                            value={form.consumerSecret}
                            onChange={(v) => updateField('consumerSecret', v)}
                            error={errors['consumerSecret']}
                          />
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 px-6 py-4">
                {step === 'credentials' ? (
                  <button
                    type="button"
                    onClick={() => setStep('platform')}
                    className="btn btn-ghost btn-md"
                  >
                    Back
                  </button>
                ) : (
                  <button type="button" onClick={handleClose} className="btn btn-ghost btn-md">
                    Cancel
                  </button>
                )}

                {step === 'platform' ? (
                  <button
                    type="button"
                    onClick={() => setStep('credentials')}
                    className="btn btn-primary btn-md gap-1.5"
                  >
                    Continue
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className={cn('btn btn-primary btn-md', loading && 'btn-loading')}
                  >
                    {!loading && 'Connect store'}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(dialog, document.body);
}
