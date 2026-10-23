import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Navbar, ActiveTab } from './components/Navbar';
import { DashboardOverview } from './components/DashboardOverview';
import { ActiveTaskList } from './components/ActiveTaskList';
import { ArchiveVault } from './components/ArchiveVault';
import { AIAdvisor } from './components/AIAdvisor';
import { ProfileView } from './components/ProfileView';
import { TaskFormModal } from './components/TaskFormModal';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';
import { AuthView } from './components/AuthView';
import { Task, UserProfile, UserAccount } from './types/task';
import { getTaskStatus } from './utils/taskCalculations';
import { playNotificationSound, sendBrowserNotification } from './utils/audioNotification';
import {
  openDeviceDatabase,
  saveLocalTasksToIndexedDB,
  loadLocalTasksFromIndexedDB,
  getPendingOfflineQueue,
  clearOfflineQueueItems,
  enqueueOfflineSync,
  detectDeviceInfo,
  logSyncEvent,
  requestPersistentStorage,
} from './utils/indexedDb';
import { onAuthStateChanged } from 'firebase/auth';
import { testFirestoreConnection, auth } from './firebase';
import {
  saveTaskToFirestore,
  deleteTaskFromFirestore,
  saveUserToFirestore,
  subscribeToUserTasks,
  logUserActivityToFirestore,
  fetchTasksFromFirestore,
} from './services/firestoreService';

