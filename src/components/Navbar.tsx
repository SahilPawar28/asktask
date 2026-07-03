import { Bell, Plus, User, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { formatDistanceToNow } from "date-fns";
import { getAvatarUrl } from "@/lib/utils";

const NOTIF_ICONS: Record<string, string> = {
  task_accepted: "🙋",
  task_completed: "✅",
  task_verified: "🔍",
  payment_released: "💰",
  new_message: "💬",
  new_task_nearby: "📍",
  review_received: "⭐",
};

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const isLanding = location.pathname === "/";
  const [showNotifications, setShowNotifications] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { user, profile } = useAuth();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

  useEffect(() => { setMounted(true); }, []);

  const avatarUrl = getAvatarUrl(profile);

  return (
    <nav className="sticky top-0 z-50 glass border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl overflow-hidden">
              <img src="/AskTaskLogo.png" alt="AskTask" className="w-full h-full object-cover" />
            </div>
            <span className="text-xl font-bold font-display text-foreground">AskTask</span>
          </Link>

          {!isLanding && user && (
            <div className="hidden md:flex items-center gap-1 bg-muted rounded-xl px-1 py-1">
              <Link to="/dashboard">
                <Button variant={location.pathname === "/dashboard" ? "default" : "ghost"} size="sm">Feed</Button>
              </Link>
              <Link to="/explore">
                <Button variant={location.pathname === "/explore" ? "default" : "ghost"} size="sm">Explore</Button>
              </Link>
              <Link to="/messages">
                <Button variant={location.pathname === "/messages" ? "default" : "ghost"} size="sm">Messages</Button>
              </Link>
            </div>
          )}

          <div className="flex items-center gap-2">
            {!user ? (
              <>
                <Link to="/login"><Button variant="ghost" size="sm">Log in</Button></Link>
                <Link to="/signup"><Button variant="hero" size="sm">Sign up</Button></Link>
              </>
            ) : (
              <>
                {/* Notifications */}
                <div className="relative">
                  <Button variant="ghost" size="icon" onClick={() => setShowNotifications(!showNotifications)} className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-urgent text-[10px] text-primary-foreground flex items-center justify-center font-bold">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Button>
                  <AnimatePresence>
                    {showNotifications && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="absolute right-0 top-12 w-80 bg-card rounded-xl shadow-elevated border border-border overflow-hidden z-50"
                      >
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                          <p className="text-sm font-semibold font-display">Notifications</p>
                          {unreadCount > 0 && (
                            <button onClick={markAllRead} className="text-xs text-primary hover:underline">Mark all read</button>
                          )}
                        </div>
                        <div className="max-h-80 overflow-y-auto divide-y divide-border">
                          {notifications.length === 0 ? (
                            <div className="py-8 text-center">
                              <p className="text-2xl mb-2">🔔</p>
                              <p className="text-sm text-muted-foreground">No notifications yet</p>
                            </div>
                          ) : notifications.map((n) => (
                            <button
                              key={n.id}
                              onClick={() => {
                                markRead(n.id);
                                if (n.taskId) navigate(`/task/${n.taskId}`);
                                setShowNotifications(false);
                              }}
                              className={`w-full flex items-start gap-3 p-3 text-left hover:bg-muted/50 transition-colors ${!n.read ? "bg-primary/5" : ""}`}
                            >
                              <span className="text-xl shrink-0">{NOTIF_ICONS[n.type] || "🔔"}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground">{n.title}</p>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                                {n.createdAt && (
                                  <p className="text-[10px] text-muted-foreground mt-1">
                                    {formatDistanceToNow(n.createdAt.toDate(), { addSuffix: true })}
                                  </p>
                                )}
                              </div>
                              {!n.read && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Theme toggle */}
                {mounted && (
                  <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                    {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                  </Button>
                )}

                {/* Avatar / Profile */}
                <Link to="/profile">
                  <img
                    src={avatarUrl}
                    alt={profile?.name || "Profile"}
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=User`; }}
                    className="w-8 h-8 rounded-full object-cover border-2 border-primary/20 hover:border-primary transition-colors"
                  />
                </Link>

                <Link to="/post-task">
                  <Button variant="hero" size="sm" className="hidden sm:flex gap-1">
                    <Plus className="h-4 w-4" /> Post Task
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Click outside to close */}
      {showNotifications && (
        <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
      )}
    </nav>
  );
}
