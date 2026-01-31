// src/lib/storage.ts
import { PupilPassport, User } from './types';

const PASSPORT_KEY = 'pupil_passport';
const USER_KEY = 'pupil_passport_user';

export function savePassport(passport: PupilPassport): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PASSPORT_KEY, JSON.stringify(passport));
}

export function loadPassport(): PupilPassport | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(PASSPORT_KEY);
  return data ? JSON.parse(data) : null;
}

export function clearPassport(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PASSPORT_KEY);
}

export function saveUser(user: User): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function loadUser(): User | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(USER_KEY);
  return data ? JSON.parse(data) : null;
}

export function clearUser(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(USER_KEY);
}



