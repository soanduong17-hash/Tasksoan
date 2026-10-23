import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateProgress,
  filterTasksBySearchQuery,
  isTaskOverdue,
  getTaskStatus,
  formatDateVietnamese,
  generateGoogleCalendarUrl,
  calculateDashboardStats,
  generateLocalStrategicReview,
  calculateWeeklyTrend,
  calculateMonthlyTrend,
  getTopUrgentTasks,
  formatBirthDateVietnamese
} from './taskCalculations.ts';
import { Task, Subtask } from '../types/task.ts';

test('calculateProgress returns correct percentage', () => {
  assert.equal(calculateProgress([]), 0);

  const subtasks: Subtask[] = [
    { id: '1', title: 'Task 1', completed: true },
    { id: '2', title: 'Task 2', completed: false },
    { id: '3', title: 'Task 3', completed: true },
    { id: '4', title: 'Task 4', completed: false }
  ];
  assert.equal(calculateProgress(subtasks), 50);

  const allCompleted: Subtask[] = [
    { id: '1', title: 'Task 1', completed: true },
    { id: '2', title: 'Task 2', completed: true }
  ];
  assert.equal(calculateProgress(allCompleted), 100);
});

test('isTaskOverdue detects overdue and completed dates correctly', () => {
  const baseTime = new Date('2026-10-22T10:00:00Z');
  const pastDue = '2026-10-20T10:00:00Z';
  const futureDue = '2026-10-25T10:00:00Z';

  assert.equal(isTaskOverdue(pastDue, undefined, baseTime), true);
  assert.equal(isTaskOverdue(futureDue, undefined, baseTime), false);
  // If completed, not overdue now
  assert.equal(isTaskOverdue(pastDue, '2026-10-19T10:00:00Z', baseTime), false);
});

test('getTaskStatus derives correct status', () => {
  const now = new Date('2026-10-22T12:00:00Z');

  // Completed
  assert.equal(
    getTaskStatus(
      { dueDate: '2026-10-20T12:00:00Z', completedAt: '2026-10-20T11:00:00Z', progress: 100, subtasks: [] },
      now
    ),
    'completed'
  );

  // Overdue
  assert.equal(
    getTaskStatus(
      { dueDate: '2026-10-20T12:00:00Z', completedAt: undefined, progress: 30, subtasks: [] },
      now
    ),
    'overdue'
  );

  // In progress
  assert.equal(
    getTaskStatus(
      { dueDate: '2026-10-25T12:00:00Z', completedAt: undefined, progress: 50, subtasks: [] },
      now
    ),
    'in_progress'
  );

  // Pending
  assert.equal(
    getTaskStatus(
      { dueDate: '2026-10-25T12:00:00Z', completedAt: undefined, progress: 0, subtasks: [] },
      now
    ),
    'pending'
  );
});

test('generateGoogleCalendarUrl formats calendar link with query parameters', () => {
  const url = generateGoogleCalendarUrl({
    title: 'Họp chi hội thường kỳ',
    description: 'Thảo luận kế hoạch sinh hoạt',
    createdAt: '2026-10-22T08:00:00Z',
    dueDate: '2026-10-22T10:00:00Z',
    unit: 'Chi hội 1'
  });

  assert.match(url, /https:\/\/calendar\.google\.com\/calendar\/render\?action=TEMPLATE/);
  assert.match(url, /Chi%20h%E1%BB%99i%201/);
});

