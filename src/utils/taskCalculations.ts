import { Task, Subtask, TaskStatus, AIStrategicReview, StrategicRecommendation } from '../types/task';

/**
 * Calculates percentage of completion from a list of subtasks.
 * Returns an integer between 0 and 100.
 */
export function calculateProgress(subtasks: Subtask[]): number {
  if (!subtasks || subtasks.length === 0) {
    return 0;
  }
  const completedCount = subtasks.filter((s) => s.completed).length;
  return Math.round((completedCount / subtasks.length) * 100);
}

/**
 * Real-time task search filter that searches against title and description.
 */
export function filterTasksBySearchQuery(tasks: Task[], query: string): Task[] {
  if (!query || !query.trim()) return tasks;
  const q = query.trim().toLowerCase();
  return tasks.filter((task) => {
    const titleMatch = (task.title || '').toLowerCase().includes(q);
    const descMatch = (task.description || '').toLowerCase().includes(q);
    const unitMatch = (task.unit || '').toLowerCase().includes(q);
    return titleMatch || descMatch || unitMatch;
  });
}

/**
 * Determines if a task is overdue.
 */
export function isTaskOverdue(dueDate: string, completedAt?: string, now = new Date()): boolean {
  if (completedAt) {
    return false; // Already completed, not overdue now
  }
  const due = new Date(dueDate);
  return due.getTime() < now.getTime();
}

/**
 * Derives current status of a task based on subtasks, completion date, and due date.
 */
export function getTaskStatus(
  task: Pick<Task, 'dueDate' | 'completedAt' | 'progress' | 'subtasks'>,
  now = new Date()
): TaskStatus {
  if (task.completedAt || task.progress === 100) {
    return 'completed';
  }
  const due = new Date(task.dueDate);
  if (due.getTime() < now.getTime()) {
    return 'overdue';
  }
  if (task.progress > 0 || (task.subtasks && task.subtasks.some((s) => s.completed))) {
    return 'in_progress';
  }
  return 'pending';
}

/**
 * Retrieves the top N most urgent pending tasks for Priority Spotlight.
 * Sorted by: overdue first, then high priority, then nearest due date.
 */
export function getTopUrgentTasks(tasks: Task[], limit = 3, now = new Date()): Task[] {
  const pendingOrInProgress = tasks.filter((t) => t.status !== 'completed' && t.progress < 100);

  return pendingOrInProgress
    .slice()
    .sort((a, b) => {
      const aOverdue = isTaskOverdue(a.dueDate, a.completedAt, now);
      const bOverdue = isTaskOverdue(b.dueDate, b.completedAt, now);

      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      const priorityWeight: Record<string, number> = { high: 3, medium: 2, low: 1 };
      const aWeight = priorityWeight[a.priority] || 1;
      const bWeight = priorityWeight[b.priority] || 1;

      if (aWeight !== bWeight) {
        return bWeight - aWeight;
      }

      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    })
    .slice(0, limit);
}

/**
 * Formats Vietnamese ISO or date strings into friendly format.
 * E.g., "14:30, 25/10/2026"
 */
