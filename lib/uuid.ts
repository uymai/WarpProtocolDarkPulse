import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'wpdp_player_id';

export function getOrCreatePlayerId(): string {
  if (typeof window === 'undefined') return '';
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) return existing;
  const id = uuidv4();
  localStorage.setItem(STORAGE_KEY, id);
  return id;
}
