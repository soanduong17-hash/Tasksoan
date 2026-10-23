import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isAccountInactive,
  getRemainingInactivityTime,
  partitionAccountsByInactivity,
  INACTIVITY_THRESHOLD_MS,
} from './accountLifecycle';

test('isAccountInactive correctly flags account inactive after 3 days', () => {
  const baseTime = new Date('2026-10-23T12:00:00.000Z');

  // Active 1 day ago -> not inactive
  const oneDayAgo = new Date(baseTime.getTime() - 24 * 60 * 60 * 1000).toISOString();
  assert.equal(isAccountInactive({ lastActiveAt: oneDayAgo }, baseTime), false);

  // Active 2.9 days ago -> not inactive
  const justUnderThreeDays = new Date(baseTime.getTime() - 2.9 * 24 * 60 * 60 * 1000).toISOString();
  assert.equal(isAccountInactive({ lastActiveAt: justUnderThreeDays }, baseTime), false);

  // Active 3.1 days ago -> inactive (should be purged)
  const overThreeDays = new Date(baseTime.getTime() - 3.1 * 24 * 60 * 60 * 1000).toISOString();
  assert.equal(isAccountInactive({ lastActiveAt: overThreeDays }, baseTime), true);

  // Active 5 days ago -> inactive
  const fiveDaysAgo = new Date(baseTime.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();
  assert.equal(isAccountInactive({ lastActiveAt: fiveDaysAgo }, baseTime), true);
});

test('getRemainingInactivityTime reports correct remaining hours and days', () => {
  const baseTime = new Date('2026-10-23T12:00:00.000Z');

  // Active 24 hours ago -> 48 hours remaining (2 days)
  const oneDayAgo = new Date(baseTime.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const res1 = getRemainingInactivityTime({ lastActiveAt: oneDayAgo }, baseTime);
  assert.equal(res1.isExpired, false);
  assert.equal(res1.remainingHours, 48);
  assert.equal(res1.remainingDays, 2.0);

  // Expired 4 days ago
  const fourDaysAgo = new Date(baseTime.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString();
  const res2 = getRemainingInactivityTime({ lastActiveAt: fourDaysAgo }, baseTime);
  assert.equal(res2.isExpired, true);
  assert.equal(res2.remainingHours, 0);
});

test('partitionAccountsByInactivity separates active accounts from expired accounts', () => {
  const baseTime = new Date('2026-10-23T12:00:00.000Z');
  const accounts = [
    { id: '1', username: 'user_active', lastActiveAt: new Date(baseTime.getTime() - 1000 * 60 * 60).toISOString() },
    { id: '2', username: 'user_expired', lastActiveAt: new Date(baseTime.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString() },
    { id: '3', username: 'user_just_active', lastActiveAt: new Date(baseTime.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString() },
  ];

  const { active, expired } = partitionAccountsByInactivity(accounts, baseTime);
  assert.equal(active.length, 2);
  assert.equal(expired.length, 1);
  assert.equal(expired[0].username, 'user_expired');
});
