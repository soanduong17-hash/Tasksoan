import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Calendar,
  Building2,
  Upload,
  Link2,
  Bell,
  Volume2,
  CheckCircle2,
  ShieldAlert,
  Save,
  Plus,
  X,
  ExternalLink,
  Trash2,
  Copy,
  Check,
  HardDrive,
  MessageSquare,
  Send,
  FileText,
  Layers,
  Globe,
  Share2,
  AlertTriangle,
  RefreshCw,
  Smartphone,
  Laptop,
  Tablet,
  Download,
  History,
  Database,
  Shield,
  Loader2,
  Unlink,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Key,
  Clock
} from 'lucide-react';
import { UserProfile, ConnectedAppItem, UserAccount, DeviceSession, Task } from '../types/task';
import { defaultConnectedApps } from '../data/seedData';
import { playNotificationSound, sendBrowserNotification } from '../utils/audioNotification';
import { formatBirthDateVietnamese } from '../utils/taskCalculations';
import { BirthDateInput } from './BirthDateInput';
import {
  getStorageDiagnostics,
  requestPersistentStorage,
  exportDatabaseBackup,
  importDatabaseBackup,
  calculateDataIntegrityChecksum,
  getLocalDeviceId,
  detectDeviceInfo,
  getRecentSyncLogs,
  clearAllSyncLogs,
  SyncLogEntry
} from '../utils/indexedDb';

interface ProfileViewProps {
  profile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
  currentUser?: UserAccount | null;
  onAccountUpdated?: (updated: UserAccount, mergedTasks?: any[]) => void;
  onTriggerSync?: () => void;
  isOnline?: boolean;
  tasks?: Task[];
  onTasksUpdated?: (tasks: Task[]) => void;
}

