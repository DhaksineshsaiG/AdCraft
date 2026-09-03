import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  Sun,
  Moon,
  Bell,
  ChevronDown,
  User,
  Settings,
  LogOut,
  Sparkles,
  Store,
  RefreshCw,
  Image as ImageIcon,
  Edit3,
  Download,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@hooks/useAuth';
import { useNotifications, type AppNotification } from '@hooks/useNotifications';
import { relativeTime } from '../../utils/time';

// ─── Route title map ──────────────────────────────────────────────────────────

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/stores':    'Connected Stores',
  '/products':  'Products',
  '/posters':   'Posters',
  '/exports':   'Exports',
  '/notifications': 'Notifications',
  '/settings':  'Settings',
};

function usePageTitle(): string {
  const { pathname } = useLocation();
  // Exact match first, then prefix match
  return (
    ROUTE_TITLES[pathname] ??
    Object.entries(ROUTE_TITLES).find(([path]) => pathname.startsWith(path))?.[1] ??
    'PosterAI'
  );
}

// ─── Theme toggle ─────────────────────────────────────────────────────────────

function useTheme() {
  const [dark, setDark] = useState(
    () => document.documentElement.classList.contains('dark')
  );

  function toggle() {
    const next = !dark;
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    setDark(next);
  }

  return { dark, toggle };
}

// ─── User dropdown ────────────────────────────────────────────────────────────

function UserDropdown({ onClose }: { onClose: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: -6 }}
      animate={{ opacity: 1, scale: 1,    y: 0  }}
      exit={{ opacity: 0,   scale: 0.94, y: -6  }}
      transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
      className="dropdown-menu right-0 top-full mt-2 min-w-[220px]"
    >
      {/* User info */}
      <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 mb-1">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
          {user?.name ?? 'User'}
        </p>
        <p className="text-xs text-slate-400 truncate mt-0.5">{user?.email ?? ''}</p>
        <div className="mt-1.5 inline-flex">
          <span className="badge badge-brand text-xs">
            <Sparkles className="h-2.5 w-2.5" />
            {user?.role ?? 'owner'}
          </span>
        </div>
      </div>

      <button
        className="dropdown-item w-full text-left"
        onClick={() => { onClose(); navigate('/settings'); }}
      >
        <User className="h-4 w-4 text-slate-400" />
        Your profile
      </button>

      <button
        className="dropdown-item w-full text-left"
        onClick={() => { onClose(); navigate('/settings'); }}
      >
        <Settings className="h-4 w-4 text-slate-400" />
        Settings
      </button>

      <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

      <button
        className="dropdown-item dropdown-item-danger w-full text-left"
        onClick={async () => { onClose(); await logout(); }}
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </motion.div>
  );
}

// ─── Notification panel ───────────────────────────────────────────────────────

const NOTIFICATION_ICON_CONFIG: Record<AppNotification['icon'], {
  icon: React.ElementType;
  color: string;
}> = {
  store: {
    icon: Store,
    color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  sync: {
    icon: RefreshCw,
    color: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
  },
  poster: {
    icon: ImageIcon,
    color: 'bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400',
  },
  edit: {
    icon: Edit3,
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  },
  export: {
    icon: Download,
    color: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
  },
  trash: {
    icon: Trash2,
    color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  },
  warning: {
    icon: AlertCircle,
    color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  },
};

function NotificationPanel({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { notifications, unreadCount, markRead } = useNotifications();
  const latestNotifications = notifications.slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: -6 }}
      animate={{ opacity: 1, scale: 1,    y: 0  }}
      exit={{ opacity: 0,   scale: 0.94, y: -6  }}
      transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
      className="dropdown-menu right-0 top-full mt-2 w-[320px]"
    >
      <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 mb-1 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Notifications</p>
        {unreadCount > 0 && (
          <span className="badge badge-brand text-xs">{unreadCount} new</span>
        )}
      </div>

      {latestNotifications.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No notifications yet</p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Activity from your stores, posters, and exports will appear here.</p>
        </div>
      ) : (
        latestNotifications.map((notification) => {
          const config = NOTIFICATION_ICON_CONFIG[notification.icon];
          const Icon = config.icon;
          return (
            <button
              key={notification.id}
              className="dropdown-item w-full text-left gap-3 items-start py-2.5"
              onClick={() => markRead(notification.id)}
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${config.color}`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {!notification.isRead && (
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-label="Unread" />
                  )}
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{notification.title}</p>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{notification.description}</p>
              </div>
              <span className="text-xs text-slate-400 shrink-0">{relativeTime(notification.timestamp)}</span>
            </button>
          );
        })
      )}

      <div className="mt-1 border-t border-slate-100 dark:border-slate-800 pt-1">
        <button
          className="dropdown-item w-full text-center justify-center text-brand-600 dark:text-brand-400 text-xs font-medium"
          onClick={() => { onClose(); navigate('/notifications'); }}
        >
          View all notifications
        </button>
      </div>
    </motion.div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

interface NavbarProps {
  onMobileMenuClick: () => void;
}

export default function Navbar({ onMobileMenuClick }: NavbarProps) {
  const title = usePageTitle();
  const { dark, toggle: toggleTheme } = useTheme();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();

  const [userOpen, setUserOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const userRef  = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (userRef.current  && !userRef.current.contains(e.target as Node))  setUserOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 sm:px-6">

      {/* Mobile menu button */}
      <button
        className="btn btn-ghost btn-icon-sm lg:hidden shrink-0"
        onClick={onMobileMenuClick}
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Page title */}
      <h1 className="flex-1 text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
        {title}
      </h1>

      {/* Right actions */}
      <div className="flex items-center gap-1 sm:gap-1.5">

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="btn btn-ghost btn-icon-sm"
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <motion.div
            key={dark ? 'moon' : 'sun'}
            initial={{ rotate: -30, opacity: 0, scale: 0.7 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            {dark
              ? <Sun  className="h-4 w-4 text-amber-500" />
              : <Moon className="h-4 w-4 text-slate-500" />
            }
          </motion.div>
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            className="btn btn-ghost btn-icon-sm relative"
            onClick={() => { setNotifOpen((v) => !v); setUserOpen(false); }}
            aria-label="Notifications"
            aria-expanded={notifOpen}
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] rounded-full bg-brand-500 px-1 text-[10px] font-bold leading-4 text-white ring-1 ring-white dark:ring-slate-900">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <AnimatePresence>
            {notifOpen && <NotificationPanel key="notif" onClose={() => setNotifOpen(false)} />}
          </AnimatePresence>
        </div>

        {/* User avatar dropdown */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => { setUserOpen((v) => !v); setNotifOpen(false); }}
            aria-label="Account menu"
            aria-expanded={userOpen}
            className="flex items-center gap-2 rounded-xl pl-1 pr-2 py-1 text-sm font-medium transition-all duration-150 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {/* Avatar */}
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-xs font-bold text-white shadow-sm">
              {user?.name?.[0]?.toUpperCase() ?? 'U'}
            </div>

            <span className="hidden sm:block max-w-[100px] truncate text-slate-700 dark:text-slate-300 text-xs">
              {user?.name?.split(' ')[0] ?? 'User'}
            </span>

            <ChevronDown
              className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${userOpen ? 'rotate-180' : ''}`}
            />
          </button>

          <AnimatePresence>
            {userOpen && (
              <UserDropdown key="user-dd" onClose={() => setUserOpen(false)} />
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
