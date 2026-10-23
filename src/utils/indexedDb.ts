import { Task } from '../types/task';

const DB_NAME = 'TaskMaster_DeviceStore';
const DB_VERSION = 1;

export interface SyncQueueItem {
  id?: number;
  userId: string;
  action: 'upsert' | 'delete';
  taskId: string;
  taskData?: Task;
  timestamp: number;
  retryCount: number;
}

export interface SyncLogEntry {
  id: string;
  timestamp: string;
  type: 'incremental_sync' | 'pull' | 'push' | 'device_paired' | 'backup_export' | 'backup_import' | 'offline_queued';
  status: 'success' | 'warning' | 'error' | 'info';
  details: string;
  count?: number;
  deviceId?: string;
}

let dbInstance: IDBDatabase | null = null;

/**
 * Open and initialize IndexedDB database with proper stores and indices
 */
export function openDeviceDatabase(): Promise<IDBDatabase> {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('Trình duyệt không hỗ trợ IndexedDB'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Tasks Object Store
      if (!db.objectStoreNames.contains('tasks')) {
        const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
        taskStore.createIndex('by_userId', 'userId', { unique: false });
        taskStore.createIndex('by_status', 'status', { unique: false });
        taskStore.createIndex('by_dueDate', 'dueDate', { unique: false });
      }

      // 2. Offline Sync Queue
      if (!db.objectStoreNames.contains('syncQueue')) {
        const queueStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
        queueStore.createIndex('by_userId', 'userId', { unique: false });
        queueStore.createIndex('by_timestamp', 'timestamp', { unique: false });
      }

      // 3. Sync Activity Logs
      if (!db.objectStoreNames.contains('syncLogs')) {
        const logStore = db.createObjectStore('syncLogs', { keyPath: 'id' });
        logStore.createIndex('by_timestamp', 'timestamp', { unique: false });
      }

      // 4. Device & Metadata Store
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(new Error(`Lỗi khởi tạo IndexedDB: ${request.error?.message}`));
    };
  });
}

/**
 * Save tasks list to local IndexedDB for specific user
 */
