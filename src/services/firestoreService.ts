import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Task, UserAccount, DeviceSession } from '../types/task';
import { handleFirestoreError, OperationType } from '../utils/firestoreError';

/**
 * Validates that Firebase Auth has an active signed-in user matching the requested userId.
 * As per Firebase Security Rules, any request made without an active matching Firebase Auth
 * session will be rejected with "Missing or insufficient permissions".
 */
export function isFirestoreReadyForUser(userId?: string): boolean {
  if (!auth.currentUser) return false;
  if (userId && auth.currentUser.uid !== userId) return false;
  return true;
}

/**
 * 1. User Profile in Firestore
 * Stored at /users/{userId}
 */
export async function saveUserToFirestore(user: UserAccount): Promise<void> {
  if (!isFirestoreReadyForUser(user.id)) {
    return;
  }
  const path = `users/${user.id}`;
  try {
    const userRef = doc(db, 'users', user.id);
    const cleanData = {
      id: user.id,
      username: user.username || user.email?.split('@')[0] || 'User',
      email: user.email,
      isProfileCompleted: !!user.isProfileCompleted,
      syncCode: user.syncCode || `TM-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      profile: user.profile || null,
      createdAt: user.createdAt || new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      lastSyncedAt: new Date().toISOString(),
    };
    await setDoc(userRef, cleanData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getUserFromFirestore(userId: string): Promise<UserAccount | null> {
  if (!isFirestoreReadyForUser(userId)) {
    return null;
  }
  const path = `users/${userId}`;
  try {
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as UserAccount;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * 2. Tasks CRUD with Firestore
 * Stored at /users/{userId}/tasks/{taskId}
 */
export async function saveTaskToFirestore(userId: string, task: Task): Promise<void> {
  if (!isFirestoreReadyForUser(userId)) {
    return;
  }
  const path = `users/${userId}/tasks/${task.id}`;
  try {
    const taskRef = doc(db, 'users', userId, 'tasks', task.id);
    const sanitizedTask = {
      id: task.id,
      userId,
      title: task.title || '',
      description: task.description || '',
      unit: task.unit || '',
      priority: task.priority || 'medium',
      status: task.status || 'pending',
      progress: typeof task.progress === 'number' ? task.progress : 0,
      createdAt: task.createdAt || new Date().toISOString(),
      dueDate: task.dueDate || new Date().toISOString(),
      completedAt: task.completedAt || null,
      subtasks: Array.isArray(task.subtasks)
        ? task.subtasks.map((st) => ({
            id: st.id || String(Date.now()),
            title: st.title || '',
            completed: !!st.completed,
            phase: st.phase || '',
            resource: st.resource
              ? {
                  title: st.resource.title || '',
                  url: st.resource.url || '',
                  description: st.resource.description || '',
                }
              : null,
          }))
        : [],
      attachments: Array.isArray(task.attachments)
        ? task.attachments.map((a) => ({
            id: a.id,
            name: a.name,
            size: a.size,
            type: a.type,
            uploadDate: a.uploadDate,
          }))
        : [],
      links: Array.isArray(task.links)
        ? task.links.map((l) => ({
            id: l.id,
            title: l.title,
            url: l.url,
          }))
        : [],
      reminder: task.reminder
        ? {
            enabled: !!task.reminder.enabled,
            minutesBefore: task.reminder.minutesBefore || 15,
            notified: !!task.reminder.notified,
          }
        : { enabled: false, minutesBefore: 15 },
      notes: task.notes || '',
      aiAnalysis: task.aiAnalysis || '',
      updatedAt: new Date().toISOString(),
    };

    await setDoc(taskRef, sanitizedTask, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function batchSaveTasksToFirestore(userId: string, tasks: Task[]): Promise<void> {
  if (!isFirestoreReadyForUser(userId)) {
    return;
  }
  const path = `users/${userId}/tasks`;
  try {
    const batch = writeBatch(db);
    for (const task of tasks) {
      const taskRef = doc(db, 'users', userId, 'tasks', task.id);
      const sanitizedTask = {
        id: task.id,
        userId,
        title: task.title || '',
        description: task.description || '',
        unit: task.unit || '',
        priority: task.priority || 'medium',
        status: task.status || 'pending',
        progress: typeof task.progress === 'number' ? task.progress : 0,
        createdAt: task.createdAt || new Date().toISOString(),
        dueDate: task.dueDate || new Date().toISOString(),
        completedAt: task.completedAt || null,
        subtasks: Array.isArray(task.subtasks)
          ? task.subtasks.map((st) => ({
              id: st.id || String(Date.now()),
              title: st.title || '',
              completed: !!st.completed,
              phase: st.phase || '',
              resource: st.resource
                ? {
                    title: st.resource.title || '',
                    url: st.resource.url || '',
                    description: st.resource.description || '',
                  }
                : null,
            }))
          : [],
        attachments: Array.isArray(task.attachments)
          ? task.attachments.map((a) => ({
              id: a.id,
              name: a.name,
              size: a.size,
              type: a.type,
              uploadDate: a.uploadDate,
            }))
          : [],
        links: Array.isArray(task.links)
          ? task.links.map((l) => ({
              id: l.id,
              title: l.title,
              url: l.url,
            }))
          : [],
        reminder: task.reminder
          ? {
              enabled: !!task.reminder.enabled,
              minutesBefore: task.reminder.minutesBefore || 15,
              notified: !!task.reminder.notified,
            }
          : { enabled: false, minutesBefore: 15 },
        notes: task.notes || '',
        aiAnalysis: task.aiAnalysis || '',
        updatedAt: new Date().toISOString(),
      };
      batch.set(taskRef, sanitizedTask, { merge: true });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteTaskFromFirestore(userId: string, taskId: string): Promise<void> {
  if (!isFirestoreReadyForUser(userId)) {
    return;
  }
  const path = `users/${userId}/tasks/${taskId}`;
  try {
    const taskRef = doc(db, 'users', userId, 'tasks', taskId);
    await deleteDoc(taskRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function fetchTasksFromFirestore(userId: string): Promise<Task[]> {
  if (!isFirestoreReadyForUser(userId)) {
    return [];
  }
  const path = `users/${userId}/tasks`;
  try {
    const tasksRef = collection(db, 'users', userId, 'tasks');
    const snap = await getDocs(tasksRef);
    const result: Task[] = [];
    snap.forEach((d) => {
      result.push(d.data() as Task);
    });
    return result;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Real-time listener for tasks
 */
export function subscribeToUserTasks(
  userId: string,
  onTasksUpdate: (tasks: Task[]) => void,
  onError?: (err: Error) => void
): () => void {
  if (!isFirestoreReadyForUser(userId)) {
    return () => {};
  }
  const path = `users/${userId}/tasks`;
  try {
    const tasksRef = collection(db, 'users', userId, 'tasks');
    const unsubscribe = onSnapshot(
      tasksRef,
      (snapshot) => {
        const loadedTasks: Task[] = [];
        snapshot.forEach((d) => {
          loadedTasks.push(d.data() as Task);
        });
        onTasksUpdate(loadedTasks);
      },
      (error) => {
        if (onError) onError(error);
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
    return unsubscribe;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * 3. Log User Activity to Firestore
 * Stored at /users/{userId}/activity_logs/{logId}
 */
export async function logUserActivityToFirestore(
  userId: string,
  action: string,
  details: string
): Promise<void> {
  if (!isFirestoreReadyForUser(userId)) {
    return;
  }
  const logId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const path = `users/${userId}/activity_logs/${logId}`;
  try {
    const logRef = doc(db, 'users', userId, 'activity_logs', logId);
    await setDoc(logRef, {
      id: logId,
      userId,
      action,
      details,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('[Firestore Audit] Could not write activity log:', error);
  }
}

/**
 * 4. Record Device Session
 * Stored at /users/{userId}/devices/{deviceId}
 */
export async function recordDeviceSessionInFirestore(
  userId: string,
  device: DeviceSession
): Promise<void> {
  if (!isFirestoreReadyForUser(userId)) {
    return;
  }
  const path = `users/${userId}/devices/${device.deviceId}`;
  try {
    const devRef = doc(db, 'users', userId, 'devices', device.deviceId);
    await setDoc(
      devRef,
      {
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        deviceType: device.deviceType,
        browser: device.browser,
        os: device.os,
        lastActive: new Date().toISOString(),
        loggedInAt: device.loggedInAt || new Date().toISOString(),
        status: device.status || 'online',
      },
      { merge: true }
    );
  } catch (error) {
    console.warn('[Firestore Device] Could not register device session:', error);
  }
}
