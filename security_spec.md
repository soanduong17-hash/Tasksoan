# Firestore Security Specification

## 1. Data Invariants
1. **User Workspace Isolation**: A user (`request.auth.uid`) can ONLY read, create, update, or delete documents within `/users/{userId}/**` where `{userId} == request.auth.uid`. No cross-user reads or writes are allowed.
2. **Task Ownership Integrity**: Any task document created in `/users/{userId}/tasks/{taskId}` must have `incoming().userId == request.auth.uid` and `userId == {userId}`.
3. **Immutable Identity & Creation**: `userId`, `id`, and `createdAt` are strictly immutable once created.
4. **Valid Task Status & Priority**: `status` must be one of `['pending', 'in_progress', 'completed', 'overdue']`. `priority` must be one of `['high', 'medium', 'low']`.
5. **Bounded Content Lengths**: Titles must be <= 500 characters, descriptions <= 5000 characters, subtasks size bounded.
6. **Device & Audit Integrity**: Device sessions and activity logs under a user subcollection can only be manipulated by that authenticated user.

## 2. The "Dirty Dozen" Malicious / Invariant-Violating Payloads
1. **Payload 1 (Cross-User Read)**: User `user_A` attempts to read `/users/user_B/tasks/task_123`.
2. **Payload 2 (Cross-User Write)**: User `user_A` attempts to write `/users/user_B/tasks/malicious_task`.
3. **Payload 3 (Unauthenticated Read)**: Unauthenticated request (`auth == null`) attempts to read `/users/user_A`.
4. **Payload 4 (Identity Spoofing on Create)**: User `user_A` attempts to create task with `userId: "user_B"`.
5. **Payload 5 (Immutable Field Mutation)**: User `user_A` attempts to update task changing `userId` to `user_C` or `id` to `tampered_id`.
6. **Payload 6 (Creation Time Tampering on Update)**: User `user_A` attempts to update `createdAt` field of an existing task.
7. **Payload 7 (Status Injection / Invalid Enum)**: User attempts to set task `status: "hacked_status"`.
8. **Payload 8 (Priority Injection / Invalid Enum)**: User attempts to set task `priority: "ultra_critical"`.
9. **Payload 9 (Oversized Payload / Denial of Wallet)**: User attempts to write a task with `title` string length > 500 or description > 5000 characters.
10. **Payload 10 (Path ID Poisoning)**: User attempts to create a document with illegal characters or excessively long ID: `/users/{userId}/tasks/???$$$invalid`.
11. **Payload 11 (Unverified Email Claim Tampering)**: Malicious actor forging claims without verified email credentials.
12. **Payload 12 (Root Blanket Read)**: Client queries `collectionGroup('tasks')` or root `/users` attempting to scrape all users and tasks.

## 3. Test Runner Definition
The rules are validated through strict attribute-based access control, preventing all 12 vulnerability vectors.