test('calculateDashboardStats aggregates tasks and unit breakdown', () => {
  const now = new Date('2026-10-22T12:00:00Z');
  const tasks: Task[] = [
    {
      id: 't1',
      title: 'Task 1',
      description: '',
      unit: 'Ban Thanh Niên',
      priority: 'high',
      createdAt: '2026-10-20T00:00:00Z',
      dueDate: '2026-10-21T00:00:00Z',
      completedAt: '2026-10-20T10:00:00Z',
      progress: 100,
      status: 'completed',
      subtasks: [],
      attachments: [],
      links: [],
      reminder: { enabled: true, minutesBefore: 30 }
    },
    {
      id: 't2',
      title: 'Task 2',
      description: '',
      unit: 'Ban Thanh Niên',
      priority: 'medium',
      createdAt: '2026-10-20T00:00:00Z',
      dueDate: '2026-10-21T00:00:00Z', // past due & not completed
      progress: 20,
      status: 'overdue',
      subtasks: [],
      attachments: [],
      links: [],
      reminder: { enabled: true, minutesBefore: 30 }
    },
    {
      id: 't3',
      title: 'Task 3',
      description: '',
      unit: 'Phòng Kỹ Thuật',
      priority: 'high',
      createdAt: '2026-10-21T00:00:00Z',
      dueDate: '2026-10-25T00:00:00Z',
      progress: 40,
      status: 'in_progress',
      subtasks: [{ id: 's1', title: 'Sub 1', completed: true }],
      attachments: [],
      links: [],
      reminder: { enabled: true, minutesBefore: 30 }
    }
  ];

  const stats = calculateDashboardStats(tasks, now);
  assert.equal(stats.total, 3);
  assert.equal(stats.completed, 1);
  assert.equal(stats.overdue, 1);
  assert.equal(stats.inProgress, 1);
  assert.equal(stats.highPriorityCount, 2);
  assert.equal(stats.unitDistribution['Ban Thanh Niên'].total, 2);
  assert.equal(stats.unitDistribution['Ban Thanh Niên'].completed, 1);
  assert.equal(stats.unitDistribution['Ban Thanh Niên'].overdue, 1);
});

test('generateLocalStrategicReview produces grade and recommendations', () => {
  const review = generateLocalStrategicReview([]);
  assert.ok(review.score >= 0 && review.score <= 100);
  assert.ok(review.recommendations.length > 0);
  assert.ok(review.grade);
});

test('filterTasksBySearchQuery matches title and description real-time', () => {
  const sampleTasks: Task[] = [
    {
      id: '1',
      title: 'Họp ban thường vụ',
      description: 'Lập kế hoạch thanh niên',
      unit: 'Ban Thanh Niên',
      priority: 'high',
      createdAt: '2026-10-20T00:00:00Z',
      dueDate: '2026-10-25T00:00:00Z',
      progress: 0,
      status: 'pending',
      subtasks: [],
      attachments: [],
      links: [],
      reminder: { enabled: true, minutesBefore: 15 },
    },
    {
      id: '2',
      title: 'Chiến dịch xanh',
      description: 'Dọn dẹp môi trường',
      unit: 'CLB Tình Nguyện',
      priority: 'low',
      createdAt: '2026-10-20T00:00:00Z',
      dueDate: '2026-10-25T00:00:00Z',
      progress: 0,
      status: 'pending',
      subtasks: [],
      attachments: [],
      links: [],
      reminder: { enabled: true, minutesBefore: 15 },
    },
  ];

  // Match by title
  assert.equal(filterTasksBySearchQuery(sampleTasks, 'Họp').length, 1);
  assert.equal(filterTasksBySearchQuery(sampleTasks, 'Họp')[0].id, '1');

  // Match by description
  assert.equal(filterTasksBySearchQuery(sampleTasks, 'môi trường').length, 1);
  assert.equal(filterTasksBySearchQuery(sampleTasks, 'môi trường')[0].id, '2');

  // Case insensitive
  assert.equal(filterTasksBySearchQuery(sampleTasks, 'chiến dịch').length, 1);

  // No match
  assert.equal(filterTasksBySearchQuery(sampleTasks, 'không tồn tại').length, 0);

  // Empty query returns all
  assert.equal(filterTasksBySearchQuery(sampleTasks, '').length, 2);
});

test('calculateWeeklyTrend returns 7 day points with completed and created counts', () => {
  const refDate = new Date('2026-10-22T12:00:00Z');
  const sampleTasks: Task[] = [
    {
      id: '1',
      title: 'Task today',
      description: '',
      unit: 'Ban Thanh Niên',
      priority: 'high',
      createdAt: '2026-10-22T08:00:00Z',
      dueDate: '2026-10-25T00:00:00Z',
      completedAt: '2026-10-22T10:00:00Z',
      progress: 100,
      status: 'completed',
      subtasks: [],
      attachments: [],
      links: [],
      reminder: { enabled: true, minutesBefore: 15 },
    },
  ];

  const trend = calculateWeeklyTrend(sampleTasks, refDate);
  assert.equal(trend.length, 7);
  const lastPoint = trend[trend.length - 1];
  assert.equal(lastPoint.completed, 1);
  assert.equal(lastPoint.created, 1);
});

test('calculateMonthlyTrend returns 6 month points', () => {
  const refDate = new Date('2026-10-22T12:00:00Z');
  const trend = calculateMonthlyTrend([], refDate);
  assert.equal(trend.length, 6);
  assert.ok(trend[0].label.includes('Thg'));
});

