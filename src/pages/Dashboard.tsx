import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { MobileNav } from "@/components/MobileNav";
import { TaskCard } from "@/components/TaskCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { categories } from "@/data/mockData";
import { subscribeOpenTasks } from "@/lib/firestore";
import type { Task } from "@/types";
import { Search, SlidersHorizontal, MapPin, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [minPay, setMinPay] = useState("");
  const [maxPay, setMaxPay] = useState("");
  const { user, profile } = useAuth();

  useEffect(() => {
    const unsub = subscribeOpenTasks((t) => {
      setTasks(t);
      setLoading(false);
    });
    return unsub;
  }, []);

  const filtered = tasks
    .filter((t) => {
      const matchCat = selectedCategory === "all" || t.category === selectedCategory;
      const matchSearch =
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchMin = minPay === "" || t.payment >= Number(minPay);
      const matchMax = maxPay === "" || t.payment <= Number(maxPay);
      return matchCat && matchSearch && matchMin && matchMax;
    })
    .sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0));

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search & Filters */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 rounded-xl bg-card border-border"
            />
          </div>
          <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl shrink-0">
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
          <Button variant="outline" className="h-12 rounded-xl shrink-0 hidden md:flex gap-2">
            <MapPin className="h-4 w-4" />
            {profile?.city || "Your City"}
          </Button>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat.value
                  ? "gradient-primary text-primary-foreground shadow-lg"
                  : "bg-card border border-border text-foreground hover:border-primary/30"
              }`}
            >
              <span>{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex gap-8 mt-6">
          {/* Sidebar filters (desktop) */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="bg-card rounded-2xl border border-border p-5 shadow-task-card sticky top-24">
              <h3 className="font-display font-semibold text-foreground mb-4">Filters</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Payment Range (₹)</p>
                  <div className="flex gap-2">
                    <Input placeholder="Min" value={minPay} onChange={(e) => setMinPay(e.target.value)} className="h-9 text-sm rounded-lg" type="number" />
                    <Input placeholder="Max" value={maxPay} onChange={(e) => setMaxPay(e.target.value)} className="h-9 text-sm rounded-lg" type="number" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Sort</p>
                  <div className="flex flex-wrap gap-2">
                    {["Newest", "Highest Pay", "Urgent First"].map((s) => (
                      <Badge key={s} variant="category" className="cursor-pointer hover:bg-primary/20 transition-colors">{s}</Badge>
                    ))}
                  </div>
                </div>
                <Button variant="default" className="w-full mt-2" onClick={() => { setMinPay(""); setMaxPay(""); setSelectedCategory("all"); }}>
                  Reset Filters
                </Button>
              </div>
            </div>
          </aside>

          {/* Task Feed */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold font-display text-foreground">Available Tasks</h2>
                <p className="text-sm text-muted-foreground">
                  {loading ? "Loading…" : `${filtered.length} tasks near you`}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map((task, i) => (
                  <TaskCard key={task.id} task={task} index={i} currentUserId={user?.uid} />
                ))}
                {filtered.length === 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
                    <p className="text-4xl mb-3">🔍</p>
                    <p className="text-lg font-display font-semibold text-foreground">No tasks found</p>
                    <p className="text-muted-foreground mb-6">Try adjusting your filters or be the first to post one!</p>
                    <Link to="/post-task">
                      <Button variant="hero">Post a Task</Button>
                    </Link>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <MobileNav />
    </div>
  );
}
