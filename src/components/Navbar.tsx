import {
  LayoutDashboard,
  CheckSquare,
  Archive,
  Sparkles,
  User,
  PlusCircle,
  Bell,
  Volume2,
  VolumeX,
  AlertTriangle,
  Wifi,
  WifiOff,
  RefreshCw,
  LogOut,
  Link2
} from 'lucide-react';
import { UserProfile, UserAccount } from '../types/task';
import { playNotificationSound } from '../utils/audioNotification';

export type ActiveTab = 'overview' | 'tasks' | 'archive' | 'ai-advisor' | 'profile';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenCreateModal: () => void;
  overdueCount: number;
  completedCount: number;
  activeCount: number;
  userProfile: UserProfile;
  currentUser?: UserAccount | null;
  soundEnabled: boolean;
  onToggleSound: () => void;
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt?: string;
  onSyncNow: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenCreateModal,
  overdueCount,
  completedCount,
  activeCount,
  userProfile,
  currentUser,
  soundEnabled,
  onToggleSound,
  isOnline,
  isSyncing,
  lastSyncedAt,
  onSyncNow,
  onLogout,
}) => {
  const handleTestChime = () => {
    playNotificationSound('reminder');
  };

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      {/* Cảnh báo nhiệm vụ quá hạn (nếu có và bật cài đặt) */}
      {overdueCount > 0 && userProfile.notifications.overdueAlerts && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-2 text-rose-800 text-xs sm:text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2 max-w-4xl mx-auto w-full">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 animate-pulse" />
            <span>
              <strong>Cảnh báo nhắc nhở:</strong> Bạn có{' '}
              <span className="font-bold underline decoration-rose-400">{overdueCount} nhiệm vụ đã trễ hạn</span>{' '}
              chưa hoàn thành. Hãy xử lý ngay để đảm bảo tiến độ đơn vị!
            </span>
            <button
              onClick={() => setActiveTab('tasks')}
              className="ml-auto underline font-semibold text-rose-700 hover:text-rose-900 shrink-0 cursor-pointer text-xs"
            >
              Xem ngay →
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('overview')}
              className="flex items-center gap-2.5 text-left group cursor-pointer focus:outline-hidden"
              aria-label="Về trang tổng quan"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-sky-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <CheckSquare className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base tracking-tight text-slate-900">TaskMaster</span>
                  <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider">AI</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium leading-none">Hệ thống Nhắc việc & Chiến lược</p>
              </div>
            </button>
          </div>

          {/* Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60" aria-label="Menu chính">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Tổng quan
            </button>

            <button
              onClick={() => setActiveTab('tasks')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all relative cursor-pointer ${
                activeTab === 'tasks'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              Nhiệm vụ
              {activeCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-slate-200 text-slate-700 text-[10px] rounded-full font-bold">
                  {activeCount}
                </span>
              )}
              {overdueCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-1 right-1 animate-ping" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('archive')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'archive'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              Lưu trữ hoàn thành
              {completedCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-emerald-100 text-emerald-700 text-[10px] rounded-full font-bold">
                  {completedCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('ai-advisor')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'ai-advisor'
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              AI Cố vấn Chiến lược
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Hồ sơ
            </button>
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2">
            {/* Online / Offline / Sync Indicator */}
            <button
              type="button"
              onClick={onSyncNow}
              disabled={isSyncing}
              title={
                !isOnline
                  ? 'Đang hoạt động ngoại tuyến (Offline) - Đã lưu trữ an toàn trong máy'
                  : isSyncing
                  ? 'Đang đồng bộ hóa dữ liệu lên máy chủ...'
                  : `Đã đồng bộ toàn hệ thống ${lastSyncedAt ? `(Lần cuối: ${new Date(lastSyncedAt).toLocaleTimeString()})` : ''}. Nhấn để đồng bộ lại ngay.`
              }
              className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer ${
                !isOnline
                  ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                  : isSyncing
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              {!isOnline ? (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                  <span>Offline (Đã lưu máy)</span>
                </>
              ) : isSyncing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                  <span>Đang đồng bộ...</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Đã đồng bộ</span>
                </>
              )}
            </button>

            {/* Audio chime toggle */}
            <button
              onClick={() => {
                onToggleSound();
                if (!soundEnabled) {
                  handleTestChime();
                }
              }}
              title={soundEnabled ? 'Âm thanh nhắc việc đang bật (Nhấn để tắt)' : 'Âm thanh nhắc việc đang tắt (Nhấn để bật)'}
              aria-label={soundEnabled ? 'Tắt âm thanh thông báo' : 'Bật âm thanh thông báo'}
              className={`p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer ${
                soundEnabled ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-400'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Overdue/Reminder Bell */}
            <button
              onClick={() => setActiveTab('tasks')}
              title={`Thông báo: ${overdueCount} việc quá hạn`}
              aria-label={`Thông báo: ${overdueCount} việc quá hạn`}
              className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {overdueCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
                  {overdueCount}
                </span>
              )}
            </button>

            {/* Tạo Nhiệm vụ Mới Button */}
            <button
              onClick={onOpenCreateModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs sm:text-sm font-semibold shadow-sm shadow-indigo-600/30 transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Tạo Nhiệm vụ mới</span>
              <span className="sm:hidden">Tạo mới</span>
            </button>

            {/* Mini Avatar */}
            <button
              onClick={() => setActiveTab('profile')}
              title={`Hồ sơ: ${userProfile.displayName} (${userProfile.role || 'Cán bộ'})${currentUser?.pairedUserId ? ` • Đã liên kết với: ${currentUser.pairedUserName}` : ''}`}
              aria-label={`Xem hồ sơ của ${userProfile.displayName}`}
              className="relative w-9 h-9 rounded-full ring-2 ring-indigo-500/30 hover:ring-indigo-500 overflow-visible transition-all shrink-0 cursor-pointer focus:outline-hidden"
            >
              <img
                src={userProfile.avatarUrl}
                alt={userProfile.displayName}
                className="w-full h-full object-cover rounded-full"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80';
                }}
              />
              {currentUser?.pairedUserId ? (
                <span
                  className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-xs ring-2 ring-white animate-pulse"
                  title={`Bộ nhớ đang đồng bộ liên kết với: ${currentUser.pairedUserName || 'Đối tác'}`}
                >
                  <Link2 className="w-2.5 h-2.5 stroke-[2.5]" />
                </span>
              ) : (
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-xs ring-1 ring-white"
                  title={`Mã kết nối: ${currentUser?.syncCode || 'TM-LOCAL'}`}
                >
                  <span className="text-[8px] font-black leading-none">✓</span>
                </span>
              )}
            </button>

            {/* Logout button */}
            <button
              type="button"
              onClick={onLogout}
              title="Đăng xuất tài khoản"
              aria-label="Đăng xuất tài khoản"
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="md:hidden flex items-center justify-around py-2 border-t border-slate-100 overflow-x-auto gap-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-md text-[10px] font-semibold whitespace-nowrap cursor-pointer ${
              activeTab === 'overview' ? 'text-indigo-600 font-bold' : 'text-slate-500'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Tổng quan
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-md text-[10px] font-semibold whitespace-nowrap relative cursor-pointer ${
              activeTab === 'tasks' ? 'text-indigo-600 font-bold' : 'text-slate-500'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            Nhiệm vụ {overdueCount > 0 && `(${overdueCount} trễ)`}
          </button>
          <button
            onClick={() => setActiveTab('archive')}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-md text-[10px] font-semibold whitespace-nowrap cursor-pointer ${
              activeTab === 'archive' ? 'text-emerald-600 font-bold' : 'text-slate-500'
            }`}
          >
            <Archive className="w-4 h-4" />
            Lưu trữ ({completedCount})
          </button>
          <button
            onClick={() => setActiveTab('ai-advisor')}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-md text-[10px] font-semibold whitespace-nowrap cursor-pointer ${
              activeTab === 'ai-advisor' ? 'text-violet-600 font-bold' : 'text-slate-500'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            AI Cố vấn
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-md text-[10px] font-semibold whitespace-nowrap cursor-pointer ${
              activeTab === 'profile' ? 'text-indigo-600 font-bold' : 'text-slate-500'
            }`}
          >
            <User className="w-4 h-4" />
            Hồ sơ
          </button>
        </div>
      </div>
    </header>
  );
};
