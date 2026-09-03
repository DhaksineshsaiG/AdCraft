export type NotificationIcon =
  | 'store'
  | 'sync'
  | 'poster'
  | 'edit'
  | 'export'
  | 'trash'
  | 'warning';

export type NotificationTone = 'success' | 'info' | 'warning' | 'error' | 'neutral';

export interface StoredNotification {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  icon: NotificationIcon;
  tone: NotificationTone;
}

export interface NotificationInput {
  id?: string;
  title: string;
  description: string;
  icon: NotificationIcon;
  tone: NotificationTone;
  createdAt?: Date;
}

const CUSTOM_KEY = 'posterai.notifications.custom';
const READ_KEY = 'posterai.notifications.read';
const DELETED_KEY = 'posterai.notifications.deleted';
export const NOTIFICATIONS_CHANGED_EVENT = 'posterai:notifications-changed';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function notifyChanged(): void {
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
}

export function getCustomNotifications(): StoredNotification[] {
  return readJson<StoredNotification[]>(CUSTOM_KEY, []);
}

export function getReadNotificationIds(): Set<string> {
  return new Set(readJson<string[]>(READ_KEY, []));
}

export function getDeletedNotificationIds(): Set<string> {
  return new Set(readJson<string[]>(DELETED_KEY, []));
}

export function publishNotification(input: NotificationInput): void {
  const id = input.id ?? `${input.icon}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const notifications = getCustomNotifications().filter((item) => item.id !== id);
  notifications.unshift({
    id,
    title: input.title,
    description: input.description,
    icon: input.icon,
    tone: input.tone,
    createdAt: (input.createdAt ?? new Date()).toISOString(),
  });
  writeJson(CUSTOM_KEY, notifications.slice(0, 100));
  notifyChanged();
}

export function markNotificationRead(id: string): void {
  const ids = getReadNotificationIds();
  ids.add(id);
  writeJson(READ_KEY, Array.from(ids));
  notifyChanged();
}

export function markNotificationsRead(ids: string[]): void {
  const readIds = getReadNotificationIds();
  ids.forEach((id) => readIds.add(id));
  writeJson(READ_KEY, Array.from(readIds));
  notifyChanged();
}

export function deleteNotification(id: string): void {
  const deletedIds = getDeletedNotificationIds();
  deletedIds.add(id);
  writeJson(DELETED_KEY, Array.from(deletedIds));
  writeJson(CUSTOM_KEY, getCustomNotifications().filter((item) => item.id !== id));
  notifyChanged();
}

export function clearNotifications(ids: string[]): void {
  const deletedIds = getDeletedNotificationIds();
  ids.forEach((id) => deletedIds.add(id));
  writeJson(DELETED_KEY, Array.from(deletedIds));
  writeJson(CUSTOM_KEY, getCustomNotifications().filter((item) => !deletedIds.has(item.id)));
  notifyChanged();
}
