import React, { useState } from 'react';
import {
  User,
  Building2,
  Calendar,
  Sparkles,
  ArrowRight,
  Plus,
  X,
  Volume2,
  CheckCircle2,
  Target,
  Briefcase,
  Phone,
  Mail,
  Loader2
} from 'lucide-react';
import { UserProfile, UserAccount } from '../types/task';
import { BirthDateInput } from './BirthDateInput';

interface ProfileOnboardingModalProps {
  user: UserAccount;
  onComplete: (profile: UserProfile) => void;
  isOnline: boolean;
}

export const ProfileOnboardingModal: React.FC<ProfileOnboardingModalProps> = ({
  user,
  onComplete,
  isOnline,
}) => {
  const [displayName, setDisplayName] = useState(user.profile?.displayName || user.username);
  const [role, setRole] = useState(user.profile?.role || 'Cán bộ phụ trách');
  const [birthDate, setBirthDate] = useState(user.profile?.birthDate || '1996-01-01');
  const [phone, setPhone] = useState(user.profile?.phone || '');
  const [email, setEmail] = useState(user.profile?.email || user.email);
  const [weeklyGoal, setWeeklyGoal] = useState<number>(user.profile?.weeklyGoal || 4);
  const [bio, setBio] = useState(user.profile?.bio || '');
  const [units, setUnits] = useState<string[]>(
    user.profile?.units && user.profile.units.length > 0
      ? user.profile.units
      : ['Ban Thanh Niên', 'Chi hội 1']
  );
  const [newUnitText, setNewUnitText] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [browserEnabled, setBrowserEnabled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAddUnit = () => {
    const trimmed = newUnitText.trim();
    if (!trimmed) return;
    if (units.includes(trimmed)) {
      setNewUnitText('');
      return;
    }
    setUnits([...units, trimmed]);
    setNewUnitText('');
  };

  const handleRemoveUnit = (u: string) => {
    if (units.length <= 1) {
      setErrorMsg('Bạn cần giữ ít nhất 1 đơn vị phụ trách / sinh hoạt.');
      return;
    }
    setUnits(units.filter((item) => item !== u));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!displayName.trim()) {
      setErrorMsg('Vui lòng nhập họ và tên của bạn.');
      return;
    }
    if (!role.trim()) {
      setErrorMsg('Vui lòng nhập chức vụ hoặc vai trò phụ trách.');
      return;
    }
    if (units.length === 0) {
      setErrorMsg('Vui lòng thêm ít nhất một đơn vị phụ trách / sinh hoạt.');
      return;
    }

    setIsSubmitting(true);

    const updatedProfile: UserProfile = {
      displayName: displayName.trim(),
      role: role.trim(),
      birthDate,
      units,
      avatarUrl:
        user.profile?.avatarUrl ||
        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName.trim())}`,
      bio: bio.trim(),
      email: email.trim(),
      phone: phone.trim(),
      weeklyGoal: Number(weeklyGoal) || 4,
      connectedAppsList: user.profile?.connectedAppsList || [],
      notifications: {
        browserEnabled,
        soundEnabled,
        priorityReminders: true,
        overdueAlerts: true,
      },
    };

    // If online, send to server
    if (isOnline) {
      try {
        await fetch('/api/auth/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, profile: updatedProfile }),
        });
      } catch {}
    }

    setIsSubmitting(false);
    onComplete(updatedProfile);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-slate-950/80 backdrop-blur-md font-['Be_Vietnam_Pro',sans-serif]">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-slate-800 text-sm">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-indigo-900 via-violet-950 to-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold uppercase tracking-wider mb-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Đăng nhập thành công
              </div>
              <h2 className="text-lg sm:text-xl font-bold">Thiết Lập Hồ Sơ Cá Nhân Ban Đầu</h2>
              <p className="text-xs text-indigo-200">
                Bước bắt buộc: Hoàn tất thông tin cá nhân và đơn vị trước khi vào hệ thống
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
              <span>{errorMsg}</span>
              <button
                type="button"
                onClick={() => setErrorMsg(null)}
                className="font-bold ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Banner Notice */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-100 text-indigo-900 text-xs flex items-start gap-2.5">
            <Target className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold">Không gian làm việc mới 100%:</span>
              <p className="text-[11px] text-indigo-800 leading-relaxed">
                Sau khi lưu hồ sơ, bạn sẽ bước vào phần mềm hoàn toàn mới, chưa có bất kỳ nhiệm vụ nào (điểm năng suất khởi điểm 0/100). Bạn sẽ tự tạo và quản lý các công việc của riêng mình.
              </p>
            </div>
          </div>

          {/* 1. Họ tên & Chức vụ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Họ và Tên cán bộ <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="VD: Nguyễn Văn An"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 outline-hidden font-medium text-slate-900"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Chức vụ / Vai trò phụ trách <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="VD: Bí thư Chi đoàn, Trưởng ban, Quản lý..."
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 outline-hidden font-medium text-slate-900"
                />
                <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>
          </div>

          {/* 2. Đơn vị công tác / sinh hoạt */}
          <div className="space-y-2 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-indigo-600" />
              Các đơn vị thực hiện công việc cho <span className="text-rose-500">*</span>
            </label>
            <p className="text-[11px] text-slate-500">
              Chỉ dùng để phân loại và phân biệt bạn đang làm phần việc này cho đơn vị nào (kế hoạch hành động là của cá nhân bạn, không phải đại diện đơn vị).
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                value={newUnitText}
                onChange={(e) => setNewUnitText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddUnit();
                  }
                }}
                placeholder="Nhập tên đơn vị tôi làm việc cho (Ví dụ: Phòng Kế Hoạch, Chi hội 2...)"
                className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white outline-hidden font-medium"
              />
              <button
                type="button"
                onClick={handleAddUnit}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {units.map((u) => (
                <div
                  key={u}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-bold shadow-2xs"
                >
                  <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{u}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveUnit(u)}
                    className="text-slate-400 hover:text-rose-600 cursor-pointer ml-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Ngày tháng năm sinh (Đúng thứ tự Ngày -> Tháng -> Năm) */}
          <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-3">
            <BirthDateInput
              value={birthDate}
              onChange={setBirthDate}
              label="Ngày tháng năm sinh cán bộ (Đúng thứ tự: Ngày - Tháng - Năm)"
              required
            />
          </div>

          {/* 4. Mục tiêu hoàn thành mỗi tuần */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Mục tiêu hoàn thành mỗi tuần
            </label>
            <div className="relative">
              <input
                type="number"
                min={1}
                max={20}
                value={weeklyGoal}
                onChange={(e) => setWeeklyGoal(Number(e.target.value))}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 outline-hidden font-medium"
              />
              <Target className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
            <span className="text-[11px] text-slate-500">Số nhiệm vụ bạn hướng đến hoàn thành/tuần</span>
          </div>

          {/* 4. Thông tin liên hệ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Số điện thoại liên hệ
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0912 345 678"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-600 outline-hidden text-xs sm:text-sm font-medium"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-600 outline-hidden text-xs sm:text-sm font-medium"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>
          </div>

          {/* 5. Cài đặt chuông & thông báo */}
          <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-2.5">
            <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider block">
              Cài đặt thông báo &amp; âm thanh nhắc nhở:
            </span>
            <div className="space-y-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  className="rounded-sm text-indigo-600"
                />
                <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Bật âm thanh chuông nhắc việc (Sound Chime)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={browserEnabled}
                  onChange={(e) => setBrowserEnabled(e.target.checked)}
                  className="rounded-sm text-indigo-600"
                />
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Bật thông báo đẩy trên trình duyệt khi đến hạn</span>
              </label>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang hoàn tất hồ sơ...
                </>
              ) : (
                <>
                  <span>Hoàn tất thiết lập &amp; Vào phần mềm</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
