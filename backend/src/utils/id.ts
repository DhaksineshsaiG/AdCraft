import { validate as validateUuid } from 'uuid';

export function isValidId(value: unknown): value is string {
  return typeof value === 'string' && validateUuid(value);
}
