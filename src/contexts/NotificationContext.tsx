import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { subscribeNotifications, markNotificationRead, markAllNotificationsRead } from "@/lib/firestore";
import { getMessagingInstance } from "@/lib/firebase";
import { getToken, onMessage } from "firebase/messaging";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Notification } from "@/types";
import { useAuth } from "./AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

const NOTIF_ICONS: Record<string, string> = {
  task_accepted: "🙋",
  task_completed: "✅",
  task_verified: "🔍",
  payment_released: "💰",
  new_message: "💬",
  new_task_nearby: "📍",
  review_received: "⭐",
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  // Tracks which notification IDs we've already shown a toast for.
  // `null` means "haven't done the initial load yet" — skip toasts for
  // whatever already exists on first snapshot so login doesn't spam toasts.
  const seenIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!user) { setNotifications([]); seenIds.current = null; return; }
    const unsub = subscribeNotifications(user.uid, (list) => {
      if (seenIds.current === null) {
        seenIds.current = new Set(list.map((n) => n.id));
      } else {
        const newOnes = list.filter((n) => !seenIds.current!.has(n.id));
        newOnes.forEach((n) => {
          seenIds.current!.add(n.id);
          toast({
            title: `${NOTIF_ICONS[n.type] || "🔔"} ${n.title}`,
            description: n.body,
            action: n.taskId ? (
              <ToastAction altText="View" onClick={() => navigate(`/task/${n.taskId}`)}>
                View
              </ToastAction>
            ) : undefined,
          });
        });
      }
      setNotifications(list);
    });
    return unsub;
  }, [user]);

  // Register FCM token
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const messaging = await getMessagingInstance();
        if (!messaging) return;
        const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
        if (!vapidKey) return;
        const token = await getToken(messaging, { vapidKey });
        if (token) {
          await updateDoc(doc(db, "users", user.uid), { fcmToken: token });
        }
        onMessage(messaging, (payload) => {
          // In-app toast is handled by the Firestore subscription above
          console.log("FCM foreground message:", payload);
        });
      } catch (e) {
        // Silently fail — notifications are optional
      }
    })();
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  function markRead(id: string) { markNotificationRead(id); }
  function markAllRead() { if (user) markAllNotificationsRead(user.uid); }

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markRead, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be inside NotificationProvider");
  return ctx;
}
