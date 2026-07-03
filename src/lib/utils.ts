import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Returns the best available avatar URL for a user.
 *  Priority: uploaded photo → DiceBear seed → DiceBear name fallback */
export function getAvatarUrl(user: {
  avatarUrl?: string | null;
  avatarSeed?: string | null;
  name?: string | null;
} | null | undefined): string {
  if (user?.avatarUrl) return user.avatarUrl;
  const seed = user?.avatarSeed || user?.name || "User";
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
}
