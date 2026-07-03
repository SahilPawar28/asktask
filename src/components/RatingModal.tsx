import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createReview } from "@/lib/firestore";
import type { Task } from "@/types";
import { Star, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { getAvatarUrl } from "@/lib/utils";

interface Props {
  task: Task;
  onClose: () => void;
}

export function RatingModal({ task, onClose }: Props) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const isCreator = user?.uid === task.creatorId;
  const targetId = isCreator ? task.doerId! : task.creatorId;
  const targetName = isCreator ? task.doerName! : task.creatorName;

  async function handleSubmit() {
    if (!user || !profile || rating === 0) {
      toast({ title: "Please select a rating", variant: "destructive" });
      return;
    }
    if (text.trim().length < 20) {
      toast({ title: "Please write at least 20 characters in your review", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const avatarUrl = getAvatarUrl(profile);
      await createReview({
        authorId: user.uid,
        authorName: profile.name,
        authorAvatar: avatarUrl,
        targetId,
        taskId: task.id,
        taskTitle: task.title,
        rating,
        text: text.trim(),
      });
      setDone(true);
    } catch (err: any) {
      if (err?.message === "already_reviewed") {
        toast({ title: "You've already reviewed this task", variant: "destructive" });
        onClose();
      } else {
        toast({ title: "Failed to submit review", description: "Please try again.", variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">Rate your experience</DialogTitle>
        </DialogHeader>

        {done ? (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6 space-y-3">
            <p className="text-4xl">⭐</p>
            <p className="text-lg font-bold font-display text-foreground">Thanks for the review!</p>
            <p className="text-sm text-muted-foreground">Your feedback helps build a trusted community.</p>
            <Button variant="hero" className="w-full" onClick={onClose}>Done</Button>
          </motion.div>
        ) : (
          <div className="space-y-5">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-3">How was your experience with <strong>{targetName}</strong>?</p>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    onMouseEnter={() => setHover(s)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => setRating(s)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-9 w-9 transition-colors ${
                        s <= (hover || rating) ? "fill-warning text-warning" : "text-muted-foreground"
                      }`}
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  {["", "Poor", "Fair", "Good", "Great", "Excellent"][rating]}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Write a review <span className="text-destructive">*</span>
                <span className="text-muted-foreground font-normal ml-1">(min 20 chars)</span>
              </label>
              <textarea
                placeholder={`Tell others about your experience with ${targetName}…`}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full min-h-[100px] px-4 py-3 rounded-xl bg-background border border-input text-sm resize-none focus:ring-2 focus:ring-ring outline-none"
                maxLength={300}
              />
              <div className="flex justify-between mt-1">
                {text.length > 0 && text.length < 20 && (
                  <p className="text-xs text-destructive">{20 - text.length} more chars needed</p>
                )}
                <p className="text-xs text-muted-foreground ml-auto">{text.length}/300</p>
              </div>
            </div>

            <Button variant="hero" className="w-full h-12" onClick={handleSubmit} disabled={saving || rating === 0}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Review"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
