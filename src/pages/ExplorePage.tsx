import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { MobileNav } from "@/components/MobileNav";
import { subscribeOpenTasks } from "@/lib/firestore";
import type { Task } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Navigation } from "lucide-react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons for Vite builds
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const taskIcon = L.divIcon({
  className: "",
  html: `<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#ea580c,#f97316);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(249,115,22,0.4)">
    <svg width="16" height="16" fill="white" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -38],
});

const urgentIcon = L.divIcon({
  className: "",
  html: `<div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#e55a1c,#f97316);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(229,90,28,0.5);animation:pulse 2s infinite">
    <svg width="18" height="18" fill="white" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
  </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -42],
});

function RecenterButton({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  return (
    <button
      onClick={() => map.setView([lat, lng], 14)}
      className="absolute bottom-20 right-4 z-[1000] w-10 h-10 bg-card rounded-xl border border-border shadow-elevated flex items-center justify-center hover:bg-muted transition-colors"
    >
      <Navigation className="h-4 w-4 text-primary" />
    </button>
  );
}

const DEFAULT_CENTER: [number, number] = [19.076, 72.877]; // Mumbai

export default function ExplorePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [gettingLoc, setGettingLoc] = useState(false);

  useEffect(() => {
    const unsub = subscribeOpenTasks((t) => {
      setTasks(t);
      setLoading(false);
    });
    return unsub;
  }, []);

  function detectLocation() {
    setGettingLoc(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos([pos.coords.latitude, pos.coords.longitude]);
        setGettingLoc(false);
      },
      () => setGettingLoc(false)
    );
  }

  // Tasks with coordinates
  const mappedTasks = tasks.filter((t) => t.lat && t.lng);
  // Tasks without coordinates — show in sidebar
  const unmappedTasks = tasks.filter((t) => !t.lat || !t.lng);

  const center = userPos || DEFAULT_CENTER;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold font-display text-foreground">Explore Tasks</h1>
            <p className="text-muted-foreground">Discover tasks near you on the map</p>
          </div>
          <Button variant="outline" className="gap-2 rounded-xl" onClick={detectLocation} disabled={gettingLoc}>
            {gettingLoc ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
            My Location
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Map */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="h-[500px] bg-muted rounded-2xl flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="relative h-[500px] rounded-2xl overflow-hidden border border-border shadow-task-card">
                <MapContainer
                  center={center}
                  zoom={13}
                  style={{ height: "100%", width: "100%" }}
                  zoomControl={false}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {userPos && (
                    <Marker
                      position={userPos}
                      icon={L.divIcon({
                        className: "",
                        html: `<div style="width:14px;height:14px;border-radius:50%;background:#f97316;border:3px solid white;box-shadow:0 0 0 4px rgba(249,115,22,0.3)"></div>`,
                        iconSize: [14, 14],
                        iconAnchor: [7, 7],
                      })}
                    >
                      <Popup>You are here</Popup>
                    </Marker>
                  )}

                  {mappedTasks.map((task) => (
                    <Marker
                      key={task.id}
                      position={[task.lat!, task.lng!]}
                      icon={task.urgent ? urgentIcon : taskIcon}
                    >
                      <Popup>
                        <div className="min-w-[200px] p-1">
                          <p className="font-semibold text-sm">{task.title}</p>
                          <p className="text-xs text-gray-500 mt-1">{task.location}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-sm font-bold" style={{ color: "#f97316" }}>₹{task.payment}</span>
                            {task.urgent && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#fff7ed", color: "#ea580c" }}>🔥 Urgent</span>}
                          </div>
                          <a
                            href={`/task/${task.id}`}
                            className="mt-2 block text-center text-xs font-medium text-white py-1.5 px-3 rounded-lg"
                            style={{ background: "linear-gradient(135deg,#ea580c,#f97316)" }}
                          >
                            View Task →
                          </a>
                        </div>
                      </Popup>
                    </Marker>
                  ))}

                  {userPos && <RecenterButton lat={userPos[0]} lng={userPos[1]} />}
                </MapContainer>
              </div>
            )}

            {mappedTasks.length === 0 && !loading && (
              <p className="text-center text-sm text-muted-foreground mt-3">
                Tasks will appear on the map once they have a location set. New tasks posted via the app include coordinates automatically.
              </p>
            )}
          </div>

          {/* Task list sidebar */}
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 scrollbar-hide">
            <p className="text-sm font-medium text-foreground">{tasks.length} open tasks</p>
            {tasks.map((task) => (
              <Link key={task.id} to={`/task/${task.id}`}>
                <div className="bg-card rounded-xl border border-border p-4 hover:shadow-task-card-hover hover:-translate-y-0.5 transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {task.urgent && <Badge variant="urgent" className="mb-1 text-[10px]">🔥 Urgent</Badge>}
                      <p className="text-sm font-semibold text-foreground line-clamp-2">{task.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{task.location}</p>
                    </div>
                    <p className="text-lg font-bold font-display text-primary shrink-0">₹{task.payment}</p>
                  </div>
                </div>
              </Link>
            ))}
            {tasks.length === 0 && !loading && (
              <div className="text-center py-8">
                <p className="text-4xl mb-2">🗺️</p>
                <p className="text-sm text-muted-foreground">No open tasks right now</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <MobileNav />
    </div>
  );
}
