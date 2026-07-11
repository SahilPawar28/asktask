import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { MobileNav } from "@/components/MobileNav";
import { ProgressTracker } from "@/components/ProgressTracker";
import { RatingStars } from "@/components/RatingStars";
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
import { getTask, updateTask, archiveTask, createNotification, getUserProfile, hasReviewedTask } from "@/lib/firestore";
import type { Task, UserProfile } from "@/types";
import { ArrowLeft, Clock, Flame, MapPin, MessageSquare, Shield, Loader2, CheckCircle, Upload, Archive } from "lucide-react";
import { getAvatarUrl } from "@/lib/utils";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { PaymentModal } from "@/components/PaymentModal";
import { RatingModal } from "@/components/RatingModal";
import { ImageLightbox } from "@/components/ImageLightbox";
import { uploadImage } from "@/lib/cloudinary";

const STATUS_STEPS = ["open", "accepted", "in_progress", "completed", "verified", "paid"];

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [task, setTask] = useState<Task | null>(null);
  const [creatorProfile, setCreatorProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [acceptDialog, setAcceptDialog] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !user) return;
    getTask(id).then(async (t) => {
      setTask(t);
      if (t) {
        const [cp, reviewed] = await Promise.all([
          getUserProfile(t.creatorId),
          hasReviewedTask(id, user.uid),
        ]);
        setCreatorProfile(cp);
        setAlreadyReviewed(reviewed);
      }
      setLoading(false);
    });
  }, [id, user]);

  const stepIndex = task ? STATUS_STEPS.indexOf(task.status) : 0;
  const isCreator = user?.uid === task?.creatorId;
  const isDoer = user?.uid === task?.doerId;

  async function handleAccept() {
    if (!user || !profile || !task || !id) return;
    if (isCreator) return; // task poster cannot accept their own task
    setAccepting(true);
    try {
      await updateTask(id, {
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
        taskId: id,
        read: false,
      });
      setTask((prev) => prev ? { ...prev, status: "accepted", doerId: user.uid } : prev);
      toast({ title: "Task accepted!", description: "You can now start working on this task." });
      setAcceptDialog(false);
    } catch {
      toast({ title: "Failed to accept", description: "Please try again.", variant: "destructive" });
    } finally {
      setAccepting(false);
    }
  }

  async function handleMarkInProgress() {
    if (!id || !task) return;
    await updateTask(id, { status: "in_progress" });
    setTask((prev) => prev ? { ...prev, status: "in_progress" } : prev);
    toast({ title: "Marked as In Progress" });
  }

  async function handleMarkComplete() {
    if (!id || !task) return;
    await updateTask(id, { status: "completed" });
    if (task) {
      await createNotification({
        userId: task.creatorId,
        type: "task_completed",
        title: "Task Completed!",
        body: `${profile?.name} has completed your task: ${task.title}`,
        taskId: id,
        read: false,
      });
    }
    setTask((prev) => prev ? { ...prev, status: "completed" } : prev);
    toast({ title: "Task marked as complete!", description: "Waiting for the creator to verify." });
  }

  async function handleArchive() {
    if (!id) return;
    setArchiving(true);
    try {
      await archiveTask(id);
      setTask((prev) => prev ? { ...prev, archived: true } : prev);
      toast({ title: "Task archived", description: "It will appear in your history." });
    } catch {
      toast({ title: "Failed to archive", variant: "destructive" });
    } finally {
      setArchiving(false);
    }
  }

  async function handleUploadProof(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.length || !id || !user) return;
    setUploadingProof(true);
    try {
      const urls = await Promise.all(
        Array.from(e.target.files).map((f) => uploadImage(f, "asktask/proofs"))
      );
      await updateTask(id, { status: "completed", proofUrls: [...(task?.proofUrls || []), ...urls] });
      if (task) {
        await createNotification({
          userId: task.creatorId,
          type: "task_completed",
          title: "Task Completed!",
          body: `${profile?.name} has completed your task: ${task.title}`,
          taskId: id,
          read: false,
        });
      }
      setTask((prev) => prev ? { ...prev, status: "completed", proofUrls: urls } : prev);
      toast({ title: "Proof uploaded!", description: "Waiting for the creator to verify." });
    } catch {
      toast({ title: "Upload failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setUploadingProof(false);
    }
  }

  async function handleVerify() {
    if (!id || !task) return;
    await updateTask(id, { status: "verified" });
    if (task.doerId) {
      await createNotification({
        userId: task.doerId,
        type: "task_verified",
        title: "Task Verified!",
        body: `Your work on "${task.title}" has been verified.`,
        taskId: id,
        read: false,
      });
    }
    setTask((prev) => prev ? { ...prev, status: "verified" } : prev);
    setShowPayment(true);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-xl font-display font-semibold">Task not found</p>
        <Link to="/dashboard"><Button>Back to Feed</Button></Link>
      </div>
    );
  }

  const avatarUrl = (u: { avatarUrl?: string; avatarSeed?: string; name?: string }) => getAvatarUrl(u);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to tasks
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2 space-y-6">
            <div className="bg-card rounded-2xl border border-border p-6 shadow-task-card">
              <div className="flex items-center gap-2 mb-3">
                {task.urgent && <Badge variant="urgent" className="gap-1"><Flame className="h-3 w-3" /> Urgent</Badge>}
                <Badge variant="category">{task.category}</Badge>
                <Badge variant={task.status === "open" ? "default" : "secondary"} className="ml-auto capitalize">
                  {task.status.replace("_", " ")}
                </Badge>
              </div>

              <h1 className="text-3xl font-bold font-display text-foreground">{task.title}</h1>

              <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{task.location}</span>
                <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{task.timeNeeded}</span>
              </div>

              <p className="mt-6 text-foreground leading-relaxed">{task.description}</p>

              {task.specialInstructions && (
                <div className="mt-4 p-4 bg-secondary rounded-xl">
                  <p className="text-sm font-medium text-foreground mb-1">Special Instructions</p>
                  <p className="text-sm text-muted-foreground">{task.specialInstructions}</p>
                </div>
              )}

              <div className="mt-6 flex items-center gap-6">
                <div>
                  <p className="text-sm text-muted-foreground">Payment</p>
                  <p className="text-3xl font-bold font-display text-success">₹{task.payment}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Deadline</p>
                  <p className="text-lg font-semibold text-foreground">{task.deadline}</p>
                </div>
              </div>

              {/* Task images */}
              {task.imageUrls && task.imageUrls.length > 0 && (
                <div className="mt-6 grid grid-cols-3 gap-2">
                  {task.imageUrls.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt="Task"
                      className="rounded-xl object-cover aspect-square cursor-zoom-in hover:opacity-90 transition-opacity"
                      onClick={() => setLightboxSrc(url)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Progress */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-task-card">
              <h3 className="font-display font-semibold text-foreground mb-4">Task Progress</h3>
              <ProgressTracker currentStep={stepIndex} />
            </div>

            {/* Proof of completion */}
            {task.proofUrls && task.proofUrls.length > 0 && (
              <div className="bg-card rounded-2xl border border-border p-6 shadow-task-card">
                <h3 className="font-display font-semibold text-foreground mb-4">Proof of Completion</h3>
                <div className="grid grid-cols-3 gap-2">
                  {task.proofUrls.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt="Proof"
                      className="rounded-xl object-cover aspect-square cursor-zoom-in hover:opacity-90 transition-opacity"
                      onClick={() => setLightboxSrc(url)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Doer upload proof */}
            {isDoer && task.status === "in_progress" && (
              <div className="bg-card rounded-2xl border border-border p-6 shadow-task-card">
                <h3 className="font-display font-semibold text-foreground mb-2">Submit Proof of Completion</h3>
                <p className="text-sm text-muted-foreground mb-4">Upload photos, screenshots, or a delivery receipt.</p>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-8 cursor-pointer hover:border-primary/40 transition-colors">
                  {uploadingProof ? (
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Click to upload proof</p>
                    </>
                  )}
                  <input type="file" className="hidden" multiple accept="image/*" onChange={handleUploadProof} disabled={uploadingProof} />
                </label>
              </div>
            )}
          </motion.div>

          {/* Sidebar */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-6">
            {/* Creator card */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-task-card">
              <h3 className="font-display font-semibold text-foreground mb-4">Posted by</h3>
              <Link to={`/profile/${task.creatorId}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <img
                  src={creatorProfile ? avatarUrl(creatorProfile) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${task.creatorName}`}
                  alt={task.creatorName}
                  className="w-12 h-12 rounded-full bg-muted"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-foreground">{task.creatorName}</p>
                    {creatorProfile?.verified && <Shield className="h-4 w-4 text-primary" />}
                  </div>
                  <RatingStars rating={task.creatorRating} />
                </div>
              </Link>
              {creatorProfile?.bio && (
                <p className="text-sm text-muted-foreground mt-3">{creatorProfile.bio}</p>
              )}
            </div>

            {/* Actions */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-task-card space-y-3">
              {/* Open task — doer can accept */}
              {task.status === "open" && !isCreator && (
                <Button variant="hero" className="w-full" size="lg" onClick={() => setAcceptDialog(true)}>
                  Accept Task
                </Button>
              )}

              {/* Accepted — doer starts work */}
              {task.status === "accepted" && isDoer && (
                <Button variant="hero" className="w-full" size="lg" onClick={handleMarkInProgress}>
                  Mark as In Progress
                </Button>
              )}

              {/* In Progress — doer can mark complete */}
              {task.status === "in_progress" && isDoer && (
                <Button variant="hero" className="w-full gap-2" size="lg" onClick={handleMarkComplete}>
                  <CheckCircle className="h-4 w-4" /> Mark as Complete
                </Button>
              )}

              {/* Completed — creator verifies */}
              {task.status === "completed" && isCreator && (
                <Button variant="hero" className="w-full gap-2" size="lg" onClick={handleVerify}>
                  <CheckCircle className="h-4 w-4" /> Verify & Pay
                </Button>
              )}

              {/* Verified but not yet paid — creator can reopen payment (e.g. if the modal was dismissed) */}
              {task.status === "verified" && isCreator && (
                <Button variant="hero" className="w-full gap-2" size="lg" onClick={() => setShowPayment(true)}>
                  <CheckCircle className="h-4 w-4" /> Release Payment ₹{task.payment}
                </Button>
              )}

              {/* Verified/Paid — show rating option only if not already reviewed */}
              {["verified", "paid"].includes(task.status) && (isCreator || isDoer) && !alreadyReviewed && (
                <Button variant="hero" className="w-full" size="lg" onClick={() => setShowRating(true)}>
                  Leave a Review
                </Button>
              )}
              {["verified", "paid"].includes(task.status) && (isCreator || isDoer) && alreadyReviewed && (
                <p className="text-center text-sm text-muted-foreground py-2">✓ You've already reviewed this task</p>
              )}

              {/* Archive — available for paid tasks or expired */}
              {(task.status === "paid" || (task.status === "verified" && isCreator)) && !task.archived && (isCreator || isDoer) && (
                <Button variant="outline" className="w-full gap-2" size="lg" onClick={handleArchive} disabled={archiving}>
                  {archiving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
                  Archive to History
                </Button>
              )}

              {/* Message button */}
              {(task.doerId || !isCreator) && task.status !== "open" && (
                <Link to={`/messages/${task.id}`} className="block">
                  <Button variant="outline" className="w-full gap-2" size="lg">
                    <MessageSquare className="h-4 w-4" /> Message
                  </Button>
                </Link>
              )}

              {!isCreator && task.status === "open" && (
                <Link to={`/messages/${task.id}`} className="block">
                  <Button variant="outline" className="w-full gap-2" size="lg">
                    <MessageSquare className="h-4 w-4" /> Ask a Question
                  </Button>
                </Link>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Accept dialog */}
      <AlertDialog open={acceptDialog} onOpenChange={setAcceptDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Accept this task?</AlertDialogTitle>
            <AlertDialogDescription>
              You're committing to complete "{task.title}" for <strong>₹{task.payment}</strong>. The creator will be notified immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAccept} disabled={accepting} className="gradient-primary text-primary-foreground">
              {accepting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yes, Accept"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showPayment && task && (
        <PaymentModal
          task={task}
          onClose={() => setShowPayment(false)}
          onPaid={async () => {
            await updateTask(id!, { status: "paid" });
            if (task.doerId) {
              await createNotification({
                userId: task.doerId,
                type: "payment_released",
                title: "Payment Released!",
                body: `₹${task.payment} for "${task.title}" has been released.`,
                taskId: id!,
                read: false,
              });
            }
            setTask((prev) => prev ? { ...prev, status: "paid" } : prev);
            setShowPayment(false);
            setShowRating(true);
          }}
        />
      )}

      {showRating && task && (
        <RatingModal
          task={task}
          onClose={() => { setShowRating(false); setAlreadyReviewed(true); }}
        />
      )}

      <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />

      <MobileNav />
    </div>
  );
}
