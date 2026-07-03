import type { Timestamp } from "firebase/firestore";

export interface UserProfile {
  id: string;
  uid: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  avatarSeed?: string;
  city: string;
  bio: string;
  rating: number;
  reviewCount: number;
  completedTasks: number;
  activeTasks: number;
  postedTasks: number;
  verified: boolean;
  onboardingComplete?: boolean;
  fcmToken?: string;
  lat?: number;
  lng?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type TaskStatus = "open" | "accepted" | "in_progress" | "completed" | "verified" | "paid";

export interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  payment: number;
  location: string;
  lat?: number;
  lng?: number;
  timeNeeded: string;
  deadline: string;
  urgent: boolean;
  status: TaskStatus;
  creatorId: string;
  creatorName: string;
  creatorAvatar: string;
  creatorRating: number;
  doerId?: string;
  doerName?: string;
  doerAvatar?: string;
  imageUrls?: string[];
  proofUrls?: string[];
  specialInstructions?: string;
  archived?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text?: string;
  imageUrl?: string;
  type: "text" | "image" | "system";
  createdAt: Timestamp;
}

export type NotificationType =
  | "task_accepted"
  | "task_completed"
  | "task_verified"
  | "payment_released"
  | "new_message"
  | "new_task_nearby"
  | "review_received";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  taskId?: string;
  read: boolean;
  createdAt: Timestamp;
}

export interface Review {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  targetId: string;
  taskId: string;
  taskTitle?: string;
  rating: number;
  text: string;
  createdAt: Timestamp;
}

export interface PaymentMethod {
  type: "upi" | "wallet" | "card";
  label: string;
  detail: string;
}
