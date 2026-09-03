import { useEffect, useMemo, useState } from 'react';
import { useExportHistory } from './useExports';
import { usePosters } from './usePosters';
import { useStores } from './useStores';
import {
  clearNotifications,
  deleteNotification,
  getCustomNotifications,
  getDeletedNotificationIds,
  getReadNotificationIds,
  markNotificationRead,
  markNotificationsRead,
  NOTIFICATIONS_CHANGED_EVENT,
  type NotificationIcon,
  type NotificationTone,
} from '@services/notifications.service';

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  timestamp: Date;
  icon: NotificationIcon;
  tone: NotificationTone;
  isRead: boolean;
}

interface NotificationDraft {
  id: string;
  title: string;
  description: string;
  timestamp: Date;
  icon: NotificationIcon;
  tone: NotificationTone;
}

export function useNotifications() {
  const [version, setVersion] = useState(0);
  const storesQuery = useStores();
  const postersQuery = usePosters({ limit: 100 });
  const exportsQuery = useExportHistory({ limit: 100 });

  useEffect(() => {
    function handleChange() {
      setVersion((value) => value + 1);
    }

    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, handleChange);
    window.addEventListener('storage', handleChange);
    return () => {
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, handleChange);
      window.removeEventListener('storage', handleChange);
    };
  }, []);

  const notifications = useMemo<AppNotification[]>(() => {
    void version;
    const readIds = getReadNotificationIds();
    const deletedIds = getDeletedNotificationIds();
    const drafts = [
      ...buildStoreNotifications(storesQuery.data ?? []),
      ...buildPosterNotifications(postersQuery.data?.posters ?? []),
      ...buildExportNotifications(exportsQuery.data?.records ?? []),
      ...getCustomNotifications().map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        timestamp: new Date(item.createdAt),
        icon: item.icon,
        tone: item.tone,
      })),
    ];

    const unique = new Map<string, NotificationDraft>();
    drafts.forEach((draft) => {
      if (deletedIds.has(draft.id)) return;
      const existing = unique.get(draft.id);
      if (!existing || draft.timestamp.getTime() > existing.timestamp.getTime()) {
        unique.set(draft.id, draft);
      }
    });

    return Array.from(unique.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .map((notification) => ({
        ...notification,
        isRead: readIds.has(notification.id),
      }));
  }, [exportsQuery.data?.records, postersQuery.data?.posters, storesQuery.data, version]);

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  return {
    notifications,
    unreadCount,
    markRead: markNotificationRead,
    markAllRead: () => markNotificationsRead(notifications.map((notification) => notification.id)),
    deleteNotification,
    clearAll: () => clearNotifications(notifications.map((notification) => notification.id)),
  };
}

function buildStoreNotifications(stores: NonNullable<ReturnType<typeof useStores>['data']>): NotificationDraft[] {
  return stores.flatMap((store) => {
    const notifications: NotificationDraft[] = [];

    if (store.status !== 'disconnected') {
      notifications.push({
        id: `store-connected-${store.id}`,
        title: 'Store connected',
        description: `${store.name} is connected and ready to sync products.`,
        timestamp: store.createdAt,
        icon: 'store',
        tone: 'success',
      });
    }

    if (store.lastSyncAt) {
      notifications.push({
        id: `store-sync-${store.id}-${store.lastSyncAt.toISOString()}`,
        title: store.status === 'error' ? 'Product sync failed' : 'Product synchronization completed',
        description: store.status === 'error'
          ? `Product synchronization failed for ${store.name}.`
          : `${store.totalProducts.toLocaleString()} products synced from ${store.name}.`,
        timestamp: store.lastSyncAt,
        icon: 'sync',
        tone: store.status === 'error' ? 'error' : 'success',
      });
    }

    return notifications;
  });
}

function buildPosterNotifications(posters: NonNullable<ReturnType<typeof usePosters>['data']>['posters']): NotificationDraft[] {
  const now = Date.now();

  return posters.flatMap((poster) => {
    const notifications: NotificationDraft[] = [];

    if (poster.generationStatus === 'completed') {
      notifications.push({
        id: `poster-generated-${poster.id}`,
        title: 'Poster generation completed',
        description: `${poster.productName} is ready in ${poster.size.replace('_', ' ')} format.`,
        timestamp: poster.createdAt,
        icon: 'poster',
        tone: 'success',
      });
    }

    if (poster.generationStatus === 'failed') {
      notifications.push({
        id: `poster-failed-${poster.id}`,
        title: 'Poster generation failed',
        description: `${poster.productName} could not be generated.`,
        timestamp: poster.createdAt,
        icon: 'warning',
        tone: 'error',
      });
    }

    (poster.editHistory ?? []).forEach((entry, index) => {
      const editedAt = getEditedAt(entry);
      if (!editedAt) return;
      notifications.push({
        id: `poster-edited-${poster.id}-${editedAt.toISOString()}-${index}`,
        title: 'Poster saved',
        description: `${poster.productName} was updated in the visual editor.`,
        timestamp: editedAt,
        icon: 'edit',
        tone: 'info',
      });
    });

    if (!poster.isEditable && poster.editableUntil.getTime() <= now) {
      notifications.push({
        id: `poster-edit-expired-${poster.id}`,
        title: 'Editable period expired',
        description: `${poster.productName} can no longer be edited.`,
        timestamp: poster.editableUntil,
        icon: 'warning',
        tone: 'warning',
      });
    }

    return notifications;
  });
}

function buildExportNotifications(exports: NonNullable<ReturnType<typeof useExportHistory>['data']>['records']): NotificationDraft[] {
  return exports.map((record) => ({
    id: `poster-exported-${record.id}`,
    title: 'Poster exported',
    description: `${record.posterName} was exported as ${record.format.toUpperCase()}.`,
    timestamp: record.exportedAt,
    icon: 'export',
    tone: 'success',
  }));
}

function getEditedAt(entry: unknown): Date | undefined {
  if (!entry || typeof entry !== 'object') return undefined;
  const editedAt = (entry as { editedAt?: unknown }).editedAt;
  if (typeof editedAt !== 'string') return undefined;
  const date = new Date(editedAt);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
