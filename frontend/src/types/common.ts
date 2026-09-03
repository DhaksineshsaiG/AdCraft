import type { ReactNode, ElementType } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// PRIMITIVE UTILITY TYPES
// ═══════════════════════════════════════════════════════════════════════════

/** Make specific keys of T optional */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/** Make specific keys of T required */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/** Deeply readonly */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/** Extract the resolved type of a Promise */
export type Awaited<T> = T extends Promise<infer U> ? U : T;

/** String literal union → object with those keys */
export type StringRecord<K extends string, V = string> = Record<K, V>;

// ═══════════════════════════════════════════════════════════════════════════
// UI PRIMITIVES
// ═══════════════════════════════════════════════════════════════════════════

/** Standard className prop */
export interface WithClassName {
  className?: string;
}

/** Standard children prop */
export interface WithChildren {
  children?: ReactNode;
}

/** Polymorphic `as` prop for rendering as a different element */
export interface WithAs<T extends ElementType = ElementType> {
  as?: T;
}

/** Combined base props shared by most UI components */
export interface BaseProps extends WithClassName, WithChildren {}

// ─── Component size scale ─────────────────────────────────────────────────────

export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type Spacing = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

// ─── Visual variants ──────────────────────────────────────────────────────────

export type ColorVariant =
  | 'brand'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'outline';

export type BadgeVariant = ColorVariant;

// ─── Orientation / alignment ──────────────────────────────────────────────────

export type Orientation = 'horizontal' | 'vertical';
export type Align       = 'left' | 'center' | 'right';
export type Side        = 'top' | 'right' | 'bottom' | 'left';
export type Placement   = Side | 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end';

// ═══════════════════════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════

export interface BreadcrumbItem {
  label:    string;
  href?:    string;
  /** True for the current (last) segment */
  current?: boolean;
}

export interface NavItem {
  label:    string;
  href:     string;
  icon?:    ElementType;
  badge?:   string | number;
  children?: NavItem[];
  disabled?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// DATA & PAGINATION
// ═══════════════════════════════════════════════════════════════════════════

export interface PaginationMeta {
  page:        number;
  limit:       number;
  total:       number;
  totalPages:  number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface SortConfig<T extends string = string> {
  field:     T;
  direction: 'asc' | 'desc';
}

/** Generic paginated API response wrapper */
export interface PaginatedResponse<T> {
  data:       T[];
  pagination: PaginationMeta;
}

/** Standard API success envelope */
export interface ApiSuccess<T = unknown> {
  success: true;
  message?: string;
  data:    T;
}

/** Standard API error envelope */
export interface ApiError {
  success:    false;
  error: {
    message:    string;
    code?:      string;
    statusCode: number;
    details?:   Array<{ field: string; message: string }>;
  };
  requestId?: string;
  timestamp:  string;
}

// ═══════════════════════════════════════════════════════════════════════════
// FORM
// ═══════════════════════════════════════════════════════════════════════════

export interface SelectOption<V = string> {
  label:     string;
  value:     V;
  disabled?: boolean;
  icon?:     ElementType;
  description?: string;
}

export interface FormFieldProps extends WithClassName {
  label?:       string;
  hint?:        string;
  error?:       string;
  required?:    boolean;
  disabled?:    boolean;
  id?:          string;
}

// ═══════════════════════════════════════════════════════════════════════════
// TABLE / LIST
// ═══════════════════════════════════════════════════════════════════════════

export interface Column<T> {
  key:          keyof T | string;
  header:       string;
  width?:       string | number;
  sortable?:    boolean;
  align?:       Align;
  render?:      (value: unknown, row: T, index: number) => ReactNode;
  className?:   string;
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL / DIALOG
// ═══════════════════════════════════════════════════════════════════════════

export interface DialogProps extends WithChildren {
  open:            boolean;
  onClose:         () => void;
  title?:          string;
  description?:    string;
  /** Prevent closing on backdrop click */
  preventClose?:   boolean;
  size?:           'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?:      string;
}

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS / TOAST
// ═══════════════════════════════════════════════════════════════════════════

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface ToastOptions {
  type?:     ToastType;
  duration?: number;
  id?:       string;
}

// ═══════════════════════════════════════════════════════════════════════════
// DOMAIN ENTITY IDs
// ═══════════════════════════════════════════════════════════════════════════

/** MongoDB ObjectId string (24-char hex) */
export type MongoId = string;

/** ISO 8601 datetime string */
export type ISODateTime = string;

/** Base fields present on every MongoDB document */
export interface MongoDocument {
  _id:       MongoId;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

// ═══════════════════════════════════════════════════════════════════════════
// ASYNC STATE
// ═══════════════════════════════════════════════════════════════════════════

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T = unknown, E = Error> {
  status:  AsyncStatus;
  data?:   T;
  error?:  E;
}

// ═══════════════════════════════════════════════════════════════════════════
// UPLOAD
// ═══════════════════════════════════════════════════════════════════════════

export interface FileUploadState {
  file:     File;
  progress: number;           // 0–100
  status:   'pending' | 'uploading' | 'done' | 'error';
  url?:     string;
  error?:   string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CHART / ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════

export interface TimeSeriesPoint {
  date:  ISODateTime | string;
  value: number;
  label?: string;
}

export interface MetricCard {
  label:       string;
  value:       string | number;
  delta?:      number;
  deltaLabel?: string;
  trend?:      'up' | 'down' | 'flat';
  unit?:       string;
}
