import { Home, Search, Plus, MessageSquare, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { getAvatarUrl } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

export function MobileNav() {
  const location = useLocation();
  const { user, profile } = useAuth();

  const items = [
    { icon: Home, label: "Home", path: "/dashboard" },
    { icon: Search, label: "Explore", path: "/explore" },
    { icon: Plus, label: "Post", path: "/post-task", special: true },
    { icon: MessageSquare, label: "Messages", path: "/messages" },
  ];

  const isProfileActive = location.pathname.startsWith("/profile");

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border md:hidden">
      <div className="flex items-center justify-around py-2 px-4">
        {items.map((item) => {
          const isActive = location.pathname === item.path;
          if (item.special) {
            return (
              <Link key={item.path} to={item.path} className="-mt-6">
                <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shadow-elevated">
                  <Plus className="h-6 w-6 text-primary-foreground" />
                </div>
              </Link>
            );
          }
          return (
            <Link key={item.path} to={item.path} className="flex flex-col items-center gap-0.5 py-1">
              <item.icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
              <span className={cn("text-[10px]", isActive ? "text-primary font-medium" : "text-muted-foreground")}>
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* Profile tab — shows real photo when available */}
        <Link to="/profile" className="flex flex-col items-center gap-0.5 py-1">
          {user && profile ? (
            <img
              src={getAvatarUrl(profile)}
              alt={profile.name}
              className={cn(
                "w-6 h-6 rounded-full object-cover",
                isProfileActive ? "ring-2 ring-primary" : "ring-1 ring-border"
              )}
            />
          ) : (
            <User className={cn("h-5 w-5", isProfileActive ? "text-primary" : "text-muted-foreground")} />
          )}
          <span className={cn("text-[10px]", isProfileActive ? "text-primary font-medium" : "text-muted-foreground")}>
            Profile
          </span>
        </Link>
      </div>
    </div>
  );
}