test('getTopUrgentTasks prioritizes overdue and high priority tasks', () => {
  const refDate = new Date('2026-10-22T12:00:00Z');
  const tasks: Task[] = [
    {
      id: 'low-future',
      title: 'Low priority',
      description: '',
      unit: 'Ban Thanh Niên',
      priority: 'low',
      createdAt: '2026-10-20T00:00:00Z',
      dueDate: '2026-10-28T00:00:00Z',
      progress: 0,
      status: 'pending',
      subtasks: [],
      attachments: [],
      links: [],
      reminder: { enabled: false, minutesBefore: 0 },
    },
    {
      id: 'high-urgent',
      title: 'High priority urgent',
      description: '',
      unit: 'Ban Thanh Niên',
      priority: 'high',
      createdAt: '2026-10-20T00:00:00Z',
      dueDate: '2026-10-24T00:00:00Z',
      progress: 20,
      status: 'in_progress',
      subtasks: [],
      attachments: [],
      links: [],
      reminder: { enabled: false, minutesBefore: 0 },
    },
    {
      id: 'overdue-task',
      title: 'Overdue task',
      description: '',
      unit: 'Ban Thanh Niên',
      priority: 'medium',
      createdAt: '2026-10-15T00:00:00Z',
      dueDate: '2026-10-20T00:00:00Z', // past
      progress: 50,
      status: 'overdue',
      subtasks: [],
      attachments: [],
      links: [],
      reminder: { enabled: false, minutesBefore: 0 },
    },
    {
      id: 'done-task',
      title: 'Already completed',
      description: '',
      unit: 'Ban Thanh Niên',
      priority: 'high',
      createdAt: '2026-10-15T00:00:00Z',
      dueDate: '2026-10-20T00:00:00Z',
      completedAt: '2026-10-19T00:00:00Z',
      progress: 100,
      status: 'completed',
      subtasks: [],
      attachments: [],
      links: [],
      reminder: { enabled: false, minutesBefore: 0 },
    },
  ];

  const top3 = getTopUrgentTasks(tasks, 3, refDate);
  assert.equal(top3.length, 3);
  // First must be overdue
  assert.equal(top3[0].id, 'overdue-task');
  // Second must be high priority
  assert.equal(top3[1].id, 'high-urgent');
  assert.equal(top3[2].id, 'low-future');
});

test('generateLocalStrategicReview computes all 4 required evaluation pillars', () => {
  const refDate = new Date('2026-10-22T12:00:00Z');
  const tasks: Task[] = [
    {
      id: 'task-1',
      title: 'Xây dựng kế hoạch công tác',
      description: 'Lập kế hoạch chi tiết',
      unit: 'Ban Thanh Niên',
      priority: 'high',
      createdAt: '2026-10-18T08:00:00Z',
      dueDate: '2026-10-21T17:00:00Z',
      completedAt: '2026-10-20T16:00:00Z',
      progress: 100,
      status: 'completed',
      subtasks: [
        { id: 's1', title: 'Khảo sát', completed: true },
        { id: 's2', title: 'Tổng hợp', completed: true },
      ],
      attachments: [{ id: 'a1', name: 'kehoach.docx', size: 1000, type: 'docx', uploadDate: '2026-10-18' }],
      links: [],
      reminder: { enabled: true, minutesBefore: 30 },
    },
    {
      id: 'task-2',
      title: 'Báo cáo định kỳ',
      description: 'Soạn thảo báo cáo',
      unit: 'Phòng Kế Hoạch',
      priority: 'medium',
      createdAt: '2026-10-10T08:00:00Z',
      dueDate: '2026-10-19T17:00:00Z',
      progress: 40,
      status: 'overdue',
      subtasks: [
        { id: 's3', title: 'Thu thập số liệu', completed: true },
        { id: 's4', title: 'Viết báo cáo', completed: false },
      ],
      attachments: [],
      links: [],
      reminder: { enabled: true, minutesBefore: 60 },
    },
  ];

  const review = generateLocalStrategicReview(tasks, refDate);

  // Pillar 1: System Pragmatism
  assert.ok(review.systemPragmatism);
  assert.ok(review.systemPragmatism.pragmatismScore >= 0 && review.systemPragmatism.pragmatismScore <= 100);
  assert.equal(review.systemPragmatism.subtaskUtilizationRate, 100);
  assert.equal(review.systemPragmatism.attachmentUtilizationRate, 50);
  assert.ok(review.systemPragmatism.practicalStrengths.length > 0);

  // Pillar 2: Task Execution Health
  assert.ok(review.taskExecution);
  assert.equal(review.taskExecution.overdueCount, 1);
  assert.ok(['healthy', 'warning', 'critical'].includes(review.taskExecution.healthLevel));
  assert.ok(review.taskExecution.bottlenecks.length > 0);

  // Pillar 3: User Management Capability
  assert.ok(review.userManagement);
  assert.ok(review.userManagement.capabilityScore >= 0 && review.userManagement.capabilityScore <= 100);
  assert.ok(review.userManagement.planningScore > 0);
  assert.ok(review.userManagement.coachingGuidance.length > 0);

  // Pillar 4: Strategic Recommendations & Weekly Archive
  assert.ok(review.weeklyArchiveAnalysis);
  assert.equal(review.weeklyArchiveAnalysis.thisWeekCompletedCount, 1);
  assert.ok(review.recommendations.length >= 3);
  assert.ok(review.recommendations.some((r) => r.timeframe === 'today' || r.timeframe === 'this_week'));

  // Gaps analysis
  assert.ok(Array.isArray(review.gaps));
  assert.ok(review.gaps.some((g) => g.category === 'deadline')); // task-2 is overdue
});

