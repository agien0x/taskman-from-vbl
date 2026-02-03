import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Universal function to remove HTML tags from text and return clean string
 * @param text - Text that may contain HTML tags
 * @param defaultText - Default text if result is empty (default: "Без названия")
 * @returns Clean text without HTML tags and with decoded HTML entities
 */
export function getCleanTitle(text: string | null | undefined, defaultText: string = "Без названия"): string {
  // Handle null or undefined
  if (!text) {
    return defaultText;
  }
  
  // Remove HTML tags
  let cleaned = text.replace(/<[^>]*>/g, '');
  
  // Decode HTML entities
  const textarea = document.createElement('textarea');
  textarea.innerHTML = cleaned;
  cleaned = textarea.value;
  
  // Replace -> with arrow
  cleaned = cleaned.replace(/->/g, '→');
  
  return cleaned.trim() || defaultText;
}
