import React, { useState } from 'react';
import {
  CheckSquare,
  Lock,
  User,
  Mail,
  ArrowRight,
  Wifi,
  WifiOff,
  AlertCircle,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  Clock,
  KeyRound,
  Sparkles,
} from 'lucide-react';
import { UserAccount } from '../types/task';

interface AuthViewProps {
  onLoginSuccess: (user: UserAccount, tasks: any[]) => void;
  isOnline: boolean;
}

export const AuthView: React.FC<AuthViewProps> = ({ onLoginSuccess, isOnline }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Form States
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Local Accounts Directory for offline fallback
  const getLocalUsers = (): UserAccount[] => {
    try {
      const saved = localStorage.getItem('taskmaster_local_accounts');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  };

  const saveLocalUsers = (users: UserAccount[]) => {
    try {
      localStorage.setItem('taskmaster_local_accounts', JSON.stringify(users));
    } catch {}
  };

  // Password Login Handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanInput = username.trim().toLowerCase();
    if (!cleanInput || !password) {
      setErrorMessage('Vui lòng nhập tên đăng nhập/email và mật khẩu.');
      return;
    }

    setIsLoading(true);

    try {
      if (isOnline) {
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: cleanInput, password }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.user) {
              const accountWithPass: UserAccount = {
                ...data.user,
                password,
              };

              const localUsers = getLocalUsers();
              const existingIdx = localUsers.findIndex(
                (u) => u.id === data.user.id || u.username.toLowerCase() === cleanInput
              );
              if (existingIdx >= 0) {
                localUsers[existingIdx] = accountWithPass;
              } else {
                localUsers.push(accountWithPass);
              }
              saveLocalUsers(localUsers);

              const serverTasks = Array.isArray(data.tasks) ? data.tasks : [];
              localStorage.setItem(`taskmaster_tasks_${data.user.id}`, JSON.stringify(serverTasks));

              onLoginSuccess(accountWithPass, serverTasks);
              return;
            }
          } else if (res.status === 401) {
            setErrorMessage('Mật khẩu không chính xác. Vui lòng kiểm tra lại.');
            return;
          } else if (res.status === 404) {
            const errData = await res.json().catch(() => ({}));
            setErrorMessage(
              errData.error ||
                'Tài khoản không tồn tại trên hệ thống hoặc đã tự động bị xóa do không hoạt động trong 3 ngày. Bạn có thể bấm "Đăng ký mới".'
            );
            return;
          } else {
            const errData = await res.json().catch(() => ({}));
            setErrorMessage(errData.error || 'Lỗi đăng nhập. Vui lòng thử lại.');
            return;
          }
        } catch {
          // Fall through to offline check
        }
      }

      // Offline fallback
      const localUsers = getLocalUsers();
      const user = localUsers.find(
        (u) => u.username.toLowerCase() === cleanInput || u.email.toLowerCase() === cleanInput
      );

      if (!user) {
        setErrorMessage(
          'Không tìm thấy tài khoản ngoại tuyến. Vui lòng kết nối mạng hoặc bấm "Đăng ký mới" để bắt đầu.'
        );
        return;
      }

      if (user.password && user.password !== password) {
        setErrorMessage('Mật khẩu không chính xác.');
        return;
      }

      let userTasks: any[] = [];
      try {
        const raw = localStorage.getItem(`taskmaster_tasks_${user.id}`);
        if (raw) userTasks = JSON.parse(raw);
      } catch {}

      onLoginSuccess(user, userTasks);
    } catch (err: any) {
      setErrorMessage('Lỗi đăng nhập: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Registration Handler
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanUser = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanUser || !cleanEmail || !password) {
      setErrorMessage('Vui lòng điền đầy đủ tất cả các trường.');
      return;
    }

    if (cleanUser.length < 3) {
      setErrorMessage('Tên đăng nhập cần tối thiểu 3 ký tự.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Mật khẩu cần tối thiểu 6 ký tự để đảm bảo an toàn.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không trùng khớp. Vui lòng kiểm tra lại.');
      return;
    }

    setIsLoading(true);

    try {
      if (isOnline) {
        try {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: cleanUser, email: cleanEmail, password }),
          });

          const data = await res.json();
          if (res.ok && data.user) {
            const localUsers = getLocalUsers();
            localUsers.push({ ...data.user, password });
            saveLocalUsers(localUsers);
            localStorage.setItem(`taskmaster_tasks_${data.user.id}`, JSON.stringify([]));

            setSuccessMessage(
              'Đăng ký tài khoản mới thành công! Vui lòng đăng nhập bằng tài khoản vừa tạo.'
            );
            setMode('login');
            setPassword('');
            setConfirmPassword('');
            return;
          } else {
            setErrorMessage(data.error || 'Lỗi đăng ký tài khoản trên máy chủ.');
            return;
          }
        } catch {
          // Fall through to offline registration
        }
      }

      // Offline registration fallback
      const localUsers = getLocalUsers();
      const existing = localUsers.find((u) => u.username === cleanUser || u.email === cleanEmail);
      if (existing) {
        setErrorMessage('Tên đăng nhập hoặc email đã được sử dụng.');
        return;
      }

      const newUserId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
      let syncCode = 'TM-';
      for (let i = 0; i < 4; i++) syncCode += chars.charAt(Math.floor(Math.random() * chars.length));

      const nowIso = new Date().toISOString();
      const newAccount: UserAccount = {
        id: newUserId,
        username: cleanUser,
        email: cleanEmail,
        password,
        isProfileCompleted: false,
        syncCode,
        profile: {
          displayName: username.trim(),
          role: '',
          units: ['Ban Thanh Niên', 'Chi hội 1'],
          birthDate: '1995-01-01',
          avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(username)}`,
          email: cleanEmail,
          phone: '',
          weeklyGoal: 3,
          notifications: {
            browserEnabled: true,
            soundEnabled: true,
            priorityReminders: true,
            overdueAlerts: true,
          },
          connectedAppsList: [],
        },
        createdAt: nowIso,
        lastActiveAt: nowIso,
        lastSyncedAt: nowIso,
      };

      localUsers.push(newAccount);
      saveLocalUsers(localUsers);
      localStorage.setItem(`taskmaster_tasks_${newUserId}`, JSON.stringify([]));

      setSuccessMessage('Đã đăng ký tài khoản thành công! Bạn có thể đăng nhập ngay.');
      setMode('login');
      setPassword('');
      setConfirmPassword('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-slate-100 flex items-center justify-center p-4 sm:p-6 font-['Be_Vietnam_Pro',sans-serif]">
      <div className="w-full max-w-md space-y-5">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 via-blue-600 to-sky-400 text-white shadow-xl shadow-indigo-500/25 mb-1">
            <CheckSquare className="w-8 h-8 stroke-[2.2]" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white">TaskMaster</h1>
            <span className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-xs font-extrabold px-2 py-0.5 rounded-md shadow-xs">
              AI
            </span>
          </div>
          <p className="text-indigo-200/90 text-xs sm:text-sm max-w-xs mx-auto">
            Quản Lý &amp; Phân Rã Nhiệm Vụ Thông Minh • Cố Vấn Năng Suất
          </p>

          {/* Online/Offline Status Indicator */}
          <div className="pt-1 flex items-center justify-center gap-1.5 text-[11px]">
            {isOnline ? (
              <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold bg-emerald-950/60 px-3 py-0.5 rounded-full border border-emerald-800/60">
                <Wifi className="w-3 h-3" /> Trực tuyến • Tự động đồng bộ đa thiết bị
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-300 font-semibold bg-amber-950/60 px-3 py-0.5 rounded-full border border-amber-800/60">
                <WifiOff className="w-3 h-3" /> Ngoại tuyến (Offline) • Lưu trữ trên thiết bị
              </span>
            )}
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-7 text-slate-800 shadow-2xl border border-white/20 space-y-4">
          {/* Notifications */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{successMessage}</div>
            </div>
          )}

          {/* Login / Register Toggle Tabs */}
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-2.5 rounded-xl transition-all cursor-pointer ${
                mode === 'login' ? 'bg-white text-indigo-700 shadow-sm font-extrabold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Đăng nhập tài khoản
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-2.5 rounded-xl transition-all cursor-pointer ${
                mode === 'register' ? 'bg-white text-indigo-700 shadow-sm font-extrabold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Đăng ký mới
            </button>
          </div>

          {/* Form */}
          <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-3.5">
            {/* Username */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">
                {mode === 'login' ? 'Tên đăng nhập hoặc Email:' : 'Tên đăng nhập mới:'}{' '}
                <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={mode === 'login' ? 'canbo_quanly hoặc email@domain.com' : 'Ví dụ: canbo_chidoan'}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 text-xs sm:text-sm font-medium outline-hidden"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            {/* Email (only in Register mode) */}
            {mode === 'register' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Địa chỉ Email liên hệ: <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="canbo@domain.com"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 text-xs sm:text-sm font-medium outline-hidden"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>
            )}

            {/* Password */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">
                Mật khẩu: <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 text-xs sm:text-sm font-medium outline-hidden"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            {/* Confirm Password (only in Register mode) */}
            {mode === 'register' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Xác nhận lại mật khẩu: <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 text-xs sm:text-sm font-medium outline-hidden"
                  />
                  <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xử lý dữ liệu...</span>
                </>
              ) : (
                <>
                  <span>{mode === 'login' ? 'Đăng nhập vào TaskMaster' : 'Đăng ký tài khoản mới'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Multi-Device & 3-Day Inactivity Auto-Cleanup Policy Notice */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-[11px] text-slate-600 space-y-1.5 leading-relaxed">
            <div className="font-bold text-indigo-950 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              <span>Chính sách đồng bộ &amp; tự động dọn dẹp tài khoản:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-slate-600">
              <li>
                <strong>Đồng bộ xuyên suốt:</strong> Khi bạn đăng nhập trên điện thoại, máy tính hay trình duyệt khác, toàn bộ nhiệm vụ bạn đã làm trước đó sẽ hiển thị đầy đủ.
              </li>
              <li>
                <strong>Tự động xóa sau 3 ngày không sử dụng:</strong> Tài khoản nào không đăng nhập hoặc không hoạt động trong 3 ngày sẽ tự động được hệ thống xóa an toàn để bảo mật dữ liệu.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