test('generateLocalStrategicReview enforces 0/100 score initially and increases upon completion', () => {
  // Empty tasks -> strictly 0
  const emptyReview = generateLocalStrategicReview([]);
  assert.equal(emptyReview.score, 0);
  assert.equal(emptyReview.grade, 'Khởi điểm (0/100)');
  assert.ok(emptyReview.gaps.some((g) => g.id === 'gap-no-completed'));

  // Tasks created but none completed -> strictly 0
  const pendingTasks: Task[] = [
    {
      id: 't-pending',
      title: 'Kế hoạch công tác năm',
      description: 'Lập bản thảo',
      unit: 'Ban Thanh Niên',
      priority: 'high',
      createdAt: '2026-10-22T08:00:00Z',
      dueDate: '2026-10-25T17:00:00Z',
      progress: 0,
      status: 'pending',
      subtasks: [{ id: 's1', title: 'Thu thập số liệu', completed: false }],
      attachments: [],
      links: [],
      reminder: { enabled: true, minutesBefore: 30 }
    }
  ];
  const pendingReview = generateLocalStrategicReview(pendingTasks);
  assert.equal(pendingReview.score, 0);
  assert.equal(pendingReview.grade, 'Khởi điểm (0/100)');
  assert.ok(pendingReview.gaps.some((g) => g.id === 'gap-no-completed'));

  // When task is completed -> score increases from 0
  const completedTask: Task = {
    ...pendingTasks[0],
    progress: 100,
    status: 'completed',
    completedAt: '2026-10-22T10:00:00Z',
    subtasks: [{ id: 's1', title: 'Thu thập số liệu', completed: true }]
  };
  const completedReview = generateLocalStrategicReview([completedTask]);
  assert.ok(completedReview.score > 0, `Expected score > 0, got ${completedReview.score}`);
  assert.equal(completedReview.gaps.some((g) => g.id === 'gap-no-completed'), false);
});

test('formatBirthDateVietnamese strictly formats Day/Month/Year in Vietnamese order', () => {
  // Test standard YYYY-MM-DD input
  assert.equal(formatBirthDateVietnamese('1990-05-18'), '18/05/1990');
  assert.equal(formatBirthDateVietnamese('1990-05-18', true), 'Ngày 18 tháng 05 năm 1990');

  // Test already formatted DD/MM/YYYY
  assert.equal(formatBirthDateVietnamese('18/05/1990'), '18/05/1990');
  assert.equal(formatBirthDateVietnamese('18/05/1990', true), 'Ngày 18 tháng 05 năm 1990');

  // Test ISO string
  assert.equal(formatBirthDateVietnamese('1995-12-05T00:00:00.000Z'), '05/12/1995');
  assert.equal(formatBirthDateVietnamese('1995-12-05T00:00:00.000Z', true), 'Ngày 05 tháng 12 năm 1995');

  // Test empty string fallback
  assert.equal(formatBirthDateVietnamese(''), 'Chưa cập nhật');
});




