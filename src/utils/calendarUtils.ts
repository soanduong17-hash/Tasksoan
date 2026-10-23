import { Task } from '../types/task';

export interface CalendarDay {
  date: Date;
  dateKey: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
}

/**
 * Formats a Date object into a YYYY-MM-DD string in local time.
 */
export function formatDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Extracts the YYYY-MM-DD date key from an ISO date string or Date object.
 */
export function getTaskDueDateKey(dueDate: string | Date): string {
  const d = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  if (isNaN(d.getTime())) return '';
  return formatDateKey(d);
}

/**
 * Day of week headers following Vietnamese business convention (Monday = T2 ... Sunday = CN).
 */
export const DAYS_OF_WEEK_HEADERS = [
  { short: 'T2', full: 'Thứ Hai', isWeekend: false },
  { short: 'T3', full: 'Thứ Ba', isWeekend: false },
  { short: 'T4', full: 'Thứ Tư', isWeekend: false },
  { short: 'T5', full: 'Thứ Năm', isWeekend: false },
  { short: 'T6', full: 'Thứ Sáu', isWeekend: false },
  { short: 'T7', full: 'Thứ Bảy', isWeekend: true },
  { short: 'CN', full: 'Chủ Nhật', isWeekend: true },
];

/**
 * Generates the full 35 or 42 grid cells for a given month and year.
 * Weeks start on Monday (T2) and end on Sunday (CN).
 */
export function getCalendarGrid(year: number, month: number, now = new Date()): CalendarDay[] {
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // JavaScript getDay(): 0 is Sunday, 1 is Monday ... 6 is Saturday
  // We want Monday = 0, Tuesday = 1 ... Sunday = 6
  const jsDay = firstDayOfMonth.getDay();
  const startOffset = jsDay === 0 ? 6 : jsDay - 1; // days to backfill from previous month

  const todayKey = formatDateKey(now);
  const nowZero = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const days: CalendarDay[] = [];

  // 1. Backfill previous month days
  for (let i = startOffset; i > 0; i--) {
    const d = new Date(year, month, 1 - i);
    const dateKey = formatDateKey(d);
    days.push({
      date: d,
      dateKey,
      dayNumber: d.getDate(),
      isCurrentMonth: false,
      isToday: dateKey === todayKey,
      isPast: d.getTime() < nowZero,
    });
  }

  // 2. Current month days
  const totalDaysInMonth = lastDayOfMonth.getDate();
  for (let day = 1; day <= totalDaysInMonth; day++) {
    const d = new Date(year, month, day);
    const dateKey = formatDateKey(d);
    days.push({
      date: d,
      dateKey,
      dayNumber: day,
      isCurrentMonth: true,
      isToday: dateKey === todayKey,
      isPast: d.getTime() < nowZero,
    });
  }

  // 3. Trailing next month days to complete 5 or 6 weeks (multiples of 7)
  const remaining = (7 - (days.length % 7)) % 7;
  // If month view has 35 days or fewer, pad to at least 35 or 42 for layout stability
  const targetLength = days.length + remaining < 35 ? 35 : days.length + remaining;
  const trailingNeeded = targetLength - days.length;

  for (let i = 1; i <= trailingNeeded; i++) {
    const d = new Date(year, month + 1, i);
    const dateKey = formatDateKey(d);
    days.push({
      date: d,
      dateKey,
      dayNumber: d.getDate(),
      isCurrentMonth: false,
      isToday: dateKey === todayKey,
      isPast: d.getTime() < nowZero,
    });
  }

  return days;
}

/**
 * Groups a collection of tasks by their due date key (YYYY-MM-DD).
 */
export function groupTasksByDueDateKey(tasks: Task[]): Record<string, Task[]> {
  const map: Record<string, Task[]> = {};
  for (const task of tasks) {
    if (!task.dueDate) continue;
    const key = getTaskDueDateKey(task.dueDate);
    if (!key) continue;
    if (!map[key]) {
      map[key] = [];
    }
    map[key].push(task);
  }

  // Sort tasks in each day: high priority first, then by time
  for (const key of Object.keys(map)) {
    map[key].sort((a, b) => {
      const pOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
      const pDiff = (pOrder[b.priority] || 0) - (pOrder[a.priority] || 0);
      if (pDiff !== 0) return pDiff;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }

  return map;
}

/**
 * Returns formatted Vietnamese month-year title, e.g. "Tháng 10, 2026".
 */
export function getMonthYearLabel(year: number, month: number): string {
  return `Tháng ${month + 1}, ${year}`;
}

/**
 * Computes monthly calendar statistics for tasks due in the active month.
 */
export function getMonthlyStats(tasks: Task[], year: number, month: number) {
  const monthStart = new Date(year, month, 1).getTime();
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();

  const monthTasks = tasks.filter((t) => {
    if (!t.dueDate) return false;
    const dueTime = new Date(t.dueDate).getTime();
    return dueTime >= monthStart && dueTime <= monthEnd;
  });

  const totalDue = monthTasks.length;
  const completedCount = monthTasks.filter((t) => t.status === 'completed' || t.progress === 100).length;
  const overdueCount = monthTasks.filter((t) => t.status === 'overdue').length;
  const highPriorityCount = monthTasks.filter((t) => t.priority === 'high' && t.status !== 'completed').length;
  const inProgressCount = monthTasks.filter((t) => t.status === 'in_progress').length;

  return {
    totalDue,
    completedCount,
    overdueCount,
    highPriorityCount,
    inProgressCount,
  };
}