export default function App() {
  // 1. Online / Offline Status
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | undefined>(undefined);

  // 2. Active User Account
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      const savedUser = localStorage.getItem('taskmaster_current_user');
      if (savedUser) return JSON.parse(savedUser);
    } catch {}
    return null;
  });

  // 3. User's Tasks (Isolated per user, empty [] for new users)
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const savedUser = localStorage.getItem('taskmaster_current_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        const savedTasks = localStorage.getItem(`taskmaster_tasks_${parsed.id}`);
        if (savedTasks) return JSON.parse(savedTasks);
      }
    } catch {}
    return [];
  });

  // 4. User Profile
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    if (currentUser?.profile) {
      return currentUser.profile;
    }
    return {
      displayName: 'Cán bộ',
      role: 'Cán bộ phụ trách',
      units: ['Ban Thanh Niên', 'Chi hội 1'],
      birthDate: '1996-01-01',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      weeklyGoal: 4,
      notifications: {
        browserEnabled: true,
        soundEnabled: true,
        priorityReminders: true,
        overdueAlerts: true,
      },
      connectedAppsList: [],
    };
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  // Sound toggle
  const [soundEnabled, setSoundEnabled] = useState(
    userProfile.notifications?.soundEnabled ?? true
  );

  // Persistent storage in IndexedDB alongside localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`taskmaster_tasks_${currentUser.id}`, JSON.stringify(tasks));
      saveLocalTasksToIndexedDB(currentUser.id, tasks).catch(() => {});
    }
  }, [tasks, currentUser]);

  // Load from IndexedDB on startup or account switch
  useEffect(() => {
    if (!currentUser) return;
    let active = true;
    loadLocalTasksFromIndexedDB(currentUser.id).then((storedTasks) => {
      if (!active) return;
      if (Array.isArray(storedTasks) && storedTasks.length > 0) {
        setTasks((prev) => {
          // If state is empty or has fewer tasks, prefer persistent IndexedDB
          if (prev.length === 0 || storedTasks.length > prev.length) {
            return storedTasks;
          }
          return prev;
        });
      } else if (tasks.length > 0) {
        saveLocalTasksToIndexedDB(currentUser.id, tasks).catch(() => {});
      }
    });
    return () => {
      active = false;
    };
  }, [currentUser?.id]);

  // 1. Boot connection test to Firestore
  useEffect(() => {
    testFirestoreConnection().catch(() => {});
  }, []);

  // 2. Real-time Firestore Task Subscription (only when user is authenticated with Firebase)
  useEffect(() => {
    if (!currentUser?.id || !isOnline) return;
    if (!auth.currentUser || auth.currentUser.uid !== currentUser.id) return;

    const unsubscribe = subscribeToUserTasks(
      currentUser.id,
      (remoteTasks) => {
        if (Array.isArray(remoteTasks) && remoteTasks.length > 0) {
          setTasks((prev) => {
            if (JSON.stringify(remoteTasks) !== JSON.stringify(prev)) {
              localStorage.setItem(`taskmaster_tasks_${currentUser.id}`, JSON.stringify(remoteTasks));
              saveLocalTasksToIndexedDB(currentUser.id, remoteTasks).catch(() => {});
              return remoteTasks;
            }
            return prev;
          });
        }
      },
      (err) => {
        console.warn('[Firestore Subscription] Listener notice:', err);
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [currentUser?.id, isOnline]);

  // 3. Firebase Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser && (!currentUser || currentUser.id === fbUser.uid)) {
        fetchTasksFromFirestore(fbUser.uid)
          .then((remoteTasks) => {
            if (Array.isArray(remoteTasks) && remoteTasks.length > 0) {
              setTasks(remoteTasks);
              localStorage.setItem(`taskmaster_tasks_${fbUser.uid}`, JSON.stringify(remoteTasks));
              saveLocalTasksToIndexedDB(fbUser.uid, remoteTasks).catch(() => {});
            }
          })
          .catch(() => {});
      }
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Sync profile to localStorage and Firestore
  useEffect(() => {
    if (currentUser) {
      const updatedUser: UserAccount = {
        ...currentUser,
        profile: userProfile,
      };
      localStorage.setItem('taskmaster_current_user', JSON.stringify(updatedUser));
      if (isOnline && auth.currentUser && auth.currentUser.uid === currentUser.id) {
        saveUserToFirestore(updatedUser).catch(() => {});
      }
    }
  }, [userProfile, currentUser, isOnline]);

  // Flush offline sync queue to server
  const flushOfflineQueue = useCallback(async () => {
    if (!currentUser || !isOnline) return;
    try {
      const queue = await getPendingOfflineQueue(currentUser.id);
      if (queue.length === 0) return;

      const ops = queue.map((q) => ({
        action: q.action,
        taskId: q.taskId,
        taskData: q.taskData,
      }));
      const info = detectDeviceInfo();
      const res = await fetch('/api/sync/incremental', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          deviceId: info.deviceId,
          operations: ops,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const itemIds = queue.map((q) => q.id!).filter(Boolean);
        await clearOfflineQueueItems(itemIds);
        await logSyncEvent(
          'incremental_sync',
          'success',
          `Đã giải phóng và đồng bộ ${ops.length} thao tác từ hàng đợi ngoại tuyến`,
          ops.length
        );
        if (Array.isArray(data.tasks)) {
          setTasks(data.tasks);
          await saveLocalTasksToIndexedDB(currentUser.id, data.tasks);
        }
        if (data.syncedAt) {
          setLastSyncedAt(data.syncedAt);
        }
      }
    } catch {
      // Remain offline and keep queue for later
    }
  }, [currentUser, isOnline]);

  // Online / Offline Listeners & Queue Auto-Drain
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      flushOfflineQueue();
      triggerSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
      logSyncEvent('incremental_sync', 'warning', 'Thiết bị mất kết nối mạng. Chuyển sang lưu trữ ngoại tuyến trên thiết bị.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [flushOfflineQueue]);

  // Server Push Synchronization
  const triggerSync = useCallback(async (tasksToSync?: Task[]) => {
    if (!currentUser || !isOnline) return;
    setIsSyncing(true);
    const payloadTasks = tasksToSync ?? tasks;
    try {
      const res = await fetch('/api/sync/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          tasks: payloadTasks,
          profile: userProfile,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setLastSyncedAt(data.syncedAt || new Date().toISOString());
        logSyncEvent('push', 'success', `Đã đồng bộ ${payloadTasks.length} nhiệm vụ lên máy chủ`, payloadTasks.length);
      }
    } catch {
      // Offline fallback: data is already safely stored in IndexedDB & localStorage
    } finally {
      setIsSyncing(false);
    }
  }, [currentUser, isOnline, tasks, userProfile]);

  // Server Pull Synchronization (Refreshes data across devices)
  const pullLatestFromServer = useCallback(async () => {
    if (!currentUser || !isOnline) return;
    try {
      const res = await fetch(`/api/sync/tasks/${currentUser.id}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.tasks)) {
          setTasks((prev) => {
            // Merge tasks: index server tasks
            const map = new Map<string, Task>();
            for (const t of data.tasks) {
              map.set(t.id, t);
            }
            // Keep any local pending tasks that haven't reached server yet
            for (const t of prev) {
              if (!map.has(t.id)) {
                map.set(t.id, t);
              }
            }
            const merged = Array.from(map.values());
            if (currentUser) {
              localStorage.setItem(`taskmaster_tasks_${currentUser.id}`, JSON.stringify(merged));
            }
            return merged;
          });
        }
        const incomingPairedId = data.pairedUserId ?? data.pairedUser?.id;
        const incomingPairedName = data.pairedUserName ?? data.pairedUser?.name;
        const incomingPairedSyncCode = data.pairedSyncCode ?? data.pairedUser?.syncCode;
        const incomingPairedAt = data.pairedAt ?? data.pairedUser?.pairedAt;

        if (data.profile || data.syncCode || incomingPairedId !== currentUser.pairedUserId) {
          if (data.profile) {
            setUserProfile(data.profile);
          }
          const updatedUser: UserAccount = {
            ...currentUser,
            profile: data.profile || currentUser.profile,
            isProfileCompleted: data.isProfileCompleted ?? currentUser.isProfileCompleted,
            syncCode: data.syncCode || currentUser.syncCode,
            pairedUserId: incomingPairedId,
            pairedUserName: incomingPairedName,
            pairedSyncCode: incomingPairedSyncCode,
            pairedAt: incomingPairedAt,
          };
          setCurrentUser(updatedUser);
          localStorage.setItem('taskmaster_current_user', JSON.stringify(updatedUser));
        }
        if (data.syncedAt) {
          setLastSyncedAt(data.syncedAt);
        }
      }
    } catch {
      // Offline fallback
    }
  }, [currentUser, isOnline]);

  // Device heartbeat and remote revocation detection
  const heartbeatAndCheckRevocation = useCallback(async () => {
    if (!currentUser || !isOnline) return;
    try {
      const info = detectDeviceInfo();
      const res = await fetch('/api/devices/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          deviceId: info.deviceId,
          deviceName: info.deviceName,
          deviceType: info.deviceType,
          browser: info.browser,
          os: info.os,
        }),
      });
      if (res.status === 401) {
        const data = await res.json().catch(() => ({}));
        if (data.revoked) {
          alert('Phiên đăng nhập trên thiết bị này đã bị thu hồi từ xa!');
          handleLogout();
          return;
        }
      }
      if (res.ok) {
        const data = await res.json();
        const thisDev = data.devices?.find((d: any) => d.deviceId === info.deviceId);
        if (thisDev && thisDev.status === 'revoked') {
          alert('Phiên làm việc trên thiết bị này đã bị ngắt kết nối từ xa!');
          handleLogout();
        }
      }
    } catch {}
  }, [currentUser, isOnline]);

  // Two-way manual sync button handler
  const handleManualSyncNow = async () => {
    setIsSyncing(true);
    await flushOfflineQueue();
    await triggerSync();
    await pullLatestFromServer();
    await heartbeatAndCheckRevocation();
    setIsSyncing(false);
  };

  // Auto-refresh when user switches back to this tab or window
  useEffect(() => {
    const handleFocus = () => {
      pullLatestFromServer();
      heartbeatAndCheckRevocation();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [pullLatestFromServer, heartbeatAndCheckRevocation]);

  // Periodic background pull and device heartbeat
  useEffect(() => {
    if (!currentUser || !isOnline) return;
    heartbeatAndCheckRevocation();
    const interval = setInterval(() => {
      pullLatestFromServer();
      heartbeatAndCheckRevocation();
    }, 20000);
    return () => clearInterval(interval);
  }, [currentUser, isOnline, pullLatestFromServer, heartbeatAndCheckRevocation]);

  // Recalculate status of tasks based on current time
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setTasks((prev) =>
        prev.map((t) => {
          if (t.status === 'completed') return t;
          const status = getTaskStatus(t, now);
          if (status !== t.status) {
            return { ...t, status };
          }
          return t;
        })
      );
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Compute counts
  const overdueCount = tasks.filter((t) => t.status === 'overdue').length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const activeCount = tasks.filter((t) => t.status !== 'completed').length;

  // Handlers
  const handleLoginSuccess = async (account: UserAccount, initialTasksList: any[] = []) => {
    setCurrentUser(account);
    setUserProfile(account.profile);
    setSoundEnabled(account.profile.notifications?.soundEnabled ?? true);
    localStorage.setItem('taskmaster_current_user', JSON.stringify(account));

    // Request persistent storage on this device
    try {
      await requestPersistentStorage();
    } catch {}

    // Load tasks for this specific account
    let loadedTasks: Task[] = [];
    if (Array.isArray(initialTasksList) && initialTasksList.length > 0) {
      loadedTasks = initialTasksList;
    } else {
      try {
        const raw = localStorage.getItem(`taskmaster_tasks_${account.id}`);
        if (raw) {
          loadedTasks = JSON.parse(raw);
        }
      } catch {}
    }

    setTasks(loadedTasks);
    localStorage.setItem(`taskmaster_tasks_${account.id}`, JSON.stringify(loadedTasks));
    saveLocalTasksToIndexedDB(account.id, loadedTasks).catch(() => {});

    // Always synchronize with server upon login to pull the absolute freshest state across devices
    if (navigator.onLine) {
      try {
        const res = await fetch(`/api/sync/tasks/${account.id}`);
        if (res.ok) {
          const syncData = await res.json();
          if (Array.isArray(syncData.tasks)) {
            setTasks(syncData.tasks);
            localStorage.setItem(`taskmaster_tasks_${account.id}`, JSON.stringify(syncData.tasks));
            await saveLocalTasksToIndexedDB(account.id, syncData.tasks);
            await logSyncEvent(
              'pull',
              'success',
              `Đồng bộ hóa tài khoản khi đăng nhập thành công (${syncData.tasks.length} nhiệm vụ)`,
              syncData.tasks.length
            );
          }
          if (syncData.profile) {
            setUserProfile(syncData.profile);
          }
          if (syncData.syncedAt) {
            setLastSyncedAt(syncData.syncedAt);
          }
        }
      } catch {}
    }
  };

  const handleProfileOnboardingComplete = (completedProfile: UserProfile) => {
    if (!currentUser) return;
    const updatedAccount: UserAccount = {
      ...currentUser,
      isProfileCompleted: true,
      profile: completedProfile,
      lastSyncedAt: new Date().toISOString(),
    };
    setCurrentUser(updatedAccount);
    setUserProfile(completedProfile);
    setSoundEnabled(completedProfile.notifications?.soundEnabled ?? true);
    localStorage.setItem('taskmaster_current_user', JSON.stringify(updatedAccount));

    // Update local accounts directory
    try {
      const savedAccounts = localStorage.getItem('taskmaster_local_accounts');
      if (savedAccounts) {
        const accounts: UserAccount[] = JSON.parse(savedAccounts);
        const idx = accounts.findIndex((a) => a.id === updatedAccount.id);
        if (idx >= 0) accounts[idx] = updatedAccount;
        else accounts.push(updatedAccount);
        localStorage.setItem('taskmaster_local_accounts', JSON.stringify(accounts));
      }
    } catch {}

    // Preserve existing tasks if user already has data from previous sessions or cross-device
    setTasks((prev) => {
      localStorage.setItem(`taskmaster_tasks_${updatedAccount.id}`, JSON.stringify(prev));
      return prev;
    });

    if (soundEnabled) {
      playNotificationSound('success');
    }
  };

  const handleAccountUpdated = (updatedUser: UserAccount, mergedTasks?: Task[]) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('taskmaster_current_user', JSON.stringify(updatedUser));
    if (updatedUser.profile) {
      setUserProfile(updatedUser.profile);
    }
    if (Array.isArray(mergedTasks)) {
      setTasks(mergedTasks);
      localStorage.setItem(`taskmaster_tasks_${updatedUser.id}`, JSON.stringify(mergedTasks));
      if (updatedUser.pairedUserId) {
        localStorage.setItem(`taskmaster_tasks_${updatedUser.pairedUserId}`, JSON.stringify(mergedTasks));
      }
    }
    try {
      const savedAccounts = localStorage.getItem('taskmaster_local_accounts');
      if (savedAccounts) {
        const accounts: UserAccount[] = JSON.parse(savedAccounts);
        const idx = accounts.findIndex((a) => a.id === updatedUser.id);
        if (idx >= 0) accounts[idx] = updatedUser;
        else accounts.push(updatedUser);
        localStorage.setItem('taskmaster_local_accounts', JSON.stringify(accounts));
      }
    } catch {}
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch {}
    localStorage.removeItem('taskmaster_current_user');
    setCurrentUser(null);
    setTasks([]);
    setActiveTab('overview');
  };

  const handleSaveTask = (savedTask: Task) => {
    let nextTasks: Task[] = [];
    setTasks((prev) => {
      const exists = prev.some((t) => t.id === savedTask.id);
      nextTasks = exists ? prev.map((t) => (t.id === savedTask.id ? savedTask : t)) : [savedTask, ...prev];
      if (currentUser) {
        localStorage.setItem(`taskmaster_tasks_${currentUser.id}`, JSON.stringify(nextTasks));
        saveLocalTasksToIndexedDB(currentUser.id, nextTasks).catch(() => {});
        if (!isOnline) {
          enqueueOfflineSync(currentUser.id, 'upsert', savedTask.id, savedTask).catch(() => {});
          logSyncEvent('offline_queued', 'info', `Xếp hàng lưu ngoại tuyến: ${savedTask.title}`);
        }
      }
      return nextTasks;
    });

    // Direct Firestore write and activity logging
    if (currentUser && isOnline) {
      saveTaskToFirestore(currentUser.id, savedTask).catch(() => {});
      logUserActivityToFirestore(currentUser.id, 'task_create', `Tạo nhiệm vụ: ${savedTask.title}`).catch(() => {});
    }

    if (soundEnabled) {
      playNotificationSound('success');
    }

    // Background sync with immediate latest tasks
    if (nextTasks.length > 0) {
      triggerSync(nextTasks);
    }
  };

  const handleUpdateTask = (updatedTask: Task) => {
    let nextTasks: Task[] = [];
    setTasks((prev) => {
      nextTasks = prev.map((t) => (t.id === updatedTask.id ? updatedTask : t));
      if (currentUser) {
        localStorage.setItem(`taskmaster_tasks_${currentUser.id}`, JSON.stringify(nextTasks));
        saveLocalTasksToIndexedDB(currentUser.id, nextTasks).catch(() => {});
        if (!isOnline) {
          enqueueOfflineSync(currentUser.id, 'upsert', updatedTask.id, updatedTask).catch(() => {});
          logSyncEvent('offline_queued', 'info', `Xếp hàng cập nhật ngoại tuyến: ${updatedTask.title}`);
        }
      }
      return nextTasks;
    });

    // Direct Firestore write and activity logging
    if (currentUser && isOnline) {
      saveTaskToFirestore(currentUser.id, updatedTask).catch(() => {});
      logUserActivityToFirestore(currentUser.id, 'task_update', `Cập nhật nhiệm vụ: ${updatedTask.title}`).catch(() => {});
    }

    // Background sync with immediate latest tasks
    if (nextTasks.length > 0) {
      triggerSync(nextTasks);
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleDeleteTask = (taskId: string) => {
    const target = tasks.find((t) => t.id === taskId);
    if (target) {
      setTaskToDelete(target);
    }
  };

  const handleConfirmDelete = (taskId: string) => {
    let nextTasks: Task[] = [];
    setTasks((prev) => {
      nextTasks = prev.filter((t) => t.id !== taskId);
      if (currentUser) {
        localStorage.setItem(`taskmaster_tasks_${currentUser.id}`, JSON.stringify(nextTasks));
        saveLocalTasksToIndexedDB(currentUser.id, nextTasks).catch(() => {});
        if (!isOnline) {
          enqueueOfflineSync(currentUser.id, 'delete', taskId).catch(() => {});
          logSyncEvent('offline_queued', 'info', `Xếp hàng xóa ngoại tuyến: ${taskId}`);
        }
      }
      return nextTasks;
    });

    // Direct Firestore deletion and activity logging
    if (currentUser && isOnline) {
      deleteTaskFromFirestore(currentUser.id, taskId).catch(() => {});
      logUserActivityToFirestore(currentUser.id, 'task_delete', `Xóa nhiệm vụ: ${taskId}`).catch(() => {});
    }

    setTaskToDelete(null);
    triggerSync(nextTasks);
  };

  const handleArchiveTask = (task: Task) => {
    const updated: Task = {
      ...task,
      progress: 100,
      status: 'completed',
      completedAt: new Date().toISOString(),
      subtasks: task.subtasks.map((s) => ({ ...s, completed: true })),
    };
    handleUpdateTask(updated);

    if (soundEnabled) {
      playNotificationSound('success');
    }

    if (userProfile.notifications?.browserEnabled) {
      sendBrowserNotification('Nhiệm vụ hoàn thành!', {
        body: `Nhiệm vụ "${task.title}" đã được nghiệm thu và lưu trữ thành công.`,
      });
    }
  };

  const handleRestoreTask = (task: Task) => {
    const updated: Task = {
      ...task,
      status: 'in_progress',
      completedAt: undefined,
    };
    handleUpdateTask(updated);
  };

  const handleUpdateProfile = (updatedProfile: UserProfile) => {
    setUserProfile(updatedProfile);
    if (currentUser) {
      const updatedUser: UserAccount = {
        ...currentUser,
        profile: updatedProfile,
      };
      setCurrentUser(updatedUser);
      localStorage.setItem('taskmaster_current_user', JSON.stringify(updatedUser));
      // Trigger background sync to persist updated profile to server
      if (isOnline) {
        fetch('/api/sync/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.id,
            tasks,
            profile: updatedProfile,
          }),
        }).catch(() => {});
      }
    }
  };

  const [defaultDueDateForModal, setDefaultDueDateForModal] = useState<string | undefined>(undefined);

  const handleOpenCreateModal = (defaultDueDate?: string | unknown) => {
    setEditingTask(null);
    setDefaultDueDateForModal(typeof defaultDueDate === 'string' ? defaultDueDate : undefined);
    setIsModalOpen(true);
  };

  const handleNavigateToTasks = (filter?: 'all' | 'in_progress' | 'overdue' | 'completed') => {
    if (filter === 'completed') {
      setActiveTab('archive');
    } else {
      setStatusFilter(filter || 'all');
      setActiveTab('tasks');
    }
  };

  const handleToggleSound = () => {
    const newSound = !soundEnabled;
    setSoundEnabled(newSound);
    setUserProfile((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        soundEnabled: newSound,
      },
    }));
  };

  // ----------------------------------------------------
  // ROUTING & AUTH WORKFLOW GATES
  // ----------------------------------------------------

  // Gate 1: No User Logged In -> Show AuthView (Login / Register)
  if (!currentUser) {
    return <AuthView onLoginSuccess={handleLoginSuccess} isOnline={isOnline} />;
  }

  // Authenticated -> Access Full Application directly (user configures role and units in Profile tab)

  // Gate 3: Authenticated & Profile Set -> Access Full Application
  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 flex flex-col font-['Be_Vietnam_Pro',sans-serif]">
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenCreateModal={handleOpenCreateModal}
        overdueCount={overdueCount}
        completedCount={completedCount}
        activeCount={activeCount}
        userProfile={userProfile}
        currentUser={currentUser}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        isOnline={isOnline}
        isSyncing={isSyncing}
        lastSyncedAt={lastSyncedAt}
        onSyncNow={handleManualSyncNow}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'overview' && (
          <DashboardOverview
            tasks={tasks}
            userProfile={userProfile}
            onNavigateToTasks={handleNavigateToTasks}
            onOpenCreateModal={handleOpenCreateModal}
            onNavigateToAiAdvisor={() => setActiveTab('ai-advisor')}
            onQuickCompleteTask={handleArchiveTask}
            onEditTask={handleEditTask}
          />
        )}

        {activeTab === 'tasks' && (
          <ActiveTaskList
            tasks={tasks}
            onUpdateTask={handleUpdateTask}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onArchiveTask={handleArchiveTask}
            onOpenCreateModal={handleOpenCreateModal}
            units={userProfile.units}
            initialStatusFilter={statusFilter}
          />
        )}

        {activeTab === 'archive' && (
          <ArchiveVault
            completedTasks={tasks.filter((t) => t.status === 'completed')}
            userProfile={userProfile}
            onRestoreTask={handleRestoreTask}
            onDeleteTask={handleDeleteTask}
            onOpenCreateModal={handleOpenCreateModal}
          />
        )}

        {activeTab === 'ai-advisor' && (
          <AIAdvisor tasks={tasks} userProfile={userProfile} />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            profile={userProfile}
            onUpdateProfile={handleUpdateProfile}
            currentUser={currentUser}
            onAccountUpdated={handleAccountUpdated}
            onTriggerSync={triggerSync}
            isOnline={isOnline}
            tasks={tasks}
            onTasksUpdated={(newTasks) => {
              setTasks(newTasks);
              if (currentUser) {
                localStorage.setItem(`taskmaster_tasks_${currentUser.id}`, JSON.stringify(newTasks));
                saveLocalTasksToIndexedDB(currentUser.id, newTasks).catch(() => {});
              }
            }}
          />
        )}
      </main>

      {/* Task Creation / Editing Modal */}
      <TaskFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTask(null);
          setDefaultDueDateForModal(undefined);
        }}
        onSaveTask={handleSaveTask}
        initialTask={editingTask}
        defaultDueDate={defaultDueDateForModal}
        userProfile={userProfile}
      />

      {/* Custom Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(taskToDelete)}
        task={taskToDelete}
        onClose={() => setTaskToDelete(null)}
        onConfirm={handleConfirmDelete}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-800">TaskMaster AI</span>
            <span>•</span>
            <span>Hệ Thống Quản Lý &amp; Nhắc Việc Thông Minh</span>
          </div>
          <div className="text-slate-400">
            Tích hợp AI phân rã công việc WBS, đồng bộ ngoại tuyến, điểm số lũy tiến và cố vấn chiến lược.
          </div>
        </div>
      </footer>
    </div>
  );
}
