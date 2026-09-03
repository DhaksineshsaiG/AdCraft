import { useCallback, useEffect, useState } from 'react';
import { checkBackendHealth } from '@services/auth.service';

export type BackendReadinessStatus = 'checking' | 'ready' | 'timed-out';

const MAX_WAIT_MS = 90_000;
const RETRY_DELAY_MS = 4_000;
const HEALTH_REQUEST_TIMEOUT_MS = 12_000;

export function useBackendReadiness() {
  const [status, setStatus] = useState<BackendReadinessStatus>('checking');
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setStatus('checking');
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    const startedAt = Date.now();
    const controller = new AbortController();
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    async function check(): Promise<void> {
      const remaining = MAX_WAIT_MS - (Date.now() - startedAt);
      if (remaining <= 0) {
        if (!cancelled) setStatus('timed-out');
        return;
      }

      try {
        const healthy = await checkBackendHealth(
          Math.min(HEALTH_REQUEST_TIMEOUT_MS, remaining),
          controller.signal
        );
        if (healthy) {
          if (!cancelled) setStatus('ready');
          return;
        }
      } catch {
        // A sleeping or starting Render service commonly rejects or times out.
      }

      if (cancelled) return;

      const elapsed = Date.now() - startedAt;
      if (elapsed >= MAX_WAIT_MS) {
        setStatus('timed-out');
        return;
      }

      retryTimer = setTimeout(
        () => void check(),
        Math.min(RETRY_DELAY_MS, MAX_WAIT_MS - elapsed)
      );
    }

    void check();

    return () => {
      cancelled = true;
      controller.abort();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [attempt]);

  return {
    status,
    isReady: status === 'ready',
    isChecking: status === 'checking',
    retry,
  };
}
