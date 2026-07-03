import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { subscribeNotifications, markNotificationRead, markAllNotificationsRead } from "@/lib/firestore";
import { getMessagingInstance } from "@/lib/firebase";
import { getToken, onMessage } from "firebase/messaging";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Notification } from "@/types";
import { useAuth } from "./AuthContext";

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user) { setNotifications([]); return; }
    const unsub = subscribeNotifications(user.uid, setNotifications);
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
          // In-app toast handled by Firestore subscription above
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
