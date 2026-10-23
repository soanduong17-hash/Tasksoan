import React, { useState } from 'react';
import {
  CheckSquare,
  Lock,
  User,
  Mail,
  ArrowRight,
  WifiOff,
  AlertCircle,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  Database,
  Sparkles,
  KeyRound,
  X,
} from 'lucide-react';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import {
  getUserFromFirestore,
  saveUserToFirestore,
  fetchTasksFromFirestore,
  logUserActivityToFirestore,
  recordDeviceSessionInFirestore,
  isFirestoreReadyForUser,
} from '../services/firestoreService';
import { UserAccount, Task } from '../types/task';
import { detectDeviceInfo } from '../utils/indexedDb';

interface AuthViewProps {
  onLoginSuccess: (user: UserAccount, tasks: Task[]) => void;
  isOnline: boolean;
}

const getLocalUsers = (): UserAccount[] => {
  try {
    const raw = localStorage.getItem('taskmaster_users');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveLocalUsers = (users: UserAccount[]) => {
  try {
    localStorage.setItem('taskmaster_users', JSON.stringify(users));
  } catch {}
};

export const AuthView: React.FC<AuthViewProps> = ({ onLoginSuccess, isOnline }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Form states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & Feedback states
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Password reset modal states
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetLoading, setIsResetLoading] = useState(false);

  // Password strength score (0 to 4)
  const calculateStrength = (pass: string): number => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 10) score++;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const passStrength = calculateStrength(password);
  const strengthLabels = ['Rất yếu', 'Yếu', 'Trung bình', 'Khá tốt', 'Rất mạnh'];
  const strengthColors = [
    'bg-slate-700',
    'bg-rose-500',
    'bg-amber-500',
    'bg-blue-500',
    'bg-emerald-500',
  ];

  /**
   * 1. Google One-Click Single Sign-On via Firebase
   */
  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);
    setLoadingText('Đang kết nối Google & xác thực bảo mật...');

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;

      setLoadingText('Đang đồng bộ cơ sở dữ liệu Firestore...');

      // Check if user account already exists in Firestore
      let userAccount: UserAccount | null = null;
      if (isFirestoreReadyForUser(fbUser.uid)) {
        userAccount = await getUserFromFirestore(fbUser.uid).catch(() => null);
      }

      const nowIso = new Date().toISOString();
      if (!userAccount) {
        // Initialize new user account with blank role & units for user to self-configure in Profile
        userAccount = {
          id: fbUser.uid,
          username: fbUser.email?.split('@')[0] || fbUser.displayName || 'google_user',
          email: fbUser.email || '',
          authProvider: 'google',
          isProfileCompleted: true,
          syncCode: `TM-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          profile: {
            displayName: fbUser.displayName || 'Cán bộ',
            role: '', // Sẽ do người dùng tự cài trong mục hồ sơ
            units: [], // Sẽ do người dùng tự cài trong mục hồ sơ
            birthDate: '1995-01-01',
            avatarUrl:
              fbUser.photoURL ||
              `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                fbUser.displayName || 'User'
              )}`,
            email: fbUser.email || '',
            weeklyGoal: 4,
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
        await saveUserToFirestore(userAccount).catch(() => {});
      } else {
        userAccount.lastActiveAt = nowIso;
        await saveUserToFirestore(userAccount).catch(() => {});
      }

      // Load tasks from Firestore
      const loadedTasks = await fetchTasksFromFirestore(fbUser.uid).catch(() => []);

      // Register device session in Firestore
      const deviceInfo = detectDeviceInfo();
      await recordDeviceSessionInFirestore(fbUser.uid, {
        deviceId: deviceInfo.deviceId,
        deviceName: deviceInfo.deviceName,
        deviceType: deviceInfo.deviceType as any,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        lastActive: nowIso,
        loggedInAt: nowIso,
        status: 'online',
      }).catch(() => {});

      await logUserActivityToFirestore(fbUser.uid, 'google_login', 'Đăng nhập thành công qua Google OAuth').catch(() => {});

      // Update local storage for seamless offline access
      const localUsers = getLocalUsers();
      const existingIdx = localUsers.findIndex((u) => u.id === userAccount!.id);
      if (existingIdx >= 0) {
        localUsers[existingIdx] = userAccount;
      } else {
        localUsers.push(userAccount);
      }
      saveLocalUsers(localUsers);
      localStorage.setItem(`taskmaster_tasks_${userAccount.id}`, JSON.stringify(loadedTasks));

      onLoginSuccess(userAccount, loadedTasks);
    } catch (err: any) {
      console.error('Google Sign-in error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMessage('Bạn đã đóng cửa sổ đăng nhập Google trước khi hoàn tất.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        // Ignored
      } else {
        setErrorMessage(`Lỗi xác thực Google: ${err.message || 'Không thể kết nối.'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 2. Email & Password Login
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanInput = username.trim().toLowerCase();
    if (!cleanInput || !password) {
      setErrorMessage('Vui lòng nhập tên đăng nhập hoặc email và mật khẩu.');
      return;
    }

    setIsLoading(true);
    setLoadingText('Đang xác thực thông tin đăng nhập...');

    try {
      // 1. Try Firebase Auth if input is an email
      const isEmail = cleanInput.includes('@');
      let fbUser: any = null;

      if (isOnline && isEmail) {
        try {
          const cred = await signInWithEmailAndPassword(auth, cleanInput, password);
          fbUser = cred.user;
        } catch (fbErr: any) {
          console.warn('Firebase Auth notice:', fbErr.code);
        }
      }

      // 2. Query backend or Firestore
      let userAccount: UserAccount | null = null;
      let userTasks: Task[] = [];

      if (fbUser) {
        // Logged in with Firebase
        userAccount = await getUserFromFirestore(fbUser.uid).catch(() => null);
        if (!userAccount) {
          userAccount = {
            id: fbUser.uid,
            username: fbUser.displayName || fbUser.email?.split('@')[0] || cleanInput,
            email: fbUser.email || cleanInput,
            authProvider: 'firebase',
            isProfileCompleted: true,
            syncCode: `TM-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
            profile: {
              displayName: fbUser.displayName || 'Cán bộ',
              role: '',
              units: [],
              birthDate: '1995-01-01',
              avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                fbUser.email || cleanInput
              )}`,
              email: fbUser.email || cleanInput,
              weeklyGoal: 3,
              notifications: {
                browserEnabled: true,
                soundEnabled: true,
                priorityReminders: true,
                overdueAlerts: true,
              },
              connectedAppsList: [],
            },
            createdAt: new Date().toISOString(),
            lastActiveAt: new Date().toISOString(),
          };
          await saveUserToFirestore(userAccount).catch(() => {});
        }
        userTasks = await fetchTasksFromFirestore(fbUser.uid).catch(() => []);
      } else if (isOnline) {
        // Fallback to Express backend database
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: cleanInput, password }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            const authedAccount: UserAccount = {
              ...data.user,
              password,
              authProvider: 'password',
            };
            userAccount = authedAccount;
            userTasks = Array.isArray(data.tasks) ? data.tasks : [];

            // Background sync with Firestore if authenticated in Firebase
            if (isFirestoreReadyForUser(authedAccount.id)) {
              saveUserToFirestore(authedAccount).catch(() => {});
            }
          }
        } else if (res.status === 401) {
          setErrorMessage('Mật khẩu không chính xác. Vui lòng kiểm tra lại.');
          setIsLoading(false);
          return;
        } else if (res.status === 404) {
          setErrorMessage(
            'Tài khoản không tồn tại trên hệ thống hoặc đã tự động bị xóa do không hoạt động trong 3 ngày. Bạn có thể bấm "Đăng ký mới".'
          );
          setIsLoading(false);
          return;
        }
      }

      // 3. Offline fallback
      if (!userAccount) {
        const localUsers = getLocalUsers();
        const found = localUsers.find(
          (u) => u.username.toLowerCase() === cleanInput || u.email?.toLowerCase() === cleanInput
        );

        if (!found) {
          setErrorMessage(
            'Không tìm thấy tài khoản. Vui lòng kiểm tra lại hoặc bấm "Đăng ký mới" để tạo tài khoản.'
          );
          setIsLoading(false);
          return;
        }

        if (found.password && found.password !== password) {
          setErrorMessage('Mật khẩu không chính xác.');
          setIsLoading(false);
          return;
        }

        userAccount = found;
        try {
          const raw = localStorage.getItem(`taskmaster_tasks_${found.id}`);
          if (raw) userTasks = JSON.parse(raw);
        } catch {}
      }

      if (!userAccount) {
        setErrorMessage('Không thể xác thực tài khoản. Vui lòng thử lại.');
        setIsLoading(false);
        return;
      }

      // Success post-processing
      const localUsers = getLocalUsers();
      const existingIdx = localUsers.findIndex(
        (u) => u.id === userAccount!.id || u.username.toLowerCase() === cleanInput
      );
      if (existingIdx >= 0) {
        localUsers[existingIdx] = { ...userAccount, password };
      } else {
        localUsers.push({ ...userAccount, password });
      }
      saveLocalUsers(localUsers);

      localStorage.setItem(`taskmaster_tasks_${userAccount.id}`, JSON.stringify(userTasks));

      // Record device session and log
      if (isOnline && isFirestoreReadyForUser(userAccount.id)) {
        const deviceInfo = detectDeviceInfo();
        recordDeviceSessionInFirestore(userAccount.id, {
          deviceId: deviceInfo.deviceId,
          deviceName: deviceInfo.deviceName,
          deviceType: deviceInfo.deviceType as any,
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          lastActive: new Date().toISOString(),
          loggedInAt: new Date().toISOString(),
          status: 'online',
        }).catch(() => {});
        logUserActivityToFirestore(userAccount.id, 'password_login', 'Đăng nhập thành công').catch(
          () => {}
        );
      }

      onLoginSuccess(userAccount, userTasks);
    } catch (err: any) {
      setErrorMessage(`Lỗi đăng nhập: ${err.message || 'Vui lòng kiểm tra lại thông tin.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 3. Register New Account (Role and units are NOT requested here; user configures them in Profile)
   */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanUser = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = displayName.trim() || username.trim();

    if (!cleanUser || !cleanEmail || !password) {
      setErrorMessage('Vui lòng điền đầy đủ tất cả các trường bắt buộc.');
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
    setLoadingText('Đang tạo tài khoản & phân vùng lưu trữ...');

    try {
      let createdUserId: string | null = null;
      let newAccount: UserAccount | null = null;

      // 1. Try Firebase Auth registration if online
      if (isOnline) {
        try {
          const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
          await updateProfile(cred.user, { displayName: cleanName });
          createdUserId = cred.user.uid;
        } catch (fbErr: any) {
          console.warn('Firebase createUser notice:', fbErr.code);
          if (fbErr.code === 'auth/email-already-in-use') {
            setErrorMessage('Địa chỉ email này đã được đăng ký. Vui lòng chuyển sang "Đăng nhập".');
            setIsLoading(false);
            return;
          }
        }
      }

      // 2. Also register in server database
      if (isOnline) {
        try {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: cleanUser,
              email: cleanEmail,
              password,
              displayName: cleanName,
              role: '', // Tự cài đặt trong mục hồ sơ
              unit: '', // Tự cài đặt trong mục hồ sơ
            }),
          });
          const serverData = await res.json();
          if (res.ok && serverData.user) {
            newAccount = { ...serverData.user, password };
            createdUserId = createdUserId || serverData.user.id;
          }
        } catch {}
      }

      // 3. Fallback or construct new account
      const nowIso = new Date().toISOString();
      const finalUserId =
        createdUserId || `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      if (!newAccount) {
        newAccount = {
          id: finalUserId,
          username: cleanUser,
          email: cleanEmail,
          password,
          authProvider: 'password',
          isProfileCompleted: true,
          syncCode: `TM-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          profile: {
            displayName: cleanName,
            role: '', // Sẽ do người dùng tự cài đặt trong mục hồ sơ
            units: [], // Sẽ do người dùng tự cài đặt trong mục hồ sơ
            birthDate: '1995-01-01',
            avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
              cleanUser
            )}`,
            email: cleanEmail,
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
      }

      // Save into Firestore Database if authenticated with Firebase
      if (isOnline && isFirestoreReadyForUser(newAccount.id)) {
        await saveUserToFirestore(newAccount).catch((err) => {
          console.warn('Firestore initial user write:', err);
        });
        await logUserActivityToFirestore(
          newAccount.id,
          'account_created',
          'Đăng ký tài khoản thành công'
        ).catch(() => {});
      }

      // Save into local cache
      const localUsers = getLocalUsers();
      localUsers.push(newAccount);
      saveLocalUsers(localUsers);
      localStorage.setItem(`taskmaster_tasks_${newAccount.id}`, JSON.stringify([]));

      setSuccessMessage('Đăng ký tài khoản thành công! Bạn có thể đăng nhập ngay.');
      setMode('login');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setErrorMessage(`Lỗi đăng ký tài khoản: ${err.message || 'Vui lòng thử lại.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 4. Password Reset Modal Handler
   */
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim() || !resetEmail.includes('@')) {
      setErrorMessage('Vui lòng nhập địa chỉ email hợp lệ để khôi phục mật khẩu.');
      return;
    }

    setIsResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail.trim().toLowerCase());
      setSuccessMessage(
        `Hướng dẫn đặt lại mật khẩu đã được gửi đến email ${resetEmail}. Vui lòng kiểm tra hộp thư.`
      );
      setIsResetOpen(false);
      setResetEmail('');
    } catch (err: any) {
      setErrorMessage(
        `Không thể gửi yêu cầu đặt lại mật khẩu: ${err.message || 'Vui lòng kiểm tra email.'}`
      );
    } finally {
      setIsResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-3 sm:p-6 relative overflow-hidden font-['Be_Vietnam_Pro',sans-serif]">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-sky-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-full opacity-40 bg-[radial-gradient(#4f46e5_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      <div className="w-full max-w-md sm:max-w-lg space-y-4 relative z-10 my-auto">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-sky-400 text-white shadow-xl shadow-indigo-500/25 ring-4 ring-indigo-500/10">
            <CheckSquare className="w-7 h-7 stroke-[2.3]" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">TaskMaster</h1>
            <span className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-xs font-black px-2.5 py-0.5 rounded-lg shadow-sm border border-indigo-400/30">
              AI CLOUD
            </span>
          </div>
          <p className="text-slate-400 text-xs sm:text-sm max-w-sm mx-auto font-medium">
            Hệ thống quản lý công việc thông minh • Lưu trữ Firestore đám mây &amp; Đồng bộ đa thiết bị
          </p>

          {/* Database & Network Status Pill */}
          <div className="pt-1 flex flex-wrap items-center justify-center gap-2 text-[11px]">
            {isOnline ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-300 font-semibold bg-emerald-950/70 px-3 py-1 rounded-full border border-emerald-800/60 shadow-xs">
                <Database className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Firestore Cloud: Sẵn sàng &amp; Mã hóa</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-amber-300 font-semibold bg-amber-950/70 px-3 py-1 rounded-full border border-amber-800/60 shadow-xs">
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span>Ngoại tuyến: Lưu trữ IndexedDB trên thiết bị</span>
              </span>
            )}
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-slate-900/90 backdrop-blur-xl rounded-3xl p-5 sm:p-7 text-slate-100 shadow-2xl border border-slate-800/80 space-y-4">
          {/* Notifications */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-800/70 text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-rose-400 hover:text-rose-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-800/70 text-emerald-200 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{successMessage}</div>
              <button
                type="button"
                onClick={() => setSuccessMessage(null)}
                className="text-emerald-400 hover:text-emerald-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Quick Google Single Sign-On Button */}
          <div className="space-y-2">
            <button
              type="button"
              disabled={isLoading || !isOnline}
              onClick={handleGoogleSignIn}
              className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group border border-slate-200 active:scale-[0.99]"
            >
              {/* Official Google SVG Icon */}
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Tiếp tục với tài khoản Google</span>
            </button>

            <div className="relative flex py-1 items-center">
              <div className="grow border-t border-slate-800"></div>
              <span className="shrink mx-3 text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
                hoặc tài khoản mật khẩu
              </span>
              <div className="grow border-t border-slate-800"></div>
            </div>
          </div>

          {/* Login / Register Toggle Tabs */}
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-800/80 border border-slate-700/60 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-2.5 rounded-xl transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-indigo-600 text-white shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-slate-200'
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
                mode === 'register'
                  ? 'bg-indigo-600 text-white shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Đăng ký tài khoản mới
            </button>
          </div>

          {/* Form */}
          <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-3.5">
            {/* Username / Login Email */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 block">
                {mode === 'login' ? 'Tên đăng nhập hoặc Email:' : 'Tên tài khoản (Username):'}{' '}
                <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={mode === 'login' ? 'canbo_quanly hoặc email@domain.com' : 'Ví dụ: canbo_chidoan'}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-xs sm:text-sm font-medium outline-hidden text-white placeholder-slate-500 transition-all"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            {/* Registration Fields */}
            {mode === 'register' && (
              <>
                {/* Full Display Name */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 block">
                    Họ và tên hiển thị: <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Ví dụ: Nguyễn Văn Tuấn"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-xs sm:text-sm font-medium outline-hidden text-white placeholder-slate-500 transition-all"
                    />
                    <Sparkles className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>

                {/* Email Address */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 block">
                    Địa chỉ Email chính thức: <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="canbo@domain.com"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-xs sm:text-sm font-medium outline-hidden text-white placeholder-slate-500 transition-all"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>
              </>
            )}

            {/* Password */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">
                  Mật khẩu: <span className="text-rose-400">*</span>
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setIsResetOpen(true)}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                  >
                    Quên mật khẩu?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-xs sm:text-sm font-medium outline-hidden text-white placeholder-slate-500 transition-all"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength meter in Register mode */}
              {mode === 'register' && password.length > 0 && (
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Độ mạnh mật khẩu:</span>
                    <span className="font-bold text-slate-200">{strengthLabels[passStrength]}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 h-1.5">
                    {[0, 1, 2, 3].map((idx) => (
                      <div
                        key={idx}
                        className={`rounded-full transition-all ${
                          idx < passStrength ? strengthColors[passStrength] : 'bg-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password (only in Register mode) */}
            {mode === 'register' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">
                  Xác nhận lại mật khẩu: <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-xs sm:text-sm font-medium outline-hidden text-white placeholder-slate-500 transition-all"
                  />
                  <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Remember Me Checkbox */}
            {mode === 'login' && (
              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none text-slate-300">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500/20"
                  />
                  <span>Ghi nhớ đăng nhập trên thiết bị này</span>
                </label>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{loadingText}</span>
                </>
              ) : (
                <>
                  <span>{mode === 'login' ? 'Đăng nhập vào TaskMaster AI' : 'Tạo tài khoản & Bắt đầu'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Multi-Device & Data Security Notice */}
          <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-900/50 text-[11px] text-slate-300 space-y-1.5 leading-relaxed">
            <div className="font-bold text-indigo-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>Bảo mật &amp; Cơ chế đồng bộ Firestore:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>
                <strong>Firestore Cloud Sync:</strong> Toàn bộ dữ liệu nhiệm vụ được lưu trữ an toàn trên máy chủ Google Cloud Firestore.
              </li>
              <li>
                <strong>Đa thiết bị:</strong> Tự động đồng bộ trên máy tính, điện thoại hoặc máy tính bảng khi đăng nhập.
              </li>
              <li>
                <strong>Hồ sơ cá nhân:</strong> Chức vụ và đơn vị công tác được tự cài đặt riêng trong mục Hồ sơ sau khi đăng nhập.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Password Reset Modal */}
      {isResetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 rounded-3xl p-6 border border-slate-700 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/30 text-indigo-400 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-white">Khôi phục mật khẩu</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsResetOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Nhập địa chỉ email tài khoản của bạn. Hệ thống sẽ gửi email có liên kết bảo mật để bạn thiết lập mật khẩu mới qua Firebase.
            </p>

            <form onSubmit={handlePasswordReset} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">Địa chỉ Email:</label>
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="canbo@domain.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs sm:text-sm text-white focus:border-indigo-500 outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsResetOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isResetLoading}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isResetLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Gửi liên kết khôi phục</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
