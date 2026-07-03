import { useState } from "react";
import { MapPin, Clock, Star, Flame, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import type { Task } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { updateTask, createNotification } from "@/lib/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getAvatarUrl } from "@/lib/utils";

const categoryIcons: Record<string, string> = {
  delivery: "📦",
  shopping: "🛒",
  food: "🍔",
  tutoring: "📚",
  tech: "💻",
  cleaning: "🧹",
  repairs: "🔧",
  moving: "🚛",
  pet: "🐾",
  errands: "🏃",
  photography: "📸",
  other: "✨",
};

export function TaskCard({ task, index = 0, currentUserId }: { task: Task; index?: number; currentUserId?: string }) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const isOwn = !!currentUserId && currentUserId === task.creatorId;
  const createdAt = task.createdAt?.toDate
    ? formatDistanceToNow(task.createdAt.toDate(), { addSuffix: true })
    : "";

  async function handleAccept() {
    if (!user || !profile || isOwn) return;
    setAccepting(true);
    try {
      await updateTask(task.id, {
        status: "accepted",
        doerId: user.uid,
        doerName: profile.name,
        doerAvatar: getAvatarUrl(profile),
      });
      await createNotification({
        userId: task.creatorId,
        type: "task_accepted",
        title: "Task Accepted!",
        body: `${profile.name} accepted your task: ${task.title}`,
        taskId: task.id,
        read: false,
      });
      setAccepted(true);
      setConfirmOpen(false);
      toast({ title: "Task accepted!", description: "Head to the task page to get started." });
    } catch {
      toast({ title: "Failed to accept", description: "Please try again.", variant: "destructive" });
    } finally {
      setAccepting(false);
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05, duration: 0.3 }}
      >
        <Link to={`/task/${task.id}`} className="block">
          <div className="bg-card rounded-2xl border border-border p-5 shadow-task-card hover:shadow-task-card-hover transition-all duration-300 hover:-translate-y-1 cursor-pointer group">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {task.urgent && (
                    <Badge variant="urgent" className="gap-1">
                      <Flame className="h-3 w-3" /> Urgent
                    </Badge>
                  )}
                  <Badge variant="category">
                    {categoryIcons[task.category] || "✨"} {task.category}
                  </Badge>
                </div>
                <h3 className="font-display font-semibold text-foreground text-lg leading-tight group-hover:text-primary transition-colors">
                  {task.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{task.description}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-2xl font-bold font-display text-primary">₹{task.payment}</p>
                <p className="text-xs text-muted-foreground">payment</p>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {task.location}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {task.timeNeeded}
              </span>
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <img
                  src={
                    user?.uid === task.creatorId
                      ? getAvatarUrl(profile)
                      : task.creatorAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(task.creatorName)}`
                  }
                  alt={task.creatorName}
                  onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(task.creatorName)}`; }}
                  className="w-7 h-7 rounded-full bg-muted object-cover"
                />
                <div>
                  <p className="text-sm font-medium text-foreground">{task.creatorName}</p>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-warning text-warning" />
                    <span className="text-xs text-muted-foreground">{task.creatorRating || "New"}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {createdAt && <span className="text-xs text-muted-foreground hidden sm:block">{createdAt}</span>}

                {/* Task poster sees "Your task" pill */}
                {isOwn && (
                  <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">Your task</span>
                )}

                {/* Others see Accept button only if task is still open */}
                {!isOwn && !accepted && task.status === "open" && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setConfirmOpen(true);
                    }}
                  >
                    Accept
                  </Button>
                )}

                {/* After accepting from the card */}
                {accepted && (
                  <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">Accepted ✓</span>
                )}
              </div>
            </div>
          </div>
        </Link>
      </motion.div>

      {/* Confirm dialog — rendered outside Link so it doesn't trigger navigation */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Accept this task?</AlertDialogTitle>
            <AlertDialogDescription>
              You're committing to complete <strong>"{task.title}"</strong> for <strong>₹{task.payment}</strong>. The poster will be notified right away.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={accepting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAccept}
              disabled={accepting}
              className="gradient-primary text-primary-foreground"
            >
              {accepting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yes, Accept"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
