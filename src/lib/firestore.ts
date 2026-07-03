import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Task, UserProfile, Notification, Review, ChatMessage } from "@/types";

// ─── Collections ────────────────────────────────────────────────────────────
export const tasksCol = collection(db, "tasks");
export const usersCol = collection(db, "users");
export const notificationsCol = collection(db, "notifications");
export const reviewsCol = collection(db, "reviews");

// ─── User Profile ────────────────────────────────────────────────────────────
export async function createUserProfile(uid: string, data: Partial<UserProfile>) {
  await updateDoc(doc(usersCol, uid), { ...data, updatedAt: serverTimestamp() }).catch(async () => {
    await addDoc(collection(db, "users"), { uid, ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  });
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(usersCol, uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as UserProfile;
}

export function subscribeUserProfile(uid: string, cb: (u: UserProfile | null) => void) {
  return onSnapshot(doc(usersCol, uid), (snap) => {
    if (!snap.exists()) { cb(null); return; }
    cb({ id: snap.id, ...snap.data() } as UserProfile);
  });
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>) {
  await updateDoc(doc(usersCol, uid), { ...data, updatedAt: serverTimestamp() });
}

/** When a user changes their avatar, back-fill it onto all tasks they created or accepted
 *  so TaskCards and message sidebars show the current photo. */
export async function propagateAvatarUpdate(uid: string, avatarUrl: string) {
  const [creatorSnap, doerSnap] = await Promise.all([
    getDocs(query(tasksCol, where("creatorId", "==", uid))),
    getDocs(query(tasksCol, where("doerId", "==", uid))),
  ]);
  const writes: Promise<void>[] = [
    ...creatorSnap.docs.map((d) => updateDoc(d.ref, { creatorAvatar: avatarUrl })),
    ...doerSnap.docs.map((d) => updateDoc(d.ref, { doerAvatar: avatarUrl })),
  ];
  await Promise.all(writes);
}

// ─── Tasks ───────────────────────────────────────────────────────────────────
export async function createTask(task: Omit<Task, "id" | "createdAt" | "updatedAt">) {
  const ref = await addDoc(tasksCol, { ...task, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return ref.id;
}

export async function updateTask(taskId: string, data: Partial<Task>) {
  await updateDoc(doc(tasksCol, taskId), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteTask(taskId: string) {
  await deleteDoc(doc(tasksCol, taskId));
}

export async function archiveTask(taskId: string) {
  await updateDoc(doc(tasksCol, taskId), { archived: true, updatedAt: serverTimestamp() });
}

export async function getTask(taskId: string): Promise<Task | null> {
  const snap = await getDoc(doc(tasksCol, taskId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Task;
}

export function subscribeTasks(
  constraints: QueryConstraint[],
  cb: (tasks: Task[]) => void
) {
  const q = query(tasksCol, ...constraints);
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Task));
  });
}

export function subscribeOpenTasks(cb: (tasks: Task[]) => void) {
  return subscribeTasks(
    [where("status", "==", "open"), orderBy("createdAt", "desc")],
    cb
  );
}

export function subscribeUserTasks(uid: string, cb: (tasks: Task[]) => void) {
  return subscribeTasks(
    [where("creatorId", "==", uid), orderBy("createdAt", "desc")],
    cb
  );
}

export function subscribeAcceptedTasks(uid: string, cb: (tasks: Task[]) => void) {
  return subscribeTasks(
    [where("doerId", "==", uid), orderBy("createdAt", "desc")],
    cb
  );
}

// ─── Chat ─────────────────────────────────────────────────────────────────────
export function chatCol(taskId: string) {
  return collection(db, "chats", taskId, "messages");
}

export async function sendMessage(taskId: string, msg: Omit<ChatMessage, "id" | "createdAt">) {
  await addDoc(chatCol(taskId), { ...msg, createdAt: serverTimestamp() });
}

export function subscribeMessages(taskId: string, cb: (msgs: ChatMessage[]) => void) {
  const q = query(chatCol(taskId), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ChatMessage));
  });
}

// ─── Notifications ─────────────────────────────────────────────────────────
export async function createNotification(notif: Omit<Notification, "id" | "createdAt">) {
  await addDoc(notificationsCol, { ...notif, createdAt: serverTimestamp() });
}

export function subscribeNotifications(uid: string, cb: (notifs: Notification[]) => void) {
  const q = query(
    notificationsCol,
    where("userId", "==", uid),
    orderBy("createdAt", "desc"),
    limit(30)
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Notification));
  });
}

export async function markNotificationRead(notifId: string) {
  await updateDoc(doc(notificationsCol, notifId), { read: true });
}

export async function markAllNotificationsRead(uid: string) {
  const q = query(notificationsCol, where("userId", "==", uid), where("read", "==", false));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => updateDoc(d.ref, { read: true })));
}

// ─── Reviews ─────────────────────────────────────────────────────────────────
export async function hasReviewedTask(taskId: string, authorId: string): Promise<boolean> {
  const snap = await getDocs(
    query(reviewsCol, where("taskId", "==", taskId), where("authorId", "==", authorId))
  );
  return !snap.empty;
}

export async function createReview(review: Omit<Review, "id" | "createdAt">) {
  // Prevent duplicate review for the same task
  const duplicate = await hasReviewedTask(review.taskId, review.authorId);
  if (duplicate) throw new Error("already_reviewed");

  await addDoc(reviewsCol, { ...review, createdAt: serverTimestamp() });

  // Update target user's rating average.
  // Requires Firestore rule: allow update if only rating/reviewCount/updatedAt fields change.
  const userReviews = await getDocs(query(reviewsCol, where("targetId", "==", review.targetId)));
  const ratings = userReviews.docs.map((d) => (d.data() as Review).rating);
  const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  await updateDoc(doc(usersCol, review.targetId), {
    rating: Math.round(avg * 10) / 10,
    reviewCount: ratings.length,
    updatedAt: serverTimestamp(),
  });
}

export function subscribeReviews(targetId: string, cb: (reviews: Review[]) => void) {
  const q = query(reviewsCol, where("targetId", "==", targetId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Review));
  });
}
