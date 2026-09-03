import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from './Sidebar';
import Navbar  from './Navbar';

// ─── Page transition config ───────────────────────────────────────────────────

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: [0.4, 0, 0.2, 1] },
  },
};

// ─── DashboardLayout ──────────────────────────────────────────────────────────

export default function DashboardLayout() {
  const location   = useLocation();
  const [collapsed,   setCollapsed]   = useState(() => {
    // Persist sidebar collapse preference
    try { return localStorage.getItem('sb-collapsed') === '1'; } catch { return false; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Persist collapse preference
  function handleCollapse(v: boolean) {
    setCollapsed(v);
    try { localStorage.setItem('sb-collapsed', v ? '1' : '0'); } catch { /* */ }
  }

  return (
    <div className="flex min-h-screen bg-page">

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <Sidebar
        collapsed={collapsed}
        onCollapse={handleCollapse}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* ── Main content area ────────────────────────────────────────────── */}
      <div className="flex flex-1 min-w-0 flex-col">

        {/* Navbar */}
        <Navbar onMobileMenuClick={() => setMobileOpen(true)} />

        {/* Page content with route transitions */}
        <main className="flex-1 overflow-auto">
          <motion.div
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
