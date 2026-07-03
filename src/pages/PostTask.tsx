import { useRef, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { MobileNav } from "@/components/MobileNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { categories } from "@/data/mockData";
import { createTask } from "@/lib/firestore";
import { uploadImages } from "@/lib/cloudinary";
import { ArrowLeft, Camera, MapPin, Navigation, Loader2, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getAvatarUrl } from "@/lib/utils";

const priceSuggestions: Record<string, number> = {
  delivery: 150, shopping: 200, food: 100, tutoring: 300,
  tech: 400, cleaning: 500, repairs: 350, moving: 800,
  pet: 250, errands: 200, other: 300,
};

interface LocationSuggestion {
  label: string;
  lat: number;
  lon: number;
}

export default function PostTask() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [payment, setPayment] = useState("");
  const [timeValue, setTimeValue] = useState("1");
  const [timeUnit, setTimeUnit] = useState<"mins" | "hours" | "days">("hours");
  const [location, setLocation] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [deadline, setDeadline] = useState("");
  const [instructions, setInstructions] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lat, setLat] = useState<number>();
  const [lng, setLng] = useState<number>();

  const locationTimer = useRef<ReturnType<typeof setTimeout>>();

  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  function handleCategorySelect(value: string) {
    setCategory(value);
    if (priceSuggestions[value] && !payment) setPayment(String(priceSuggestions[value]));
  }

  function handleImages(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const files = Array.from(e.target.files).slice(0, 5);
    setImages(files);
    setImagePreviews(files.map((f) => URL.createObjectURL(f)));
  }

  function detectLocation() {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`
          );
          const data = await res.json();
          const area = data.address?.suburb || data.address?.neighbourhood || "";
          const city = data.address?.city || data.address?.town || "";
          setLocation([area, city].filter(Boolean).join(", "));
          setShowSuggestions(false);
        } catch {
          toast({ title: "Couldn't get address", description: "Please enter manually.", variant: "destructive" });
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        toast({ title: "Location denied", description: "Please enter your location manually.", variant: "destructive" });
      }
    );
  }

  function handleLocationInput(val: string) {
    setLocation(val);
    clearTimeout(locationTimer.current);
    if (val.length < 3) { setLocationSuggestions([]); setShowSuggestions(false); return; }
    locationTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&addressdetails=1&limit=5`
        );
        const items = await res.json();
        const suggestions: LocationSuggestion[] = items.map((item: any) => {
          const addr = item.address || {};
          const parts = [
            addr.suburb || addr.neighbourhood,
            addr.city || addr.town || addr.county,
            addr.state,
          ].filter(Boolean);
          return {
            label: parts.length > 0 ? parts.join(", ") : item.display_name.split(",").slice(0, 3).join(",").trim(),
            lat: Number(item.lat),
            lon: Number(item.lon),
          };
        });
        setLocationSuggestions(suggestions);
        setShowSuggestions(true);
      } catch {
        setLocationSuggestions([]);
      }
    }, 400);
  }

  function selectSuggestion(s: LocationSuggestion) {
    setLocation(s.label);
    setLat(s.lat);
    setLng(s.lon);
    setLocationSuggestions([]);
    setShowSuggestions(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !profile) { toast({ title: "Not logged in", variant: "destructive" }); return; }
    if (!category) { toast({ title: "Please select a category", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const imageUrls = images.length > 0 ? await uploadImages(images, "asktask/tasks") : [];
      const avatarUrl = getAvatarUrl(profile);

      await createTask({
        title: title.trim(),
        description: description.trim(),
        category,
        payment: Number(payment),
        location: location.trim(),
        lat,
        lng,
        timeNeeded: `${timeValue} ${timeUnit}`,
        deadline,
        urgent,
        status: "open",
        creatorId: user.uid,
        creatorName: profile.name,
        creatorAvatar: avatarUrl,
        creatorRating: profile.rating,
        imageUrls,
        specialInstructions: instructions.trim(),
      });

      toast({ title: "Task posted! 🎉", description: "You'll be notified when someone accepts it." });
      navigate("/dashboard");
    } catch {
      toast({ title: "Failed to post task", description: "Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold font-display text-foreground mb-2">Post a New Task</h1>
          <p className="text-muted-foreground mb-8">Describe what you need done and someone nearby will help.</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-card rounded-2xl border border-border p-6 shadow-task-card space-y-5">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Task Title</label>
                <Input placeholder="e.g., Deliver a parcel to Andheri" value={title} onChange={(e) => setTitle(e.target.value)} className="h-12 rounded-xl" required />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Description</label>
                <textarea
                  placeholder="Describe the task in detail…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full min-h-[120px] px-4 py-3 rounded-xl bg-background border border-input text-sm resize-none focus:ring-2 focus:ring-ring outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Category</label>
                <div className="flex flex-wrap gap-2">
                  {categories.filter((c) => c.value !== "all").map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => handleCategorySelect(cat.value)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        category === cat.value
                          ? "gradient-primary text-primary-foreground shadow-lg"
                          : "bg-muted text-foreground hover:bg-muted/80"
                      }`}
                    >
                      {cat.icon} {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Payment (₹)
                    {category && priceSuggestions[category] && (
                      <span className="text-xs text-primary ml-1">Suggested: ₹{priceSuggestions[category]}</span>
                    )}
                  </label>
                  <Input type="number" placeholder="₹200" value={payment} onChange={(e) => setPayment(e.target.value)} className="h-12 rounded-xl" required />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Time Needed</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="1"
                      value={timeValue}
                      onChange={(e) => setTimeValue(e.target.value)}
                      className="h-12 rounded-xl w-20 shrink-0"
                      required
                    />
                    <select
                      value={timeUnit}
                      onChange={(e) => setTimeUnit(e.target.value as "mins" | "hours" | "days")}
                      className="flex-1 h-12 rounded-xl bg-background border border-input text-sm px-3 focus:ring-2 focus:ring-ring outline-none"
                    >
                      <option value="mins">mins</option>
                      <option value="hours">hours</option>
                      <option value="days">days</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Location</label>
                  <div className="relative">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                        <Input
                          placeholder="Area, City"
                          value={location}
                          onChange={(e) => handleLocationInput(e.target.value)}
                          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                          onFocus={() => locationSuggestions.length > 0 && setShowSuggestions(true)}
                          className="h-12 rounded-xl pl-10"
                          required
                        />
                      </div>
                      <Button type="button" variant="outline" size="icon" className="h-12 w-12 rounded-xl shrink-0" onClick={detectLocation} disabled={locating}>
                        {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
                      </Button>
                    </div>
                    {showSuggestions && locationSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-10 z-50 mt-1 bg-card border border-border rounded-xl shadow-elevated overflow-hidden">
                        {locationSuggestions.map((s, i) => (
                          <button
                            key={i}
                            type="button"
                            onMouseDown={() => selectSuggestion(s)}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors border-b border-border last:border-0 truncate"
                          >
                            <MapPin className="inline h-3 w-3 mr-1.5 text-muted-foreground shrink-0" />
                            {s.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Deadline</label>
                  <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="h-12 rounded-xl" required />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Special Instructions</label>
                <textarea
                  placeholder="Any special notes or instructions…"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full min-h-[80px] px-4 py-3 rounded-xl bg-background border border-input text-sm resize-none focus:ring-2 focus:ring-ring outline-none"
                />
              </div>

              {/* Urgent toggle */}
              <div className="flex items-center justify-between p-3 bg-urgent/10 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-foreground">🔥 Mark as Urgent</p>
                  <p className="text-xs text-muted-foreground">Appears at the top of the feed</p>
                </div>
                <button
                  type="button"
                  onClick={() => setUrgent(!urgent)}
                  className={`w-12 h-6 rounded-full transition-colors ${urgent ? "bg-urgent" : "bg-muted"} relative`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${urgent ? "translate-x-6" : ""}`} />
                </button>
              </div>

              {/* Image upload */}
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Attach Images <span className="text-muted-foreground">(optional, max 5)</span></label>
                {imagePreviews.length > 0 && (
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {imagePreviews.map((src, i) => (
                      <div key={i} className="relative">
                        <img src={src} alt="" className="w-20 h-20 rounded-xl object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setImages((p) => p.filter((_, j) => j !== i));
                            setImagePreviews((p) => p.filter((_, j) => j !== i));
                          }}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/30 transition-colors flex flex-col items-center">
                  <Camera className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Click to upload photos</p>
                  <input type="file" className="hidden" multiple accept="image/*" onChange={handleImages} />
                </label>
              </div>
            </div>

            <Button type="submit" variant="hero" size="xl" className="w-full" disabled={submitting}>
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Posting…</> : "Post Task"}
            </Button>
          </form>
        </motion.div>
      </div>
      <MobileNav />
    </div>
  );
}
