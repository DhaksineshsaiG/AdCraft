import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface DashboardStat {
  label:      string;
  value:      string | number;
  delta?:     number;        // Positive = up, negative = down, 0 = flat
  deltaLabel?: string;       // e.g. "vs last month"
  icon:       React.ElementType;
  iconBg:     string;        // Tailwind bg class
  iconColor:  string;        // Tailwind text class
  href:       string;
}


// â”€â”€â”€ Container / item animation variants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 },
  },
};

const MotionLink = motion.create(Link);

const cardVariant = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  show:   {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
  },
};

// â”€â”€â”€ Delta indicator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function DeltaBadge({ delta, label }: { delta: number; label?: string }) {
  const up   = delta > 0;
  const down = delta < 0;

  return (
    <div className={[
      'flex items-center gap-1 text-xs font-medium',
      up   ? 'text-emerald-600 dark:text-emerald-400' : '',
      down ? 'text-red-500 dark:text-red-400'         : '',
      !up && !down ? 'text-slate-400'                 : '',
    ].join(' ')}>
      {up   && <TrendingUp   className="h-3 w-3" />}
      {down && <TrendingDown className="h-3 w-3" />}
      {!up && !down && <Minus className="h-3 w-3" />}
      <span>
        {up ? '+' : ''}{delta} {label}
      </span>
    </div>
  );
}

// â”€â”€â”€ Stat card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function StatCard({ stat }: { stat: DashboardStat }) {
  const Icon = stat.icon;

  return (
    <MotionLink
      to={stat.href}
      variants={cardVariant}
      whileHover={{ y: -3, transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] } }}
      className="card block p-5 cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
    >
      <div className="flex items-start justify-between gap-3">
        {/* Icon */}
        <div className={[
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
          'transition-transform duration-200 group-hover:scale-110',
          stat.iconBg,
        ].join(' ')}>
          <Icon className={`h-5 w-5 ${stat.iconColor}`} strokeWidth={1.8} />
        </div>

        {/* Value */}
        <div className="flex-1 text-right">
          <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {stat.value}
          </p>
        </div>
      </div>

      <div className="mt-3">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
          {stat.label}
        </p>
        {stat.delta !== undefined && (
          <div className="mt-1">
            <DeltaBadge delta={stat.delta} label={stat.deltaLabel} />
          </div>
        )}
      </div>

      {/* Hover accent line */}
      <div className={[
        'mt-3 h-0.5 w-0 rounded-full transition-all duration-300 group-hover:w-full',
        stat.iconBg.replace('bg-', 'bg-').replace('-100', '-400').replace('/30', ''),
      ].join(' ')} />
    </MotionLink>
  );
}

// â”€â”€â”€ Skeleton loader â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function StatSkeleton() {
  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-start gap-3">
        <div className="skeleton h-10 w-10 rounded-xl" />
        <div className="flex-1 flex justify-end">
          <div className="skeleton h-8 w-20 rounded-lg" />
        </div>
      </div>
      <div className="skeleton h-4 w-28 rounded" />
      <div className="skeleton h-3 w-20 rounded" />
    </div>
  );
}

// â”€â”€â”€ DashboardStats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface DashboardStatsProps {
  isLoading?: boolean;
  stats: DashboardStat[];
}

export default function DashboardStats({ isLoading = false, stats }: DashboardStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
    >
      {stats.map((stat) => (
        <StatCard key={stat.label} stat={stat} />
      ))}
    </motion.div>
  );
}

