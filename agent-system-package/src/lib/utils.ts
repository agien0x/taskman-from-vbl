import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getCleanTitle(text: string | null | undefined, defaultText: string = "Без названия"): string {
  // Handle null or undefined
  if (!text) {
    return defaultText;
  }
  
  // Remove HTML tags
  let cleaned = text.replace(/<[^>]*>/g, '');
  
  // Decode HTML entities
  if (typeof document !== 'undefined') {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = cleaned;
    cleaned = textarea.value;
  }
  
  // Replace -> with arrow
  cleaned = cleaned.replace(/->/g, '→');
  
  return cleaned.trim() || defaultText;
}
