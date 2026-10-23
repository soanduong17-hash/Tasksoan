import { test } from 'node:test';
import assert from 'node:assert';
import {
  formatDateKey,
  getTaskDueDateKey,
  getCalendarGrid,
  groupTasksByDueDateKey,
  getMonthYearLabel,
  getMonthlyStats,
  DAYS_OF_WEEK_HEADERS,
} from './calendarUtils';
import { Task } from '../types/task';

test('formatDateKey formats date properly into YYYY-MM-DD', () => {
  const d = new Date(2026, 9, 22); // Month is 0-indexed: 9 = October
  assert.strictEqual(formatDateKey(d), '2026-10-22');
});

test('getTaskDueDateKey handles ISO strings correctly', () => {
  const key = getTaskDueDateKey('2026-10-25T15:30:00.000Z');
  assert.match(key, /^2026-10-\d{2}$/);
});

test('DAYS_OF_WEEK_HEADERS has 7 days starting with T2 (Monday) and ending with CN (Sunday)', () => {
  assert.strictEqual(DAYS_OF_WEEK_HEADERS.length, 7);
  assert.strictEqual(DAYS_OF_WEEK_HEADERS[0].short, 'T2');
  assert.strictEqual(DAYS_OF_WEEK_HEADERS[6].short, 'CN');
  assert.strictEqual(DAYS_OF_WEEK_HEADERS[6].isWeekend, true);
});

test('getCalendarGrid returns full grid with exact multiples of 7', () => {
  const grid = getCalendarGrid(2026, 9); // October 2026
  assert.strictEqual(grid.length % 7, 0);
  assert.ok(grid.length >= 35);

  const currentMonthDays = grid.filter((d) => d.isCurrentMonth);
  assert.strictEqual(currentMonthDays.length, 31); // October has 31 days
});

test('groupTasksByDueDateKey groups tasks by their due date key correctly and sorts by priority', () => {
  const mockTasks: Task[] = [
    {
      id: 'task-1',
      title: 'Việc vừa',
      description: 'Mô tả việc vừa',
      unit: 'Ban Thanh Niên',
      dueDate: '2026-10-22T10:00:00.000Z',
      createdAt: '2026-10-20T00:00:00.000Z',
      priority: 'medium',
      status: 'pending',
      progress: 0,
      subtasks: [],
      attachments: [],
      links: [],
      reminder: { enabled: false, minutesBefore: 60 },
    },
    {
      id: 'task-2',
      title: 'Việc gấp',
      description: 'Mô tả việc gấp',
      unit: 'Ban Thanh Niên',
      dueDate: '2026-10-22T14:00:00.000Z',
      createdAt: '2026-10-20T00:00:00.000Z',
      priority: 'high',
      status: 'pending',
      progress: 0,
      subtasks: [],
      attachments: [],
      links: [],
      reminder: { enabled: true, minutesBefore: 30 },
    },
    {
      id: 'task-3',
      title: 'Việc ngày mai',
      description: 'Mô tả việc ngày mai',
      unit: 'Chi hội 1',
      dueDate: '2026-10-23T14:00:00.000Z',
      createdAt: '2026-10-20T00:00:00.000Z',
      priority: 'low',
      status: 'pending',
      progress: 0,
      subtasks: [],
      attachments: [],
      links: [],
      reminder: { enabled: false, minutesBefore: 60 },
    },
  ];

  const grouped = groupTasksByDueDateKey(mockTasks);
  const key1 = getTaskDueDateKey(mockTasks[0].dueDate);
  assert.ok(grouped[key1]);
  assert.strictEqual(grouped[key1].length, 2);
  // High priority should be first
  assert.strictEqual(grouped[key1][0].priority, 'high');
  assert.strictEqual(grouped[key1][1].priority, 'medium');
});

test('getMonthYearLabel outputs localized Vietnamese title', () => {
  assert.strictEqual(getMonthYearLabel(2026, 9), 'Tháng 10, 2026');
  assert.strictEqual(getMonthYearLabel(2026, 0), 'Tháng 1, 2026');
});

test('getMonthlyStats computes metrics for tasks due in active month', () => {
  const mockTasks: Task[] = [
    {
      id: 't-1',
      title: 'Hoàn thành trong tháng',
      description: 'Mô tả hoàn thành',
      unit: 'Ban Thanh Niên',
      dueDate: new Date(2026, 9, 15).toISOString(),
      createdAt: new Date(2026, 9, 1).toISOString(),
      priority: 'medium',
      status: 'completed',
      progress: 100,
      subtasks: [],
      attachments: [],
      links: [],
      reminder: { enabled: false, minutesBefore: 60 },
    },
    {
      id: 't-2',
      title: 'Nhiệm vụ gấp trong tháng',
      description: 'Mô tả gấp',
      unit: 'Ban Thanh Niên',
      dueDate: new Date(2026, 9, 20).toISOString(),
      createdAt: new Date(2026, 9, 1).toISOString(),
      priority: 'high',
      status: 'in_progress',
      progress: 50,
      subtasks: [],
      attachments: [],
      links: [],
      reminder: { enabled: true, minutesBefore: 15 },
    },
    {
      id: 't-3',
      title: 'Nhiệm vụ tháng sau',
      description: 'Mô tả tháng sau',
      unit: 'Ban Thanh Niên',
      dueDate: new Date(2026, 10, 10).toISOString(),
      createdAt: new Date(2026, 9, 1).toISOString(),
      priority: 'high',
      status: 'pending',
      progress: 0,
      subtasks: [],
      attachments: [],
      links: [],
      reminder: { enabled: false, minutesBefore: 60 },
    },
  ];

  const stats = getMonthlyStats(mockTasks, 2026, 9);
  assert.strictEqual(stats.totalDue, 2);
  assert.strictEqual(stats.completedCount, 1);
  assert.strictEqual(stats.highPriorityCount, 1);
  assert.strictEqual(stats.inProgressCount, 1);
});
