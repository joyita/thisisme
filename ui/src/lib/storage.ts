// src/lib/storage.ts
import { Passport } from './api';

export interface PendingChange {
  passportId: string;
  sectionId?: string;
  action: 'add' | 'update' | 'delete' | 'reorder';
  payload: Record<string, unknown>;
}

export function cachePassport(passport: Passport): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`passport_cache_${passport.id}`, JSON.stringify(passport));
}

export function getCachedPassport<T>(id: string): T | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(`passport_cache_${id}`);
  return data ? JSON.parse(data) : null;
}

export function clearPassportCache(id: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`passport_cache_${id}`);
}

export function addPendingChange(change: PendingChange): void {
  if (typeof window === 'undefined') return;
  const existing = getPendingChanges();
  existing.push(change);
  localStorage.setItem('passport_pending_changes', JSON.stringify(existing));
}

export function getPendingChanges(): PendingChange[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem('passport_pending_changes');
  return data ? JSON.parse(data) : [];
}

export function clearPendingChanges(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('passport_pending_changes');
}
