//import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Store,
  Package,
  Image,
  Download,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
  Zap,
} from 'lucide-react';
import { useAuth } from '@hooks/useAuth';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SidebarProps {
  collapsed:      boolean;
  onCollapse:     (v: boolean) => void;
  mobileOpen:     boolean;
  onMobileClose:  () => void;
}

interface NavItem {
  label: string;
  path:  string;
  icon:  React.ElementType;
  badge?: string;
}

// ─── Nav items ─────────────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',          path: '/dashboard', icon: LayoutDashboard },
  { label: 'AI Growth',          path: '/growth',    icon: Zap, badge: 'Agent' },
  { label: 'Stores',             path: '/stores',    icon: Store            },
  { label: 'Products',           path: '/products',  icon: Package          },
  { label: 'Posters',            path: '/posters',   icon: Image            },
  { label: 'Exports',            path: '/exports',   icon: Download         },
];

const BOTTOM_ITEMS: NavItem[] = [
  { label: 'Settings', path: '/settings', icon: Settings },
];

// ─── Nav link item ─────────────────────────────────────────────────────────────

function NavItem({
  item,
  collapsed,
  onClick,
}: {
  item: NavItem;
  collapsed: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      onClick={onClick}
      className={({ isActive }) =>
        [
          'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium',
          'transition-all duration-150 outline-none',
          isActive
            ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white',
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          {/* Active glow */}
          {isActive && (
            <motion.div
              layoutId="active-pill"
              className="absolute inset-0 rounded-xl bg-brand-500"
              style={{ zIndex: -1 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            />
          )}

          <Icon
            className={[
              'h-4.5 w-4.5 shrink-0 transition-transform duration-150',
              'group-hover:scale-110',
              isActive ? 'text-white' : '',
            ].join(' ')}
            strokeWidth={isActive ? 2.2 : 1.8}
          />

          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                className="overflow-hidden whitespace-nowrap"
              >
                {item.label}
              </motion.span>
            )}
          </AnimatePresence>

          {/* Tooltip on collapsed */}
          {collapsed && (
            <div className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-lg bg-slate-900 dark:bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-white dark:text-slate-900 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-lg">
              {item.label}
            </div>
          )}
        </>
      )}
    </NavLink>
  );
}

// ─── Sidebar inner content ────────────────────────────────────────────────────

function SidebarContent({
  collapsed,
  onCollapse,
  onClose,
  isMobile = false,
}: {
  collapsed: boolean;
  onCollapse: (v: boolean) => void;
  onClose?: () => void;
  isMobile?: boolean;
}) {
  const { logout, user } = useAuth();

  async function handleLogout() {
    onClose?.();
    await logout();
  }

  return (
    <div className="flex h-full flex-col">
      {/* ── Logo + collapse ──────────────────────────────────────────────── */}
      <div className={[
        'flex items-center border-b border-slate-200 dark:border-slate-800',
        collapsed ? 'justify-center px-3 py-4' : 'justify-between px-4 py-4',
      ].join(' ')}>
        <AnimatePresence initial={false} mode="wait">
          {!collapsed ? (
            <motion.div
              key="logo-full"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
              className="flex items-center gap-2.5"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500">
                <Zap className="h-4 w-4 text-white" strokeWidth={2.2} />
              </div>
              <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                PosterAI
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="logo-icon"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.18 }}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500"
            >
              <Zap className="h-4 w-4 text-white" strokeWidth={2.2} />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-1">
          {isMobile ? (
            <button
              onClick={onClose}
              className="btn btn-ghost btn-icon-sm"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => onCollapse(!collapsed)}
              className="btn btn-ghost btn-icon-sm"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed
                ? <ChevronRight className="h-4 w-4" />
                : <ChevronLeft  className="h-4 w-4" />
              }
            </button>
          )}
        </div>
      </div>

      {/* ── Main nav ─────────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 scrollbar-none">
        <div className="space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <NavItem
              key={item.path}
              item={item}
              collapsed={collapsed}
              onClick={isMobile ? onClose : undefined}
            />
          ))}
        </div>

        {/* Divider */}
        <div className="my-3 border-t border-slate-200 dark:border-slate-800" />

        <div className="space-y-0.5">
          {BOTTOM_ITEMS.map((item) => (
            <NavItem
              key={item.path}
              item={item}
              collapsed={collapsed}
              onClick={isMobile ? onClose : undefined}
            />
          ))}
        </div>
      </nav>

      {/* ── User + logout ─────────────────────────────────────────────────── */}
      <div className="border-t border-slate-200 dark:border-slate-800 px-3 py-3">
        <div className={[
          'flex items-center rounded-xl p-2',
          collapsed ? 'justify-center' : 'gap-2.5',
        ].join(' ')}>
          {/* Avatar */}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-xs font-bold text-white shadow-sm">
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>

          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-1 items-center justify-between overflow-hidden"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {user?.name ?? 'User'}
                  </p>
                  <p className="truncate text-xs text-slate-400 dark:text-slate-500">
                    {user?.email ?? ''}
                  </p>
                </div>

                <button
                  onClick={handleLogout}
                  className="btn btn-ghost btn-icon-sm ml-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400"
                  aria-label="Sign out"
                  title="Sign out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Logout on collapsed */}
          {collapsed && (
            <button
              onClick={handleLogout}
              className="group relative btn btn-ghost btn-icon-sm mt-0.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400"
              aria-label="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <div className="pointer-events-none absolute left-full ml-3 z-50 rounded-lg bg-slate-900 dark:bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-white dark:text-slate-900 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg whitespace-nowrap">
                Sign out
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export default function Sidebar({
  collapsed,
  onCollapse,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  // Sidebar width tokens
  //const sidebarW    = collapsed ? 'w-[68px]' : 'w-[228px]';
  const sidebarWNum = collapsed ? 68 : 228;

  return (
    <>
      {/* ── Desktop sidebar ────────────────────────────────────────────────── */}
      <motion.aside
        animate={{ width: sidebarWNum }}
        transition={{ type: 'spring', stiffness: 280, damping: 30 }}
        className={[
          'hidden lg:flex flex-col shrink-0 h-screen sticky top-0',
          'bg-white dark:bg-slate-900',
          'border-r border-slate-200 dark:border-slate-800',
          'overflow-hidden z-20',
        ].join(' ')}
      >
        <SidebarContent
          collapsed={collapsed}
          onCollapse={onCollapse}
        />
      </motion.aside>

      {/* ── Mobile overlay backdrop ─────────────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={onMobileClose}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* ── Mobile drawer ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            key="drawer"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            className={[
              'fixed top-0 left-0 z-40 h-screen w-[260px] flex flex-col lg:hidden',
              'bg-white dark:bg-slate-900',
              'border-r border-slate-200 dark:border-slate-800 shadow-2xl',
            ].join(' ')}
          >
            <SidebarContent
              collapsed={false}
              onCollapse={() => {}}
              onClose={onMobileClose}
              isMobile
            />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
