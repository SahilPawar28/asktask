import { useState, useCallback, useRef } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, RotateCcw, RotateCw, ZoomIn, ZoomOut, FlipHorizontal, Sun, Contrast, Check, X } from "lucide-react";

interface Props {
  open: boolean;
  imageSrc: string;
  onClose: () => void;
  onDone: (blob: Blob) => void;
}

interface Adjustments {
  brightness: number;
  contrast: number;
}

// Draws the cropped canvas and returns a Blob
async function getCroppedBlob(
  imageSrc: string,
  pixelCrop: Area,
  rotation: number,
  flipH: boolean,
  adj: Adjustments
): Promise<Blob> {
  const img = await createImageBitmap(await (await fetch(imageSrc)).blob());

  const canvas = document.createElement("canvas");
  const size = Math.max(img.width, img.height) * 2;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // Apply brightness / contrast via CSS filter trick on offscreen canvas
  ctx.filter = `brightness(${adj.brightness}%) contrast(${adj.contrast}%)`;

  // Translate to center, rotate, flip, draw
  ctx.translate(size / 2, size / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  if (flipH) ctx.scale(-1, 1);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  ctx.filter = "none";

  // Extract the crop region
  const out = document.createElement("canvas");
  out.width = pixelCrop.width;
  out.height = pixelCrop.height;
  const outCtx = out.getContext("2d")!;

  // The crop coords are relative to the original image; account for the centered drawing
  const offsetX = size / 2 - img.width / 2;
  const offsetY = size / 2 - img.height / 2;

  outCtx.drawImage(
    canvas,
    pixelCrop.x + offsetX,
    pixelCrop.y + offsetY,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((res, rej) => out.toBlob((b) => (b ? res(b) : rej(new Error("Canvas empty"))), "image/jpeg", 0.92));
}

export function ImageCropModal({ open, imageSrc, onClose, onDone }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [applying, setApplying] = useState(false);
  const [activeTab, setActiveTab] = useState<"crop" | "adjust">("crop");

  const onCropComplete = useCallback((_: Area, pxArea: Area) => {
    setCroppedArea(pxArea);
  }, []);

  async function handleApply() {
    if (!croppedArea) return;
    setApplying(true);
    try {
      const blob = await getCroppedBlob(imageSrc, croppedArea, rotation, flipH, { brightness, contrast });
      onDone(blob);
    } catch {
      // silent — caller handles errors
    } finally {
      setApplying(false);
    }
  }

  function reset() {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setFlipH(false);
    setBrightness(100);
    setContrast(100);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg rounded-2xl p-0 overflow-hidden gap-0">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="font-display">Edit Photo</DialogTitle>
        </DialogHeader>

        {/* Tab bar */}
        <div className="flex border-b border-border px-5">
          {(["crop", "adjust"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2 px-3 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Crop area */}
        <div className="relative bg-black" style={{ height: 320 }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            style={{
              containerStyle: { borderRadius: 0 },
              cropAreaStyle: { border: "3px solid #f97316", boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)" },
            }}
          />
        </div>

        {/* Controls */}
        <div className="px-5 py-4 space-y-4 bg-card">
          {activeTab === "crop" && (
            <>
              {/* Zoom */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><ZoomIn className="h-3.5 w-3.5" /> Zoom</label>
                  <span className="text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
                </div>
                <input
                  type="range" min={1} max={3} step={0.01} value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full accent-primary h-1.5 rounded-full"
                />
              </div>

              {/* Rotate */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Rotation</label>
                  <span className="text-xs text-muted-foreground">{rotation}°</span>
                </div>
                <input
                  type="range" min={-180} max={180} step={1} value={rotation}
                  onChange={(e) => setRotation(Number(e.target.value))}
                  className="w-full accent-primary h-1.5 rounded-full"
                />
              </div>

              {/* Quick rotate + flip buttons */}
              <div className="flex items-center gap-2">
                <button onClick={() => setRotation((r) => r - 90)} className="flex-1 h-9 rounded-xl border border-border flex items-center justify-center gap-1.5 text-xs font-medium hover:bg-muted transition-colors">
                  <RotateCcw className="h-3.5 w-3.5" /> –90°
                </button>
                <button onClick={() => setRotation((r) => r + 90)} className="flex-1 h-9 rounded-xl border border-border flex items-center justify-center gap-1.5 text-xs font-medium hover:bg-muted transition-colors">
                  <RotateCw className="h-3.5 w-3.5" /> +90°
                </button>
                <button
                  onClick={() => setFlipH((f) => !f)}
                  className={`flex-1 h-9 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-medium transition-colors ${flipH ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"}`}
                >
                  <FlipHorizontal className="h-3.5 w-3.5" /> Flip
                </button>
              </div>
            </>
          )}

          {activeTab === "adjust" && (
            <>
              {/* Brightness */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Sun className="h-3.5 w-3.5" /> Brightness</label>
                  <span className="text-xs text-muted-foreground">{brightness}%</span>
                </div>
                <input
                  type="range" min={50} max={150} step={1} value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="w-full accent-primary h-1.5 rounded-full"
                />
              </div>

              {/* Contrast */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Contrast className="h-3.5 w-3.5" /> Contrast</label>
                  <span className="text-xs text-muted-foreground">{contrast}%</span>
                </div>
                <input
                  type="range" min={50} max={150} step={1} value={contrast}
                  onChange={(e) => setContrast(Number(e.target.value))}
                  className="w-full accent-primary h-1.5 rounded-full"
                />
              </div>
            </>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1 h-10 rounded-xl gap-1.5" onClick={reset}>
              Reset
            </Button>
            <Button variant="outline" className="h-10 px-3 rounded-xl" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
            <Button variant="hero" className="flex-1 h-10 rounded-xl gap-1.5" onClick={handleApply} disabled={applying}>
              {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4" /> Apply</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
