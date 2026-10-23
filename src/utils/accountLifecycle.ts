/**
 * Account lifecycle & inactivity management rules.
 * System policy: Accounts not active/used for 3 days are automatically purged.
 */

export const INACTIVITY_THRESHOLD_DAYS = 3;
export const INACTIVITY_THRESHOLD_MS = INACTIVITY_THRESHOLD_DAYS * 24 * 60 * 60 * 1000; // 259,200,000 ms

export interface AccountWithTimestamps {
  id: string;
  username: string;
  lastActiveAt?: string;
  lastSyncedAt?: string;
  createdAt?: string;
  [key: string]: any;
}

/**
 * Returns true if the account has been inactive for more than 3 days.
 */
export function isAccountInactive(
  account: { lastActiveAt?: string; lastSyncedAt?: string; createdAt?: string },
  now: Date = new Date()
): boolean {
  const timestampStr = account.lastActiveAt || account.lastSyncedAt || account.createdAt;
  if (!timestampStr) return false;

  const timestamp = new Date(timestampStr).getTime();
  if (isNaN(timestamp)) return false;

  return now.getTime() - timestamp > INACTIVITY_THRESHOLD_MS;
}

/**
 * Calculates remaining hours or days before an account is automatically deleted.
 */
export function getRemainingInactivityTime(
  account: { lastActiveAt?: string; lastSyncedAt?: string; createdAt?: string },
  now: Date = new Date()
): { isExpired: boolean; remainingHours: number; remainingDays: number } {
  const timestampStr = account.lastActiveAt || account.lastSyncedAt || account.createdAt;
  if (!timestampStr) {
    return { isExpired: false, remainingHours: 72, remainingDays: 3 };
  }

  const timestamp = new Date(timestampStr).getTime();
  const elapsedMs = now.getTime() - timestamp;
  const remainingMs = INACTIVITY_THRESHOLD_MS - elapsedMs;

  if (remainingMs <= 0) {
    return { isExpired: true, remainingHours: 0, remainingDays: 0 };
  }

  const remainingHours = Math.max(0, Math.round(remainingMs / (60 * 60 * 1000)));
  const remainingDays = +(remainingMs / (24 * 60 * 60 * 1000)).toFixed(1);

  return { isExpired: false, remainingHours, remainingDays };
}

/**
 * Partitions accounts into active and expired (inactive > 3 days) sets.
 */
export function partitionAccountsByInactivity<T extends AccountWithTimestamps>(
  accounts: T[],
  now: Date = new Date()
): { active: T[]; expired: T[] } {
  const active: T[] = [];
  const expired: T[] = [];

  for (const acc of accounts) {
    if (isAccountInactive(acc, now)) {
      expired.push(acc);
    } else {
      active.push(acc);
    }
  }

  return { active, expired };
}