const APP_PRESETS = [
  {
    key: 'gcalendar',
    name: 'Google Calendar',
    url: 'https://calendar.google.com',
    category: 'calendar' as const,
    description: 'Đồng bộ lịch công tác tuần, lịch họp chi bộ và tự động nhắc sự kiện',
    iconKey: 'calendar',
  },
  {
    key: 'gdrive',
    name: 'Google Drive & Docs',
    url: 'https://drive.google.com',
    category: 'storage' as const,
    description: 'Kho lưu trữ biên bản, nghị quyết, tài liệu minh chứng và hồ sơ nhiệm vụ',
    iconKey: 'drive',
  },
  {
    key: 'zalo',
    name: 'Zalo Chat & OA',
    url: 'https://chat.zalo.me',
    category: 'communication' as const,
    description: 'Điều phối trực tiếp các nhóm công tác, tiếp nhận phản hồi tức thời',
    iconKey: 'zalo',
  },
  {
    key: 'telegram',
    name: 'Telegram Messenger',
    url: 'https://web.telegram.org',
    category: 'communication' as const,
    description: 'Kênh nhận thông báo tự động và báo cáo tiến độ khẩn cấp',
    iconKey: 'telegram',
  },
  {
    key: 'notion',
    name: 'Notion Workspace',
    url: 'https://www.notion.so',
    category: 'document' as const,
    description: 'Cơ sở tri thức nội bộ, ghi chép sổ tay công việc và chiến lược',
    iconKey: 'notion',
  },
  {
    key: 'trello',
    name: 'Trello Board',
    url: 'https://trello.com',
    category: 'project_management' as const,
    description: 'Bảng Kanban trực quan điều phối công việc liên phòng ban',
    iconKey: 'trello',
  },
  {
    key: 'slack',
    name: 'Slack Workspace',
    url: 'https://app.slack.com',
    category: 'communication' as const,
    description: 'Không gian trao đổi nghiệp vụ và tích hợp thông báo webhook',
    iconKey: 'slack',
  },
  {
    key: 'github',
    name: 'GitHub Repository',
    url: 'https://github.com',
    category: 'project_management' as const,
    description: 'Theo dõi mã nguồn dự án, báo cáo lỗi và tiến độ kỹ thuật',
    iconKey: 'github',
  },
  {
    key: 'custom',
    name: '',
    url: '',
    category: 'other' as const,
    description: '',
    iconKey: 'custom',
  },
];

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  onUpdateProfile,
  currentUser,
  onAccountUpdated,
  onTriggerSync,
  isOnline = true,
  tasks = [],
  onTasksUpdated,
}) => {
  const [formData, setFormData] = useState<UserProfile>(profile);
  const [newUnitText, setNewUnitText] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [statusNotice, setStatusNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Account & Memory Synchronization States (Code-based, no QR)
  const [syncCode, setSyncCode] = useState<string>(() => {
    return currentUser?.syncCode || 'TM-' + Math.floor(1000 + Math.random() * 9000);
  });
  const [pairedInfo, setPairedInfo] = useState<{
    id?: string;
    displayName?: string;
    syncCode?: string;
    pairedAt?: string;
  } | null>(() => {
    if (currentUser?.pairedUserId) {
      return {
        id: currentUser.pairedUserId,
        displayName: currentUser.pairedUserName || 'Tài khoản liên kết',
        syncCode: currentUser.pairedSyncCode,
        pairedAt: currentUser.pairedAt,
      };
    }
    return null;
  });

  const [targetSyncCodeInput, setTargetSyncCodeInput] = useState('');
  const [isPairingLoading, setIsPairingLoading] = useState(false);
  const [pairError, setPairError] = useState<string | null>(null);
  const [pairSuccess, setPairSuccess] = useState<string | null>(null);
  const [copiedSyncCode, setCopiedSyncCode] = useState(false);

  // Multi-Device Sessions State
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [isDevicesLoading, setIsDevicesLoading] = useState(false);
  const [revokingDeviceId, setRevokingDeviceId] = useState<string | null>(null);

  // Storage Diagnostics State
  const [storageStats, setStorageStats] = useState<{
    usageBytes: number;
    quotaBytes: number;
    percentageUsed: number;
    isPersisted: boolean;
  }>({ usageBytes: 0, quotaBytes: 0, percentageUsed: 0, isPersisted: false });
  const [syncLogs, setSyncLogs] = useState<SyncLogEntry[]>([]);
  const [isSyncLogsOpen, setIsSyncLogsOpen] = useState(false);
  const [isPersistenceRequesting, setIsPersistenceRequesting] = useState(false);
  const fileBackupInputRef = useRef<HTMLInputElement | null>(null);

  // Connected apps real state
  const [connectedApps, setConnectedApps] = useState<ConnectedAppItem[]>(() => {
    if (formData.connectedAppsList && formData.connectedAppsList.length > 0) {
      return formData.connectedAppsList;
    }
    return defaultConnectedApps;
  });

  // Modals for apps
  const [isAddAppModalOpen, setIsAddAppModalOpen] = useState(false);
  const [appToDelete, setAppToDelete] = useState<ConnectedAppItem | null>(null);
  const [copiedAppId, setCopiedAppId] = useState<string | null>(null);

  // New App Form State
  const [presetChoice, setPresetChoice] = useState('gcalendar');
  const [appName, setAppName] = useState('Google Calendar');
  const [appUrl, setAppUrl] = useState('https://calendar.google.com');
  const [appCategory, setAppCategory] = useState<ConnectedAppItem['category']>('calendar');
  const [appDescription, setAppDescription] = useState('Đồng bộ lịch công tác tuần và nhắc việc');
  const [appFormError, setAppFormError] = useState('');

  // Fetch devices and storage diagnostics
  const refreshDevicesList = async () => {
    if (!currentUser) return;
    setIsDevicesLoading(true);
    try {
      const devId = getLocalDeviceId();
      const res = await fetch(`/api/devices/${currentUser.id}?currentDeviceId=${devId}`);
      if (res.ok) {
        const data = await res.json();
        setDevices(data.devices || []);
      }
    } catch {
    } finally {
      setIsDevicesLoading(false);
    }
  };

  const refreshStorageDiagnostics = async () => {
    try {
      const stats = await getStorageDiagnostics();
      setStorageStats(stats);
      const logs = await getRecentSyncLogs(20);
      setSyncLogs(logs);
    } catch {}
  };

  useEffect(() => {
    refreshDevicesList();
    refreshStorageDiagnostics();
  }, [currentUser]);

  useEffect(() => {
    if (currentUser?.syncCode) {
      setSyncCode(currentUser.syncCode);
    }
    if (currentUser?.pairedUserId) {
      setPairedInfo({
        id: currentUser.pairedUserId,
        displayName: currentUser.pairedUserName || 'Tài khoản đối tác',
        syncCode: currentUser.pairedSyncCode,
        pairedAt: currentUser.pairedAt,
      });
    } else {
      setPairedInfo(null);
    }
  }, [currentUser]);

  const handleCopySyncCode = () => {
    navigator.clipboard.writeText(syncCode);
    setCopiedSyncCode(true);
    setTimeout(() => setCopiedSyncCode(false), 2000);
  };

  // Pair 2 accounts via sync code
  const handlePairAccount = async () => {
    const finalCode = targetSyncCodeInput.trim().toUpperCase();
    if (!finalCode) {
      setPairError('Vui lòng nhập mã kết nối hoặc tên tài khoản đối tác.');
      return;
    }

    if (currentUser?.syncCode && finalCode === currentUser.syncCode.toUpperCase()) {
      setPairError('Không thể tự liên kết với chính tài khoản hiện tại.');
      return;
    }

    setIsPairingLoading(true);
    setPairError(null);
    setPairSuccess(null);

    try {
      if (isOnline && currentUser) {
        const res = await fetch('/api/sync/pair', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentUserId: currentUser.id,
            targetSyncCode: finalCode,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const newPairInfo = {
            id: data.pairedUser.id,
            displayName: data.pairedUser.displayName,
            syncCode: data.pairedUser.syncCode,
            pairedAt: data.pairedUser.pairedAt,
          };
          setPairedInfo(newPairInfo);

          const updatedUser: UserAccount = {
            ...currentUser,
            pairedUserId: data.pairedUser.id,
            pairedUserName: data.pairedUser.displayName,
            pairedSyncCode: data.pairedUser.syncCode,
            pairedAt: data.pairedUser.pairedAt,
          };

          if (onAccountUpdated) {
            onAccountUpdated(updatedUser, data.tasks || []);
          }

          setPairSuccess(data.message || `Đã liên kết bộ nhớ thành công với "${data.pairedUser.displayName}"!`);
          setTargetSyncCodeInput('');
          if (onTriggerSync) onTriggerSync();
          playNotificationSound('success');
          return;
        } else {
          const errData = await res.json().catch(() => ({}));
          setPairError(errData.error || 'Mã kết nối không hợp lệ hoặc không tìm thấy tài khoản đối tác.');
          return;
        }
      }

      setPairSuccess(`Đã lưu thiết lập liên kết bộ nhớ cho mã "${finalCode}".`);
      setTargetSyncCodeInput('');
    } catch (err: any) {
      setPairError('Lỗi kết nối bộ nhớ: ' + err.message);
    } finally {
      setIsPairingLoading(false);
    }
  };

  const handleUnpairAccount = async () => {
    if (!currentUser) return;
    setIsPairingLoading(true);
    setPairError(null);
    setPairSuccess(null);

    try {
      if (isOnline) {
        await fetch('/api/sync/unpair', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id }),
        });
      }

      setPairedInfo(null);
      const updatedUser: UserAccount = {
        ...currentUser,
        pairedUserId: undefined,
        pairedUserName: undefined,
        pairedSyncCode: undefined,
        pairedAt: undefined,
      };
      if (onAccountUpdated) {
        onAccountUpdated(updatedUser);
      }
      setPairSuccess('Đã hủy liên kết bộ nhớ tài khoản thành công.');
    } catch (err: any) {
      setPairError('Lỗi hủy liên kết: ' + err.message);
    } finally {
      setIsPairingLoading(false);
    }
  };

  // Device Revocation Handler
  const handleRevokeDevice = async (targetDeviceId: string) => {
    if (!currentUser) return;
    setRevokingDeviceId(targetDeviceId);
    try {
      const res = await fetch('/api/devices/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          targetDeviceId,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setDevices(data.devices || []);
        setStatusNotice({
          type: 'success',
          text: data.message || 'Đã thu hồi phiên và đăng xuất thiết bị từ xa!',
        });
        setTimeout(() => setStatusNotice(null), 4000);
      } else {
        const err = await res.json().catch(() => ({}));
        setPairError(err.error || 'Không thể thu hồi thiết bị');
      }
    } catch (e: any) {
      setPairError('Lỗi thu hồi phiên: ' + e.message);
    } finally {
      setRevokingDeviceId(null);
    }
  };

  // Storage Diagnostics & Backup Handlers
  const handleRequestPersistence = async () => {
    setIsPersistenceRequesting(true);
    try {
      const granted = await requestPersistentStorage();
      if (granted) {
        setStatusNotice({
          type: 'success',
          text: '✓ Trình duyệt đã cấp quyền lưu trữ bền vững (Persistent Storage). Dữ liệu sẽ không bị xóa tự động!',
        });
      } else {
        setStatusNotice({
          type: 'error',
          text: 'Trình duyệt từ chối hoặc đã lưu theo chính sách mặc định.',
        });
      }
      refreshStorageDiagnostics();
    } catch (err: any) {
      setPairError('Lỗi xin quyền lưu trữ: ' + err.message);
    } finally {
      setIsPersistenceRequesting(false);
    }
  };

  const handleExportBackup = async () => {
    if (!currentUser) return;
    try {
      const backupJson = await exportDatabaseBackup(currentUser.id, tasks || []);
      const blob = new Blob([backupJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TaskMaster_Backup_${currentUser.username}_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatusNotice({
        type: 'success',
        text: `Đã xuất tệp sao lưu an toàn (${tasks.length} nhiệm vụ) về máy!`,
      });
      setTimeout(() => setStatusNotice(null), 4000);
      refreshStorageDiagnostics();
    } catch (err: any) {
      setPairError('Lỗi xuất tệp sao lưu: ' + err.message);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    try {
      const text = await file.text();
      const result = await importDatabaseBackup(currentUser.id, text);
      if (result.success && Array.isArray(result.tasks)) {
        if (onTasksUpdated) {
          onTasksUpdated(result.tasks);
        }
        setStatusNotice({
          type: 'success',
          text: result.message,
        });
        if (onTriggerSync) onTriggerSync();
        playNotificationSound('success');
      } else {
        setPairError(result.message);
      }
      refreshStorageDiagnostics();
    } catch (err: any) {
      setPairError('Lỗi đọc tệp sao lưu: ' + err.message);
    } finally {
      if (fileBackupInputRef.current) {
        fileBackupInputRef.current.value = '';
      }
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setFormData((prev) => ({
          ...prev,
          avatarUrl: event.target!.result as string,
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddUnit = () => {
    const trimmed = newUnitText.trim();
    if (!trimmed) return;
    if (formData.units.includes(trimmed)) {
      setNewUnitText('');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      units: [...prev.units, trimmed],
    }));
    setNewUnitText('');
  };

  const handleRemoveUnit = (unitToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      units: prev.units.filter((u) => u !== unitToRemove),
    }));
  };

  const handleToggleNotification = (key: keyof UserProfile['notifications']) => {
    setFormData((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: !prev.notifications[key],
      },
    }));
  };

  const handleTestChime = () => {
    playNotificationSound('reminder');
  };

  const handleTestBrowserNotification = async () => {
    const allowed = await sendBrowserNotification('TaskMaster AI', {
      body: 'Đây là thông báo mẫu nhắc nhở nhiệm vụ ưu tiên của bạn!',
    });
    if (!allowed) {
      setStatusNotice({
        type: 'error',
        text: 'Vui lòng cấp quyền thông báo trên trình duyệt của bạn trong phần Cài đặt trang web.',
      });
      setTimeout(() => setStatusNotice(null), 5000);
    } else {
      setStatusNotice({
        type: 'success',
        text: 'Đã gửi thông báo mẫu lên màn hình trình duyệt thành công!',
      });
      setTimeout(() => setStatusNotice(null), 4000);
    }
  };

  // Connected Apps Handlers
  const handleOpenAddModal = () => {
    setPresetChoice('custom');
    setAppName('');
    setAppUrl('');
    setAppCategory('other');
    setAppDescription('');
    setAppFormError('');
    setIsAddAppModalOpen(true);
  };

  const handleSelectPreset = (key: string) => {
    setPresetChoice(key);
    const preset = APP_PRESETS.find((p) => p.key === key);
    if (preset && key !== 'custom') {
      setAppName(preset.name);
      setAppUrl(preset.url);
      setAppCategory(preset.category);
      setAppDescription(preset.description);
    } else {
      setAppName('');
      setAppUrl('');
      setAppCategory('other');
      setAppDescription('');
    }
  };

  const handleAddAppSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAppFormError('');

    const trimmedName = appName.trim();
    let trimmedUrl = appUrl.trim();

    if (!trimmedName) {
      setAppFormError('Vui lòng nhập tên ứng dụng');
      return;
    }
    if (!trimmedUrl) {
      setAppFormError('Vui lòng nhập địa chỉ liên kết (URL)');
      return;
    }

    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      trimmedUrl = `https://${trimmedUrl}`;
    }

    try {
      new URL(trimmedUrl);
    } catch {
      setAppFormError('Đường link URL không hợp lệ (Ví dụ: https://calendar.google.com)');
      return;
    }

    const newApp: ConnectedAppItem = {
      id: `app-${Date.now()}`,
      name: trimmedName,
      url: trimmedUrl,
      category: appCategory,
      description: appDescription.trim() || 'Ứng dụng liên kết công việc',
      isConnected: true,
      addedAt: new Date().toISOString(),
      iconKey: presetChoice !== 'custom' ? presetChoice : 'custom',
    };

    const nextApps = [newApp, ...connectedApps];
    setConnectedApps(nextApps);
    const updatedProfile = {
      ...formData,
      connectedAppsList: nextApps,
    };
    setFormData(updatedProfile);
    onUpdateProfile(updatedProfile);
    setIsAddAppModalOpen(false);
  };

  // Explicit confirmation when deleting connected apps
  const handleDeleteAppConfirm = (id: string) => {
    const targetApp = connectedApps.find((a) => a.id === id);
    const nextApps = connectedApps.filter((a) => a.id !== id);
    setConnectedApps(nextApps);
    const updatedProfile = {
      ...formData,
      connectedAppsList: nextApps,
    };
    setFormData(updatedProfile);
    onUpdateProfile(updatedProfile);
    setAppToDelete(null);

    setStatusNotice({
      type: 'success',
      text: `Đã xóa liên kết ứng dụng "${targetApp?.name || 'ứng dụng'}" thành công.`,
    });
    setTimeout(() => setStatusNotice(null), 3000);
  };

  const handleToggleAppStatus = (id: string) => {
    const nextApps = connectedApps.map((a) =>
      a.id === id ? { ...a, isConnected: !a.isConnected } : a
    );
    setConnectedApps(nextApps);
    const updatedProfile = {
      ...formData,
      connectedAppsList: nextApps,
    };
    setFormData(updatedProfile);
    onUpdateProfile(updatedProfile);
  };

  const handleCopyUrl = (id: string, url: string) => {
    try {
      navigator.clipboard.writeText(url);
      setCopiedAppId(id);
      setTimeout(() => setCopiedAppId(null), 2000);
    } catch {}
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalProfile: UserProfile = {
      ...formData,
      connectedAppsList: connectedApps,
    };
    onUpdateProfile(finalProfile);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const renderAppIcon = (app: ConnectedAppItem) => {
    const key = app.iconKey || app.category;
    switch (key) {
      case 'calendar':
      case 'gcalendar':
        return <Calendar className="w-5 h-5 text-indigo-600" />;
      case 'storage':
      case 'drive':
      case 'gdrive':
        return <HardDrive className="w-5 h-5 text-emerald-600" />;
      case 'communication':
      case 'zalo':
        return <MessageSquare className="w-5 h-5 text-blue-600" />;
      case 'telegram':
        return <Send className="w-5 h-5 text-sky-500" />;
      case 'document':
      case 'notion':
        return <FileText className="w-5 h-5 text-stone-700" />;
      case 'project_management':
      case 'trello':
        return <Layers className="w-5 h-5 text-violet-600" />;
      case 'slack':
        return <Share2 className="w-5 h-5 text-pink-600" />;
      case 'github':
        return <Globe className="w-5 h-5 text-slate-800" />;
      default:
        return <ExternalLink className="w-5 h-5 text-indigo-600" />;
    }
  };

  const getCategoryLabel = (category: ConnectedAppItem['category']) => {
    switch (category) {
      case 'calendar':
        return 'Lịch làm việc';
      case 'storage':
        return 'Lưu trữ & Tệp';
      case 'communication':
        return 'Nhóm trao đổi & Chat';
      case 'project_management':
        return 'Quản lý dự án';
      case 'document':
        return 'Soạn thảo & Tri thức';
      default:
        return 'Tiện ích mở rộng';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-slate-950/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20 rounded-2xl ring-4 ring-indigo-500/30 overflow-hidden shrink-0 shadow-lg bg-slate-800">
            <img
              src={formData.avatarUrl}
              alt={formData.displayName}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80';
              }}
            />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold">{formData.displayName}</h1>
            <p className="text-xs text-indigo-200">
              {formData.units.length} Đơn vị thực hiện • {connectedApps.filter((a) => a.isConnected).length}/{connectedApps.length} Ứng dụng liên kết
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <span className="inline-block px-2.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-200 text-[11px] font-medium border border-indigo-400/20">
                Tài khoản Quản trị &amp; Điều hành
              </span>
              {formData.birthDate && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-400/20 text-amber-200 text-[11px] font-bold border border-amber-300/30">
                  <Calendar className="w-3 h-3 text-amber-300" />
                  <span>Ngày sinh: {formatBirthDateVietnamese(formData.birthDate, false)}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {saveSuccess && (
          <div className="bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            Đã lưu hồ sơ thành công!
          </div>
        )}

        {statusNotice && (
          <div
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
              statusNotice.type === 'success'
                ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-200'
                : 'bg-rose-500/20 border border-rose-400/40 text-rose-200'
            }`}
          >
            {statusNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0" />
            )}
            <span>{statusNotice.text}</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ĐỒNG BỘ TÀI KHOẢN, QUẢN LÝ THIẾT BỊ & KẾT NỐI BỘ NHỚ */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-7 rounded-3xl text-white shadow-xl border border-indigo-900/50 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 to-sky-400 p-2.5 flex items-center justify-center shrink-0 shadow-md">
                <Link2 className="w-6 h-6 text-white stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base sm:text-lg text-white tracking-tight">
                    Đồng Bộ Tài Khoản &amp; Quản Lý Thiết Bị
                  </h3>
                  <span className="bg-indigo-500/30 text-indigo-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-indigo-400/30">
                    Đa thiết bị
                  </span>
                </div>
                <p className="text-xs text-indigo-200/90 leading-relaxed mt-0.5">
                  Đăng nhập đúng tài khoản trên bất kỳ thiết bị nào để tiếp tục công việc của bạn.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {pairedInfo ? (
                <span className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-3 py-1 rounded-full text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Đang liên kết bộ nhớ
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-slate-300 bg-white/10 px-3 py-1 rounded-full text-xs font-medium border border-white/10">
                  {devices.length} thiết bị hoạt động
                </span>
              )}
            </div>
          </div>

          {pairError && (
            <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{pairError}</div>
              <button
                type="button"
                onClick={() => setPairError(null)}
                className="text-rose-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {pairSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-700 text-emerald-200 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{pairSuccess}</div>
              <button
                type="button"
                onClick={() => setPairSuccess(null)}
                className="text-emerald-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Grid: 2 Cột Mã kết nối và liên kết đối tác */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
            {/* Box 1: Mã Kết Nối Cố Định của Bạn */}
            <div className="md:col-span-5 bg-white/5 backdrop-blur-xs p-5 rounded-2xl border border-white/10 flex flex-col justify-between space-y-4 text-center">
              <div className="space-y-1 w-full">
                <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider block">
                  Mã Kết Nối Bộ Nhớ Của Bạn
                </span>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="text-xl sm:text-2xl font-mono font-black text-amber-300 tracking-widest bg-black/40 px-3.5 py-1.5 rounded-xl border border-amber-400/30">
                    {syncCode}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopySyncCode}
                    className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition-colors cursor-pointer"
                    title="Sao chép mã"
                  >
                    {copiedSyncCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-black/30 border border-white/10 space-y-2 text-left">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Cách hoạt động:</span>
                </div>
                <p className="text-[11px] text-indigo-200/90 leading-relaxed">
                  Gửi mã kết nối này cho đồng nghiệp để cả hai cùng chia sẻ và cập nhật một bộ nhớ công việc chung, hoặc sử dụng để liên kết nhanh giữa 2 tài khoản.
                </p>
              </div>

              {/* 3-day inactivity notice */}
              <div className="text-[11px] text-amber-200/90 bg-amber-950/40 border border-amber-800/50 p-2.5 rounded-xl flex items-center gap-2 text-left">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>Lưu ý:</strong> Tài khoản không có hoạt động trong <strong>3 ngày</strong> sẽ tự động xóa để giải phóng bộ nhớ hệ thống.
                </span>
              </div>
            </div>

            {/* Box 2: Trạng thái & Thao tác liên kết */}
            <div className="md:col-span-7 bg-white/5 backdrop-blur-xs p-5 rounded-2xl border border-white/10 flex flex-col justify-between space-y-4">
              {pairedInfo ? (
                <div className="space-y-4 my-auto">
                  <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-600/60 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-900 font-extrabold flex items-center justify-center text-sm shadow-sm">
                          {pairedInfo.displayName?.charAt(0) || 'P'}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-emerald-300">Bộ nhớ đang liên kết với:</div>
                          <div className="text-sm sm:text-base font-extrabold text-white">
                            {pairedInfo.displayName || 'Tài khoản đối tác'}
                          </div>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-amber-300 bg-black/40 px-2 py-0.5 rounded-lg border border-amber-400/30">
                        {pairedInfo.syncCode || 'TM-LINKED'}
                      </span>
                    </div>

                    <p className="text-xs text-emerald-100/90 leading-relaxed">
                      ✓ Toàn bộ nhiệm vụ của hai bên đã được hợp nhất thành một bộ nhớ chung. Thay đổi từ bất kỳ ai cũng sẽ hiển thị cho người kia.
                    </p>

                    <div className="text-[11px] text-slate-400">
                      Thời điểm liên kết: {pairedInfo.pairedAt ? new Date(pairedInfo.pairedAt).toLocaleString() : 'Vừa xong'}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (onTriggerSync) onTriggerSync();
                        setPairSuccess('Đang đồng bộ lại toàn bộ dữ liệu 2 tài khoản...');
                      }}
                      className="flex-1 py-2.5 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Đồng bộ bộ nhớ ngay</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleUnpairAccount}
                      disabled={isPairingLoading}
                      className="py-2.5 px-4 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-200 hover:text-white border border-rose-500/40 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                      <span>Hủy liên kết</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 my-auto">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-200 block">
                      Nhập mã kết nối của tài khoản khác (hoặc tên tài khoản):
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={targetSyncCodeInput}
                        onChange={(e) => setTargetSyncCodeInput(e.target.value.toUpperCase())}
                        placeholder="VD: TM-8492 hoặc tên đăng nhập"
                        className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 focus:border-amber-400 focus:bg-white/15 text-xs sm:text-sm font-mono font-bold tracking-wider text-white placeholder-slate-400 outline-hidden uppercase"
                      />
                      <button
                        type="button"
                        onClick={handlePairAccount}
                        disabled={isPairingLoading || !targetSyncCodeInput.trim()}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                      >
                        {isPairingLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Link2 className="w-3.5 h-3.5" />
                        )}
                        <span>Liên kết ngay</span>
                      </button>
                    </div>
                  </div>

                  <div className="text-[11px] text-indigo-300/80 flex items-center gap-2 pt-2 border-t border-white/10">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      Dữ liệu được lưu trữ tự động trên máy chủ và thiết bị, giúp bạn xem lại dễ dàng trên mọi thiết bị khi đăng nhập.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* DANH SÁCH THIẾT BỊ ĐANG KẾT NỐI */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-amber-300" />
                <h4 className="font-extrabold text-sm text-white">
                  Danh Sách Thiết Bị Đang Kết Nối ({devices.length} thiết bị)
                </h4>
              </div>
              <button
                type="button"
                onClick={refreshDevicesList}
                disabled={isDevicesLoading}
                className="text-xs text-indigo-300 hover:text-white flex items-center gap-1 cursor-pointer self-start sm:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isDevicesLoading ? 'animate-spin' : ''}`} />
                <span>Làm mới danh sách</span>
              </button>
            </div>

            {devices.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                Chưa có thiết bị nào khác kết nối với tài khoản này.
              </p>
            ) : (
              <div className="divide-y divide-white/10 overflow-hidden">
                {devices.map((dev) => (
                  <div
                    key={dev.deviceId}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0 text-indigo-300">
                        {dev.deviceType === 'desktop' ? (
                          <Laptop className="w-4 h-4" />
                        ) : dev.deviceType === 'tablet' ? (
                          <Tablet className="w-4 h-4" />
                        ) : (
                          <Smartphone className="w-4 h-4" />
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs sm:text-sm">
                            {dev.deviceName}
                          </span>
                          {dev.isCurrentDevice && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold">
                              Thiết bị này
                            </span>
                          )}
                          <span
                            className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase ${
                              dev.status === 'revoked'
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-emerald-500/20 text-emerald-300'
                            }`}
                          >
                            {dev.status === 'revoked' ? 'Đã thu hồi' : 'Đang hoạt động'}
                          </span>
                        </div>
                        <div className="text-[11px] text-indigo-200/70">
                          {dev.browser} • {dev.os} • IP: {dev.ip || '127.0.0.1'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Đăng nhập: {new Date(dev.loggedInAt).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {!dev.isCurrentDevice && dev.status !== 'revoked' && (
                      <button
                        type="button"
                        onClick={() => handleRevokeDevice(dev.deviceId)}
                        disabled={revokingDeviceId === dev.deviceId}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-600 text-rose-200 hover:text-white border border-rose-500/40 text-[11px] font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1 self-start sm:self-auto"
                      >
                        {revokingDeviceId === dev.deviceId ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Unlink className="w-3.5 h-3.5" />
                        )}
                        <span>Đăng xuất từ xa</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CƠ SỞ DỮ LIỆU FIRESTORE CLOUD DATABASE & THEO DÕI NGƯỜI DÙNG */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/60 to-slate-900/80 border border-indigo-500/30 space-y-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-indigo-500/20">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/30 text-indigo-300 flex items-center justify-center border border-indigo-400/40">
                  <Database className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-white flex items-center gap-2 flex-wrap">
                    <span>Cơ Sở Dữ Liệu Đám Mây Firestore</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 font-bold uppercase">
                      Google Cloud Firestore
                    </span>
                  </h4>
                  <p className="text-[11px] text-indigo-200/80">
                    Lưu trữ phân tán, tự động sao lưu và bảo mật theo từng người dùng
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-800/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Đồng bộ thời gian thực (Real-time)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-black/25 border border-white/5 space-y-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Dự án Firebase:</span>
                <span className="font-mono text-indigo-300 font-bold text-[11px] truncate block">chrome-aspect-wcjpc</span>
              </div>
              <div className="p-3 rounded-xl bg-black/25 border border-white/5 space-y-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Bảo mật Firestore:</span>
                <span className="text-emerald-300 font-bold text-[11px] flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Security Rules Hardened</span>
                </span>
              </div>
              <div className="p-3 rounded-xl bg-black/25 border border-white/5 space-y-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Không gian lưu trữ:</span>
                <span className="font-mono text-sky-300 font-bold text-[11px] truncate block">
                  /users/{currentUser?.id ? `${currentUser.id.substring(0, 10)}...` : 'user_uid'}/tasks
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-900/30 border border-indigo-500/20 text-[11px] text-indigo-200/90 leading-relaxed flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong>Cơ chế tự động hóa Firestore:</strong> Mọi thay đổi về nhiệm vụ, hồ sơ cá nhân và phiên đăng nhập đều được truyền tức thời lên Firestore Cloud. Khi đăng nhập trên thiết bị mới, dữ liệu sẽ tự động khôi phục hoàn chỉnh.
              </div>
            </div>
          </div>

          {/* QUẢN LÝ LƯU TRỮ THIẾT BỊ & XIN QUYỀN LƯU BỀN VỮNG */}
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-400/30">
                  <Database className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                    <span>Bộ Nhớ Lưu Trữ Thiết Bị &amp; Cấp Quyền Bền Vững</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-bold uppercase">
                      Lưu trữ trực tiếp
                    </span>
                  </h4>
                  <p className="text-[11px] text-indigo-200/80">
                    Lưu trữ dữ liệu nhiệm vụ trực tiếp vào phần cứng thiết bị và đồng bộ hóa tự động
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-[10px] font-mono font-bold text-amber-300 bg-black/40 px-2 py-0.5 rounded-md border border-amber-400/30">
                  {calculateDataIntegrityChecksum(tasks)}
                </span>
                <span className="text-[10px] text-slate-300 font-medium">Toàn vẹn: Đạt</span>
              </div>
            </div>

            {/* Storage Permission Box (Requirement: Phải xin thiết bị đang sử dụng quyền này để lưu trữ trực tiếp) */}
            <div className={`p-4 rounded-2xl border transition-all space-y-2.5 ${
              storageStats.isPersisted
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {storageStats.isPersisted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
                    )}
                    <span className="font-extrabold text-xs sm:text-sm">
                      {storageStats.isPersisted
                        ? 'Thiết bị ĐÃ CẤP QUYỀN lưu trữ bền vững trực tiếp (Persistent Storage)'
                        : 'Thiết bị CHƯA CẤP QUYỀN lưu trữ bền vững trực tiếp'}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-90 max-w-xl">
                    {storageStats.isPersisted
                      ? 'Dữ liệu nhiệm vụ được lưu trữ an toàn, trực tiếp trên bộ nhớ máy và sẽ không bao giờ bị trình duyệt tự động xóa giải phóng cache.'
                      : 'Cần xin quyền từ thiết bị để lưu trữ dữ liệu trực tiếp vào bộ nhớ máy, đảm bảo dữ liệu luôn khả dụng cả khi mất mạng.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleRequestPersistence}
                  disabled={isPersistenceRequesting}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 shadow-sm ${
                    storageStats.isPersisted
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 ring-2 ring-amber-400/40 hover:scale-105 active:scale-95'
                  }`}
                >
                  {isPersistenceRequesting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang xin quyền thiết bị...</span>
                    </>
                  ) : (
                    <>
                      <Shield className="w-3.5 h-3.5" />
                      <span>{storageStats.isPersisted ? 'Kiểm tra lại quyền thiết bị' : 'Xin thiết bị cấp quyền ngay'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Multi-Account Login Sync Guarantee Notice */}
            <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-700/40 text-xs text-indigo-200 flex items-start gap-2.5">
              <RefreshCw className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold text-white block">
                  Đồng Bộ Hóa Đa Tài Khoản Khi Đăng Nhập:
                </span>
                <p className="text-[11px] text-indigo-200/90 leading-relaxed">
                  Khi người khác hoặc bạn đăng nhập tài khoản trên thiết bị này, hệ thống <strong>luôn luôn tự động đồng bộ hóa</strong> toàn bộ dữ liệu mới nhất từ máy chủ về và lưu trữ trực tiếp vào bộ nhớ thiết bị ngay lập tức.
                </p>
              </div>
            </div>

            {/* Action Buttons: Export/Import Backup */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleExportBackup}
                className="py-2.5 px-3 rounded-xl bg-indigo-600/50 hover:bg-indigo-600 border border-indigo-400/40 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-amber-300" />
                <span>Xuất sao lưu tệp JSON</span>
              </button>

              <label className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer text-center">
                <Upload className="w-3.5 h-3.5 text-sky-400" />
                <span>Khôi phục từ tệp JSON</span>
                <input
                  ref={fileBackupInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-white/10">
              <span className="text-[11px] text-slate-400">
                {tasks.length} nhiệm vụ lưu trực tiếp trên thiết bị này.
              </span>
              <button
                type="button"
                onClick={() => setIsSyncLogsOpen(true)}
                className="text-xs font-bold text-indigo-300 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <History className="w-3.5 h-3.5" />
                <span>Xem nhật ký đồng bộ ({syncLogs.length})</span>
              </button>
            </div>
          </div>
        </div>

        {/* 1. Thông tin cá nhân cơ bản */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <User className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Thông Tin Định Danh
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Họ và Tên Cán Bộ:
              </label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-xs sm:text-sm font-medium"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 flex items-center justify-between">
                <span>Chức Vụ / Vai Trò Phụ Trách:</span>
                <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                  Tôi tự cài đặt
                </span>
              </label>
              <input
                type="text"
                value={formData.role || ''}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                placeholder="Ví dụ: Cán bộ chuyên trách, Bí thư Đoàn, Trưởng phòng..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-xs sm:text-sm font-medium"
              />
            </div>

            <div className="md:col-span-2 p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100">
              <BirthDateInput
                value={formData.birthDate}
                onChange={(newDate) => setFormData({ ...formData, birthDate: newDate })}
                label="Ngày Tháng Năm Sinh (Đúng thứ tự: Ngày - Tháng - Năm)"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Email Liên Hệ:
              </label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-xs sm:text-sm font-medium"
                placeholder="email@example.com"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Số Điện Thoại:
              </label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-xs sm:text-sm font-medium"
                placeholder="0912 345 678"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Thay Đổi Ảnh Đại Diện (Tải ảnh từ máy tính hoặc dán link URL):
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <input
                  type="text"
                  value={formData.avatarUrl}
                  onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                  placeholder="https://..."
                  className="flex-1 px-4 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-xs font-mono"
                />
                <label className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-colors shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Chọn tệp ảnh</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Ghi Chú Cá Nhân / Chức Trách Đảm Nhiệm:
              </label>
              <textarea
                rows={2}
                value={formData.bio || ''}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Ghi chú về phân công công tác hoặc nhiệm vụ chuyên trách..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-xs sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* 2. Đơn vị thực hiện công việc cho */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Các Đơn Vị Thực Hiện Công Việc Cho
            </h2>
          </div>

          <p className="text-xs text-slate-500">
            Chỉ là phân loại mảng việc để bạn phân biệt mình đang lập kế hoạch và làm việc cho đơn vị nào (kế hoạch hành động là của cá nhân bạn, không phải đại diện đơn vị).
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
              placeholder="Nhập tên đơn vị mới (Ví dụ: Ban Chấp Hành, Tổ Công Tác Số 2...)"
              className="flex-1 px-4 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-xs sm:text-sm font-medium"
            />
            <button
              type="button"
              onClick={handleAddUnit}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm
            </button>
          </div>

          <div className="pt-2">
            <span className="text-xs font-semibold text-slate-600 block mb-2">
              Danh sách đơn vị đã thiết lập ({formData.units.length}):
            </span>
            {formData.units.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-500 flex items-center gap-3">
                <Building2 className="w-5 h-5 text-indigo-400 shrink-0" />
                <div>
                  <span className="font-semibold text-slate-700 block">Bạn chưa cài đặt đơn vị nào</span>
                  <span>Hãy nhập tên đơn vị bạn phụ trách hoặc sinh hoạt ở ô phía trên rồi bấm nút <strong>&quot;Thêm&quot;</strong> để tự cài đặt.</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {formData.units.map((unit) => (
                  <div
                    key={unit}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-xs font-bold border border-slate-200 transition-all group"
                  >
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{unit}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveUnit(unit)}
                      className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      aria-label={`Xóa đơn vị ${unit}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 3. LIÊN KẾT ỨNG DỤNG KHÁC (CÓ XÁC NHẬN XÓA) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Link2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Liên Kết Ứng Dụng Khác
                </h2>
                <p className="text-xs text-slate-500">
                  Kết nối với các công cụ làm việc bên ngoài. Nhấn để mở trực tiếp, thêm ứng dụng hoặc xóa liên kết.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs hover:shadow-indigo-600/20 cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm ứng dụng liên kết
            </button>
          </div>

          {/* Connected Apps Grid */}
          {connectedApps.length === 0 ? (
            <div className="text-center py-8 px-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-slate-500">
              <Link2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold">Chưa có ứng dụng nào được liên kết.</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Nhấn &quot;Thêm ứng dụng liên kết&quot; để kết nối Google Calendar, Drive, Zalo, Notion hoặc công cụ riêng của bạn.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {connectedApps.map((app) => (
                <div
                  key={app.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                    app.isConnected
                      ? 'border-slate-200/90 bg-white hover:border-indigo-300 hover:shadow-xs'
                      : 'border-slate-200 bg-slate-50/60 opacity-80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center shrink-0">
                        {renderAppIcon(app)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                            {app.name}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                            {getCategoryLabel(app.category)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                          {app.description}
                        </p>
                        <a
                          href={app.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-mono text-indigo-600 hover:text-indigo-800 hover:underline mt-1 truncate max-w-xs"
                          title={app.url}
                        >
                          <Globe className="w-3 h-3 shrink-0" />
                          <span className="truncate">{app.url.replace(/^https?:\/\//, '')}</span>
                        </a>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleAppStatus(app.id)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 transition-colors cursor-pointer ${
                        app.isConnected
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                      title={app.isConnected ? 'Nhấn để tạm ngắt' : 'Nhấn để kích hoạt'}
                    >
                      {app.isConnected ? 'Đã liên kết' : 'Tạm dừng'}
                    </button>
                  </div>

                  {/* Actions: Open Real App, Copy Link, Delete */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <a
                        href={app.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Mở ứng dụng</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => handleCopyUrl(app.id, app.url)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer relative"
                        title="Sao chép địa chỉ liên kết"
                      >
                        {copiedAppId === app.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Button trigger for Delete confirmation */}
                    <button
                      type="button"
                      onClick={() => setAppToDelete(app)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-rose-600 transition-colors p-1.5 rounded-lg hover:bg-rose-50 cursor-pointer"
                      title="Xóa liên kết ứng dụng này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. Cài đặt thông báo & nhắc việc ưu tiên */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Cài Đặt Thông Báo &amp; Nhắc Việc Ưu Tiên
              </h2>
            </div>
            <button
              type="button"
              onClick={handleTestChime}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5" />
              Nghe thử chuông nhắc
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div>
                <span className="font-bold text-xs text-slate-800 block">
                  Thông báo đẩy trên trình duyệt (Web Notifications)
                </span>
                <span className="text-[11px] text-slate-500">
                  Hiển thị thông báo khi sắp đến giờ hoàn thành nhiệm vụ
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestBrowserNotification}
                  className="text-[11px] font-semibold text-indigo-600 underline mr-2 cursor-pointer"
                >
                  Gửi thử
                </button>
                <input
                  type="checkbox"
                  checked={formData.notifications.browserEnabled}
                  onChange={() => handleToggleNotification('browserEnabled')}
                  className="w-4 h-4 rounded-sm text-indigo-600 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div>
                <span className="font-bold text-xs text-slate-800 block">
                  Âm thanh chuông báo (Chime Sound)
                </span>
                <span className="text-[11px] text-slate-500">
                  Phát âm thanh nhẹ nhàng khi tick subtask hoặc có việc khẩn
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.notifications.soundEnabled}
                onChange={() => handleToggleNotification('soundEnabled')}
                className="w-4 h-4 rounded-sm text-indigo-600 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div>
                <span className="font-bold text-xs text-slate-800 block">
                  Nhắc việc ưu tiên cao (Khẩn cấp)
                </span>
                <span className="text-[11px] text-slate-500">
                  Ưu tiên cảnh báo đối với các nhiệm vụ gắn nhãn &quot;Cao (Gấp)&quot;
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.notifications.priorityReminders}
                onChange={() => handleToggleNotification('priorityReminders')}
                className="w-4 h-4 rounded-sm text-indigo-600 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-rose-50/60 border border-rose-100">
              <div>
                <span className="font-bold text-xs text-rose-900 block flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                  Dải cảnh báo nhiệm vụ trễ hạn (Overdue Alert Banner)
                </span>
                <span className="text-[11px] text-rose-700/80">
                  Hiển thị thanh cảnh báo đỏ khi có việc trễ hạn
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.notifications.overdueAlerts}
                onChange={() => handleToggleNotification('overdueAlerts')}
                className="w-4 h-4 rounded-sm text-rose-600 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-7 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 inline-flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Lưu Thay Đổi Hồ Sơ
          </button>
        </div>
      </form>

      {/* Modal: Thêm ứng dụng liên kết mới */}
      {isAddAppModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Link2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Thêm Ứng Dụng Liên Kết Mới</h3>
                  <p className="text-xs text-slate-500">Tạo lối tắt kết nối thực sự tới ứng dụng làm việc</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddAppModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddAppSubmit} className="space-y-4">
              {appFormError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{appFormError}</span>
                </div>
              )}

              {/* Preset Selector */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Chọn mẫu ứng dụng phổ biến:
                </label>
                <select
                  value={presetChoice}
                  onChange={(e) => handleSelectPreset(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                >
                  <option value="custom">-- Tùy chỉnh (Nhập ứng dụng khác) --</option>
                  <option value="gcalendar">Google Calendar (Lịch công tác &amp; Nhắc hẹn)</option>
                  <option value="gdrive">Google Drive &amp; Docs (Lưu trữ tài liệu nghị quyết)</option>
                  <option value="zalo">Zalo Chat &amp; OA (Điều phối nhóm)</option>
                  <option value="telegram">Telegram Messenger (Thông báo bot tự động)</option>
                  <option value="notion">Notion Workspace (Cơ sở tri thức &amp; Ghi chép)</option>
                  <option value="trello">Trello Board (Bảng Kanban tiến độ)</option>
                  <option value="slack">Slack Workspace (Trao đổi chuyên trách)</option>
                  <option value="github">GitHub Repository (Quản lý dự án kỹ thuật)</option>
                </select>
              </div>

              {/* App Name */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Tên ứng dụng: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="Ví dụ: Google Calendar Công Việc, Zalo Nhóm 1..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  required
                />
              </div>

              {/* App URL */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Địa chỉ liên kết URL (Mở thật sự khi click): <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={appUrl}
                    onChange={(e) => setAppUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    required
                  />
                  <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              {/* App Category */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Phân loại ứng dụng:
                </label>
                <select
                  value={appCategory}
                  onChange={(e) => setAppCategory(e.target.value as ConnectedAppItem['category'])}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                >
                  <option value="calendar">Lịch làm việc &amp; Nhắc hẹn</option>
                  <option value="storage">Lưu trữ tệp &amp; Tài liệu</option>
                  <option value="communication">Giao tiếp &amp; Nhóm Chat</option>
                  <option value="project_management">Quản lý dự án &amp; Công việc</option>
                  <option value="document">Soạn thảo &amp; Tri thức</option>
                  <option value="other">Tiện ích khác</option>
                </select>
              </div>

              {/* App Description */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Mô tả mục đích liên kết:
                </label>
                <input
                  type="text"
                  value={appDescription}
                  onChange={(e) => setAppDescription(e.target.value)}
                  placeholder="Ví dụ: Đồng bộ lịch họp định kỳ thứ hai hàng tuần"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddAppModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs hover:shadow-indigo-600/30 transition-all cursor-pointer"
                >
                  Lưu &amp; Thêm liên kết
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA ỨNG DỤNG LIÊN KẾT (REQUIREMENT) */}
      {appToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-slate-800 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Xác Nhận Xóa Ứng Dụng Liên Kết</h3>
                <p className="text-[11px] text-slate-500">Gỡ bỏ lối tắt kết nối khỏi tài khoản của bạn</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                  {renderAppIcon(appToDelete)}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate">{appToDelete.name}</div>
                  <div className="text-[11px] text-slate-500 font-mono truncate max-w-xs">{appToDelete.url}</div>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed pt-1">
                Bạn có chắc chắn muốn xóa liên kết với ứng dụng <strong>&quot;{appToDelete.name}&quot;</strong> không? Lối tắt và cấu hình kết nối này sẽ được gỡ bỏ khỏi danh sách của bạn.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setAppToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => handleDeleteAppConfirm(appToDelete.id)}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xác nhận xóa liên kết</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nhật Ký Hoạt Động Đồng Bộ */}
      {isSyncLogsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 text-slate-800 space-y-4 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Nhật Ký Hoạt Động Đồng Bộ</h3>
                  <p className="text-[11px] text-slate-500">
                    Ghi nhận các sự kiện lưu ngoại tuyến và đồng bộ máy chủ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSyncLogsOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700">Tổng số bản ghi:</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-extrabold font-mono text-[11px]">
                  {syncLogs.length}
                </span>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await clearAllSyncLogs();
                  setSyncLogs([]);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 font-bold transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
              >
                <Trash2 className="w-3 h-3 text-rose-600" />
                <span>Xóa nhật ký</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px] max-h-[380px]">
              {syncLogs.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-200 text-slate-400">
                  <Database className="w-8 h-8 text-slate-300 mx-auto mb-2 opacity-50" />
                  <p className="font-semibold text-xs text-slate-600">Chưa có bản ghi nhật ký nào.</p>
                </div>
              ) : (
                syncLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-2xl border bg-slate-50 border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-[11px] uppercase tracking-wide text-slate-800">
                          {log.type}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white border border-slate-200 font-bold uppercase text-slate-600">
                          {log.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 leading-snug break-words">
                        {log.details}
                      </p>
                    </div>
                    <div className="text-right shrink-0 text-[10px] text-slate-400">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setIsSyncLogsOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
