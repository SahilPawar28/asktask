import { Star } from "lucide-react";

export function RatingStars({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" | "lg" }) {
  const starSize = size === "sm" ? "h-3.5 w-3.5" : size === "md" ? "h-4 w-4" : "h-5 w-5";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${starSize} ${star <= Math.round(rating) ? "fill-warning text-warning" : "text-muted"}`}
        />
      ))}
      <span className="ml-1 text-sm font-medium text-foreground">{rating}</span>
    </div>
  );
}
