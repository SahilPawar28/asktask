import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { MobileNav } from "@/components/MobileNav";
import { RatingStars } from "@/components/RatingStars";
import { TaskCard } from "@/components/TaskCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImageCropModal } from "@/components/ImageCropModal";
import {
  getUserProfile,
  updateUserProfile,
  propagateAvatarUpdate,
  subscribeUserTasks,
  subscribeAcceptedTasks,
  subscribeReviews,
  subscribeUserProfile,
} from "@/lib/firestore";
import { uploadImage } from "@/lib/cloudinary";
import type { Task, UserProfile, Review } from "@/types";
import { Camera, Edit, Loader2, MapPin, Navigation, Shield, LogOut, X } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const AVATAR_SEEDS = ["Felix", "Lily", "Max", "Mia", "Leo", "Zoe", "Noah", "Eva", "Sam", "Aria", "Jake", "Luna", "Kai", "Ruby", "Cole", "Nora"];

export default function ProfilePage() {
  const { uid: paramUid } = useParams<{ uid?: string }>();
  const { user, profile: myProfile, refreshProfile, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const viewingUid = paramUid || user?.uid || "";
  const isOwn = !paramUid || paramUid === user?.uid;

  const [profile, setProfile] = useState<UserProfile | null>(isOwn ? myProfile : null);
  const [postedTasks, setPostedTasks] = useState<Task[]>([]);
  const [acceptedTasks, setAcceptedTasks] = useState<Task[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(!isOwn);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editSeed, setEditSeed] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [locating, setLocating] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (!viewingUid) return;
    if (!isOwn) {
      // Live subscription so rating/reviewCount update in real-time on visited profiles too
      const unsubP = subscribeUserProfile(viewingUid, (p) => { setProfile(p); setLoading(false); });
      const unsub1 = subscribeUserTasks(viewingUid, setPostedTasks);
      const unsub2 = subscribeAcceptedTasks(viewingUid, (tasks) => setAcceptedTasks(tasks));
      const unsub3 = subscribeReviews(viewingUid, setReviews);
      return () => { unsubP(); unsub1(); unsub2(); unsub3(); };
    } else {
      setProfile(myProfile);
      const unsub1 = subscribeUserTasks(viewingUid, setPostedTasks);
      const unsub2 = subscribeAcceptedTasks(viewingUid, (tasks) => setAcceptedTasks(tasks));
      const unsub3 = subscribeReviews(viewingUid, setReviews);
      return () => { unsub1(); unsub2(); unsub3(); };
    }
  }, [viewingUid, myProfile]);

  function openEdit() {
    setEditName(profile?.name || "");
    setEditBio(profile?.bio || "");
    setEditCity(profile?.city || "");
    setEditSeed(profile?.avatarSeed || "Felix");
    setEditOpen(true);
  }

  async function handleSaveEdit() {
    if (!user) return;
    setSavingEdit(true);
    try {
      await updateUserProfile(user.uid, { name: editName.trim(), bio: editBio.trim(), city: editCity.trim(), avatarSeed: editSeed });
      await refreshProfile();
      setProfile((prev) => prev ? { ...prev, name: editName.trim(), bio: editBio.trim(), city: editCity.trim(), avatarSeed: editSeed } : prev);
      setEditOpen(false);
      toast({ title: "Profile updated!" });
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    } finally {
      setSavingEdit(false);
    }
  }

  function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    e.target.value = "";
    const objectUrl = URL.createObjectURL(file);
    setCropSrc(objectUrl);
  }

  async function handleCropDone(blob: Blob) {
    if (!user) return;
    setCropSrc(null);
    setUploadingAvatar(true);
    try {
      const url = await uploadImage(blob, "asktask/avatars");
      await updateUserProfile(user.uid, { avatarUrl: url });
      await propagateAvatarUpdate(user.uid, url);
      await refreshProfile();
      setProfile((prev) => prev ? { ...prev, avatarUrl: url } : prev);
      toast({ title: "Profile photo updated!" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
    }
  }

  function detectLocation() {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`);
          const data = await res.json();
          setEditCity(data.address?.city || data.address?.town || "");
        } catch {
          toast({ title: "Couldn't detect city", variant: "destructive" });
        } finally { setLocating(false); }
      },
      () => { setLocating(false); toast({ title: "Location denied", variant: "destructive" }); }
    );
  }

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (!profile) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Profile not found.</p>
    </div>
  );

  const avatarUrl = profile.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.avatarSeed || profile.name}`;
  const activeTasks = acceptedTasks.filter((t) => ["accepted", "in_progress"].includes(t.status));
  const completedTasks = acceptedTasks.filter((t) => ["completed", "verified", "paid"].includes(t.status) && !t.archived);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border overflow-hidden shadow-task-card">
          <div className="h-32 gradient-hero" />
          <div className="px-6 pb-6 -mt-12">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
              {/* Avatar */}
              <div className="relative">
                <button
                  onClick={() => setPreviewOpen(true)}
                  className="block focus:outline-none focus:ring-2 focus:ring-primary rounded-2xl"
                >
                  <img
                    src={avatarUrl}
                    alt={profile.name}
                    className="w-24 h-24 rounded-2xl border-4 border-card bg-muted shadow-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                  />
                </button>
                {isOwn && (
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full gradient-primary flex items-center justify-center shadow-elevated"
                  >
                    {uploadingAvatar ? <Loader2 className="h-3.5 w-3.5 text-white animate-spin" /> : <Camera className="h-3.5 w-3.5 text-white" />}
                  </button>
                )}
                <input ref={fileRef} type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold font-display text-foreground">{profile.name}</h1>
                  {profile.verified && <Shield className="h-5 w-5 text-primary" />}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <RatingStars rating={profile.rating} />
                  <span className="text-xs text-muted-foreground">({profile.reviewCount || 0} reviews)</span>
                  {profile.city && (
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />{profile.city}
                    </span>
                  )}
                </div>
                {profile.bio && <p className="text-sm text-muted-foreground mt-2">{profile.bio}</p>}
              </div>

              <div className="flex gap-2">
                {isOwn && (
                  <>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={openEdit}>
                      <Edit className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-1.5 text-destructive" onClick={async () => { await signOut(); navigate("/"); }}>
                      <LogOut className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="text-center p-3 bg-secondary rounded-xl">
                <p className="text-2xl font-bold font-display text-foreground">{completedTasks.length}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div className="text-center p-3 bg-secondary rounded-xl">
                <p className="text-2xl font-bold font-display text-foreground">{activeTasks.length}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
              <div className="text-center p-3 bg-secondary rounded-xl">
                <p className="text-2xl font-bold font-display text-foreground">{postedTasks.length}</p>
                <p className="text-xs text-muted-foreground">Posted</p>
              </div>
            </div>
          </div>
        </motion.div>

        <Tabs defaultValue="active" className="mt-6">
          <TabsList className="w-full bg-card border border-border rounded-xl h-12">
            {["active", "completed", "posted", "reviews"].map((t) => (
              <TabsTrigger key={t} value={t} className="flex-1 rounded-lg capitalize data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                {t}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="active" className="space-y-4 mt-4">
            {activeTasks.length === 0 ? <Empty text="No active tasks" /> : activeTasks.map((t, i) => <TaskCard key={t.id} task={t} index={i} currentUserId={user?.uid} />)}
          </TabsContent>
          <TabsContent value="completed" className="space-y-4 mt-4">
            {completedTasks.length === 0 ? <Empty text="No completed tasks yet" /> : completedTasks.map((t, i) => <TaskCard key={t.id} task={t} index={i} currentUserId={user?.uid} />)}
          </TabsContent>
          <TabsContent value="posted" className="space-y-4 mt-4">
            {postedTasks.length === 0 ? <Empty text="No posted tasks yet" /> : postedTasks.map((t, i) => <TaskCard key={t.id} task={t} index={i} currentUserId={user?.uid} />)}
          </TabsContent>
          <TabsContent value="reviews" className="mt-4 space-y-4">
            {reviews.length === 0 ? <Empty text="No reviews yet" /> : reviews.map((r, i) => (
              <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="bg-card rounded-2xl border border-border p-5 shadow-task-card">
                <div className="flex items-center gap-3 mb-2">
                  <img
                    src={r.authorAvatar}
                    alt={r.authorName}
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(r.authorName)}`; }}
                    className="w-8 h-8 rounded-full bg-muted object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-foreground text-sm">{r.authorName}</p>
                      <RatingStars rating={r.rating} size="sm" />
                    </div>
                    {r.taskTitle && (
                      <p className="text-xs text-muted-foreground mt-0.5">for: {r.taskTitle}</p>
                    )}
                  </div>
                </div>
                {r.text && <p className="text-sm text-muted-foreground mt-1">{r.text}</p>}
              </motion.div>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* Profile pic preview modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-sm rounded-2xl p-4">
          <DialogHeader>
            <DialogTitle className="font-display text-sm">{profile.name}</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center">
            <img
              src={avatarUrl}
              alt={profile.name}
              className="w-64 h-64 rounded-2xl object-cover bg-muted"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="font-display">Edit Profile</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Avatar</p>
              <div className="grid grid-cols-8 gap-1.5 mb-2">
                {AVATAR_SEEDS.map((seed) => (
                  <button key={seed} onClick={() => setEditSeed(seed)} className={`rounded-lg overflow-hidden border-2 transition-all ${editSeed === seed ? "border-primary" : "border-transparent"}`}>
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`} alt={seed} className="w-full bg-secondary" />
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Or upload a real photo using the camera icon on your profile picture.</p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Name</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-12 rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">City</label>
              <div className="flex gap-2">
                <Input value={editCity} onChange={(e) => setEditCity(e.target.value)} className="h-12 rounded-xl flex-1" placeholder="Your city" />
                <Button type="button" variant="outline" size="icon" className="h-12 w-12 rounded-xl" onClick={detectLocation} disabled={locating}>
                  {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Bio</label>
              <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} className="w-full min-h-[80px] px-4 py-3 rounded-xl bg-background border border-input text-sm resize-none focus:ring-2 focus:ring-ring outline-none" maxLength={160} />
            </div>
            <Button variant="hero" className="w-full h-12" onClick={handleSaveEdit} disabled={savingEdit}>
              {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {cropSrc && (
        <ImageCropModal
          open={!!cropSrc}
          imageSrc={cropSrc}
          onClose={() => { URL.revokeObjectURL(cropSrc); setCropSrc(null); }}
          onDone={handleCropDone}
        />
      )}

      <MobileNav />
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="text-center py-12">
      <p className="text-4xl mb-3">📭</p>
      <p className="text-muted-foreground">{text}</p>
    </div>
  );
}