export function formatDateVietnamese(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${hours}:${minutes}, ${day}/${month}/${year}`;
}

/**
 * Formats a birth date string strictly into Day / Month / Year (Ngày / Tháng / Năm).
 * E.g., "Ngày 25 tháng 08 năm 1996" or "25/08/1996"
 */
export function formatBirthDateVietnamese(dateStr: string, detailed = false): string {
  if (!dateStr || !dateStr.trim()) return 'Chưa cập nhật';
  const cleanStr = dateStr.trim();

  // Case 1: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
  if (cleanStr.includes('-')) {
    const rawDatePart = cleanStr.split('T')[0];
    const parts = rawDatePart.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        const dd = String(d).padStart(2, '0');
        const mm = String(m).padStart(2, '0');
        return detailed ? `Ngày ${dd} tháng ${mm} năm ${y}` : `${dd}/${mm}/${y}`;
      }
    }
  }

  // Case 2: DD/MM/YYYY
  if (cleanStr.includes('/')) {
    const parts = cleanStr.split('/');
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const y = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        const dd = String(d).padStart(2, '0');
        const mm = String(m).padStart(2, '0');
        return detailed ? `Ngày ${dd} tháng ${mm} năm ${y}` : `${dd}/${mm}/${y}`;
      }
    }
  }

  const date = new Date(cleanStr);
  if (isNaN(date.getTime())) return cleanStr;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return detailed ? `Ngày ${day} tháng ${month} năm ${year}` : `${day}/${month}/${year}`;
}

/**
 * Formats a date string for input[type="datetime-local"] (YYYY-MM-DDTHH:mm)
 */
export function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
}

/**
 * Generates direct Google Calendar web event creation link.
 */
export function generateGoogleCalendarUrl(task: Pick<Task, 'title' | 'description' | 'createdAt' | 'dueDate' | 'unit'>): string {
  const start = new Date(task.createdAt || Date.now());
  const end = new Date(task.dueDate);

  // Format to YYYYMMDDTHHmmssZ
  const formatUtc = (d: Date) => {
    return d.toISOString().replace(/-|:|\.\d\d\d/g, '');
  };

  const dates = `${formatUtc(start)}/${formatUtc(end)}`;
  const text = encodeURIComponent(`[${task.unit || 'Nhiệm vụ'}] ${task.title}`);
  const details = encodeURIComponent(
    `Nhiệm vụ: ${task.title}\nĐơn vị: ${task.unit || 'Không xác định'}\n\nMô tả chi tiết:\n${task.description || 'Không có mô tả'}\n\nHệ thống nhắc việc TaskMaster AI`
  );

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}`;
}

/**
 * Generates an .ics iCalendar file string for download.
 */
