import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * `cn` — Class Name utility.
 *
 * Combines `clsx` (conditional class joining) with `tailwind-merge`
 * (conflict resolution for Tailwind utilities) so callers never need to
 * worry about duplicate or conflicting classes.
 *
 * @example
 * // Conditional classes
 * cn('px-4 py-2', isActive && 'bg-brand-500', !isActive && 'bg-slate-100')
 *
 * // Merge overrides — tailwind-merge picks the winner
 * cn('px-4', 'px-6')           // → 'px-6'
 * cn('text-red-500', props.className)  // props.className wins if it sets text-*
 *
 * // Variants
 * cn(baseStyles, variantStyles[variant], sizeStyles[size], className)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export default cn;
