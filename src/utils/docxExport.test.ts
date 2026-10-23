import test from 'node:test';
import assert from 'node:assert/strict';
import { exportTaskToDocx, exportAllCompletedTasksToDocx } from './docxExport.ts';
import { Task, UserProfile } from '../types/task.ts';

const mockTask: Task = {
  id: 'task-test-1',
  title: 'Hội nghị Tổng kết Đơn vị',
  description: 'Báo cáo chi tiết và tổng kết quý',
  unit: 'Ban Thanh Niên',
  priority: 'high',
  createdAt: '2026-10-10T08:00:00Z',
  dueDate: '2026-10-15T17:00:00Z',
  completedAt: '2026-10-15T16:30:00Z',
  progress: 100,
  status: 'completed',
  subtasks: [
    {
      id: 'st-1',
      title: 'Lập danh sách đại biểu',
      completed: true,
      resource: { title: 'Mẫu danh sách', url: 'https://docs.google.com' },
    },
    {
      id: 'st-2',
      title: 'Soạn thảo biên bản',
      completed: true,
    },
  ],
  attachments: [
    {
      id: 'att-1',
      name: 'bien_ban.pdf',
      size: 102400,
      type: 'application/pdf',
      uploadDate: '2026-10-15T10:00:00Z',
    },
  ],
  links: [
    {
      id: 'l-1',
      title: 'Google Drive Thư viện ảnh',
      url: 'https://drive.google.com',
    },
  ],
  reminder: { enabled: true, minutesBefore: 60 },
};

const mockUser: UserProfile = {
  displayName: 'Nguyễn Văn An',
  birthDate: '1995-05-18',
  units: ['Ban Thanh Niên'],
  avatarUrl: '',
  connectedApps: {
    googleCalendar: true,
    googleDrive: true,
    zalo: true,
    notion: false,
    telegram: false,
  },
  notifications: {
    browserEnabled: true,
    soundEnabled: true,
    priorityReminders: true,
    overdueAlerts: true,
  },
};

test('exportTaskToDocx generates a valid non-empty blob', async () => {
  const blob = await exportTaskToDocx(mockTask, mockUser);
  assert.ok(blob);
  assert.ok(blob.size > 1000, `Expected blob size > 1000 bytes, got ${blob.size}`);
});

test('exportAllCompletedTasksToDocx generates a valid non-empty master report blob', async () => {
  const blob = await exportAllCompletedTasksToDocx([mockTask], mockUser);
  assert.ok(blob);
  assert.ok(blob.size > 1000, `Expected master blob size > 1000 bytes, got ${blob.size}`);
});
