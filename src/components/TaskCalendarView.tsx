import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  Clock,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Building2,
  ExternalLink,
  Edit3,
  Trash2,
  Download,
  CalendarCheck2,
  X,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Task, Subtask, TaskPriority, TaskStatus } from '../types/task';
import {
  formatDateKey,
  getCalendarGrid,
  groupTasksByDueDateKey,
  getMonthYearLabel,
  getMonthlyStats,
  DAYS_OF_WEEK_HEADERS,
  CalendarDay,
} from '../utils/calendarUtils';
import {
  calculateProgress,
  formatDateVietnamese,
  generateGoogleCalendarUrl,
  generateIcsContent,
} from '../utils/taskCalculations';

interface TaskCalendarViewProps {
  tasks: Task[];
  onUpdateTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onArchiveTask: (task: Task) => void;
  onOpenCreateModal: (defaultDueDate?: string) => void;
  units: string[];
  searchQuery?: string;
}

export const TaskCalendarView: React.FC<TaskCalendarViewProps> = ({
  tasks,
  onUpdateTask,
  onEditTask,
  onDeleteTask,
  onArchiveTask,
  onOpenCreateModal,
  units,
  searchQuery = '',
}) => {
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => formatDateKey(today), [today]);

  // Current calendar month & year
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth());

  // Selected date key for the day inspector drawer (defaults to today)
  const [selectedDateKey, setSelectedDateKey] = useState<string>(todayKey);

  // Filter toggles inside calendar view
  const [showCompleted, setShowCompleted] = useState<boolean>(true);
  const [calendarUnit, setCalendarUnit] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Navigate months
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleJumpToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDateKey(todayKey);
  };

  // Filter tasks based on settings
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Completed filter
      if (!showCompleted && (t.status === 'completed' || t.progress === 100)) {
        return false;
      }
      // Unit filter
      if (calendarUnit !== 'all' && t.unit !== calendarUnit) {
        return false;
      }
      // Priority filter
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchTitle = (t.title || '').toLowerCase().includes(q);
        const matchDesc = (t.description || '').toLowerCase().includes(q);
        const matchUnit = (t.unit || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchUnit) return false;
      }
      return true;
    });
  }, [tasks, showCompleted, calendarUnit, priorityFilter, searchQuery]);

  // Monthly statistics
  const monthlyStats = useMemo(() => {
    return getMonthlyStats(tasks, currentYear, currentMonth);
  }, [tasks, currentYear, currentMonth]);

  // Group tasks by their due date YYYY-MM-DD
  const tasksByDate = useMemo(() => {
    return groupTasksByDueDateKey(filteredTasks);
  }, [filteredTasks]);

  // Calendar days grid
  const calendarDays = useMemo(() => {
    return getCalendarGrid(currentYear, currentMonth, today);
  }, [currentYear, currentMonth, today]);

  // Tasks due on the currently selected date
  const selectedDateTasks = useMemo(() => {
    return tasksByDate[selectedDateKey] || [];
  }, [tasksByDate, selectedDateKey]);

  // Formatted date string for selected date
  const selectedDateDisplay = useMemo(() => {
    if (!selectedDateKey) return '';
    const [y, m, d] = selectedDateKey.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const daysName = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    return `${daysName[dateObj.getDay()]}, ngày ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
  }, [selectedDateKey]);

  // Toggle subtask directly from day inspector
  const handleToggleSubtask = (task: Task, subtaskId: string) => {
    const updatedSubtasks = task.subtasks.map((s) =>
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    );
    const newProgress = calculateProgress(updatedSubtasks);
    const isNowFinished = newProgress === 100;

    const updatedTask: Task = {
      ...task,
      subtasks: updatedSubtasks,
      progress: newProgress,
      status: isNowFinished
        ? 'completed'
        : new Date(task.dueDate).getTime() < Date.now()
        ? 'overdue'
        : newProgress > 0
        ? 'in_progress'
        : 'pending',
      completedAt: isNowFinished ? new Date().toISOString() : undefined,
    };

    onUpdateTask(updatedTask);
  };

  const handleDownloadIcs = (task: Task) => {
    const icsContent = generateIcsContent(task);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `${(task.title || 'nhiem_vu').slice(0, 30)}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. Header Toolbar: Navigation, Month Title & Quick Filters */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Month Navigation */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Tháng trước"
              className="p-2 rounded-xl text-slate-700 hover:text-slate-950 hover:bg-white transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleJumpToToday}
              className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-indigo-600 hover:bg-white rounded-xl transition-all cursor-pointer"
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Tháng tiếp theo"
              className="p-2 rounded-xl text-slate-700 hover:text-slate-950 hover:bg-white transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-indigo-600 shrink-0" />
              <span>{getMonthYearLabel(currentYear, currentMonth)}</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Chế độ lịch biểu theo hạn chót nhiệm vụ (Due Date)
            </p>
          </div>
        </div>

        {/* Filters & Action */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Unit selector */}
          <select
            value={calendarUnit}
            onChange={(e) => setCalendarUnit(e.target.value)}
            aria-label="Lọc đơn vị trong lịch"
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 outline-hidden hover:border-slate-300 transition-colors cursor-pointer"
          >
            <option value="all">Tất cả đơn vị</option>
            {units.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>

          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            aria-label="Lọc mức độ ưu tiên"
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 outline-hidden hover:border-slate-300 transition-colors cursor-pointer"
          >
            <option value="all">Tất cả ưu tiên</option>
            <option value="high">🔥 Ưu tiên cao (Gấp)</option>
            <option value="medium">⚡ Trung bình</option>
            <option value="low">🌱 Tiêu chuẩn</option>
          </select>

          {/* Toggle show completed */}
          <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer transition-colors select-none">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="w-3.5 h-3.5 text-indigo-600 rounded-sm focus:ring-indigo-500 cursor-pointer"
            />
            <span>Đã hoàn thành</span>
          </label>

          {/* Primary Create Task button */}
          <button
            type="button"
            onClick={() => {
              const defaultDue = selectedDateKey ? `${selectedDateKey}T17:00:00` : undefined;
              onOpenCreateModal(defaultDue);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm nhiệm vụ</span>
          </button>
        </div>
      </div>

      {/* 2. Monthly Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Hết hạn trong tháng</div>
          <div className="text-xl font-extrabold text-slate-900 mt-0.5 font-mono tabular-nums">
            {monthlyStats.totalDue}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1">
            <Flame className="w-3 h-3" />
            Việc gấp / ưu tiên cao
          </div>
          <div className="text-xl font-extrabold text-rose-700 mt-0.5 font-mono tabular-nums">
            {monthlyStats.highPriorityCount}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Quá hạn / Trễ việc
          </div>
          <div className="text-xl font-extrabold text-amber-700 mt-0.5 font-mono tabular-nums">
            {monthlyStats.overdueCount}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Đang thực hiện
          </div>
          <div className="text-xl font-extrabold text-blue-700 mt-0.5 font-mono tabular-nums">
            {monthlyStats.inProgressCount}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs col-span-2 sm:col-span-1">
          <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Đã nghiệm thu
          </div>
          <div className="text-xl font-extrabold text-emerald-700 mt-0.5 font-mono tabular-nums">
            {monthlyStats.completedCount}
          </div>
        </div>
      </div>

      {/* 3. Main Calendar Layout: Grid + Selected Date Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Calendar Grid (8 cols on desktop) */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-center text-xs font-bold">
            {DAYS_OF_WEEK_HEADERS.map((col) => (
              <div
                key={col.short}
                className={`py-3 px-1 border-r last:border-r-0 border-slate-200/70 ${
                  col.isWeekend ? 'text-rose-600 bg-rose-50/20' : 'text-slate-700'
                }`}
              >
                <span className="block sm:hidden">{col.short}</span>
                <span className="hidden sm:block">{col.full}</span>
              </div>
            ))}
          </div>

          {/* 7-Column Calendar Grid Cells */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100">
            {calendarDays.map((day: CalendarDay) => {
              const dayTasks = tasksByDate[day.dateKey] || [];
              const hasTasks = dayTasks.length > 0;
              const isSelected = selectedDateKey === day.dateKey;

              return (
                <div
                  key={day.dateKey}
                  onClick={() => setSelectedDateKey(day.dateKey)}
                  className={`min-h-[95px] sm:min-h-[110px] p-1.5 sm:p-2 transition-all flex flex-col justify-between group cursor-pointer relative ${
                    !day.isCurrentMonth
                      ? 'bg-slate-50/50 text-slate-400'
                      : isSelected
                      ? 'bg-indigo-50/40 ring-2 ring-indigo-500/80 ring-inset z-10'
                      : 'bg-white hover:bg-slate-50/90'
                  }`}
                >
                  {/* Top Bar of Day: Day number & Add Task quick button */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center justify-center text-xs font-bold font-mono tabular-nums rounded-lg w-6 h-6 ${
                        day.isToday
                          ? 'bg-indigo-600 text-white font-extrabold shadow-2xs'
                          : isSelected
                          ? 'bg-indigo-100 text-indigo-900 font-extrabold'
                          : day.isCurrentMonth
                          ? 'text-slate-800'
                          : 'text-slate-400'
                      }`}
                    >
                      {day.dayNumber}
                    </span>

                    <div className="flex items-center gap-1">
                      {hasTasks && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md font-mono tabular-nums ${
                            dayTasks.some((t) => t.status === 'overdue')
                              ? 'bg-rose-100 text-rose-800'
                              : dayTasks.some((t) => t.priority === 'high')
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                          title={`${dayTasks.length} nhiệm vụ hết hạn vào ngày này`}
                        >
                          {dayTasks.length}
                        </span>
                      )}

                      {/* Quick + button on hover */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDateKey(day.dateKey);
                          onOpenCreateModal(`${day.dateKey}T17:00:00`);
                        }}
                        aria-label={`Thêm nhiệm vụ ngày ${day.dateKey}`}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded-md hover:bg-indigo-100 text-indigo-700 transition-opacity cursor-pointer"
                        title="Tạo nhiệm vụ có hạn chót ngày này"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Task Chips for Day */}
                  <div className="space-y-1 my-1 flex-1 overflow-hidden">
                    {dayTasks.slice(0, 2).map((task) => {
                      const isOverdue = task.status === 'overdue';
                      const isCompleted = task.status === 'completed' || task.progress === 100;
                      const isHigh = task.priority === 'high';

                      return (
                        <div
                          key={task.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDateKey(day.dateKey);
                          }}
                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium truncate flex items-center gap-1 border transition-all ${
                            isCompleted
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 line-through'
                              : isOverdue
                              ? 'bg-rose-50 text-rose-800 border-rose-200 font-semibold'
                              : isHigh
                              ? 'bg-amber-50 text-amber-900 border-amber-200 font-semibold'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                          title={`${task.title} (${task.unit || 'Đơn vị'})`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              isCompleted
                                ? 'bg-emerald-500'
                                : isOverdue
                                ? 'bg-rose-500'
                                : isHigh
                                ? 'bg-amber-500'
                                : 'bg-slate-400'
                            }`}
                          />
                          <span className="truncate">{task.title}</span>
                        </div>
                      );
                    })}

                    {dayTasks.length > 2 && (
                      <div className="text-[10px] text-indigo-700 font-bold px-1 hover:underline">
                        +{dayTasks.length - 2} việc nữa...
                      </div>
                    )}
                  </div>

                  {/* Subtle bottom indicator */}
                  <div className="h-0.5" />
                </div>
              );
            })}
          </div>

          {/* Grid Legend Footer */}
          <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>Quá hạn / Trễ việc</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Việc ưu tiên cao (Gấp)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                <span>Đang thực hiện / Tiêu chuẩn</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Đã nghiệm thu</span>
              </span>
            </div>

            <div className="text-slate-400 text-[11px]">
              Bấm vào bất kỳ ô ngày nào để xem danh sách nhiệm vụ chi tiết
            </div>
          </div>
        </div>

        {/* Selected Date Inspector (4 cols on desktop) */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 space-y-4 sticky top-6">
          <div className="flex items-start justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1">
                <CalendarIcon className="w-3.5 h-3.5" />
                Chi tiết ngày được chọn
              </span>
              <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                {selectedDateDisplay}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedDateTasks.length} nhiệm vụ hết hạn vào ngày này
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                const defaultDue = selectedDateKey ? `${selectedDateKey}T17:00:00` : undefined;
                onOpenCreateModal(defaultDue);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition-colors cursor-pointer"
              title="Thêm nhiệm vụ hết hạn vào ngày này"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm việc</span>
            </button>
          </div>

          {/* List of Tasks Due on Selected Date */}
          {selectedDateTasks.length === 0 ? (
            <div className="text-center py-10 px-4 space-y-3 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-500 mx-auto flex items-center justify-center">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-800">Không có hạn chót trong ngày này</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Bạn có thể lên lịch hoặc tạo nhiệm vụ mới có thời hạn hoàn thành vào ngày này.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenCreateModal(`${selectedDateKey}T17:00:00`)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tạo nhiệm vụ ngày này</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {selectedDateTasks.map((task) => {
                const isOverdue = task.status === 'overdue';
                const isCompleted = task.status === 'completed' || task.progress === 100;
                const calUrl = generateGoogleCalendarUrl({
                  title: task.title,
                  description: task.description,
                  createdAt: task.createdAt,
                  dueDate: task.dueDate,
                  unit: task.unit,
                });

                return (
                  <div
                    key={task.id}
                    className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                      isCompleted
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : isOverdue
                        ? 'bg-rose-50/40 border-rose-200'
                        : task.priority === 'high'
                        ? 'bg-amber-50/40 border-amber-200'
                        : 'bg-slate-50/50 border-slate-200'
                    }`}
                  >
                    {/* Header: Title & Priority */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              task.priority === 'high'
                                ? 'bg-rose-100 text-rose-800'
                                : task.priority === 'medium'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {task.priority === 'high'
                              ? '🔥 Ưu tiên cao'
                              : task.priority === 'medium'
                              ? '⚡ Trung bình'
                              : '🌱 Tiêu chuẩn'}
                          </span>

                          <span className="text-[10px] text-slate-500 font-medium">
                            {task.unit || 'Đơn vị thực hiện'}
                          </span>
                        </div>

                        <h4
                          className={`text-xs sm:text-sm font-bold text-slate-900 ${
                            isCompleted ? 'line-through text-slate-400' : ''
                          }`}
                        >
                          {task.title}
                        </h4>
                      </div>

                      {/* Progress percentage */}
                      <span className="text-xs font-extrabold font-mono tabular-nums text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md shrink-0">
                        {task.progress}%
                      </span>
                    </div>

                    {/* Due time exact */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono tabular-nums">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Hạn chót: {formatDateVietnamese(task.dueDate)}</span>
                    </div>

                    {/* Mini subtask checklist */}
                    {task.subtasks && task.subtasks.length > 0 && (
                      <div className="space-y-1.5 pt-1 border-t border-slate-200/60 text-xs">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Đầu việc con ({task.subtasks.filter((s) => s.completed).length}/
                          {task.subtasks.length})
                        </div>
                        <div className="space-y-1 max-h-28 overflow-y-auto">
                          {task.subtasks.map((s) => (
                            <label
                              key={s.id}
                              className="flex items-start gap-2 p-1.5 rounded-lg hover:bg-white/80 cursor-pointer transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={s.completed}
                                onChange={() => handleToggleSubtask(task, s.id)}
                                className="w-3.5 h-3.5 mt-0.5 text-indigo-600 rounded-sm cursor-pointer"
                              />
                              <span
                                className={`text-[11px] leading-tight ${
                                  s.completed ? 'line-through text-slate-400' : 'text-slate-700 font-medium'
                                }`}
                              >
                                {s.title}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions Toolbar */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                      <div className="flex items-center gap-1">
                        <a
                          href={calUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-white transition-colors"
                          title="Thêm vào Google Lịch"
                        >
                          <CalendarCheck2 className="w-3.5 h-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDownloadIcs(task)}
                          className="p-1 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-white transition-colors cursor-pointer"
                          title="Tải file lịch (.ics)"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEditTask(task)}
                          className="px-2 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                        >
                          Sửa
                        </button>

                        {!isCompleted && (
                          <button
                            type="button"
                            onClick={() => onArchiveTask(task)}
                            className="px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                          >
                            Xong
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onDeleteTask(task.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                          title="Xóa nhiệm vụ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
