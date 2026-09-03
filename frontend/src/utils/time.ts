export function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const future = diffMs < 0;
  const absMs = Math.abs(diffMs);
  const mins = Math.floor(absMs / 60_000);
  const hours = Math.floor(absMs / 3_600_000);
  const days = Math.floor(absMs / 86_400_000);
  const suffix = future ? 'from now' : 'ago';

  if (mins < 1) return future ? 'in a moment' : 'just now';
  if (mins < 60) return `${mins}m ${suffix}`;
  if (hours < 24) return `${hours}h ${suffix}`;
  if (days < 30) return `${days}d ${suffix}`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  });
}
