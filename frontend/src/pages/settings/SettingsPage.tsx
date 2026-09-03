import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
  Settings,
  User,
  KeyRound,
  Sun,
  Moon,
  Monitor,
  Check,
  Save,
} from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import SettingsSection from '../../components/settings/SettingsSection';
import { useAuth } from '../../hooks/useAuth';
import { changePassword, extractApiError, type ChangePasswordPayload } from '../../services/auth.service';
import { cn } from '../../utils/cn';
import { motionStagger, motionFadeUp } from '../../styles/theme';

type Theme = 'light' | 'dark' | 'system';

function ThemeOption({
  value,
  current,
  onSelect,
  icon: Icon,
  label,
}: {
  value: Theme;
  current: Theme;
  onSelect: (v: Theme) => void;
  icon: React.ElementType;
  label: string;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={cn(
        'relative flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-3 text-xs font-medium',
        'transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-500 outline-none',
        active
          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400'
          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={1.8} />
      {label}
      {active && (
        <div className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-500">
          <Check className="h-2.5 w-2.5 text-white" />
        </div>
      )}
    </button>
  );
}

const emptyPasswords: ChangePasswordPayload = {
  currentPassword: '',
  newPassword: '',
  confirmNewPassword: '',
};

export default function SettingsPage() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [passwords, setPasswords] = useState<ChangePasswordPayload>(emptyPasswords);

  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme');
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
  });

  const changePasswordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: (message) => {
      setPasswords(emptyPasswords);
      toast.success(message || 'Password changed successfully.');
    },
    onError: (error) => {
      const { message, details } = extractApiError(error);
      const toastMessage = details?.[0]
        ? `${details[0].field}: ${details[0].message}`
        : message;
      toast.error(toastMessage);
    },
  });

  useEffect(() => {
    setName(user?.name ?? '');
    setEmail(user?.email ?? '');
  }, [user?.email, user?.name]);

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    changePasswordMutation.mutate(passwords);
  }

  function handleThemeChange(t: Theme) {
    setTheme(t);
    if (t === 'dark') document.documentElement.classList.add('dark');
    if (t === 'light') document.documentElement.classList.remove('dark');
    if (t === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', prefersDark);
    }
    localStorage.setItem('theme', t);
  }

  return (
    <div className="page-container py-7 space-y-6 max-w-2xl">
        <PageHeader
          title="Settings"
          subtitle="Manage your account, appearance, and preferences"
          icon={Settings}
        />

        <motion.div
          variants={motionStagger(0.07)}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          <motion.div variants={motionFadeUp}>
            <SettingsSection
              title="Account"
              description="Your signed-in account identity"
            >
              <div className="space-y-4">
                <div>
                  <label htmlFor="settings-name" className="label">
                    <User className="inline h-3.5 w-3.5 mr-1 mb-0.5 text-slate-400" aria-hidden="true" />
                    Full name
                  </label>
                  <input
                    id="settings-name"
                    type="text"
                    value={name}
                    className="input"
                    autoComplete="name"
                    readOnly
                  />
                </div>
                <div>
                  <label htmlFor="settings-email" className="label">
                    Email address
                  </label>
                  <input
                    id="settings-email"
                    type="email"
                    value={email}
                    className="input"
                    autoComplete="email"
                    readOnly
                  />
                </div>
              </div>
            </SettingsSection>
          </motion.div>

          <motion.div variants={motionFadeUp}>
            <SettingsSection
              title="Password"
              description="Change your account password"
            >
              <form onSubmit={handlePasswordSubmit} noValidate className="space-y-4">
                <div>
                  <label htmlFor="settings-current-password" className="label">
                    <KeyRound className="inline h-3.5 w-3.5 mr-1 mb-0.5 text-slate-400" aria-hidden="true" />
                    Current password
                  </label>
                  <input
                    id="settings-current-password"
                    type="password"
                    value={passwords.currentPassword}
                    onChange={(e) => setPasswords((prev) => ({ ...prev, currentPassword: e.target.value }))}
                    className="input"
                    autoComplete="current-password"
                  />
                </div>
                <div>
                  <label htmlFor="settings-new-password" className="label">
                    New password
                  </label>
                  <input
                    id="settings-new-password"
                    type="password"
                    value={passwords.newPassword}
                    onChange={(e) => setPasswords((prev) => ({ ...prev, newPassword: e.target.value }))}
                    className="input"
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label htmlFor="settings-confirm-password" className="label">
                    Confirm new password
                  </label>
                  <input
                    id="settings-confirm-password"
                    type="password"
                    value={passwords.confirmNewPassword}
                    onChange={(e) => setPasswords((prev) => ({ ...prev, confirmNewPassword: e.target.value }))}
                    className="input"
                    autoComplete="new-password"
                  />
                </div>
                <button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  className={cn('btn btn-primary btn-md gap-1.5', changePasswordMutation.isPending && 'btn-loading')}
                >
                  {!changePasswordMutation.isPending && <Save className="h-3.5 w-3.5" />}
                  {!changePasswordMutation.isPending && 'Change password'}
                </button>
              </form>
            </SettingsSection>
          </motion.div>

          <motion.div variants={motionFadeUp}>
            <SettingsSection
              title="Appearance"
              description="Choose how PosterAI looks on your device"
            >
              <div
                role="radiogroup"
                aria-label="Theme"
                className="flex items-center gap-3"
              >
                <ThemeOption value="light" current={theme} onSelect={handleThemeChange} icon={Sun} label="Light" />
                <ThemeOption value="dark" current={theme} onSelect={handleThemeChange} icon={Moon} label="Dark" />
                <ThemeOption value="system" current={theme} onSelect={handleThemeChange} icon={Monitor} label="System" />
              </div>
            </SettingsSection>
          </motion.div>
        </motion.div>
      </div>
  );
}
