import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  CalendarCheck2,
  ExternalLink,
  Edit3,
  Trash2,
  Download,
  Paperclip,
  ArrowUpRight,
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  Tag,
  LayoutList,
  Calendar as CalendarIcon
} from 'lucide-react';
import { Task, Subtask, TaskPriority, TaskStatus } from '../types/task';
import {
  calculateProgress,
  formatDateVietnamese,
  generateGoogleCalendarUrl,
  generateIcsContent,
  filterTasksBySearchQuery
} from '../utils/taskCalculations';
import { playNotificationSound } from '../utils/audioNotification';
import { TaskCalendarView } from './TaskCalendarView';

interface ActiveTaskListProps {
  tasks: Task[];
  onUpdateTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onArchiveTask: (task: Task) => void;
  onOpenCreateModal: (defaultDueDate?: string) => void;
  units: string[];
  initialStatusFilter?: string;
  initialViewMode?: 'list' | 'calendar';
}

/**
 * Renders text with search query occurrences highlighted in real-time.
 */
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query || !query.trim() || !text) {
    return <>{text}</>;
  }

  const trimmedQuery = query.trim();
  // Escape regex special chars
  const escaped = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-amber-200 text-amber-950 font-bold px-0.5 rounded-xs">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

export const ActiveTaskList: React.FC<ActiveTaskListProps> = ({
  tasks,
  onUpdateTask,
  onEditTask,
  onDeleteTask,
  onArchiveTask,
  onOpenCreateModal,
  units,
  initialStatusFilter = 'all',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter);
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut to focus search input (press '/' or Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') ||
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Active tasks (exclude completed)
  const activeTasks = tasks.filter((t) => t.status !== 'completed');

  // Real-time filter across search query, unit, and status
  const searchedTasks = filterTasksBySearchQuery(activeTasks, searchQuery);

  const filteredTasks = searchedTasks.filter((task) => {
    if (selectedUnit !== 'all' && task.unit !== selectedUnit) {
      return false;
    }
    if (statusFilter === 'overdue' && task.status !== 'overdue') return false;
    if (statusFilter === 'in_progress' && task.status !== 'in_progress') return false;
    if (statusFilter === 'pending' && task.status !== 'pending') return false;
    if (statusFilter === 'high' && task.priority !== 'high') return false;
    return true;
  });

  const toggleExpand = (taskId: string) => {
    setExpandedTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  // Toggle subtask directly on the task card
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

    if (isNowFinished) {
      playNotificationSound('success');
    }

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

  const handleClearSearch = () => {
    setSearchQuery('');
    searchInputRef.current?.focus();
  };

  return (
    <div className="space-y-6">
      {/* Real-time Search & Filter Card */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        {/* Main Search Input */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm nhanh nhiệm vụ theo tiêu đề hoặc mô tả... (Gõ phím / để tìm)"
              aria-label="Tìm kiếm nhiệm vụ theo tiêu đề hoặc mô tả"
              className="w-full pl-11 pr-24 py-3 text-xs sm:text-sm rounded-2xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 outline-hidden transition-all text-slate-900 placeholder:text-slate-400 font-medium"
            />
            {/* Quick Clear or Keyboard Shortcut badge */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {searchQuery ? (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                  title="Xóa tìm kiếm"
                  aria-label="Xóa từ khóa tìm kiếm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold text-slate-400 bg-slate-200/60 rounded-md border border-slate-200">
                  /
                </kbd>
              )}
            </div>
          </div>

          {/* Unit & Status Filters */}
          <div className="flex items-center gap-2">
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              aria-label="Lọc theo mảng việc làm cho đơn vị"
              className="px-3.5 py-2.5 text-xs font-semibold rounded-2xl border border-slate-200 bg-white text-slate-700 outline-hidden cursor-pointer hover:border-slate-300 transition-colors"
            >
              <option value="all">Làm cho: Tất cả đơn vị</option>
              {units.map((u) => (
                <option key={u} value={u}>
                  Làm cho: {u}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Lọc theo trạng thái"
              className="px-3.5 py-2.5 text-xs font-semibold rounded-2xl border border-slate-200 bg-white text-slate-700 outline-hidden cursor-pointer hover:border-slate-300 transition-colors"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="overdue">🚨 Quá hạn / Trễ việc</option>
              <option value="in_progress">⏳ Đang thực hiện</option>
              <option value="pending">📋 Chưa bắt đầu</option>
              <option value="high">🔥 Ưu tiên cao (Gấp)</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Chips & Match Counter Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              Lọc nhanh:
            </span>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('all');
                setSelectedUnit('all');
                setSearchQuery('');
              }}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === 'all' && selectedUnit === 'all' && !searchQuery
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất cả ({activeTasks.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'high' ? 'all' : 'high')}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === 'high'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/60'
              }`}
            >
              🔥 Việc gấp ({activeTasks.filter((t) => t.priority === 'high').length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'overdue' ? 'all' : 'overdue')}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === 'overdue'
                  ? 'bg-rose-700 text-white shadow-2xs'
                  : 'bg-rose-100/70 text-rose-800 hover:bg-rose-200/80 border border-rose-300'
              }`}
            >
              🚨 Trễ hạn ({activeTasks.filter((t) => t.status === 'overdue').length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'in_progress' ? 'all' : 'in_progress')}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === 'in_progress'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60'
              }`}
            >
              ⏳ Đang làm ({activeTasks.filter((t) => t.status === 'in_progress').length})
            </button>
          </div>

          {/* Real-time search count info */}
          <div className="text-slate-500 font-medium text-xs">
            {searchQuery ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                <span>Tìm thấy <strong>{filteredTasks.length}</strong> kết quả cho &quot;{searchQuery}&quot;</span>
              </span>
            ) : (
              <span>Hiển thị <strong>{filteredTasks.length}</strong>/{activeTasks.length} nhiệm vụ</span>
            )}
          </div>
        </div>
      </div>

      {/* Task Cards List */}
      {filteredTasks.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            {searchQuery ? <Search className="w-7 h-7" /> : <CheckCircle2 className="w-7 h-7" />}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">
              {searchQuery ? `Không tìm thấy nhiệm vụ nào khớp với "${searchQuery}"` : 'Không có nhiệm vụ nào phù hợp'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? 'Hãy thử thay đổi từ khóa tìm kiếm theo tiêu đề hoặc mô tả khác.'
                : 'Không tìm thấy nhiệm vụ nào đang diễn ra với bộ lọc hiện tại.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-2">
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                Xóa từ khóa tìm kiếm
              </button>
            )}
            <button
              onClick={() => onOpenCreateModal()}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Tạo nhiệm vụ mới
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((task) => {
            const isOverdue = task.status === 'overdue';
            const isExpanded = expandedTasks[task.id] ?? true;
            const googleCalUrl = generateGoogleCalendarUrl(task);

            return (
              <div
                key={task.id}
                className={`bg-white rounded-3xl border transition-all shadow-xs hover:shadow-md overflow-hidden ${
                  isOverdue
                    ? 'border-rose-300 ring-2 ring-rose-500/10'
                    : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                {/* Overdue Banner if applicable */}
                {isOverdue && (
                  <div className="bg-rose-500 text-white px-5 py-1.5 text-xs font-bold flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
                      NHIỆM VỤ NÀY ĐÃ QUÁ HẠN CHÓT! CẦN XỬ LÝ NGAY
                    </span>
                    <span className="text-[11px] opacity-90">Hạn: {formatDateVietnamese(task.dueDate)}</span>
                  </div>
                )}

                <div className="p-5 sm:p-6 space-y-4">
                  {/* Card Header: Unit, Priority, Dates & Status */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Unit badge */}
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100" title="Mảng việc tôi trực tiếp làm cho đơn vị này">
                        <Building2 className="w-3 h-3 text-indigo-600" />
                        <span className="text-[10px] text-indigo-500 font-medium">Làm cho:</span>
                        <HighlightMatch text={task.unit} query={searchQuery} />
                      </span>

                      {/* Priority badge */}
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                          task.priority === 'high'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : task.priority === 'medium'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {task.priority === 'high'
                          ? '🔥 Khẩn cấp'
                          : task.priority === 'medium'
                          ? '⚡ Trung bình'
                          : 'Tiêu chuẩn'}
                      </span>

                      {/* Status indicator */}
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                          task.status === 'overdue'
                            ? 'bg-rose-100 text-rose-800'
                            : task.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {task.status === 'overdue'
                          ? 'Trễ hạn'
                          : task.status === 'in_progress'
                          ? 'Đang làm'
                          : 'Chưa làm'}
                      </span>
                    </div>

                    {/* Timeline dates */}
                    <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                      <span title="Thời gian bắt đầu">
                        Tạo: <strong className="text-slate-700">{formatDateVietnamese(task.createdAt)}</strong>
                      </span>
                      <span>•</span>
                      <span
                        className={`flex items-center gap-1 ${
                          isOverdue ? 'text-rose-600 font-bold' : 'text-slate-700 font-medium'
                        }`}
                        title="Thời gian hoàn thành (Hạn chót)"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        Hạn: {formatDateVietnamese(task.dueDate)}
                      </span>
                    </div>
                  </div>

                  {/* Task Title & Description with live search highlighting */}
                  <div className="space-y-2">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">
                      <HighlightMatch text={task.title} query={searchQuery} />
                    </h3>
                    {task.description && (
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                        <HighlightMatch text={task.description} query={searchQuery} />
                      </p>
                    )}

                    {/* AI Research Insight Callout if present */}
                    {task.aiAnalysis && (
                      <div className="p-3 rounded-2xl bg-gradient-to-r from-indigo-50/80 via-violet-50/50 to-blue-50/80 border border-indigo-200/70 text-xs text-indigo-950 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-indigo-900">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>💡 AI Tham mưu chiến lược thực thi:</span>
                        </div>
                        <p className="text-[12px] text-slate-700 leading-relaxed font-normal whitespace-pre-line">
                          <HighlightMatch text={task.aiAnalysis} query={searchQuery} />
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Progress Bar & Subtasks Checklist */}
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-700 uppercase tracking-wider">Tiến độ công việc:</span>
                        <span className="text-indigo-600 font-extrabold text-sm">{task.progress}%</span>
                      </div>
                      <span className="text-slate-500 font-normal">
                        ({task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length} hạng mục hoàn thành)
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${
                          task.progress === 100
                            ? 'bg-emerald-500'
                            : isOverdue
                            ? 'bg-rose-500'
                            : 'bg-gradient-to-r from-indigo-500 to-blue-500'
                        }`}
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>

                    {/* Subtasks Accordion */}
                    <div className="border border-slate-200/80 rounded-2xl p-3 sm:p-4 bg-slate-50/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">
                          Checklist hành động của tôi (Tick để tăng % tiến độ)
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleExpand(task.id)}
                          className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                        >
                          {isExpanded ? (
                            <>
                              Thu gọn <ChevronUp className="w-3.5 h-3.5" />
                            </>
                          ) : (
                            <>
                              Mở rộng ({task.subtasks.length}) <ChevronDown className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="space-y-2 pt-1">
                          {task.subtasks.map((subtask) => (
                            <div
                              key={subtask.id}
                              className={`p-2.5 rounded-xl border transition-all flex items-start gap-2.5 ${
                                subtask.completed
                                  ? 'bg-emerald-50/70 border-emerald-200 text-slate-500'
                                  : 'bg-white border-slate-200 text-slate-800'
                              }`}
                            >
                              <input
                                type="checkbox"
                                id={`subtask-item-${task.id}-${subtask.id}`}
                                checked={subtask.completed}
                                onChange={() => handleToggleSubtask(task, subtask.id)}
                                className="mt-0.5 w-4 h-4 rounded-sm text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {subtask.phase && (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200/80 shrink-0">
                                      {subtask.phase}
                                    </span>
                                  )}
                                  <label
                                    htmlFor={`subtask-item-${task.id}-${subtask.id}`}
                                    className={`text-xs sm:text-sm font-medium cursor-pointer ${
                                      subtask.completed ? 'line-through text-slate-400' : 'text-slate-800'
                                    }`}
                                  >
                                    {subtask.title}
                                  </label>
                                </div>

                                {/* External resource reference link */}
                                {subtask.resource && (
                                  <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[10px] text-slate-400 font-semibold uppercase">
                                      Tài liệu mạng:
                                    </span>
                                    <a
                                      href={subtask.resource.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200"
                                    >
                                      <span>{subtask.resource.title}</span>
                                      <ExternalLink className="w-3 h-3 shrink-0" />
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Attachments & Links if present */}
                  {(task.attachments.length > 0 || task.links.length > 0) && (
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                      {task.attachments.map((att) => (
                        <div
                          key={att.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium"
                        >
                          <Paperclip className="w-3 h-3 text-slate-500" />
                          <span className="truncate max-w-[150px]">{att.name}</span>
                          {att.dataUrl && (
                            <a
                              href={att.dataUrl}
                              download={att.name}
                              className="text-indigo-600 hover:underline ml-1 font-bold"
                            >
                              Tải
                            </a>
                          )}
                        </div>
                      ))}

                      {task.links.map((link) => (
                        <a
                          key={link.id}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-semibold hover:underline border border-blue-100"
                        >
                          <span>{link.title}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Card Bottom Actions */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Thêm vào Google Calendar */}
                      <a
                        href={googleCalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                      >
                        <CalendarCheck2 className="w-3.5 h-3.5 text-indigo-600" />
                        Google Lịch
                        <ArrowUpRight className="w-3 h-3 opacity-60" />
                      </a>

                      {/* Download .ics */}
                      <button
                        type="button"
                        onClick={() => handleDownloadIcs(task)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium transition-colors cursor-pointer"
                        title="Tải file .ics cho Outlook / Apple Calendar"
                      >
                        <Download className="w-3 h-3" />
                        .ics
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onEditTask(task)}
                        className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                        title="Chỉnh sửa nhiệm vụ"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteTask(task.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        title="Xóa nhiệm vụ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      {/* Hoàn thành & Chuyển vào lưu trữ */}
                      <button
                        type="button"
                        onClick={() => onArchiveTask(task)}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer ${
                          task.progress === 100
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Hoàn thành & Lưu trữ
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