export async function saveLocalTasksToIndexedDB(userId: string, tasks: Task[]): Promise<void> {
  const db = await openDeviceDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['tasks'], 'readwrite');
    const store = tx.objectStore('tasks');

    // Remove existing tasks for this user first
    const index = store.index('by_userId');
    const getRequest = index.getAllKeys(userId);

    getRequest.onsuccess = () => {
      const keys = getRequest.result;
      for (const key of keys) {
        store.delete(key);
      }
      // Insert new tasks
      for (const t of tasks) {
        store.put({ ...t, userId });
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Load tasks from IndexedDB for specific user
 */
export async function loadLocalTasksFromIndexedDB(userId: string): Promise<Task[]> {
  try {
    const db = await openDeviceDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['tasks'], 'readonly');
      const store = tx.objectStore('tasks');
      const index = store.index('by_userId');
      const request = index.getAll(userId);

      request.onsuccess = () => {
        const rawResults = request.result || [];
        // Clean out userId added for indexing
        const cleaned: Task[] = rawResults.map((item: any) => {
          const { userId: _, ...task } = item;
          return task as Task;
        });
        resolve(cleaned);
      };
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
}

/**
 * Save or update single task in IndexedDB
 */
export async function putLocalTaskInIndexedDB(userId: string, task: Task): Promise<void> {
  const db = await openDeviceDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['tasks'], 'readwrite');
    const store = tx.objectStore('tasks');
    store.put({ ...task, userId });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Delete single task from IndexedDB
 */
export async function deleteLocalTaskFromIndexedDB(taskId: string): Promise<void> {
  const db = await openDeviceDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['tasks'], 'readwrite');
    const store = tx.objectStore('tasks');
    store.delete(taskId);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Enqueue an offline operation into syncQueue
 */
export async function enqueueOfflineSync(
  userId: string,
  action: 'upsert' | 'delete',
  taskId: string,
  taskData?: Task
): Promise<void> {
  const db = await openDeviceDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['syncQueue'], 'readwrite');
    const store = tx.objectStore('syncQueue');
    const item: SyncQueueItem = {
      userId,
      action,
      taskId,
      taskData,
      timestamp: Date.now(),
      retryCount: 0,
    };
    store.add(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Get all pending offline operations
 */
export async function getPendingOfflineQueue(userId: string): Promise<SyncQueueItem[]> {
  try {
    const db = await openDeviceDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['syncQueue'], 'readonly');
      const store = tx.objectStore('syncQueue');
      const index = store.index('by_userId');
      const request = index.getAll(userId);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
}

/**
 * Clear queue items after successful server synchronization
 */
export async function clearOfflineQueueItems(itemIds: number[]): Promise<void> {
  if (!itemIds.length) return;
  const db = await openDeviceDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['syncQueue'], 'readwrite');
    const store = tx.objectStore('syncQueue');
    for (const id of itemIds) {
      store.delete(id);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Append an entry to Sync Logs
 */
export async function logSyncEvent(
  type: SyncLogEntry['type'],
  status: SyncLogEntry['status'],
  details: string,
  count?: number
): Promise<void> {
  try {
    const db = await openDeviceDatabase();
    const tx = db.transaction(['syncLogs'], 'readwrite');
    const store = tx.objectStore('syncLogs');
    const entry: SyncLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      type,
      status,
      details,
      count,
      deviceId: getLocalDeviceId(),
    };
    store.add(entry);
  } catch (err) {
    console.warn('[SyncLog] Failed to write log:', err);
  }
}

/**
 * Get recent sync logs
 */
export async function getRecentSyncLogs(limit = 25): Promise<SyncLogEntry[]> {
  try {
    const db = await openDeviceDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['syncLogs'], 'readonly');
      const store = tx.objectStore('syncLogs');
      const request = store.getAll();

      request.onsuccess = () => {
        const results = (request.result || []) as SyncLogEntry[];
        results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        resolve(results.slice(0, limit));
      };
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
}

/**
 * Clear all sync logs
 */
export async function clearAllSyncLogs(): Promise<void> {
  try {
    const db = await openDeviceDatabase();
    const tx = db.transaction(['syncLogs'], 'readwrite');
    const store = tx.objectStore('syncLogs');
    store.clear();
  } catch {}
}

/**
 * Calculate simple SHA-like checksum string for data integrity
 */
export function calculateDataIntegrityChecksum(tasks: Task[]): string {
  const serialized = JSON.stringify(
    tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      dueDate: t.dueDate,
      progress: t.progress,
      subtasksCount: t.subtasks?.length || 0,
      completedAt: t.completedAt,
    }))
  );

  let hash = 0;
  for (let i = 0; i < serialized.length; i++) {
    const char = serialized.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `CRC-${Math.abs(hash).toString(16).toUpperCase().padStart(8, '0')}`;
}

/**
 * Request persistent browser storage permission
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persist();
      await logSyncEvent(
        'incremental_sync',
        isPersisted ? 'success' : 'warning',
        isPersisted ? 'Đã được cấp quyền lưu trữ bền vững (Persistent Storage)' : 'Trình duyệt từ chối cấp quyền lưu trữ bền vững'
      );
      return isPersisted;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Estimate storage usage & quota
 */
export async function getStorageDiagnostics(): Promise<{
  usageBytes: number;
  quotaBytes: number;
  percentageUsed: number;
  isPersisted: boolean;
}> {
  let usageBytes = 0;
  let quotaBytes = 0;
  let percentageUsed = 0;
  let isPersisted = false;

  if (typeof navigator !== 'undefined' && navigator.storage) {
    if (navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        usageBytes = estimate.usage || 0;
        quotaBytes = estimate.quota || 0;
        if (quotaBytes > 0) {
          percentageUsed = Math.min(100, Math.round((usageBytes / quotaBytes) * 1000) / 10);
        }
      } catch {}
    }
    if (navigator.storage.persisted) {
      try {
        isPersisted = await navigator.storage.persisted();
      } catch {}
    }
  }

  return { usageBytes, quotaBytes, percentageUsed, isPersisted };
}

/**
 * Export full JSON backup of local database
 */
