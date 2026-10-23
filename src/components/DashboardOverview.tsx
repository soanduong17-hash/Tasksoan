import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Building2,
  Calendar,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  PlusCircle,
  BarChart3,
  Activity,
  Layers,
  Zap,
  Flame,
  Check,
  Edit3,
  ExternalLink,
  Target
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { Task, UserProfile } from '../types/task';
import {
  calculateDashboardStats,
  formatDateVietnamese,
  calculateWeeklyTrend,
  calculateMonthlyTrend,
  getTopUrgentTasks,
  isTaskOverdue
} from '../utils/taskCalculations';

interface DashboardOverviewProps {
  tasks: Task[];
  userProfile: UserProfile;
  onNavigateToTasks: (filter?: 'all' | 'in_progress' | 'overdue' | 'completed') => void;
  onOpenCreateModal: () => void;
  onNavigateToAiAdvisor: () => void;
  onQuickCompleteTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  tasks,
  userProfile,
  onNavigateToTasks,
  onOpenCreateModal,
  onNavigateToAiAdvisor,
  onQuickCompleteTask,
  onEditTask,
}) => {
  const stats = calculateDashboardStats(tasks);
  const [trendPeriod, setTrendPeriod] = useState<'weekly' | 'monthly'>('weekly');

  // Filter overdue tasks
  const overdueTasks = tasks.filter((t) => t.status === 'overdue');

  // Top 3 most urgent pending tasks for Priority Spotlight
  const urgentTasks = getTopUrgentTasks(tasks, 3);

  // Recharts trend data
  const weeklyData = calculateWeeklyTrend(tasks);
  const monthlyData = calculateMonthlyTrend(tasks);
  const trendData = trendPeriod === 'weekly' ? weeklyData : monthlyData;

  // Recharts unit comparison data
  const unitChartData = Object.entries(stats.unitDistribution).map(([unitName, uStats]) => ({
    name: unitName.length > 15 ? unitName.slice(0, 15) + '...' : unitName,
    fullName: unitName,
    'Hoàn thành': uStats.completed,
    'Đang làm': uStats.total - uStats.completed - uStats.overdue,
    'Trễ hạn': uStats.overdue,
    total: uStats.total,
  }));

  // SVG Donut calculation
  const total = stats.total || 1;
  const c = 251.32;
  const compDash = (stats.completed / total) * c;
  const inProgDash = (stats.inProgress / total) * c;
  const overdueDash = (stats.overdue / total) * c;
  const pendDash = (stats.pending / total) * c;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-indigo-950/10 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-indigo-400/20 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 text-xs font-semibold backdrop-blur-xs">
                <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                Bảng điều khiển tổng quan nhiệm vụ
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                Dữ liệu lưu trữ thời gian thực
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Xin chào, {userProfile.displayName}!
            </h1>
            <p className="text-indigo-200/90 text-sm leading-relaxed">
              Theo dõi biểu đồ xu hướng hoàn thành công việc theo tuần/tháng và tiến độ chi tiết theo từng đơn vị sinh hoạt. Toàn bộ dữ liệu được lưu trữ liên tục thời gian thực.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={onNavigateToAiAdvisor}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold border border-white/20 backdrop-blur-md transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              Đánh giá AI
            </button>
            <button
              onClick={onOpenCreateModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-500/40 transition-all hover:scale-105 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Tạo nhiệm vụ mới
            </button>
          </div>
        </div>
      </div>

      {/* Pristine Empty State Banner for New Account */}
      {tasks.length === 0 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-dashed border-indigo-200 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-sm">
            <Sparkles className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              Chào Mừng Đến Với Không Gian Làm Việc Mới!
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Tài khoản của bạn hoàn toàn mới và chưa có nhiệm vụ nào. Điểm năng suất khởi điểm là <strong>0/100</strong>. Hãy bắt đầu tạo nhiệm vụ đầu tiên hoặc dán mô tả dài để AI tự động phân rã (WBS) thành các mốc con quản lý được!
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={onOpenCreateModal}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/30 transition-all hover:scale-105 cursor-pointer flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Tạo nhiệm vụ đầu tiên ngay</span>
            </button>
          </div>
        </div>
      )}

      {/* PRIORITY SPOTLIGHT SECTION (HIGH CONTRAST TOP 3 URGENT TASKS) */}
      <section className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-7 text-white shadow-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/30">
              <Flame className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white uppercase">
                  Tiêu Điểm Ưu Tiên (Priority Spotlight)
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-extrabold uppercase tracking-wider">
                  Top 3 Cần Xử Lý Ngay
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Các nhiệm vụ quan trọng nhất đang chờ giải quyết, hỗ trợ hoàn thành nhanh hoặc chỉnh sửa tức thì
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateToTasks('overdue')}
            className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          >
            Xem tất cả việc gấp <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {urgentTasks.length === 0 ? (
          <div className="py-8 text-center space-y-2 bg-slate-900/60 rounded-2xl border border-slate-800/80 p-6">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-200 text-sm">Tuyệt vời! Không có nhiệm vụ khẩn cấp nào tồn đọng</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Tất cả các nhiệm vụ ưu tiên cao hoặc quá hạn đã được hoàn thành. Bạn có thể tạo thêm nhiệm vụ mới.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            {urgentTasks.map((task, idx) => {
              const isOverdue = isTaskOverdue(task.dueDate, task.completedAt);
              const subtaskCompleted = task.subtasks.filter((s) => s.completed).length;

              return (
                <div
                  key={task.id}
                  className={`relative rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 border shadow-lg ${
                    isOverdue
                      ? 'bg-gradient-to-b from-rose-950/40 via-slate-900 to-slate-900 border-rose-500/50 hover:border-rose-400'
                      : task.priority === 'high'
                      ? 'bg-gradient-to-b from-amber-950/30 via-slate-900 to-slate-900 border-amber-500/40 hover:border-amber-400'
                      : 'bg-slate-900/90 border-slate-700/80 hover:border-indigo-500'
                  }`}
                >
                  {/* Spotlight Rank Pill */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-800/90 px-2 py-0.5 rounded-md border border-slate-700">
                      #{idx + 1} Ưu Tiên
                    </span>

                    {/* Urgency Badge */}
                    {isOverdue ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider shadow-sm animate-pulse">
                        <AlertCircle className="w-3 h-3" />
                        Quá hạn
                      </span>
                    ) : task.priority === 'high' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                        <Flame className="w-3 h-3" />
                        Khẩn cấp
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 text-[10px] font-bold">
                        Đang làm
                      </span>
                    )}
                  </div>

                  {/* Task Content */}
                  <div className="space-y-2 flex-1">
                    <div className="text-[11px] font-semibold text-sky-400 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span className="truncate">{task.unit}</span>
                    </div>

                    <h3 className="font-extrabold text-white text-sm sm:text-base leading-snug line-clamp-2 hover:text-indigo-300 transition-colors">
                      {task.title}
                    </h3>

                    {task.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {task.description}
                      </p>
                    )}

                    <div className="flex items-center gap-1 text-[11px] text-slate-300 pt-1">
                      <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>Hạn: <strong>{formatDateVietnamese(task.dueDate)}</strong></span>
                    </div>
                  </div>

                  {/* Progress & Quick Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Tiến độ ({subtaskCompleted}/{task.subtasks.length}):</span>
                      <span className="font-black text-emerald-400">{task.progress}%</span>
                    </div>

                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isOverdue ? 'bg-rose-500' : 'bg-gradient-to-r from-amber-400 to-emerald-400'
                        }`}
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>

                    {/* Quick Completion & Quick Modification Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => onEditTask(task)}
                        className="inline-flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-all border border-slate-700 cursor-pointer active:scale-95"
                        title="Chỉnh sửa nhiệm vụ này"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-sky-400" />
                        Chỉnh sửa
                      </button>

                      <button
                        type="button"
                        onClick={() => onQuickCompleteTask(task)}
                        className="inline-flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition-all shadow-md shadow-emerald-500/20 cursor-pointer active:scale-95"
                        title="Hoàn thành 100% và chuyển vào kho lưu trữ"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        Xong ngay
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Đã hoàn thành */}
        <div
          onClick={() => onNavigateToTasks('completed')}
          className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-xs hover:shadow-md transition-all cursor-pointer group hover:border-emerald-300"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">ĐÃ HOÀN THÀNH</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900">{stats.completed}</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
              {stats.completionRate}%
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">Đã lưu trữ vào hệ thống</p>
        </div>

        {/* Đang thực hiện */}
        <div
          onClick={() => onNavigateToTasks('in_progress')}
          className="bg-white p-5 rounded-2xl border border-blue-100 shadow-xs hover:shadow-md transition-all cursor-pointer group hover:border-blue-300"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">ĐANG THỰC HIỆN</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900">{stats.inProgress}</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
              {Math.round((stats.inProgress / (stats.total || 1)) * 100)}%
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">Đang triển khai các subtask</p>
        </div>

        {/* Trễ việc / Quá hạn */}
        <div
          onClick={() => onNavigateToTasks('overdue')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer group ${
            stats.overdue > 0
              ? 'bg-rose-50/50 border-rose-200 shadow-md shadow-rose-500/10 hover:border-rose-300'
              : 'bg-white border-slate-100 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${stats.overdue > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
              TRỄ VIỆC (QUÁ HẠN)
            </span>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${
                stats.overdue > 0 ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-slate-100 text-slate-500'
              }`}
            >
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className={`text-3xl font-extrabold ${stats.overdue > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {stats.overdue}
            </span>
            {stats.overdue > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-rose-200 text-rose-900 animate-bounce">
                Khẩn cấp
              </span>
            )}
          </div>
          <p className="mt-2 text-[11px] text-rose-600/80 font-medium">
            {stats.overdue > 0 ? 'Cần xử lý dứt điểm ngay' : 'Không có việc quá hạn'}
          </p>
        </div>

        {/* Tổng số nhiệm vụ */}
        <div
          onClick={() => onNavigateToTasks('all')}
          className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs hover:shadow-md transition-all cursor-pointer group hover:border-indigo-300"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">TỔNG NHIỆM VỤ</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900">{stats.total}</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
              {stats.highPriorityCount} việc gấp
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">Trên toàn bộ các đơn vị</p>
        </div>
      </div>

      {/* RECHARTS: BIỂU ĐỒ XU HƯỚNG HOÀN THÀNH CÔNG VIỆC THEO TUẦN / THÁNG */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Biểu Đồ Xu Hướng Hoàn Thành Công Việc
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Theo dõi tốc độ nghiệm thu hoàn thành, số việc tạo mới và phát sinh trễ hạn theo thời gian
            </p>
          </div>

          {/* Toggle Tuần / Tháng */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setTrendPeriod('weekly')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                trendPeriod === 'weekly'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Theo Tuần (7 ngày)
            </button>
            <button
              type="button"
              onClick={() => setTrendPeriod('monthly')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                trendPeriod === 'monthly'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Theo Tháng (6 tháng)
            </button>
          </div>
        </div>

        {/* Recharts Area Chart */}
        <div className="h-72 sm:h-80 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorOverdue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#94A3B8"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#E2E8F0' }}
              />
              <YAxis
                stroke="#94A3B8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
                formatter={(value: any, name: any) => {
                  const labelMap: Record<string, string> = {
                    completed: 'Việc hoàn thành',
                    created: 'Việc tạo mới',
                    overdue: 'Việc trễ hạn',
                  };
                  return [`${value} nhiệm vụ`, labelMap[name] || name];
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: '12px', fontSize: '11px', fontWeight: 600 }}
                formatter={(value) => {
                  const labelMap: Record<string, string> = {
                    completed: 'Nhiệm vụ hoàn thành',
                    created: 'Nhiệm vụ tạo mới',
                    overdue: 'Nhiệm vụ trễ hạn',
                  };
                  return <span className="text-slate-700 ml-1">{labelMap[value] || value}</span>;
                }}
              />
              <Area
                type="monotone"
                dataKey="completed"
                stroke="#10B981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorCompleted)"
                name="completed"
              />
              <Area
                type="monotone"
                dataKey="created"
                stroke="#6366F1"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorCreated)"
                name="created"
              />
              <Area
                type="monotone"
                dataKey="overdue"
                stroke="#EF4444"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorOverdue)"
                name="overdue"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Main Charts & Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* RECHARTS: BIỂU ĐỒ CỘT SO SÁNH TIẾN ĐỘ THEO ĐƠN VỊ */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900">
                  Phân Bổ Việc Tôi Làm Theo Mảng Đơn Vị (Recharts)
                </h2>
              </div>
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                {unitChartData.length} Mảng đơn vị
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Thống kê khối lượng công việc tôi trực tiếp thực hiện cho từng đơn vị (hoàn thành, đang làm, trễ hạn)
            </p>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={unitChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#94A3B8"
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '16px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                      fontSize: '12px',
                    }}
                    labelFormatter={(label, payload) => {
                      const full = payload?.[0]?.payload?.fullName;
                      return full || label;
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    wrapperStyle={{ paddingBottom: '8px', fontSize: '11px', fontWeight: 600 }}
                  />
                  <Bar dataKey="Hoàn thành" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Đang làm" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Trễ hạn" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Dữ liệu biểu đồ tự động cập nhật khi tick chọn task</span>
            <button
              onClick={() => onNavigateToTasks('all')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              Xem chi tiết <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Biểu đồ Donut & Thống kê Tỷ lệ */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Tỷ Lệ Nghiệm Thu Tổng Thể</h2>
                <p className="text-xs text-slate-500">Tỷ trọng hoàn thành, trễ hạn và đang làm</p>
              </div>
              <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                Tổng: {stats.total}
              </span>
            </div>

            {/* Circular Ring Chart */}
            <div className="my-5 flex items-center justify-center">
              <div className="relative w-44 h-44 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#F1F5F9"
                    strokeWidth="12"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#10B981"
                    strokeWidth="12"
                    strokeDasharray={`${compDash} ${c}`}
                    strokeDashoffset="0"
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#3B82F6"
                    strokeWidth="12"
                    strokeDasharray={`${inProgDash} ${c}`}
                    strokeDashoffset={`${-compDash}`}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#EF4444"
                    strokeWidth="12"
                    strokeDasharray={`${overdueDash} ${c}`}
                    strokeDashoffset={`${-(compDash + inProgDash)}`}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#94A3B8"
                    strokeWidth="12"
                    strokeDasharray={`${pendDash} ${c}`}
                    strokeDashoffset={`${-(compDash + inProgDash + overdueDash)}`}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>

                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-extrabold text-slate-800 tracking-tight">
                    {stats.completionRate}%
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Hoàn thành
                  </span>
                </div>
              </div>
            </div>

            {/* Legend & Percentages */}
            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-slate-600 font-medium">Đã xong:</span>
                <span className="font-bold text-slate-900 ml-auto">{stats.completed}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-blue-500 shrink-0" />
                <span className="text-slate-600 font-medium">Đang làm:</span>
                <span className="font-bold text-slate-900 ml-auto">{stats.inProgress}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-rose-500 shrink-0" />
                <span className="text-slate-600 font-medium">Trễ hạn:</span>
                <span className="font-bold text-rose-600 ml-auto">{stats.overdue}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-slate-400 shrink-0" />
                <span className="text-slate-600 font-medium">Chưa bắt đầu:</span>
                <span className="font-bold text-slate-900 ml-auto">{stats.pending}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cảnh báo việc trễ hạn & Việc khẩn cấp */}
      {overdueTasks.length > 0 && (
        <div className="bg-rose-50/70 border border-rose-200 rounded-3xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-sm">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-rose-900">Danh mục Việc Quá Hạn Cần Xử Lý Ngay</h2>
                <p className="text-xs text-rose-700/80">
                  Các nhiệm vụ đã vượt quá mốc thời gian hoàn thành cam kết
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigateToTasks('overdue')}
              className="text-xs font-bold text-rose-700 hover:text-rose-900 bg-white px-3 py-1.5 rounded-xl border border-rose-200 shadow-xs cursor-pointer"
            >
              Xem tất cả ({overdueTasks.length})
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {overdueTasks.slice(0, 4).map((task) => (
              <div
                key={task.id}
                onClick={() => onNavigateToTasks('overdue')}
                className="bg-white p-4 rounded-2xl border border-rose-200/80 hover:border-rose-400 transition-all cursor-pointer shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs mb-1">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 font-semibold text-slate-700">
                      {task.unit}
                    </span>
                    <span className="text-rose-600 font-bold flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Hạn: {formatDateVietnamese(task.dueDate)}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm line-clamp-1 mt-1">{task.title}</h3>
                  <p className="text-slate-500 text-xs line-clamp-2 mt-1">{task.description}</p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Tiến độ: {task.progress}%</span>
                  <span className="text-indigo-600 font-bold hover:underline">Mở xử lý →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
