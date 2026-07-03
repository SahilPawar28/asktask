import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { updateUserProfile } from "@/lib/firestore";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Loader2, Navigation } from "lucide-react";
import { motion } from "framer-motion";

const AVATAR_SEEDS = ["Felix", "Lily", "Max", "Mia", "Leo", "Zoe", "Noah", "Eva", "Sam", "Aria", "Jake", "Luna"];

export default function OnboardingPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [city, setCity] = useState(profile?.city || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [selectedSeed, setSelectedSeed] = useState(profile?.avatarSeed || AVATAR_SEEDS[0]);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  function detectLocation() {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`
          );
          const data = await res.json();
          const detected = data.address?.city || data.address?.town || data.address?.village || data.address?.state || "";
          setCity(detected);
        } catch {
          toast({ title: "Couldn't detect city", description: "Please enter it manually.", variant: "destructive" });
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        toast({ title: "Location access denied", description: "Please enter your city manually.", variant: "destructive" });
      }
    );
  }

  async function handleSave() {
    if (!user) return;
    if (!city.trim()) {
      toast({ title: "City required", description: "Please enter your city.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await updateUserProfile(user.uid, { city: city.trim(), bio: bio.trim(), avatarSeed: selectedSeed, onboardingComplete: true });
      await refreshProfile();
      navigate("/dashboard");
    } catch {
      toast({ title: "Failed to save", description: "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl overflow-hidden mx-auto mb-4">
            <img src="/AskTaskLogo.png" alt="AskTask" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-bold font-display text-foreground">Set up your profile</h1>
          <p className="text-muted-foreground mt-2">Just a couple more details and you're ready to go</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 shadow-task-card space-y-6">
          {/* Avatar selector */}
          <div>
            <label className="text-sm font-medium text-foreground mb-3 block">Choose your avatar</label>
            <div className="grid grid-cols-6 gap-2">
              {AVATAR_SEEDS.map((seed) => (
                <button
                  key={seed}
                  onClick={() => setSelectedSeed(seed)}
                  className={`rounded-xl overflow-hidden border-2 transition-all ${
                    selectedSeed === seed ? "border-primary shadow-elevated" : "border-transparent hover:border-primary/30"
                  }`}
                >
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`}
                    alt={seed}
                    className="w-full h-full bg-secondary"
                  />
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">You can upload a real photo later in your profile settings.</p>
          </div>

          {/* City */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Your city</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Mumbai, Delhi, Bangalore…"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="h-12 rounded-xl pl-10"
                />
              </div>
              <Button variant="outline" className="h-12 rounded-xl gap-1.5 shrink-0" onClick={detectLocation} disabled={locating}>
                {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
                Detect
              </Button>
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Short bio <span className="text-muted-foreground">(optional)</span></label>
            <textarea
              placeholder="Tell others a little about yourself…"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full min-h-[80px] px-4 py-3 rounded-xl bg-background border border-input text-sm resize-none focus:ring-2 focus:ring-ring outline-none"
              maxLength={160}
            />
            <p className="text-xs text-muted-foreground text-right">{bio.length}/160</p>
          </div>

          <Button variant="hero" className="w-full h-12 rounded-xl" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Get Started →"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