export async function exportDatabaseBackup(userId: string, tasks: Task[]): Promise<string> {
  const checksum = calculateDataIntegrityChecksum(tasks);
  const backup = {
    app: 'TaskMasterAI',
    schemaVersion: 1,
    exportDate: new Date().toISOString(),
    userId,
    deviceId: getLocalDeviceId(),
    checksum,
    taskCount: tasks.length,
    tasks,
  };
  await logSyncEvent('backup_export', 'success', `Đã xuất tệp sao lưu dữ liệu (${tasks.length} nhiệm vụ)`, tasks.length);
  return JSON.stringify(backup, null, 2);
}

/**
 * Import and validate JSON backup file
 */
export async function importDatabaseBackup(
  userId: string,
  jsonString: string
): Promise<{ success: boolean; tasks: Task[]; message: string }> {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || !Array.isArray(parsed.tasks)) {
      throw new Error('Định dạng tệp sao lưu không hợp lệ (thiếu danh sách nhiệm vụ)');
    }

    const tasks: Task[] = parsed.tasks.map((t: any) => ({
      id: t.id || `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: t.title || 'Nhiệm vụ phục hồi',
      description: t.description || '',
      unit: t.unit || 'Đơn vị thực hiện',
      priority: t.priority || 'medium',
      createdAt: t.createdAt || new Date().toISOString(),
      dueDate: t.dueDate || new Date(Date.now() + 86400000).toISOString(),
      completedAt: t.completedAt,
      subtasks: Array.isArray(t.subtasks) ? t.subtasks : [],
      progress: typeof t.progress === 'number' ? t.progress : 0,
      status: t.status || 'pending',
      attachments: Array.isArray(t.attachments) ? t.attachments : [],
      links: Array.isArray(t.links) ? t.links : [],
      reminder: t.reminder || { enabled: false, minutesBefore: 30 },
      notes: t.notes || '',
    }));

    // Save to IndexedDB
    await saveLocalTasksToIndexedDB(userId, tasks);
    await logSyncEvent('backup_import', 'success', `Khôi phục thành công ${tasks.length} nhiệm vụ từ tệp sao lưu`, tasks.length);

    return {
      success: true,
      tasks,
      message: `Khôi phục thành công ${tasks.length} nhiệm vụ từ tệp sao lưu!`,
    };
  } catch (err: any) {
    await logSyncEvent('backup_import', 'error', `Thất bại khi khôi phục sao lưu: ${err.message}`);
    return {
      success: false,
      tasks: [],
      message: err.message || 'Lỗi đọc tệp sao lưu',
    };
  }
}

/**
 * Get or create unique device identifier
 */
export function getLocalDeviceId(): string {
  if (typeof window === 'undefined') return 'server_node';
  let devId = localStorage.getItem('taskmaster_device_id');
  if (!devId) {
    devId = `dev_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}`;
    localStorage.setItem('taskmaster_device_id', devId);
  }
  return devId;
}

/**
 * Detect client device name & type
 */
export function detectDeviceInfo(): {
  deviceId: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
} {
  const deviceId = getLocalDeviceId();
  let deviceName = 'Thiết bị Web';
  let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';
  let browser = 'Chrome/Safari';
  let os = 'Unknown OS';

  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent;

    // Detect OS
    if (/Windows/i.test(ua)) os = 'Windows PC';
    else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
    else if (/Linux/i.test(ua)) os = 'Linux';
    else if (/Android/i.test(ua)) os = 'Android';
    else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';

    // Detect Device Type
    if (/Tablet|iPad/i.test(ua)) {
      deviceType = 'tablet';
    } else if (/Mobi|Android|iPhone/i.test(ua)) {
      deviceType = 'mobile';
    } else {
      deviceType = 'desktop';
    }

    // Detect Browser
    if (/Edg/i.test(ua)) browser = 'Microsoft Edge';
    else if (/Chrome/i.test(ua)) browser = 'Google Chrome';
    else if (/Firefox/i.test(ua)) browser = 'Mozilla Firefox';
    else if (/Safari/i.test(ua)) browser = 'Apple Safari';

    deviceName = `${os} (${browser})`;
  }

  return { deviceId, deviceName, deviceType, browser, os };
}