export function generateIcsContent(task: Task): string {
  const formatIcsDate = (d: Date) => {
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const start = new Date(task.createdAt);
  const end = new Date(task.dueDate);
  const now = new Date();

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TaskMaster AI//Nhiem Vu Nhac Viec//VI',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:taskmaster-${task.id}@app.local`,
    `DTSTAMP:${formatIcsDate(now)}`,
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:[${task.unit || 'Nhiệm vụ'}] ${task.title}`,
    `DESCRIPTION:${(task.description || '').replace(/\n/g, '\\n')}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    `DESCRIPTION:Nhắc việc: ${task.title}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

export interface DashboardStats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  overdue: number;
  completionRate: number; // 0 - 100
  highPriorityCount: number;
  unitDistribution: Record<string, { total: number; completed: number; overdue: number }>;
}

export function calculateDashboardStats(tasks: Task[], now = new Date()): DashboardStats {
  const total = tasks.length;
  let completed = 0;
  let inProgress = 0;
  let pending = 0;
  let overdue = 0;
  let highPriorityCount = 0;

  const unitDistribution: Record<string, { total: number; completed: number; overdue: number }> = {};

  tasks.forEach((task) => {
    const status = getTaskStatus(task, now);
    const unit = task.unit?.trim() || 'Chưa phân loại';

    if (!unitDistribution[unit]) {
      unitDistribution[unit] = { total: 0, completed: 0, overdue: 0 };
    }
    unitDistribution[unit].total += 1;

    if (task.priority === 'high') {
      highPriorityCount += 1;
    }

    if (status === 'completed') {
      completed += 1;
      unitDistribution[unit].completed += 1;
    } else if (status === 'overdue') {
      overdue += 1;
      unitDistribution[unit].overdue += 1;
    } else if (status === 'in_progress') {
      inProgress += 1;
    } else {
      pending += 1;
    }
  });

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    total,
    completed,
    inProgress,
    pending,
    overdue,
    completionRate,
    highPriorityCount,
    unitDistribution
  };
}

export interface TrendDataPoint {
  label: string;
  completed: number;
  created: number;
  overdue: number;
}

/**
 * Calculates work completion, creation, and overdue trends over the last 7 days.
 */
export function calculateWeeklyTrend(tasks: Task[], refDate = new Date()): TrendDataPoint[] {
  const points: TrendDataPoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(refDate);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);

    const nextD = new Date(d);
    nextD.setDate(nextD.getDate() + 1);

    const dayName = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d.getDay()];
    const label = `${dayName} (${d.getDate()}/${d.getMonth() + 1})`;

    let completed = 0;
    let created = 0;
    let overdue = 0;

    tasks.forEach((t) => {
      if (t.completedAt) {
        const compTime = new Date(t.completedAt).getTime();
        if (compTime >= d.getTime() && compTime < nextD.getTime()) {
          completed++;
        }
      }
      const createTime = new Date(t.createdAt).getTime();
      if (createTime >= d.getTime() && createTime < nextD.getTime()) {
        created++;
      }
      if (t.status === 'overdue') {
        const dueTime = new Date(t.dueDate).getTime();
        if (dueTime >= d.getTime() && dueTime < nextD.getTime()) {
          overdue++;
        }
      }
    });

    points.push({ label, completed, created, overdue });
  }
  return points;
}

/**
 * Calculates work completion, creation, and overdue trends over the last 6 months.
 */
export function calculateMonthlyTrend(tasks: Task[], refDate = new Date()): TrendDataPoint[] {
  const points: TrendDataPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(refDate.getFullYear(), refDate.getMonth() - i, 1);
    const nextM = new Date(refDate.getFullYear(), refDate.getMonth() - i + 1, 1);
    const label = `Thg ${d.getMonth() + 1}/${d.getFullYear()}`;

    let completed = 0;
    let created = 0;
    let overdue = 0;

    tasks.forEach((t) => {
      if (t.completedAt) {
        const compTime = new Date(t.completedAt).getTime();
        if (compTime >= d.getTime() && compTime < nextM.getTime()) {
          completed++;
        }
      }
      const createTime = new Date(t.createdAt).getTime();
      if (createTime >= d.getTime() && createTime < nextM.getTime()) {
        created++;
      }
      if (t.status === 'overdue') {
        const dueTime = new Date(t.dueDate).getTime();
        if (dueTime >= d.getTime() && dueTime < nextM.getTime()) {
          overdue++;
        }
      }
    });

    points.push({ label, completed, created, overdue });
  }
  return points;
}

/**
 * Intelligent local AI / rule-based advisor fallback if server AI is unavailable.
 * Fully computes:
 * 1. Overview metrics
 * 2. Active tasks & subtasks execution health
 * 3. Weekly archive completion velocity and lead time
 * 4. System pragmatism assessment & User management maturity score
 */
export function generateLocalStrategicReview(tasks: Task[], now = new Date()): AIStrategicReview {
  const stats = calculateDashboardStats(tasks, now);
  const oneDayMs = 24 * 60 * 60 * 1000;
  const sevenDaysAgo = new Date(now.getTime() - 7 * oneDayMs);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * oneDayMs);

  const completedTasks = tasks.filter((t) => t.status === 'completed' || t.progress === 100);
  const activeTasks = tasks.filter((t) => t.status !== 'completed' && t.progress < 100);
  const overdueTasks = tasks.filter((t) => t.status === 'overdue');
  const urgentTasks = activeTasks.filter((t) => t.priority === 'high');

  // 1. Weekly Archive Analysis
  const thisWeekCompleted = completedTasks.filter((t) => {
    if (!t.completedAt) return false;
    return new Date(t.completedAt).getTime() >= sevenDaysAgo.getTime();
  });

  const lastWeekCompleted = completedTasks.filter((t) => {
    if (!t.completedAt) return false;
    const comp = new Date(t.completedAt).getTime();
    return comp >= fourteenDaysAgo.getTime() && comp < sevenDaysAgo.getTime();
  });

  const earlierCompleted = completedTasks.filter((t) => {
    if (!t.completedAt) return false;
    return new Date(t.completedAt).getTime() < fourteenDaysAgo.getTime();
  });

  let totalLeadTimeDays = 0;
  let onTimeCompletedCount = 0;
  completedTasks.forEach((t) => {
    if (t.completedAt && t.createdAt) {
      const lead = Math.max(0, (new Date(t.completedAt).getTime() - new Date(t.createdAt).getTime()) / oneDayMs);
      totalLeadTimeDays += lead;
    }
    if (t.completedAt && t.dueDate) {
      if (new Date(t.completedAt).getTime() <= new Date(t.dueDate).getTime()) {
        onTimeCompletedCount++;
      }
    }
  });

  const avgLeadTimeDays = completedTasks.length > 0 ? +(totalLeadTimeDays / completedTasks.length).toFixed(1) : 0;
  const onTimeRate = completedTasks.length > 0 ? Math.round((onTimeCompletedCount / completedTasks.length) * 100) : 100;
  const weeklyVelocity = +(completedTasks.length / 2).toFixed(1); // normalized over active period

  const weeklySummaryText =
    thisWeekCompleted.length > 0
      ? `Tuần này đã nghiệm thu ${thisWeekCompleted.length} nhiệm vụ (tuần trước: ${lastWeekCompleted.length} nhiệm vụ). Tốc độ giải quyết đạt mức ổn định với thời gian hoàn tất trung bình ${avgLeadTimeDays} ngày/việc.`
      : `Đang có ${completedTasks.length} nhiệm vụ hoàn tất được lưu trữ trong kho. Tỷ lệ giao việc đúng hạn đạt ${onTimeRate}%.`;

  // 2. System Pragmatism Assessment
  const tasksWithSubtasks = tasks.filter((t) => t.subtasks && t.subtasks.length > 0).length;
  const tasksWithAttachments = tasks.filter((t) => (t.attachments && t.attachments.length > 0) || (t.links && t.links.length > 0)).length;
  const tasksWithUnit = tasks.filter((t) => t.unit && t.unit.trim().length > 0).length;
  const tasksWithDueDate = tasks.filter((t) => Boolean(t.dueDate)).length;

  const subtaskUtilizationRate = tasks.length > 0 ? Math.round((tasksWithSubtasks / tasks.length) * 100) : 0;
  const attachmentUtilizationRate = tasks.length > 0 ? Math.round((tasksWithAttachments / tasks.length) * 100) : 0;
  const unitAssignmentRate = tasks.length > 0 ? Math.round((tasksWithUnit / tasks.length) * 100) : 0;
  const deadlinePrecisionRate = tasks.length > 0 ? Math.round((tasksWithDueDate / tasks.length) * 100) : 100;

  let pragmatismScore = Math.round(
    subtaskUtilizationRate * 0.35 +
    attachmentUtilizationRate * 0.25 +
    unitAssignmentRate * 0.25 +
    deadlinePrecisionRate * 0.15
  );
  pragmatismScore = Math.max(40, Math.min(98, pragmatismScore));

  let pragmatismGrade = 'Thực chiến Khá';
  if (pragmatismScore >= 85) pragmatismGrade = 'Rất cao - Thực chiến tối đa';
  else if (pragmatismScore >= 70) pragmatismGrade = 'Thực chiến Tốt & Chuẩn hóa';
  else if (pragmatismScore < 60) pragmatismGrade = 'Cần gia tăng minh chứng & phân rã việc';

  const practicalStrengths: string[] = [];
  const practicalGaps: string[] = [];

  if (subtaskUtilizationRate >= 75) {
    practicalStrengths.push(`Tỷ lệ chia nhỏ nhiệm vụ thành checklists đạt ${subtaskUtilizationRate}%, giúp kiểm soát sát sao từng đầu việc con.`);
  } else {
    practicalGaps.push('Nhiều nhiệm vụ chưa được bẻ nhỏ thành subtasks, dễ dẫn đến chậm tiến độ khi thực thi.');
  }

  if (attachmentUtilizationRate >= 60) {
    practicalStrengths.push(`Có ${attachmentUtilizationRate}% nhiệm vụ được gắn tệp/link minh chứng, đảm bảo tính pháp lý và lưu trữ hồ sơ.`);
  } else {
    practicalGaps.push('Nên bổ sung tài liệu đính kèm hoặc link Google Drive vào nhiệm vụ để phục vụ công tác nghiệm thu.');
  }

  if (unitAssignmentRate >= 85) {
    practicalStrengths.push('100% nhiệm vụ được phân công rõ ràng cho từng đơn vị sinh hoạt cụ thể, không bị chồng chéo.');
  }

  // 3. Task Execution Health
  let healthLevel: 'healthy' | 'warning' | 'critical' = 'healthy';
  let healthLabel = 'Tiến độ Ổn định & Lành mạnh';

  if (overdueTasks.length >= 3) {
    healthLevel = 'critical';
    healthLabel = 'Cảnh báo Đỏ: Tồn đọng quá hạn nghiêm trọng';
  } else if (overdueTasks.length > 0 || urgentTasks.length >= 4) {
    healthLevel = 'warning';
    healthLabel = 'Cần lưu ý: Có việc quá hạn và áp lực việc khẩn';
  }

  const bottlenecks: string[] = [];
  const immediateRisks: string[] = [];

  if (overdueTasks.length > 0) {
    bottlenecks.push(`Hiện có ${overdueTasks.length} nhiệm vụ trễ hạn chót (${overdueTasks.map((t) => t.title).slice(0, 2).join('; ')}...).`);
    immediateRisks.push(`Cần xử lý khẩn cấp ${overdueTasks.length} việc quá hạn để tránh ảnh hưởng đến chỉ tiêu thi đua.`);
  }

  if (urgentTasks.length > 0) {
    bottlenecks.push(`Khối lượng việc gấp ưu tiên cao đang mở: ${urgentTasks.length} nhiệm vụ.`);
  }

  if (bottlenecks.length === 0) {
    bottlenecks.push('Quy trình xử lý trôi chảy, không có nhiệm vụ nào bị ùn tắc quá hạn.');
  }

  // 4. User Management Capability & Maturity & Strict 0/100 Initial Score Rule
  let score = 0;
  let grade = 'Khởi điểm (0/100)';

  if (completedTasks.length === 0) {
    // Initial state: strictly 0/100 until user finishes their first task
    score = 0;
    grade = 'Khởi điểm (0/100)';
  } else {
    // Dynamic score accumulation as tasks are completed and quality is maintained
    const completionPart = Math.round((completedTasks.length / Math.max(1, tasks.length)) * 40); // 0 - 40 pts
    const onTimePart = Math.round((onTimeRate / 100) * 25); // 0 - 25 pts
    const subtaskPart = Math.round((subtaskUtilizationRate / 100) * 15); // 0 - 15 pts
    const attachmentPart = Math.round((attachmentUtilizationRate / 100) * 10); // 0 - 10 pts
    const volumeBonus = Math.min(10, completedTasks.length * 2); // 0 - 10 pts
    const overduePenalty = Math.min(30, stats.overdue * 7);

    let rawScore = completionPart + onTimePart + subtaskPart + attachmentPart + volumeBonus - overduePenalty;
    score = Math.max(10, Math.min(100, Math.round(rawScore)));

    if (score >= 90) grade = 'Xuất sắc (A+)';
    else if (score >= 80) grade = 'Tốt (A)';
    else if (score >= 65) grade = 'Khá (B)';
    else if (score >= 50) grade = 'Trung bình (C)';
    else grade = 'Cần cải thiện (D)';
  }

  const planningScore = tasks.length === 0 ? 0 : Math.min(95, Math.max(20, Math.round(deadlinePrecisionRate * 0.6 + unitAssignmentRate * 0.4)));
  const executionDisciplineScore = completedTasks.length === 0 ? 0 : Math.min(95, Math.max(20, Math.round(onTimeRate * 0.7 + stats.completionRate * 0.3)));
  const deadlineControlScore = tasks.length === 0 ? 100 : Math.max(20, Math.min(100, Math.round(100 - stats.overdue * 20)));
  const crossUnitCoordinationScore = tasks.length === 0 ? 0 : Math.min(95, Math.max(30, Math.round(unitAssignmentRate * 0.6 + stats.completionRate * 0.4)));

  const capabilityScore = tasks.length === 0 
    ? 0 
    : Math.round((planningScore + executionDisciplineScore + deadlineControlScore + crossUnitCoordinationScore) / 4);

  let maturityStage = 'Cấp 1: Thiết Lập & Khởi Đầu';
  if (capabilityScore >= 88) maturityStage = 'Cấp 5: Lãnh Đạo Điều Hành Xuất Sắc';
  else if (capabilityScore >= 75) maturityStage = 'Cấp 4: Quản Trị Linh Hoạt & Chiến Lược';
  else if (capabilityScore >= 60) maturityStage = 'Cấp 3: Thực Thi Kỷ Luật & Chuẩn Hóa';
  else if (capabilityScore >= 40) maturityStage = 'Cấp 2: Quản Lý Đang Hoàn Thiện';

  const userStrengths: string[] = [];
  const userGrowthAreas: string[] = [];

  if (completedTasks.length > 0) {
    if (onTimeRate >= 80) {
      userStrengths.push('Kỷ luật thời gian vững vàng, tỷ lệ hoàn thành đúng hẹn đạt mức cao.');
    }
    if (subtaskUtilizationRate >= 70) {
      userStrengths.push('Khả năng bẻ khóa mục tiêu và phân rã công việc chi tiết thành checklist con.');
    }
  }

  if (userStrengths.length === 0) {
    userStrengths.push(
      tasks.length === 0
        ? 'Hệ thống đã sẵn sàng đón nhận các nhiệm vụ và mục tiêu công tác mới của bạn.'
        : 'Đã thiết lập danh sách nhiệm vụ cần làm rõ ràng.'
    );
  }

  if (stats.overdue > 0) {
    userGrowthAreas.push(`Cần siết chặt kiểm soát ${stats.overdue} việc quá hạn để triệt tiêu tỷ lệ trễ.`);
  }
  if (completedTasks.length === 0 && tasks.length > 0) {
    userGrowthAreas.push('Ưu tiên hoàn thành nghiệm thu nhiệm vụ đầu tiên để kích hoạt tích lũy điểm hiệu suất.');
  }
  if (subtaskUtilizationRate < 70 && tasks.length > 0) {
    userGrowthAreas.push('Nên tận dụng AI phân rã nhiệm vụ lớn để kiểm soát các đầu việc con dễ dàng hơn.');
  }
  if (userGrowthAreas.length === 0) {
    userGrowthAreas.push('Tiếp tục duy trì nhịp độ hoàn tất và cập nhật minh chứng kết quả.');
  }

  // 5. Gap Analysis (Thiếu sót ở mục nào, nội dung nào)
  const gaps: Array<{
    id: string;
    category: 'completion' | 'subtasks' | 'deadline' | 'unit' | 'attachments';
    title: string;
    description: string;
    recommendation: string;
    severity: 'critical' | 'warning' | 'info';
  }> = [];

  if (completedTasks.length === 0) {
    gaps.push({
      id: 'gap-no-completed',
      category: 'completion',
      title: 'Thiếu nhiệm vụ hoàn thành trong Kho Lưu Trữ (Điểm hiện tại: 0/100)',
      description: 'Hệ thống bắt đầu ở mức 0/100 điểm. Bạn chưa có nhiệm vụ nào hoàn tất 100% để nghiệm thu vào ArchiveVault.',
      recommendation: 'Chọn một nhiệm vụ ưu tiên, tích chọn hoàn thành các subtasks và lưu trữ để bắt đầu tích lũy điểm năng suất.',
      severity: 'critical',
    });
  }

  if (stats.overdue > 0) {
    gaps.push({
      id: 'gap-overdue',
      category: 'deadline',
      title: `Có ${stats.overdue} nhiệm vụ đã trễ hạn chót`,
      description: 'Nhiệm vụ quá hạn làm giảm nghiêm trọng điểm kiểm soát rủi ro và kéo lùi chỉ số hiệu suất tổng hợp.',
      recommendation: 'Thực hiện dập lửa ngay hôm nay hoặc điều chỉnh lại thời hạn thực tế nếu có phát sinh khách quan.',
      severity: 'critical',
    });
  }

  const tasksWithoutSubtasks = tasks.filter((t) => !t.subtasks || t.subtasks.length === 0);
  if (tasksWithoutSubtasks.length > 0) {
    gaps.push({
      id: 'gap-subtasks',
      category: 'subtasks',
      title: `Còn ${tasksWithoutSubtasks.length} nhiệm vụ chưa được phân rã subtasks`,
      description: 'Nhiệm vụ để nguyên khối với mô tả dài mà không chia nhỏ sẽ rất khó theo dõi tiến độ chính xác theo tỷ lệ %.',
      recommendation: 'Bấm vào chỉnh sửa nhiệm vụ và dùng tính năng "AI Phân rã nhiệm vụ lớn (WBS)" để tự động tạo 4-6 việc con.',
      severity: 'warning',
    });
  }

  const tasksWithoutAttachments = tasks.filter((t) => (!t.attachments || t.attachments.length === 0) && (!t.links || t.links.length === 0));
  if (tasksWithoutAttachments.length > 0 && tasks.length > 0) {
    gaps.push({
      id: 'gap-attachments',
      category: 'attachments',
      title: `Còn ${tasksWithoutAttachments.length} nhiệm vụ thiếu hồ sơ/link minh chứng`,
      description: 'Thiếu tệp đính kèm văn bản, quyết định hoặc đường link Google Docs/Drive dẫn chứng kết quả.',
      recommendation: 'Tải lên tài liệu hoặc dán link báo cáo liên quan để bảo đảm tính thực chiến và dễ nghiệm thu.',
      severity: 'info',
    });
  }

  // 6. Strategic Recommendations
  const recommendations: StrategicRecommendation[] = [];

  if (stats.overdue > 0) {
    recommendations.push({
      id: 'rec-1',
      title: 'Chiến thuật Dập lửa 90 phút đầu ngày',
      detail: `Tập trung giải quyết dứt điểm ${stats.overdue} nhiệm vụ đã quá hạn chót hoặc thương lượng dời mốc nghiệm thu hợp lý.`,
      tag: 'Cấp bách',
      impact: 'high',
      timeframe: 'today',
    });
  }

  if (completedTasks.length === 0) {
    recommendations.push({
      id: 'rec-start',
      title: 'Khai thông dòng chảy công việc (Quick Win)',
      detail: 'Chọn 1 nhiệm vụ nhỏ nhất, hoàn tất checklist và nghiệm thu để mở điểm năng suất ban đầu vượt qua mốc 0/100.',
      tag: 'Khởi đầu nhanh',
      impact: 'high',
      timeframe: 'today',
    });
  }

  recommendations.push({
    id: 'rec-2',
    title: 'Phân rã nhiệm vụ lớn bằng AI (WBS)',
    detail: 'Với những công việc có mô tả dài hoặc phức tạp, sử dụng nút "AI Phân rã nhiệm vụ lớn" trong biểu mẫu để chia nhỏ công việc.',
    tag: 'Tối ưu phân rã',
    impact: 'high',
    timeframe: 'this_week',
  });

  recommendations.push({
    id: 'rec-3',
    title: 'Đồng bộ hóa ngoại tuyến & Lịch công tác',
    detail: 'Hệ thống tự động lưu trữ trên máy khi offline và đồng bộ lên máy chủ ngay khi có mạng. Tận dụng liên kết Google Calendar để nhắc việc.',
    tag: 'Đồng bộ hệ thống',
    impact: 'medium',
    timeframe: 'this_week',
  });

  let overallSummary = '';
  if (completedTasks.length === 0) {
    overallSummary = tasks.length === 0
      ? 'Hệ thống đang ở trạng thái mới hoàn toàn (0/100 điểm). Hãy tạo nhiệm vụ đầu tiên và hoàn tất các hạng mục để cố vấn AI bắt đầu chấm điểm và định hướng chiến lược.'
      : `Bạn đang có ${tasks.length} nhiệm vụ đang mở nhưng chưa có nhiệm vụ nào hoàn tất (Điểm: 0/100). Hãy nghiệm thu các nhiệm vụ đầu tiên để bắt đầu tăng điểm năng suất!`;
  } else {
    overallSummary = `Hệ thống ghi nhận tổng cộng ${stats.total} nhiệm vụ (${stats.completed} đã hoàn thành, ${stats.inProgress} đang thực hiện, ${stats.overdue} quá hạn). Điểm năng suất đạt ${score}/100 (${grade}), năng lực quản trị đạt ${capabilityScore}/100.`;
  }

  return {
    score,
    grade,
    overallSummary,
    completionRate: stats.completionRate,
    onTimeRate,
    averageVelocityDays: avgLeadTimeDays,
    weeklyArchiveAnalysis: {
      thisWeekCompletedCount: thisWeekCompleted.length,
      lastWeekCompletedCount: lastWeekCompleted.length,
      earlierCompletedCount: earlierCompleted.length,
      averageLeadTimeDays: avgLeadTimeDays,
      onTimeCompletionRate: onTimeRate,
      weeklyVelocity,
      weeklySummaryText,
    },
    systemPragmatism: {
      pragmatismScore,
      pragmatismGrade,
      subtaskUtilizationRate,
      attachmentUtilizationRate,
      deadlinePrecisionRate,
      unitAssignmentRate,
      assessmentSummary: `Người dùng khai thác hệ thống với mức độ thực chiến: ${subtaskUtilizationRate}% việc có checklists cụ thể, ${attachmentUtilizationRate}% có tài liệu minh chứng, và ${unitAssignmentRate}% được gán đơn vị rõ ràng.`,
      practicalStrengths,
      practicalGaps,
    },
    taskExecution: {
      healthLevel,
      healthLabel,
      urgentPendingCount: urgentTasks.length,
      overdueCount: overdueTasks.length,
      inProgressCount: activeTasks.length,
      executionSummary: `Hiện có ${activeTasks.length} nhiệm vụ đang mở, trong đó có ${urgentTasks.length} việc ưu tiên cao và ${overdueTasks.length} việc quá hạn.`,
      bottlenecks,
      immediateRisks,
    },
    userManagement: {
      capabilityScore,
      maturityStage,
      planningScore,
      executionDisciplineScore,
      deadlineControlScore,
      crossUnitCoordinationScore,
      strengths: userStrengths,
      growthAreas: userGrowthAreas,
      coachingGuidance:
        stats.overdue > 0
          ? 'Hãy chuyển từ thế bị động xử lý việc gấp sang chủ động chặn trước rủi ro. Dành 15 phút rà soát deadline mỗi ngày.'
          : completedTasks.length === 0
          ? 'Hãy bắt đầu với những nhiệm vụ đầu tiên để kích hoạt chỉ số năng suất và tạo đà bứt phá!'
          : 'Phong độ quản lý rất ấn tượng! Tiếp tục giữ vững kỷ luật thời gian và bám sát các mục tiêu tuần.',
    },
    gaps,
    strengths: userStrengths,
    bottlenecks,
    recommendations,
    analyzedAt: new Date().toISOString(),
  };
}

